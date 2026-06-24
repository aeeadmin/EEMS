const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin, requireAny } = require('../middleware/rbac');

router.get('/employees', verifyToken, requireAny, exportController.exportEmployees);
router.get('/managers', verifyToken, requireAdmin, exportController.exportManagers);
router.get('/admins', verifyToken, requireAdmin, exportController.exportAdmins);
router.get('/requests', verifyToken, requireAdmin, exportController.exportRequests);
router.get('/retirements', verifyToken, requireAdmin, exportController.exportRetirements);
router.get('/notifications', verifyToken, exportController.exportNotifications);
router.get('/audit', verifyToken, requireAdmin, exportController.exportAuditLogs);

module.exports = router;
