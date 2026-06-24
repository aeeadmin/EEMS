const db = require('../config/database');
const auditService = require('../services/auditService');
const notificationService = require('../services/notificationService');
const socketService = require('../services/socketService');

async function createRequest(req, res) {
  const { employee_id, position_id, request_type, subject, comments, field_name, current_value, new_value } = req.body;

  try {
    // For inline edit requests
    let finalComments = comments;
    if (request_type === 'EDIT_REQUEST') {
      finalComments = JSON.stringify({
        field: field_name,
        current: current_value,
        proposed: new_value
      });
    }

    const [result] = await db.execute(
      `INSERT INTO email_mapping_requests 
       (employee_id, position_id, email_id, district, status, request_type, subject, comments, requested_by)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
      [
        employee_id,
        position_id,
        req.body.designation_email || '',
        req.user.district,
        request_type || 'EDIT_REQUEST',
        subject || 'Edit Request',
        finalComments,
        req.user.unique_id
      ]
    );

    const requestId = result.insertId;

    // Notify all admins
    await notificationService.createNotificationForRole(
      'ADMIN',
      'New Request Submitted',
      `Manager ${req.user.name} submitted a ${request_type} for Employee ${employee_id} (Request #${requestId}).`,
      'INFO'
    );

    // Notify Manager
    await notificationService.createNotification(
      req.user.unique_id,
      'Request Submitted',
      `Your request for Employee ${employee_id} has been submitted (Request #${requestId}).`,
      'INFO'
    );

    socketService.broadcast('dashboard:updated', {});

    return res.status(201).json({ message: 'Request submitted successfully', requestId: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getAllRequests(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const district = req.query.district || '';
    const search = req.query.search || '';

    let query = `
      SELECT r.*, e.name as employee_name, e.name_based_email, e.phone_number
      FROM email_mapping_requests r
      LEFT JOIN employees e ON r.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    if (district) {
      query += ` AND r.district = ?`;
      params.push(district);
    }

    if (search) {
      query += ` AND (
        r.employee_id LIKE ? 
        OR r.position_id LIKE ? 
        OR r.subject LIKE ? 
        OR r.comments LIKE ? 
        OR r.requested_by LIKE ?
        OR r.approved_by LIKE ?
        OR e.name LIKE ?
      )`;
      const searchPat = `%${search}%`;
      params.push(searchPat, searchPat, searchPat, searchPat, searchPat, searchPat, searchPat);
    }

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM email_mapping_requests r 
      LEFT JOIN employees e ON r.employee_id = e.employee_id
      WHERE 1=1
    `;
    const countParams = [];
    if (status) {
      countQuery += ` AND r.status = ?`;
      countParams.push(status);
    }
    if (district) {
      countQuery += ` AND r.district = ?`;
      countParams.push(district);
    }
    if (search) {
      countQuery += ` AND (
        r.employee_id LIKE ? 
        OR r.position_id LIKE ? 
        OR r.subject LIKE ? 
        OR r.comments LIKE ? 
        OR r.requested_by LIKE ?
        OR r.approved_by LIKE ?
        OR e.name LIKE ?
      )`;
      const searchPat = `%${search}%`;
      countParams.push(searchPat, searchPat, searchPat, searchPat, searchPat, searchPat, searchPat);
    }

    const [countRows] = await db.execute(countQuery, countParams);
    const total = countRows[0].total;

    query += ` ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    return res.json({
      requests: rows,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getMyRequests(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT r.*, e.name as employee_name, e.name_based_email, e.phone_number, em.designation_email
      FROM email_mapping_requests r
      LEFT JOIN employees e ON r.employee_id = e.employee_id
      LEFT JOIN email_master em ON e.position_id = em.position_id
      WHERE r.requested_by = ?
    `;
    const params = [req.user.unique_id];

    if (search) {
      query += ` AND (
        r.employee_id LIKE ? 
        OR r.position_id LIKE ? 
        OR r.subject LIKE ? 
        OR r.comments LIKE ? 
        OR r.approved_by LIKE ?
        OR e.name LIKE ?
      )`;
      const searchPat = `%${search}%`;
      params.push(searchPat, searchPat, searchPat, searchPat, searchPat, searchPat);
    }

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM email_mapping_requests r
      LEFT JOIN employees e ON r.employee_id = e.employee_id
      WHERE r.requested_by = ?
    `;
    const countParams = [req.user.unique_id];

    if (search) {
      countQuery += ` AND (
        r.employee_id LIKE ? 
        OR r.position_id LIKE ? 
        OR r.subject LIKE ? 
        OR r.comments LIKE ? 
        OR r.approved_by LIKE ?
        OR e.name LIKE ?
      )`;
      const searchPat = `%${search}%`;
      countParams.push(searchPat, searchPat, searchPat, searchPat, searchPat, searchPat);
    }

    const [countRows] = await db.execute(countQuery, countParams);
    const total = countRows[0].total;

    query += ` ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(query, params);

    return res.json({
      requests: rows,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function approveRequest(req, res) {
  const { id } = req.params;
  const { editableColumns, comments } = req.body; // Array of columns: ['phone_number', 'name_based_email', 'designation_email']

  try {
    const [rows] = await db.execute('SELECT * FROM email_mapping_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = rows[0];

    // Status shifts to APPROVED. Mark columns as editable by Manager.
    await db.execute(
      `UPDATE email_mapping_requests 
       SET status = 'APPROVED', editable_columns = ?, approved_by = ?, comments = ?
       WHERE id = ?`,
      [JSON.stringify(editableColumns || []), req.user.unique_id, comments || 'Approved', id]
    );

    // Notify manager
    await notificationService.createNotification(
      request.requested_by,
      'Request Approved',
      `Your request for Employee ${request.employee_id} has been approved (Request #${id}). Columns editable: ${(editableColumns || []).join(', ')}`,
      'SUCCESS'
    );

    // Update existing notifications to stop the ticking clock
    await db.execute(
      `UPDATE notifications 
       SET type = 'SUCCESS', 
           title = 'Request Approved', 
           message = REPLACE(REPLACE(REPLACE(message, 'submitted', 'approved'), 'pending approval', 'approved'), 'pending', 'approved')
       WHERE message LIKE ?`,
      [`%Request #${id}%`]
    );

    await auditService.logAction(req.user.unique_id, req.user.role, 'APPROVE_REQUEST', 'email_mapping_requests', id, request, { status: 'APPROVED', editableColumns }, req.ip);

    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Request approved and permission granted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function rejectRequest(req, res) {
  const { id } = req.params;
  const { comments } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM email_mapping_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = rows[0];

    await db.execute(
      `UPDATE email_mapping_requests 
       SET status = 'REJECTED', approved_by = ?, comments = ?
       WHERE id = ?`,
      [req.user.unique_id, comments || 'Rejected', id]
    );

    // Notify manager
    await notificationService.createNotification(
      request.requested_by,
      'Request Rejected',
      `Your request for Employee ${request.employee_id} was rejected (Request #${id}). Reason: ${comments || 'No comment'}`,
      'ERROR'
    );

    // Update existing notifications to stop the ticking clock
    await db.execute(
      `UPDATE notifications 
       SET type = 'ERROR', 
           title = 'Request Rejected', 
           message = REPLACE(REPLACE(REPLACE(message, 'submitted', 'rejected'), 'pending approval', 'rejected'), 'pending', 'rejected')
       WHERE message LIKE ?`,
      [`%Request #${id}%`]
    );

    await auditService.logAction(req.user.unique_id, req.user.role, 'REJECTED_REQUEST', 'email_mapping_requests', id, request, { status: 'REJECTED', comments }, req.ip);

    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Request rejected successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Manager updates the permitted fields
async function submitManagerEdits(req, res) {
  const { id } = req.params;
  const { edits } = req.body; // e.g. { phone_number: '...', name_based_email: '...' }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT * FROM email_mapping_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = rows[0];
    if (request.status !== 'APPROVED') {
      await conn.rollback();
      return res.status(400).json({ message: 'Request is not approved or has already been completed' });
    }

    let permitted = request.editable_columns;
    if (typeof permitted === 'string') {
      try {
        permitted = JSON.parse(permitted);
      } catch (e) {
        permitted = [];
      }
    }
    if (!Array.isArray(permitted)) {
      permitted = [];
    }
    
    // Validate that edits only contain permitted fields
    for (const key of Object.keys(edits)) {
      if (!permitted.includes(key)) {
        await conn.rollback();
        return res.status(400).json({ message: `Field ${key} is not authorized for editing` });
      }
    }

    if (edits.designation_email && !edits.designation_email.toLowerCase().endsWith('@tnebnet.org')) {
      await conn.rollback();
      return res.status(400).json({ message: 'Designation email must end with @tnebnet.org' });
    }
    if (edits.name_based_email && !edits.name_based_email.toLowerCase().endsWith('@tnebltd.org')) {
      await conn.rollback();
      return res.status(400).json({ message: 'Name Based email must end with @tnebltd.org' });
    }

    // Now, let's update the employee/email_master database directly (or queue for final approval)
    // The prompt says: "After manager edits: Permission revoked automatically. Final Admin Approval required"
    // Since "Final Admin Approval required", we store the proposed changes back in the request table
    // (e.g. update status to 'PENDING' again, or a new sub-status 'PENDING_FINAL', clear editable_columns so they can't edit again)
    
    await conn.execute(
      `UPDATE email_mapping_requests 
       SET comments = ?, editable_columns = NULL, status = 'PENDING'
       WHERE id = ?`,
      [JSON.stringify({ edits, originalComments: request.comments }), id]
    );

    await conn.commit();

    // Notify Admins
    await notificationService.createNotificationForRole(
      'ADMIN',
      'Edits Submitted for Final Approval',
      `Manager ${req.user.name} completed edits for Request #${id}. Final Admin Approval is required.`,
      'WARNING'
    );

    // Notify Manager
    await notificationService.createNotification(
      request.requested_by,
      'Edits Submitted for Final Approval',
      `Your edits for Employee ${request.employee_id} have been submitted for final admin approval (Request #${id}).`,
      'WARNING'
    );

    await auditService.logAction(req.user.unique_id, req.user.role, 'SUBMIT_EDITS', 'email_mapping_requests', id, request, { edits }, req.ip);

    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Edits submitted successfully, awaiting final admin approval' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
}

// Admin final approval to apply the changes
async function finalAdminApproval(req, res) {
  const { id } = req.params;
  const { approve } = req.body; // boolean

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute('SELECT * FROM email_mapping_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = rows[0];
    
    let commentsObj;
    try {
      commentsObj = JSON.parse(request.comments);
    } catch(e) {
      await conn.rollback();
      return res.status(400).json({ message: 'No proposed edits found in comments' });
    }

    if (!commentsObj || !commentsObj.edits) {
      await conn.rollback();
      return res.status(400).json({ message: 'No proposed edits found' });
    }

    if (approve) {
      const edits = commentsObj.edits;

      // Fetch employee to update
      const [empRows] = await conn.execute('SELECT * FROM employees WHERE employee_id = ?', [request.employee_id]);
      if (empRows.length > 0) {
        const employee = empRows[0];
        
        // Update employee table
        if (edits.phone_number) {
          await conn.execute('UPDATE employees SET phone_number = ? WHERE employee_id = ?', [edits.phone_number, employee.employee_id]);
        }
        if (edits.name_based_email) {
          await conn.execute('UPDATE employees SET name_based_email = ? WHERE employee_id = ?', [edits.name_based_email, employee.employee_id]);
        }
        // Update email_master table
        if (edits.designation_email) {
          await conn.execute('UPDATE email_master SET designation_email = ? WHERE employee_id = ?', [edits.designation_email, employee.employee_id]);
        }
      }

      await conn.execute(
        `UPDATE email_mapping_requests SET status = 'APPROVED', comments = ? WHERE id = ?`,
        ['Final Admin Approval completed and changes applied.', id]
      );

      await notificationService.createNotification(
        request.requested_by,
        'Final Approval Completed',
        `Edits for Employee ${request.employee_id} have been finalized and applied to DB.`,
        'SUCCESS'
      );

      // Notify Admin
      await notificationService.createNotificationForRole(
        'ADMIN',
        'Final Approval Completed',
        `Edits for Employee ${request.employee_id} (Request #${id}) have been approved and applied to DB.`,
        'SUCCESS'
      );

      // Stop the ticking clock on all related notifications for this request ID
      await conn.execute(
        `UPDATE notifications 
         SET type = 'SUCCESS', 
             title = 'Final Approval Completed', 
             message = REPLACE(REPLACE(message, 'Final Admin Approval is required', 'Final Admin Approval is completed'), 'submitted for final admin approval', 'approved and applied to DB')
         WHERE message LIKE ?`,
        [`%Request #${id}%`]
      );

      await auditService.logAction(req.user.unique_id, req.user.role, 'FINAL_APPROVE_EDITS', 'employees', request.employee_id, commentsObj.edits, null, req.ip);
    } else {
      await conn.execute(
        `UPDATE email_mapping_requests SET status = 'REJECTED', comments = ? WHERE id = ?`,
        ['Final Admin Approval rejected. Edits discarded.', id]
      );

      await notificationService.createNotification(
        request.requested_by,
        'Final Approval Rejected',
        `Proposed edits for Employee ${request.employee_id} were rejected and discarded.`,
        'ERROR'
      );

      // Notify Admin
      await notificationService.createNotificationForRole(
        'ADMIN',
        'Final Approval Rejected',
        `Proposed edits for Employee ${request.employee_id} (Request #${id}) were rejected and discarded.`,
        'ERROR'
      );

      // Stop the ticking clock on all related notifications for this request ID
      await conn.execute(
        `UPDATE notifications 
         SET type = 'ERROR', 
             title = 'Final Approval Rejected', 
             message = REPLACE(REPLACE(message, 'Final Admin Approval is required', 'Final Admin Approval is rejected'), 'submitted for final admin approval', 'rejected and discarded')
         WHERE message LIKE ?`,
        [`%Request #${id}%`]
      );

      await auditService.logAction(req.user.unique_id, req.user.role, 'FINAL_REJECT_EDITS', 'employees', request.employee_id, commentsObj.edits, null, req.ip);
    }

    await conn.commit();
    socketService.broadcast('dashboard:updated', {});

    return res.json({ message: 'Final approval process completed' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    conn.release();
  }
}

module.exports = {
  createRequest,
  getAllRequests,
  getMyRequests,
  approveRequest,
  rejectRequest,
  submitManagerEdits,
  finalAdminApproval
};
