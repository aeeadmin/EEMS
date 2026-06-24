const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auditService = require('../services/auditService');
const { JWT_SECRET } = require('../middleware/auth');
const emailService = require('../services/emailService');

const otpStore = new Map();

async function loginAdmin(req, res) {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ message: 'User ID and Password are required' });
  }

  const cleanUserId = userId.trim();

  try {
    // Check users table first (username, user_id, email, or employee_id) where role = 'ADMIN'
    const [userRows] = await db.execute(
      'SELECT * FROM users WHERE (user_id = ? OR username = ? OR email = ? OR employee_id = ?) AND role = "ADMIN"',
      [cleanUserId, cleanUserId, cleanUserId, cleanUserId]
    );

    if (userRows.length === 0) {
      // Failed login audit
      await auditService.logAction(userId, 'ADMIN', 'FAILED_LOGIN', 'users', null, null, null, req.ip);
      return res.status(403).json({ message: 'Invalid Admin Credentials' });
    }

    const user = userRows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await auditService.logAction(userId, 'ADMIN', 'FAILED_LOGIN', 'users', null, null, null, req.ip);
      return res.status(403).json({ message: 'Invalid Admin Credentials' });
    }

    // Check admins table to ensure they are active and get details
    const [adminRows] = await db.execute(
      'SELECT * FROM admins WHERE employee_id = ? AND is_active = 1',
      [user.employee_id]
    );

    if (adminRows.length === 0) {
      await auditService.logAction(userId, 'ADMIN', 'FAILED_LOGIN', 'admins', null, null, null, req.ip);
      return res.status(403).json({ message: 'Invalid Admin Credentials' });
    }

    const admin = adminRows[0];

    // Concurrency Check removed to allow token rotation (new logins invalidate old sessions instead of locking out)

    // Generate JWT
    const payload = {
      id: admin.id,
      unique_id: admin.admin_unique_id,
      employee_id: admin.employee_id,
      role: 'ADMIN',
      district: admin.district,
      name: user.name || 'Admin',
      is_view_admin: admin.is_view_admin ? 1 : 0
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // Store active session in database
    await db.execute(
      'UPDATE users SET session_token = ?, session_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
      [token, user.id]
    );

    // Update login status in employees table
    await db.execute(
      'UPDATE employees SET login = 1 WHERE employee_id = ?',
      [admin.employee_id]
    );

    // Audit log
    await auditService.logAction(admin.admin_unique_id, 'ADMIN', 'LOGIN', 'users', admin.admin_unique_id, null, null, req.ip);

    // Send login notification email
    if (admin.email) {
      emailService.sendLoginNotificationEmail(admin.email, 'Administrator ' + (user.name || 'Admin')).catch(err => {
        console.error('Failed to send login notification email:', err);
      });
    }

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin.id,
        unique_id: admin.admin_unique_id,
        employee_id: admin.employee_id,
        role: 'ADMIN',
        district: admin.district,
        name: user.name || 'Admin',
        email: admin.email,
        is_view_admin: admin.is_view_admin ? 1 : 0
      }
    });

  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function loginManager(req, res) {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ message: 'User ID and Password are required' });
  }

  const cleanUserId = userId.trim();

  try {
    // Check users table first (username, user_id, email, or employee_id) where role = 'MANAGER'
    const [userRows] = await db.execute(
      'SELECT * FROM users WHERE (user_id = ? OR username = ? OR email = ? OR employee_id = ?) AND role = "MANAGER"',
      [cleanUserId, cleanUserId, cleanUserId, cleanUserId]
    );

    if (userRows.length === 0) {
      await auditService.logAction(userId, 'MANAGER', 'FAILED_LOGIN', 'users', null, null, null, req.ip);
      return res.status(403).json({ message: 'Invalid Manager Credentials' });
    }

    const user = userRows[0];

    // Check managers table to ensure they are active and get details
    const [mgrRows] = await db.execute(
      'SELECT * FROM managers WHERE employee_id = ? AND is_active = 1',
      [user.employee_id]
    );

    if (mgrRows.length === 0) {
      await auditService.logAction(userId, 'MANAGER', 'FAILED_LOGIN', 'managers', null, null, null, req.ip);
      return res.status(403).json({ message: 'Invalid Manager Credentials' });
    }

    const manager = mgrRows[0];

    // Check if account is frozen
    if (manager.freeze_until && new Date(manager.freeze_until) > new Date()) {
      const remainingMin = Math.ceil((new Date(manager.freeze_until) - new Date()) / 1000 / 60);
      return res.status(403).json({
        message: `Account is temporarily frozen due to 5 failed login attempts. Please try again after ${remainingMin} minutes.`
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // Password wrong - increment failed attempts
      const newAttempts = (manager.failed_login_attempts || 0) + 1;
      let freezeUntil = null;
      let responseMessage = 'Invalid Manager Credentials';

      if (newAttempts % 5 === 0) {
        freezeUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        responseMessage = 'Account frozen for 15 minutes due to 5 failed login attempts.';
      }

      await db.execute(
        'UPDATE managers SET failed_login_attempts = ?, freeze_until = ? WHERE employee_id = ?',
        [newAttempts, freezeUntil, manager.employee_id]
      );

      await auditService.logAction(userId, 'MANAGER', 'FAILED_LOGIN', 'users', null, null, null, req.ip);
      return res.status(403).json({ message: responseMessage });
    }

    // Concurrency Check removed to allow token rotation (new logins invalidate old sessions instead of locking out)

    // Login successful - Reset failed attempts & freeze_until
    await db.execute(
      'UPDATE managers SET failed_login_attempts = 0, freeze_until = NULL WHERE employee_id = ?',
      [manager.employee_id]
    );

    const payload = {
      id: manager.id,
      unique_id: manager.manager_unique_id,
      employee_id: manager.employee_id,
      role: 'MANAGER',
      district: manager.district,
      name: user.name || 'Manager'
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // Store active session in database
    await db.execute(
      'UPDATE users SET session_token = ?, session_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
      [token, user.id]
    );

    // Update login status in employees table
    await db.execute(
      'UPDATE employees SET login = 1 WHERE employee_id = ?',
      [manager.employee_id]
    );

    await auditService.logAction(manager.manager_unique_id, 'MANAGER', 'LOGIN', 'users', manager.manager_unique_id, null, null, req.ip);

    // Send login notification email
    if (manager.email) {
      emailService.sendLoginNotificationEmail(manager.email, 'Manager ' + (user.name || 'Manager')).catch(err => {
        console.error('Failed to send login notification email:', err);
      });
    }

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: manager.id,
        unique_id: manager.manager_unique_id,
        employee_id: manager.employee_id,
        role: 'MANAGER',
        district: manager.district,
        name: user.name || 'Manager',
        email: manager.email
      }
    });

  } catch (err) {
    console.error('Manager login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    if (req.user) {
      if (req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
        await db.execute(
          'UPDATE users SET session_token = NULL, session_expires_at = NULL WHERE employee_id = ? AND role = ?',
          [req.user.employee_id, req.user.role]
        );
        // Reset login column to 0 in employees table
        await db.execute(
          'UPDATE employees SET login = 0 WHERE employee_id = ?',
          [req.user.employee_id]
        );
      } else if (req.user.role === 'USER') {
        await db.execute(
          'UPDATE email_master SET session_token = NULL, session_expires_at = NULL WHERE employee_id = ?',
          [req.user.employee_id]
        );
      }

      await auditService.logAction(req.user.unique_id, req.user.role, 'LOGOUT', 'users', req.user.unique_id, null, null, req.ip);
    }
    return res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getProfile(req, res) {
  try {
    return res.json({ user: req.user });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function loginUser(req, res) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  const cleanUserId = userId.trim();

  try {
    // Now query email_master for the employee profile
    const query = `
      SELECT em.*, e.name, e.date_of_birth, e.name_based_email, e.phone_number, e.designation
      FROM email_master em
      LEFT JOIN employees e ON em.employee_id = e.employee_id
      WHERE (em.employee_id = ? OR em.position_id = ? OR em.designation_email = ?)
      AND em.is_active = 1
    `;
    const [rows] = await db.execute(query, [cleanUserId, cleanUserId, cleanUserId]);

    if (rows.length === 0) {
      await auditService.logAction(userId, 'USER', 'FAILED_LOOKUP', 'email_master', null, null, null, req.ip);
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    const empEmailRecord = rows[0];

    const payload = {
      id: empEmailRecord.id,
      unique_id: empEmailRecord.employee_id, // Employee ID acts as unique identifier
      employee_id: empEmailRecord.employee_id,
      position_id: empEmailRecord.position_id,
      role: 'USER',
      district: empEmailRecord.district,
      name: empEmailRecord.name || 'User',
      designation: empEmailRecord.designation || '',
      date_of_birth: empEmailRecord.date_of_birth,
      name_based_email: empEmailRecord.name_based_email,
      designation_email: empEmailRecord.designation_email,
      phone_number: empEmailRecord.phone_number
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // Store active session in email_master
    await db.execute(
      'UPDATE email_master SET session_token = ?, session_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
      [token, empEmailRecord.id]
    );

    await auditService.logAction(empEmailRecord.employee_id, 'USER', 'LOGIN', 'email_master', empEmailRecord.employee_id, null, null, req.ip);

    return res.json({
      message: 'Profile details retrieved successfully',
      token,
      user: payload
    });

  } catch (err) {
    console.error('User profile check error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function forgotPasswordRequest(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Search for user in users, admins, or managers table
    let user = null;
    
    // Search in users table first
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (users.length > 0) {
      user = users[0];
    } else {
      // Search in admins
      const [admins] = await db.execute('SELECT * FROM admins WHERE email = ?', [cleanEmail]);
      if (admins.length > 0) {
        const [u] = await db.execute('SELECT * FROM users WHERE employee_id = ? AND role = "ADMIN"', [admins[0].employee_id]);
        if (u.length > 0) user = u[0];
      } else {
        // Search in managers
        const [managers] = await db.execute('SELECT * FROM managers WHERE email = ?', [cleanEmail]);
        if (managers.length > 0) {
          const [u] = await db.execute('SELECT * FROM users WHERE employee_id = ? AND role = "MANAGER"', [managers[0].employee_id]);
          if (u.length > 0) user = u[0];
        }
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'Email address not found' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in otpStore
    otpStore.set(cleanEmail, { otp, expiresAt, verified: false });

    // Output to console for quick developer access/fallback
    console.log(`[OTP FORGOT PASSWORD] OTP for email ${cleanEmail} is ${otp}`);

    // Try sending email
    const emailSent = await emailService.sendOtpEmail(cleanEmail, otp);

    return res.json({ 
      message: emailSent 
        ? 'OTP sent successfully to your email.' 
        : 'OTP generated. (Fallback: Check backend console logs for OTP as Google credentials might not be configured.)',
      email: cleanEmail
    });

  } catch (err) {
    console.error('Forgot password request error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function forgotPasswordVerifyOtp(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  const record = otpStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ message: 'No OTP requested for this email' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
  }

  // Mark as verified
  otpStore.set(cleanEmail, { ...record, verified: true });

  return res.json({ message: 'OTP verified successfully.' });
}

async function forgotPasswordReset(req, res) {
  const { email, newPassword, confirmPassword } = req.body;

  if (!email || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);

  if (!record || !record.verified) {
    return res.status(400).json({ message: 'Email OTP has not been verified' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Find the user details in users table
    let user = null;
    
    // Search in users table first
    const [users] = await conn.execute('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (users.length > 0) {
      user = users[0];
    } else {
      // Search in admins
      const [admins] = await conn.execute('SELECT * FROM admins WHERE email = ?', [cleanEmail]);
      if (admins.length > 0) {
        const [u] = await conn.execute('SELECT * FROM users WHERE employee_id = ? AND role = "ADMIN"', [admins[0].employee_id]);
        if (u.length > 0) user = u[0];
      } else {
        // Search in managers
        const [managers] = await conn.execute('SELECT * FROM managers WHERE email = ?', [cleanEmail]);
        if (managers.length > 0) {
          const [u] = await conn.execute('SELECT * FROM users WHERE employee_id = ? AND role = "MANAGER"', [managers[0].employee_id]);
          if (u.length > 0) user = u[0];
        }
      }
    }

    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: 'User account not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update in users table
    await conn.execute(
      'UPDATE users SET password = ? WHERE employee_id = ? AND role = ?',
      [hashedPassword, user.employee_id, user.role]
    );

    // Update in role specific tables
    if (user.role === 'ADMIN') {
      await conn.execute(
        'UPDATE admins SET password = ? WHERE employee_id = ?',
        [hashedPassword, user.employee_id]
      );
    } else if (user.role === 'MANAGER') {
      await conn.execute(
        'UPDATE managers SET password = ? WHERE employee_id = ?',
        [hashedPassword, user.employee_id]
      );
    }

    await conn.commit();

    // Clean up OTP store
    otpStore.delete(cleanEmail);

    // Log audit action
    await auditService.logAction(user.user_id || user.username, user.role, 'RESET_PASSWORD_FORGOT', 'users', user.employee_id, null, null, req.ip);

    return res.json({ message: 'Password has been updated successfully.' });

  } catch (err) {
    await conn.rollback();
    console.error('Error resetting password:', err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
}

module.exports = {
  loginAdmin,
  loginManager,
  loginUser,
  logout,
  getProfile,
  forgotPasswordRequest,
  forgotPasswordVerifyOtp,
  forgotPasswordReset
};
