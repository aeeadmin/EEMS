const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'tneb_eems_super_secret_jwt_key_2024';

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, unique_id, role, district, name, employee_id

    // Check active session in DB to enforce single session and 30-min inactivity limit
    if (decoded.role === 'ADMIN' || decoded.role === 'MANAGER') {
      const [rows] = await db.execute(
        'SELECT session_token, (session_expires_at < NOW()) AS is_expired FROM users WHERE employee_id = ? AND role = ?',
        [decoded.employee_id, decoded.role]
      );
      if (rows.length === 0 || rows[0].session_token !== token) {
        return res.status(401).json({ message: 'Session expired or logged in on another system. Please log in again.' });
      }

      if (rows[0].is_expired === 1 || rows[0].is_expired === true) {
        // Clear stale session
        await db.execute(
          'UPDATE users SET session_token = NULL, session_expires_at = NULL WHERE employee_id = ? AND role = ?',
          [decoded.employee_id, decoded.role]
        );
        await db.execute(
          'UPDATE employees SET login = 0 WHERE employee_id = ?',
          [decoded.employee_id]
        );
        return res.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
      }

      // Slide session expiration by 30 minutes
      await db.execute(
        'UPDATE users SET session_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE employee_id = ? AND role = ?',
        [decoded.employee_id, decoded.role]
      );

    } else if (decoded.role === 'USER') {
      const [rows] = await db.execute(
        'SELECT session_token, (session_expires_at < NOW()) AS is_expired FROM email_master WHERE employee_id = ?',
        [decoded.employee_id]
      );
      if (rows.length === 0 || rows[0].session_token !== token) {
        return res.status(401).json({ message: 'Session expired or logged in on another system. Please log in again.' });
      }

      if (rows[0].is_expired === 1 || rows[0].is_expired === true) {
        // Clear stale session
        await db.execute(
          'UPDATE email_master SET session_token = NULL, session_expires_at = NULL WHERE employee_id = ?',
          [decoded.employee_id]
        );
        return res.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
      }

      // Slide session expiration by 30 minutes
      await db.execute(
        'UPDATE email_master SET session_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE employee_id = ?',
        [decoded.employee_id]
      );
    }

    next();
  } catch (err) {
    console.error('JWT Verification error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function verifyTokenForLogout(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Verification error during logout:', err);
    next();
  }
}

module.exports = {
  verifyToken,
  verifyTokenForLogout,
  JWT_SECRET
};
