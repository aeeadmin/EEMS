const db = require('../config/database');

async function logAction(userId, role, action, tableName, recordId, oldValue, newValue, ipAddress) {
  try {
    const oldValStr = oldValue ? JSON.stringify(oldValue) : null;
    const newValStr = newValue ? JSON.stringify(newValue) : null;
    const loginVal = action === 'LOGIN' ? 1 : 0;
    
    await db.execute(
      `INSERT INTO audit_logs (user_id, role, action, login, table_name, record_id, old_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, role, action, loginVal, tableName, recordId, oldValStr, newValStr, ipAddress || '127.0.0.1']
    );
    console.log(`[Audit Log] ${role} ${userId} executed ${action} (login=${loginVal}) on ${tableName}`);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = {
  logAction
};
