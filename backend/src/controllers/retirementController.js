const db = require('../config/database');

async function getUpcomingRetirements(req, res) {
  try {
    const search = req.query.search || '';
    let query = `
      SELECT e.*, em.designation_email, m.manager_unique_id, a.admin_unique_id, u.user_id,
      DATE_ADD(e.date_of_birth, INTERVAL 58 YEAR) as retirement_date,
      DATEDIFF(DATE_ADD(e.date_of_birth, INTERVAL 58 YEAR), CURDATE()) as days_remaining
      FROM employees e
      LEFT JOIN email_master em ON e.position_id = em.position_id
      LEFT JOIN managers m ON e.employee_id = m.employee_id
      LEFT JOIN admins a ON e.employee_id = a.employee_id
      LEFT JOIN users u ON e.employee_id = u.employee_id
      WHERE e.is_active = 1
    `;
    const params = [];
    if (search) {
      query += ` AND (
        e.name LIKE ? 
        OR e.employee_id LIKE ? 
        OR e.position_id LIKE ? 
        OR e.district LIKE ? 
        OR m.manager_unique_id LIKE ? 
        OR a.admin_unique_id LIKE ?
        OR u.user_id LIKE ?
      )`;
      const searchPat = `%${search}%`;
      params.push(searchPat, searchPat, searchPat, searchPat, searchPat, searchPat, searchPat);
    }
    query += ` HAVING days_remaining >= 0 AND days_remaining <= 180 ORDER BY days_remaining ASC`;

    const [rows] = await db.execute(query, params);
    return res.json({ retirements: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getRetirementArchive(req, res) {
  try {
    const search = req.query.search || '';
    let query = 'SELECT * FROM retirement_archive';
    const params = [];

    if (search) {
      query += ' WHERE employee_id LIKE ? OR position_id LIKE ?';
      const searchPat = `%${search}%`;
      params.push(searchPat, searchPat);
    }

    query += ' ORDER BY retired_date DESC';

    const [rows] = await db.execute(query, params);
    return res.json({ archive: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getUpcomingRetirements,
  getRetirementArchive
};
