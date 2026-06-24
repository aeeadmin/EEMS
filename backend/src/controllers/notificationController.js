const db = require('../config/database');

async function getNotifications(req, res) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.unique_id]
    );

    const [unreadCountRows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.unique_id]
    );

    return res.json({
      notifications: rows,
      unreadCount: unreadCountRows[0].count
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function markAsRead(req, res) {
  const { id } = req.params;
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.unique_id]
    );
    return res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function markAllAsRead(req, res) {
  try {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.unique_id]
    );
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
