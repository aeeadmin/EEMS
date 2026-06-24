const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

router.get('/', verifyToken, requireAdmin, managerController.getAllManagers);
router.get('/:id', verifyToken, requireAdmin, managerController.getManagerById);
router.post('/', verifyToken, requireAdmin, managerController.createManager);
router.put('/:id', verifyToken, requireAdmin, managerController.updateManager);
router.put('/:id/deactivate', verifyToken, requireAdmin, managerController.deactivateManager);
router.put('/:id/unfreeze', verifyToken, requireAdmin, managerController.unfreezeManager);

module.exports = router;
