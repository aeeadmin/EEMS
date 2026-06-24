const db = require('../config/database');
const XLSX = require('xlsx');
const { formatDate } = require('../utils/helpers');

async function exportEmployees(req, res) {
  try {
    const format = req.query.format || 'excel'; // 'excel' or 'csv'
    
    let query = `
      SELECT e.employee_id, e.name, e.date_of_birth, e.name_based_email, e.phone_number, e.district, e.position_id, e.is_active, em.designation_email
      FROM employees e
      LEFT JOIN email_master em ON e.position_id = em.position_id
    `;
    const params = [];

    if (req.user && req.user.role === 'MANAGER') {
      query += ` WHERE e.district = ?`;
      params.push(req.user.district);
    }

    const [rows] = await db.execute(query, params);

    const data = rows.map(r => ({
      'Employee ID': r.employee_id,
      'Name': r.name,
      'Date of Birth': formatDate(r.date_of_birth),
      'Name Based Email': r.name_based_email,
      'Phone Number': r.phone_number,
      'District': r.district,
      'Position ID': r.position_id,
      'Designation Email': r.designation_email || '',
      'Status': r.is_active ? 'Active' : 'Inactive/Retired'
    }));

    const dateStr = formatDate(new Date());
    const filename = `Employees_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportManagers(req, res) {
  try {
    const format = req.query.format || 'excel';
    const [rows] = await db.execute(
      `SELECT m.manager_unique_id, m.employee_id, m.token_number, m.email, m.district, e.name 
       FROM managers m
       LEFT JOIN employees e ON m.employee_id = e.employee_id`
    );

    const data = rows.map(r => ({
      'Manager ID': r.manager_unique_id,
      'Employee ID': r.employee_id,
      'Name': r.name || '',
      'Position ID (Token)': r.token_number,
      'Email': r.email,
      'District': r.district
    }));

    const dateStr = formatDate(new Date());
    const filename = `Managers_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportAdmins(req, res) {
  try {
    const format = req.query.format || 'excel';
    const [rows] = await db.execute(
      `SELECT a.admin_unique_id, a.employee_id, a.token_number, a.email, a.district, e.name 
       FROM admins a
       LEFT JOIN employees e ON a.employee_id = e.employee_id`
    );

    const data = rows.map(r => ({
      'Admin ID': r.admin_unique_id,
      'Employee ID': r.employee_id,
      'Name': r.name || '',
      'Position ID (Token)': r.token_number,
      'Email': r.email,
      'District': r.district
    }));

    const dateStr = formatDate(new Date());
    const filename = `Admins_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportRequests(req, res) {
  try {
    const format = req.query.format || 'excel';
    const [rows] = await db.execute(
      `SELECT r.*, e.name as employee_name
       FROM email_mapping_requests r
       LEFT JOIN employees e ON r.employee_id = e.employee_id`
    );

    const data = rows.map(r => ({
      'Request ID': r.id,
      'Employee ID': r.employee_id,
      'Employee Name': r.employee_name || '',
      'Position ID': r.position_id,
      'Email ID': r.email_id,
      'District': r.district,
      'Request Type': r.request_type,
      'Subject': r.subject,
      'Status': r.status,
      'Comments': r.comments || '',
      'Requested By': r.requested_by,
      'Approved/Rejected By': r.approved_by || '',
      'Date': formatDate(r.created_at)
    }));

    const dateStr = formatDate(new Date());
    const filename = `Requests_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function sendExportResponse(res, data, filename, format) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    return res.send(csvContent);
  } else {
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    return res.send(excelBuffer);
  }
}

async function exportRetirements(req, res) {
  try {
    const format = req.query.format || 'excel';
    const [rows] = await db.execute(
      `SELECT e.*, em.designation_email,
       DATE_ADD(e.date_of_birth, INTERVAL 58 YEAR) as retirement_date,
       DATEDIFF(DATE_ADD(e.date_of_birth, INTERVAL 58 YEAR), CURDATE()) as days_remaining
       FROM employees e
       LEFT JOIN email_master em ON e.position_id = em.position_id
       WHERE e.is_active = 1
       HAVING days_remaining >= 0 AND days_remaining <= 180
       ORDER BY days_remaining ASC`
    );

    const data = rows.map(r => ({
      'Employee ID': r.employee_id,
      'Name': r.name,
      'Position ID': r.position_id,
      'Date of Birth': formatDate(r.date_of_birth),
      'Retirement Date': formatDate(r.retirement_date),
      'Days Remaining': `${r.days_remaining} days`,
      'District': r.district,
      'Designation Email': r.designation_email || ''
    }));

    const dateStr = formatDate(new Date());
    const filename = `Retirements_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportNotifications(req, res) {
  try {
    const format = req.query.format || 'excel';
    const [rows] = await db.execute(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.unique_id]
    );

    const data = rows.map(r => ({
      'Notification ID': r.id,
      'Title': r.title,
      'Message': r.message,
      'Type': r.type,
      'Status': r.is_read ? 'Read' : 'Unread',
      'Date': new Date(r.created_at).toLocaleString()
    }));

    const dateStr = formatDate(new Date());
    const filename = `Notifications_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportAuditLogs(req, res) {
  try {
    const format = req.query.format || 'excel';
    const [rows] = await db.execute(
      `SELECT * FROM audit_logs ORDER BY created_at DESC`
    );

    const data = rows.map(r => ({
      'Log ID': r.id,
      'User ID': r.user_id,
      'Role': r.role,
      'Action': r.action,
      'Table Name': r.table_name || 'N/A',
      'Record ID': r.record_id || '',
      'Old Value': r.old_value ? JSON.stringify(r.old_value) : '',
      'New Value': r.new_value ? JSON.stringify(r.new_value) : '',
      'IP Address': r.ip_address || '',
      'Date/Time': new Date(r.created_at).toLocaleString()
    }));

    const dateStr = formatDate(new Date());
    const filename = `AuditLogs_${dateStr}`;

    sendExportResponse(res, data, filename, format);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  exportEmployees,
  exportManagers,
  exportAdmins,
  exportRequests,
  exportRetirements,
  exportNotifications,
  exportAuditLogs
};
