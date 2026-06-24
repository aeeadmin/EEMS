const db = require('../config/database');
const bcrypt = require('bcrypt');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const socketService = require('../services/socketService');

const SALT_ROUNDS = 10;

async function getAllManagers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT m.*, e.name, e.name_based_email, e.phone_number, e.date_of_birth
      FROM managers m
      LEFT JOIN employees e ON m.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (e.name LIKE ? OR m.employee_id LIKE ? OR m.district LIKE ? OR m.token_number LIKE ? OR m.manager_unique_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM managers m
      LEFT JOIN employees e ON m.employee_id = e.employee_id
      WHERE 1=1 ${search ? 'AND (e.name LIKE ? OR m.employee_id LIKE ? OR m.district LIKE ? OR m.token_number LIKE ? OR m.manager_unique_id LIKE ?)' : ''}
    `;
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];
    const [countRows] = await db.execute(countQuery, countParams);

    return res.json({
      managers: rows,
      total: countRows[0].total,
      page,
      pages: Math.ceil(countRows[0].total / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getManagerById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.execute('SELECT * FROM managers WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }
    return res.json({ manager: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createManager(req, res) {
  const {
    employeeId,
    userId,
    username,
    password
  } = req.body;

  if (!employeeId || !userId || !username || !password) {
    return res.status(400).json({ message: 'Employee ID, User ID, Username, and Password are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch employee details from employees table
    const [empRows] = await conn.execute(
      'SELECT * FROM employees WHERE employee_id = ? AND is_active = TRUE',
      [employeeId]
    );
    if (empRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: `Employee with ID ${employeeId} does not exist or is inactive. You must create the employee first.` });
    }
    const emp = empRows[0];

    // 2. Fetch email master details
    const [emailRows] = await conn.execute(
      'SELECT * FROM email_master WHERE employee_id = ? AND is_active = TRUE',
      [employeeId]
    );
    if (emailRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: `No active designation email details found in email_master for Employee ID ${employeeId}.` });
    }
    const emailMaster = emailRows[0];

    // 3. Check manager uniqueness in managers table
    const [existingMgr] = await conn.execute(
      'SELECT manager_unique_id, employee_id FROM managers WHERE manager_unique_id = ? OR employee_id = ?',
      [userId, employeeId]
    );
    if (existingMgr.length > 0) {
      const match = existingMgr[0];
      let conflictField = '';
      if (match.manager_unique_id === userId) conflictField = 'User ID';
      else if (match.employee_id === employeeId) conflictField = 'Employee ID';

      await conn.rollback();
      return res.status(400).json({ message: `Manager account with this ${conflictField} already exists` });
    }

    // 4. Check username uniqueness in users table
    const [existingUser] = await conn.execute(
      'SELECT user_id, username FROM users WHERE user_id = ? OR username = ?',
      [userId, username]
    );
    if (existingUser.length > 0) {
      const match = existingUser[0];
      let conflictField = '';
      if (match.user_id === userId) conflictField = 'User ID';
      else if (match.username === username) conflictField = 'Username';

      await conn.rollback();
      return res.status(400).json({ message: `User credentials with this ${conflictField} already exist` });
    }

    const hashedPwd = await bcrypt.hash(password, SALT_ROUNDS);

    // 5. Insert into managers
    await conn.execute(
      `INSERT INTO managers (manager_unique_id, employee_id, token_number, email, district, password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, employeeId, emp.position_id, emailMaster.designation_email, emp.district, hashedPwd]
    );

    // 6. Insert into users
    await conn.execute(
      `INSERT INTO users (employee_id, name, email, username, password, role, user_id, district)
       VALUES (?, ?, ?, ?, ?, 'MANAGER', ?, ?)`,
      [employeeId, emp.name, emailMaster.designation_email, username, hashedPwd, userId, emp.district]
    );

    await conn.commit();

    // Audit Log
    await auditService.logAction(req.user.unique_id, req.user.role, 'CREATE_MANAGER', 'managers', userId, null, req.body, req.ip);

    // Notification
    await notificationService.createNotificationForRole(
      'ADMIN',
      'Manager Account Created',
      `Manager account for ${emp.name} (${userId}) was created by ${req.user.name}.`,
      'SUCCESS'
    );

    socketService.broadcast('dashboard:updated', {});

    return res.status(201).json({ message: 'Manager created successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating manager:', err);
    return res.status(500).json({ message: 'Internal server error: ' + err.message });
  } finally {
    conn.release();
  }
}

async function updateManager(req, res) {
  const { id } = req.params;
  const { email, district, is_active } = req.body;

  if (email && !email.toLowerCase().endsWith('@tnebnet.org')) {
    return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
  }

  try {
    const [existing] = await db.execute('SELECT * FROM managers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const manager = existing[0];

    await db.execute(
      'UPDATE managers SET email = ?, district = ?, is_active = ? WHERE id = ?',
      [email || manager.email, district || manager.district, is_active !== undefined ? is_active : manager.is_active, id]
    );

    // Update users table too
    await db.execute(
      'UPDATE users SET email = ?, district = ? WHERE user_id = ? AND role = ?',
      [email || manager.email, district || manager.district, manager.manager_unique_id, 'MANAGER']
    );

    await auditService.logAction(req.user.unique_id, req.user.role, 'UPDATE_MANAGER', 'managers', manager.manager_unique_id, manager, req.body, req.ip);
    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Manager updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deactivateManager(req, res) {
  const { id } = req.params;
  try {
    const [existing] = await db.execute('SELECT * FROM managers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const manager = existing[0];

    await db.execute('UPDATE managers SET is_active = 0 WHERE id = ?', [id]);
    await db.execute('UPDATE users SET password = "" WHERE user_id = ? AND role = ?', [manager.manager_unique_id, 'MANAGER']); // Invalidate login

    await auditService.logAction(req.user.unique_id, req.user.role, 'DEACTIVATE_MANAGER', 'managers', manager.manager_unique_id, manager, { is_active: 0 }, req.ip);
    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Manager deactivated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function unfreezeManager(req, res) {
  const { id } = req.params;
  try {
    const [existing] = await db.execute('SELECT * FROM managers WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const manager = existing[0];
    await db.execute(
      'UPDATE managers SET failed_login_attempts = 0, freeze_until = NULL WHERE id = ?',
      [id]
    );

    await auditService.logAction(
      req.user.unique_id,
      req.user.role,
      'UNFREEZE_MANAGER',
      'managers',
      manager.manager_unique_id,
      manager,
      { failed_login_attempts: 0, freeze_until: null },
      req.ip
    );
    
    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Manager account unfrozen successfully' });
  } catch (err) {
    console.error('unfreezeManager error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getAllManagers,
  getManagerById,
  createManager,
  updateManager,
  deactivateManager,
  unfreezeManager
};
