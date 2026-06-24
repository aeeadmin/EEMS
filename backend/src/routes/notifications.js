const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');
const { requireAny } = require('../middleware/rbac');

router.get('/', verifyToken, requireAny, notificationController.getNotifications);
router.put('/:id/read', verifyToken, requireAny, notificationController.markAsRead);
router.put('/read-all', verifyToken, requireAny, notificationController.markAllAsRead);

module.exports = router;
