const db = require('../config/database');

async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = 'SELECT * FROM audit_logs';
    const params = [];

    if (search) {
      query += ' WHERE user_id LIKE ? OR record_id LIKE ? OR action LIKE ? OR table_name LIKE ?';
      const searchPat = `%${search}%`;
      params.push(searchPat, searchPat, searchPat, searchPat);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs';
    const countParams = [];

    if (search) {
      countQuery += ' WHERE user_id LIKE ? OR record_id LIKE ? OR action LIKE ? OR table_name LIKE ?';
      const searchPat = `%${search}%`;
      countParams.push(searchPat, searchPat, searchPat, searchPat);
    }

    const [countRows] = await db.execute(countQuery, countParams);

    return res.json({
      logs: rows,
      total: countRows[0].total,
      page,
      pages: Math.ceil(countRows[0].total / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getAuditLogs
};
