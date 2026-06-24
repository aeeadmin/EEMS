const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

router.get('/', verifyToken, requireAdmin, auditController.getAuditLogs);

module.exports = router;
