const db = require('../config/database');
const socketService = require('./socketService');

async function createNotification(userId, title, message, type = 'INFO') {
  try {
    const [result] = await db.execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [userId, title, message, type]
    );
    
    const notif = {
      id: result.insertId,
      user_id: userId,
      title,
      message,
      type,
      is_read: 0,
      created_at: new Date()
    };
    
    // Emit real-time notification
    socketService.emitToUser(userId, 'notification:new', notif);
    return notif;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

async function createNotificationForRole(role, title, message, type = 'INFO') {
  try {
    // Find all users with this role
    const [users] = await db.execute('SELECT user_id FROM users WHERE role = ?', [role]);
    const notifs = [];
    
    for (const u of users) {
      const notif = await createNotification(u.user_id, title, message, type);
      if (notif) notifs.push(notif);
    }
    
    // Also emit to the room of that role
    socketService.emitToRole(role, 'notification:new_role', { title, message, type });
    return notifs;
  } catch (err) {
    console.error('Failed to create notification for role:', err);
  }
}

module.exports = {
  createNotification,
  createNotificationForRole
};
