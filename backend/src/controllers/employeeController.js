const db = require('../config/database');
const bcrypt = require('bcrypt');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const socketService = require('../services/socketService');

async function getAllEmployees(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search || '';
    let district = req.query.district || '';
    if (req.user && req.user.role === 'MANAGER') {
      district = req.user.district;
    }
    const isActive = req.query.is_active;
    const sortBy = req.query.sortBy || 'id';
    const sortOrder = req.query.sortOrder || 'ASC';

    // Allowed sort columns
    const allowedSort = ['id', 'employee_id', 'name', 'date_of_birth', 'name_based_email', 'phone_number', 'district', 'position_id', 'is_active'];
    const orderColumn = allowedSort.includes(sortBy) ? sortBy : 'id';
    const orderDir = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder : 'ASC';

    let query = `
      SELECT e.*, em.designation_email, u.role AS user_role, m.manager_unique_id, a.admin_unique_id
      FROM employees e
      LEFT JOIN email_master em ON e.position_id = em.position_id
      LEFT JOIN users u ON e.employee_id = u.employee_id
      LEFT JOIN managers m ON e.employee_id = m.employee_id
      LEFT JOIN admins a ON e.employee_id = a.employee_id
      WHERE 1=1
    `;
    const params = [];

    // Search filter
    if (search) {
      query += ` AND (
        e.name LIKE ? 
        OR e.employee_id LIKE ? 
        OR e.position_id LIKE ? 
        OR e.name_based_email LIKE ? 
        OR e.phone_number LIKE ? 
        OR e.district LIKE ? 
        OR em.designation_email LIKE ?
        OR e.designation LIKE ?
        OR u.role LIKE ?
        OR u.user_id LIKE ?
        OR m.manager_unique_id LIKE ?
        OR a.admin_unique_id LIKE ?
      )`;
      const searchPat = `%${search}%`;
      params.push(
        searchPat, searchPat, searchPat,
        searchPat, searchPat, searchPat,
        searchPat, searchPat, searchPat,
        searchPat, searchPat, searchPat
      );
    }

    // District filter
    if (district) {
      query += ` AND e.district = ?`;
      params.push(district);
    }

    // Role-specific visibility: manager can only see their district's employees?
    // Wait, the prompt says: "EMPLOYEE DETAILS PAGE Columns: S.No, ... Features: Search, Filter, Sort...". 
    // Usually, managers can view all, but let's check: "MANAGER: View-only by default. Can request edits for...".
    // If managers can view all, we just keep it as is. If managers can only see their district, we can filter.
    // Let's allow managers to see all but only submit edit requests. Let's make it general.

    // Active status filter
    if (isActive !== undefined && isActive !== '') {
      query += ` AND e.is_active = ?`;
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as t`;
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;

    // Sorting and Pagination
    query += ` ORDER BY e.${orderColumn} ${orderDir} LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    return res.json({
      employees: rows,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error in getAllEmployees:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getEmployeeById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT e.*, em.designation_email 
       FROM employees e
       LEFT JOIN email_master em ON e.position_id = em.position_id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    return res.json({ employee: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createEmployee(req, res) {
  const { 
    employee_id, 
    name, 
    designation, 
    date_of_birth, 
    name_based_email, 
    phone_number, 
    district, 
    position_id,
    designation_email,
    password
  } = req.body;

  if (
    !employee_id || 
    !name || 
    !designation || 
    !date_of_birth || 
    !name_based_email || 
    !phone_number || 
    !district || 
    !position_id ||
    !designation_email ||
    !password
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!designation_email.toLowerCase().endsWith('@tnebnet.org')) {
    return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
  }

  if (!name_based_email.toLowerCase().endsWith('@tnebltd.org')) {
    return res.status(400).json({ message: 'Name Based email must end with @tnebltd.org' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check unique constraints
    const [existing] = await conn.execute(
      'SELECT employee_id, name_based_email, phone_number, position_id FROM employees WHERE employee_id=? OR name_based_email=? OR phone_number=? OR position_id=?',
      [employee_id, name_based_email, phone_number, position_id]
    );

    if (existing.length > 0) {
      const match = existing[0];
      let conflictField = '';
      if (match.employee_id === employee_id) conflictField = 'Employee ID';
      else if (match.position_id === position_id) conflictField = 'Position ID';
      else if (match.name_based_email === name_based_email) conflictField = 'Name Based Email';
      else if (match.phone_number === phone_number) conflictField = 'Phone Number';

      await conn.rollback();
      return res.status(400).json({ message: `${conflictField} already exists` });
    }

    // Check designation email unique constraint in email_master
    const [existingEmail] = await conn.execute(
      'SELECT designation_email FROM email_master WHERE designation_email = ?',
      [designation_email]
    );
    if (existingEmail.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Designation Email already exists' });
    }

    // Insert into employees
    await conn.execute(
      `INSERT INTO employees (employee_id, name, designation, date_of_birth, name_based_email, phone_number, district, position_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [employee_id, name, designation, date_of_birth, name_based_email, phone_number, district, position_id]
    );

    // Insert into email_master
    const hashedPwd = await bcrypt.hash(password, 10);

    await conn.execute(
      `INSERT INTO email_master (employee_id, position_id, designation_email, district, password, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [employee_id, position_id, designation_email, district, hashedPwd]
    );

    await conn.commit();

    // Log action
    await auditService.logAction(req.user.unique_id, req.user.role, 'CREATE_EMPLOYEE', 'employees', employee_id, null, req.body, req.ip);

    // Notify role ADMIN
    await notificationService.createNotificationForRole(
      'ADMIN',
      'New Employee Added',
      `Employee ${name} (${employee_id}) has been added by ${req.user.name}.`,
      'SUCCESS'
    );

    socketService.broadcast('dashboard:updated', {});

    return res.status(201).json({ message: 'Employee created successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating employee:', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
}

async function updateEmployee(req, res) {
  const { id } = req.params;
  const { name, name_based_email, phone_number, district, is_active } = req.body;

  if (name_based_email && !name_based_email.toLowerCase().endsWith('@tnebltd.org')) {
    return res.status(400).json({ message: 'Name Based email must end with @tnebltd.org' });
  }

  try {
    const [existing] = await db.execute('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = existing[0];

    // Enforce rules: "Manager cannot edit DOB, Position ID. Position ID permanent."
    // Since this endpoint is Admin only (or general with limitations), let's ensure we do not update DOB or Position ID
    // If the caller is admin, they can edit some details, but Position ID is permanent.
    await db.execute(
      `UPDATE employees 
       SET name = ?, name_based_email = ?, phone_number = ?, district = ?, is_active = ?
       WHERE id = ?`,
      [name || employee.name, name_based_email || employee.name_based_email, phone_number || employee.phone_number, district || employee.district, is_active !== undefined ? is_active : employee.is_active, id]
    );

    await auditService.logAction(req.user.unique_id, req.user.role, 'UPDATE_EMPLOYEE', 'employees', employee.employee_id, employee, req.body, req.ip);
    
    // Notify
    await notificationService.createNotificationForRole(
      'ADMIN',
      'Employee Updated',
      `Employee ${employee.name} (${employee.employee_id}) was updated.`,
      'INFO'
    );

    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteEmployee(req, res) {
  const { id } = req.params;
  try {
    const [existing] = await db.execute('SELECT * FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = existing[0];

    await db.execute('UPDATE employees SET is_active = 0 WHERE id = ?', [id]);
    await db.execute('UPDATE email_master SET is_active = 0 WHERE employee_id = ?', [employee.employee_id]);

    await auditService.logAction(req.user.unique_id, req.user.role, 'DELETE_EMPLOYEE', 'employees', employee.employee_id, employee, { is_active: 0 }, req.ip);

    await notificationService.createNotificationForRole(
      'ADMIN',
      'Employee Deactivated',
      `Employee ${employee.name} (${employee.employee_id}) has been deactivated.`,
      'WARNING'
    );

    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Employee deactivated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDashboardStats(req, res) {
  try {
    const isManager = req.user && req.user.role === 'MANAGER';
    const district = isManager ? req.user.district : null;
    const uniqueId = isManager ? req.user.unique_id : null;

    let totalEmpQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = 1';
    let activeEmpQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = 1';
    let retiredEmpQuery = 'SELECT COUNT(*) as count FROM employees WHERE is_active = 0';
    let pendingReqQuery = "SELECT COUNT(*) as count FROM email_mapping_requests WHERE status = 'PENDING'";
    let approvedReqQuery = "SELECT COUNT(*) as count FROM email_mapping_requests WHERE status = 'APPROVED'";
    let rejectedReqQuery = "SELECT COUNT(*) as count FROM email_mapping_requests WHERE status = 'REJECTED'";
    let totalReqQuery = "SELECT COUNT(*) as count FROM email_mapping_requests";

    const empParams = [];
    const reqParams = [];

    if (isManager) {
      totalEmpQuery += ' AND district = ?';
      activeEmpQuery += ' AND district = ?';
      retiredEmpQuery += ' AND district = ?';
      empParams.push(district);

      pendingReqQuery += ' AND requested_by = ?';
      approvedReqQuery += ' AND requested_by = ?';
      rejectedReqQuery += ' AND requested_by = ?';
      totalReqQuery += ' WHERE requested_by = ?';
      reqParams.push(uniqueId);
    }

    const [totalEmp] = await db.execute(totalEmpQuery, empParams);
    const [activeEmp] = await db.execute(activeEmpQuery, empParams);
    const [retiredEmp] = await db.execute(retiredEmpQuery, empParams);
    const [pendingReq] = await db.execute(pendingReqQuery, reqParams);
    const [approvedReq] = await db.execute(approvedReqQuery, reqParams);
    const [rejectedReq] = await db.execute(rejectedReqQuery, reqParams);
    const [totalReq] = await db.execute(totalReqQuery, reqParams);

    return res.json({
      totalEmployees: totalEmp[0].count,
      activeEmployees: activeEmp[0].count,
      retiredEmployees: retiredEmp[0].count,
      pendingRequests: pendingReq[0].count,
      approvedRequests: approvedReq[0].count,
      rejectedRequests: rejectedReq[0].count,
      districtRequests: totalReq[0].count
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDashboardStats
};
