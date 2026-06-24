'use strict';
const pool = require('../config/database');

/**
 * GET /api/email-mapping
 * List all email_master records with pagination, search, filter
 */
async function getAllEmailMappings(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const district = req.query.district || '';
    console.log(`[EMAIL_MAPPING] getAllEmailMappings page=${page}`);

    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(em.employee_id LIKE ? OR em.position_id LIKE ? OR em.designation_email LIKE ? OR e.name LIKE ? OR u.user_id LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (district) { whereConditions.push('em.district = ?'); queryParams.push(district); }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM email_master em 
       LEFT JOIN employees e ON em.employee_id = e.employee_id 
       LEFT JOIN users u ON em.employee_id = u.employee_id
       ${whereClause}`,
      queryParams
    );

    const [rows] = await pool.execute(
      `SELECT em.id, em.employee_id, em.position_id, em.designation_email, em.district, em.is_active,
              e.name, e.phone_number, e.name_based_email, u.user_id
       FROM email_master em
       LEFT JOIN employees e ON em.employee_id = e.employee_id
       LEFT JOIN users u ON em.employee_id = u.employee_id
       ${whereClause}
       ORDER BY em.id DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: { page, limit, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / limit) }
    });
  } catch (err) {
    console.error('[EMAIL_MAPPING] getAllEmailMappings error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * GET /api/email-mapping/:employee_id
 */
async function getEmailMappingByEmployee(req, res) {
  try {
    const { employee_id } = req.params;
    const [rows] = await pool.execute(
      `SELECT em.*, e.name, e.date_of_birth, e.district as emp_district
       FROM email_master em
       LEFT JOIN employees e ON em.employee_id = e.employee_id
       WHERE em.employee_id = ?`,
      [employee_id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Email mapping not found' });
    const record = rows[0];
    delete record.password;
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    console.error('[EMAIL_MAPPING] getEmailMappingByEmployee error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PUT /api/email-mapping/:employee_id
 * Update designation_email or district (admin only)
 */
async function updateEmailMapping(req, res) {
  try {
    const { employee_id } = req.params;
    const { designation_email, district, password } = req.body;
    console.log(`[EMAIL_MAPPING] updateEmailMapping for: ${employee_id}`);

    if (designation_email && !designation_email.toLowerCase().endsWith('@tnebnet.org')) {
      return res.status(400).json({ success: false, message: 'Designation email must end with @tnebnet.org' });
    }

    const [existing] = await pool.execute('SELECT * FROM email_master WHERE employee_id=?', [employee_id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Email mapping not found' });

    const updates = {
      designation_email: designation_email || existing[0].designation_email,
      district: district || existing[0].district,
      password: password || existing[0].password
    };

    await pool.execute(
      'UPDATE email_master SET designation_email=?, district=?, password=? WHERE employee_id=?',
      [updates.designation_email, updates.district, updates.password, employee_id]
    );

    return res.status(200).json({ success: true, message: 'Email mapping updated successfully' });
  } catch (err) {
    console.error('[EMAIL_MAPPING] updateEmailMapping error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * PATCH /api/email-mapping/:employee_id/transfer
 * Transfer position: assign new position_id to employee
 */
async function transferPosition(req, res) {
  try {
    const { employee_id } = req.params;
    const { new_position_id, new_district } = req.body;
    console.log(`[EMAIL_MAPPING] transferPosition for: ${employee_id} -> ${new_position_id}`);

    if (!new_position_id) return res.status(400).json({ success: false, message: 'new_position_id is required' });

    const [existing] = await pool.execute('SELECT * FROM email_master WHERE employee_id=?', [employee_id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Email mapping not found' });

    const newEmail = `${new_position_id.toLowerCase()}@tnebnet.org`;

    await pool.execute(
      'UPDATE email_master SET position_id=?, designation_email=?, district=IFNULL(?, district) WHERE employee_id=?',
      [new_position_id, newEmail, new_district || null, employee_id]
    );

    await pool.execute(
      'UPDATE employees SET position_id=?, district=IFNULL(?, district) WHERE employee_id=?',
      [new_position_id, new_district || null, employee_id]
    );

    return res.status(200).json({ success: true, message: 'Position transferred successfully', data: { new_position_id, new_email: newEmail } });
  } catch (err) {
    console.error('[EMAIL_MAPPING] transferPosition error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = { getAllEmailMappings, getEmailMappingByEmployee, updateEmailMapping, transferPosition };
