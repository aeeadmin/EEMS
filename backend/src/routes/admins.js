const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', verifyToken, requireAdmin, adminController.getAllAdmins);
router.get('/settings/cyber-campaign', verifyToken, requireAdmin, adminController.getCyberCampaignSettings);
router.put('/settings/cyber-campaign', verifyToken, requireAdmin, adminController.updateCyberCampaignSettings);
router.get('/db/tables', verifyToken, requireAdmin, adminController.getDbTables);
router.get('/db/tables/:tableName', verifyToken, requireAdmin, adminController.getDbTableData);
router.put('/db/tables/:tableName/row', verifyToken, requireAdmin, adminController.updateDbTableRow);
router.post('/employees/:employeeId/birthday-email', verifyToken, requireAdmin, adminController.sendTestBirthdayEmail);
router.post('/send-awareness-email', verifyToken, requireAdmin, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'csvFile', maxCount: 1 }]), adminController.sendCustomAwarenessEmail);
router.get('/:id', verifyToken, requireAdmin, adminController.getAdminById);
router.post('/', verifyToken, requireAdmin, adminController.createAdmin);
router.put('/:id', verifyToken, requireAdmin, adminController.updateAdmin);
router.put('/:id/deactivate', verifyToken, requireAdmin, adminController.deactivateAdmin);

module.exports = router;
