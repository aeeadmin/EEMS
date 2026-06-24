const db = require('../config/database');
const bcrypt = require('bcrypt');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const socketService = require('../services/socketService');
const emailService = require('../services/emailService');
const XLSX = require('xlsx');

const SALT_ROUNDS = 10;

async function getAllAdmins(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT a.*, e.name, e.name_based_email, e.phone_number, e.date_of_birth
      FROM admins a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (e.name LIKE ? OR a.employee_id LIKE ? OR a.district LIKE ? OR a.token_number LIKE ? OR a.admin_unique_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM admins a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE 1=1 ${search ? 'AND (e.name LIKE ? OR a.employee_id LIKE ? OR a.district LIKE ? OR a.token_number LIKE ? OR a.admin_unique_id LIKE ?)' : ''}
    `;
    const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : [];
    const [countRows] = await db.execute(countQuery, countParams);

    return res.json({
      admins: rows,
      total: countRows[0].total,
      page,
      pages: Math.ceil(countRows[0].total / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getAdminById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    return res.json({ admin: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createAdmin(req, res) {
  const {
    employeeId,
    userId,
    username,
    password,
    isViewAdmin
  } = req.body;

  if (!employeeId || !userId || !username || !password) {
    return res.status(400).json({ message: 'Employee ID, User ID, Username, and Password are required' });
  }

  const isViewAdminVal = isViewAdmin === true || isViewAdmin === 1 || isViewAdmin === 'true' ? 1 : 0;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Only one active main administrator (is_view_admin = 0) is allowed
    const [activeAdmins] = await conn.execute('SELECT id FROM admins WHERE is_active = 1 AND is_view_admin = 0');
    if (!isViewAdminVal && activeAdmins.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Only one administrator account is allowed in EEMS.' });
    }

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

    // 3. Check admin uniqueness in admins table
    const [existingAdmin] = await conn.execute(
      'SELECT admin_unique_id, employee_id FROM admins WHERE admin_unique_id = ? OR employee_id = ?',
      [userId, employeeId]
    );
    if (existingAdmin.length > 0) {
      const match = existingAdmin[0];
      let conflictField = '';
      if (match.admin_unique_id === userId) conflictField = 'User ID';
      else if (match.employee_id === employeeId) conflictField = 'Employee ID';

      await conn.rollback();
      return res.status(400).json({ message: `Admin account with this ${conflictField} already exists` });
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

    // 5. Insert into admins
    await conn.execute(
      `INSERT INTO admins (admin_unique_id, employee_id, token_number, email, district, password, is_active, is_view_admin)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [userId, employeeId, emp.position_id, emailMaster.designation_email, emp.district, hashedPwd, isViewAdminVal]
    );

    // 6. Insert into users
    await conn.execute(
      `INSERT INTO users (employee_id, name, email, username, password, role, user_id, district, is_view_admin)
       VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, ?, ?, ?)`,
      [employeeId, emp.name, emailMaster.designation_email, username, hashedPwd, userId, emp.district, isViewAdminVal]
    );

    await conn.commit();

    await auditService.logAction(req.user.unique_id, req.user.role, 'CREATE_ADMIN', 'admins', userId, null, req.body, req.ip);

    await notificationService.createNotificationForRole(
      'ADMIN',
      'Admin Account Created',
      `Admin account for ${emp.name} (${userId}) was created by ${req.user.name}.`,
      'SUCCESS'
    );

    socketService.broadcast('dashboard:updated', {});

    return res.status(201).json({ message: 'Admin created successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating admin:', err);
    return res.status(500).json({ message: 'Internal server error: ' + err.message });
  } finally {
    conn.release();
  }
}

async function updateAdmin(req, res) {
  const { id } = req.params;
  const { email, district, is_active } = req.body;

  if (email && !email.toLowerCase().endsWith('@tnebnet.org')) {
    return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
  }

  try {
    const [existing] = await db.execute('SELECT * FROM admins WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin = existing[0];

    await db.execute(
      'UPDATE admins SET email = ?, district = ?, is_active = ? WHERE id = ?',
      [email || admin.email, district || admin.district, is_active !== undefined ? is_active : admin.is_active, id]
    );

    await db.execute(
      'UPDATE users SET email = ?, district = ? WHERE user_id = ? AND role = ?',
      [email || admin.email, district || admin.district, admin.admin_unique_id, 'ADMIN']
    );

    await auditService.logAction(req.user.unique_id, req.user.role, 'UPDATE_ADMIN', 'admins', admin.admin_unique_id, admin, req.body, req.ip);
    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Admin updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deactivateAdmin(req, res) {
  const { id } = req.params;
  try {
    const [existing] = await db.execute('SELECT * FROM admins WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin = existing[0];

    await db.execute('UPDATE admins SET is_active = 0 WHERE id = ?', [id]);
    await db.execute('UPDATE users SET password = "" WHERE user_id = ? AND role = ?', [admin.admin_unique_id, 'ADMIN']);

    await auditService.logAction(req.user.unique_id, req.user.role, 'DEACTIVATE_ADMIN', 'admins', admin.admin_unique_id, admin, { is_active: 0 }, req.ip);
    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Admin deactivated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDbTables(req, res) {
  try {
    const [rows] = await db.execute('SHOW TABLES');
    const dbName = process.env.DB_NAME || 'tneb_eems';
    const key = `Tables_in_${dbName}`;
    const tables = rows.map(r => r[key] || Object.values(r)[0]);
    return res.json({ tables });
  } catch (err) {
    console.error('getDbTables error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDbTableData(req, res) {
  const { tableName } = req.params;
  
  const allowedTables = ['employees', 'email_master', 'users', 'managers', 'admins', 'email_mapping_requests', 'notifications', 'audit_logs', 'retirement_archive'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ message: 'Invalid or restricted table name' });
  }

  try {
    const [columnsInfo] = await db.execute(`DESCRIBE ${tableName}`);
    const [rows] = await db.execute(`SELECT * FROM ${tableName}`);

    return res.json({
      tableName,
      columns: columnsInfo.map(c => ({
        name: c.Field,
        type: c.Type,
        nullable: c.Null === 'YES',
        key: c.Key,
        default: c.Default
      })),
      rows
    });
  } catch (err) {
    console.error('getDbTableData error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateDbTableRow(req, res) {
  const { tableName } = req.params;
  const { id, updates } = req.body;

  const allowedTables = ['employees', 'email_master', 'users', 'managers', 'admins', 'email_mapping_requests', 'notifications', 'audit_logs', 'retirement_archive'];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ message: 'Invalid or restricted table name' });
  }

  if (!id || !updates) {
    return res.status(400).json({ message: 'ID and updates object are required' });
  }

  if (updates.name_based_email && !updates.name_based_email.toLowerCase().endsWith('@tnebltd.org')) {
    return res.status(400).json({ message: 'Name Based email must end with @tnebltd.org' });
  }

  if (updates.designation_email && !updates.designation_email.toLowerCase().endsWith('@tnebnet.org')) {
    return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
  }

  if (tableName === 'users' || tableName === 'managers' || tableName === 'admins') {
    if (updates.email && !updates.email.toLowerCase().endsWith('@tnebnet.org')) {
      return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
    }
  }

  if (tableName === 'email_mapping_requests') {
    if (updates.email_id && !updates.email_id.toLowerCase().endsWith('@tnebnet.org')) {
      return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
    }
  }

  try {
    // Auto-hash password
    if (updates.password !== undefined && ['admins', 'managers', 'users', 'email_master', 'email_mapping_requests'].includes(tableName)) {
      const plainText = updates.password;
      if (plainText) {
        const isBcrypt = plainText.startsWith('$2a$') || plainText.startsWith('$2b$');
        if (!isBcrypt) {
          const hashed = await bcrypt.hash(plainText, SALT_ROUNDS);
          updates.password = hashed;
        }
      } else {
        updates.password = null;
      }
    }

    const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    if (keys.length === 0) {
      return res.status(400).json({ message: 'No columns to update' });
    }

    // Check if updated_at exists in this table
    const [colsInfo] = await db.execute(`SHOW COLUMNS FROM ${tableName} LIKE 'updated_at'`);
    let setClause = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => updates[k]);
    if (colsInfo.length > 0) {
      setClause += `, updated_at = CURRENT_TIMESTAMP`;
    }
    params.push(id);

    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    await db.execute(query, params);

    await auditService.logAction(
      req.user.unique_id,
      req.user.role,
      'DIRECT_DB_UPDATE',
      tableName,
      id.toString(),
      null,
      updates,
      req.ip
    );

    return res.json({ message: 'Row updated successfully' });
  } catch (err) {
    console.error('updateDbTableRow error:', err);
    return res.status(500).json({ message: 'Internal server error: ' + err.message });
  }
}

async function sendTestBirthdayEmail(req, res) {
  const { employeeId } = req.params;
  try {
    const [rows] = await db.execute(
      'SELECT name, name_based_email FROM employees WHERE employee_id = ?',
      [employeeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const emp = rows[0];
    if (!emp.name_based_email) {
      return res.status(400).json({ message: 'Employee has no registered Name Based Email address' });
    }

    const cyberTip = emailService.getRandomCyberTip();
    const success = await emailService.sendBirthdayGreetingEmail(emp.name_based_email, emp.name, cyberTip);

    if (!success) {
      return res.status(500).json({ message: 'Failed to send birthday email via SMTP' });
    }

    await auditService.logAction(
      req.user.unique_id,
      req.user.role,
      'SEND_BIRTHDAY_EMAIL_TEST',
      'employees',
      employeeId,
      null,
      { sent_to: emp.name_based_email },
      req.ip
    );

    return res.json({ message: `Birthday email sent successfully to ${emp.name} (${emp.name_based_email})` });
  } catch (err) {
    console.error('Error sending test birthday email:', err);
    return res.status(500).json({ message: 'Internal server error: ' + err.message });
  }
}

function extractEmailsFromFile(file) {
  const emails = [];
  const filename = file.originalname.toLowerCase();
  
  try {
    if (filename.endsWith('.csv')) {
      const csvText = file.buffer.toString('utf8');
      const lines = csvText.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const cells = line.split(',').map(c => c.replace(/["'\r]/g, '').trim());
        for (const cell of cells) {
          if (cell && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell)) {
            emails.push(cell.toLowerCase());
          }
        }
      }
    } else {
      // Parse as Excel (.xlsx, .xls, etc.)
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        for (const row of rows) {
          if (!Array.isArray(row)) continue;
          for (const cell of row) {
            if (cell !== undefined && cell !== null) {
              const strCell = cell.toString().trim();
              if (strCell && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strCell)) {
                emails.push(strCell.toLowerCase());
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing recipient file:', err);
  }
  
  return [...new Set(emails)];
}

async function sendCustomAwarenessEmail(req, res) {
  const { keyContent, description, scheduledDate, recipientType } = req.body;

  if (!keyContent || !description) {
    return res.status(400).json({ message: 'Key Content and Description are required' });
  }

  const file = req.files && req.files['file'] ? req.files['file'][0] : null;
  const csvFile = req.files && req.files['csvFile'] ? req.files['csvFile'][0] : null;

  try {
    let targetEmails = [];
    if (recipientType === 'SPECIFIC') {
      if (!csvFile) {
        return res.status(400).json({ message: 'Recipient file (CSV or Excel) is required when selecting Specific Employees.' });
      }
      targetEmails = extractEmailsFromFile(csvFile);
      if (targetEmails.length === 0) {
        return res.status(400).json({ message: 'No valid email addresses found in the uploaded CSV or Excel file.' });
      }
    }

    // If a scheduled date is provided, save the campaign in the database
    if (scheduledDate) {
      await db.execute(
        `INSERT INTO scheduled_campaigns (title, description, attachment_name, attachment_data, scheduled_date, recipient_type, target_emails, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          keyContent,
          description,
          file ? file.originalname : null,
          file ? file.buffer : null,
          scheduledDate,
          recipientType === 'SPECIFIC' ? 'SPECIFIC' : 'ALL',
          recipientType === 'SPECIFIC' ? JSON.stringify(targetEmails) : null,
          req.user.unique_id
        ]
      );

      await auditService.logAction(
        req.user.unique_id,
        req.user.role,
        'SCHEDULE_CUSTOM_AWARENESS_EMAIL',
        'scheduled_campaigns',
        scheduledDate,
        null,
        { title: keyContent, scheduled_date: scheduledDate, has_attachment: !!file, recipient_type: recipientType },
        req.ip
      );

      return res.json({ 
        message: `Awareness email campaign scheduled successfully for ${scheduledDate}.` 
      });
    }

    // Fetch all active employees for resolving names and emails
    let targetList = [];
    if (recipientType === 'SPECIFIC') {
      const [allEmployees] = await db.execute(
        `SELECT e.name, e.name_based_email, em.designation_email 
         FROM employees e 
         LEFT JOIN email_master em ON e.position_id = em.position_id 
         WHERE e.is_active = 1`
      );
      
      for (const email of targetEmails) {
        const emp = allEmployees.find(e => 
          (e.name_based_email && e.name_based_email.toLowerCase() === email.toLowerCase()) || 
          (e.designation_email && e.designation_email.toLowerCase() === email.toLowerCase())
        );
        targetList.push({
          email: email,
          name: emp ? emp.name : 'Employee'
        });
      }
    } else {
      const [employees] = await db.execute(
        'SELECT name, name_based_email FROM employees WHERE is_active = 1'
      );
      targetList = employees.map(emp => ({
        email: emp.name_based_email,
        name: emp.name
      }));
    }

    if (targetList.length === 0) {
      return res.status(404).json({ message: 'No recipients found to receive emails.' });
    }

    const fileAttachment = file ? {
      filename: file.originalname,
      content: file.buffer
    } : null;

    // Trigger sending process in the background, so that we don't block the HTTP request
    res.json({ 
      message: `Awareness email campaign started successfully. Emails are being dispatched to ${targetList.length} recipients.` 
    });

    // Run sending loop in the background
    (async () => {
      console.log(`📣 Starting custom awareness campaign: "${keyContent}". Sending to ${targetList.length} recipients...`);
      let sentCount = 0;
      for (const target of targetList) {
        if (target.email) {
          try {
            const success = await emailService.sendCustomAwarenessEmail(
              target.email,
              target.name,
              keyContent,
              description,
              fileAttachment
            );
            if (success) {
              sentCount++;
            }
            // Small pause of 100ms to avoid slamming SMTP server connection pools
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (mailErr) {
            console.error(`❌ Error sending custom awareness mail to ${target.email}:`, mailErr);
          }
        }
      }

      console.log(`📣 Custom awareness campaign finished. Dispatched ${sentCount}/${targetList.length} emails.`);

      // Log this action to audit_logs
      await auditService.logAction(
        req.user.unique_id,
        req.user.role,
        'SEND_CUSTOM_AWARENESS_EMAIL',
        'employees',
        'CUSTOM_CAMPAIGN',
        null,
        { title: keyContent, sent_count: sentCount, has_attachment: !!fileAttachment, recipient_type: recipientType },
        req.ip
      );
    })().catch(err => {
      console.error('Error in background custom awareness email processing:', err);
    });

  } catch (err) {
    console.error('Error starting custom awareness campaign:', err);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Internal server error: ' + err.message });
    }
  }
}

async function getCyberCampaignSettings(req, res) {
  try {
    const [startRows] = await db.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'cyber_campaign_start_date'");
    const [endRows] = await db.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'cyber_campaign_end_date'");
    
    const startDate = startRows.length > 0 ? startRows[0].setting_value : '2026-06-16';
    const endDate = endRows.length > 0 ? endRows[0].setting_value : '2026-06-22';
    
    return res.json({ startDate, endDate });
  } catch (err) {
    console.error('Error fetching cyber campaign settings:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateCyberCampaignSettings(req, res) {
  const { startDate, endDate } = req.body;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Both start date and end date are required' });
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: 'Invalid start date or end date format' });
  }
  
  if (start > end) {
    return res.status(400).json({ message: 'Start date must be before or equal to end date' });
  }
  
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    await conn.execute("INSERT INTO system_settings (setting_key, setting_value) VALUES ('cyber_campaign_start_date', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [startDate, startDate]);
    await conn.execute("INSERT INTO system_settings (setting_key, setting_value) VALUES ('cyber_campaign_end_date', ?) ON DUPLICATE KEY UPDATE setting_value = ?", [endDate, endDate]);
    
    await conn.commit();
    
    await auditService.logAction(
      req.user.unique_id || req.user.admin_unique_id,
      req.user.role,
      'UPDATE_CYBER_CAMPAIGN_SETTINGS',
      'system_settings',
      'cyber_campaign',
      null,
      { startDate, endDate },
      req.ip
    );
    
    socketService.broadcast('dashboard:updated', {});
    
    return res.json({ message: 'Cybersecurity Campaign settings updated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating cyber campaign settings:', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
}

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deactivateAdmin,
  getDbTables,
  getDbTableData,
  updateDbTableRow,
  sendTestBirthdayEmail,
  sendCustomAwarenessEmail,
  getCyberCampaignSettings,
  updateCyberCampaignSettings
};
