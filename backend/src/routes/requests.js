const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin, requireManager, requireAny } = require('../middleware/rbac');

router.get('/', verifyToken, requireAdmin, requestController.getAllRequests);
router.get('/my', verifyToken, requireManager, requestController.getMyRequests);
router.post('/', verifyToken, requireManager, requestController.createRequest);

router.put('/:id/approve', verifyToken, requireAdmin, requestController.approveRequest);
router.put('/:id/reject', verifyToken, requireAdmin, requestController.rejectRequest);

router.put('/:id/submit-edits', verifyToken, requireManager, requestController.submitManagerEdits);
router.put('/:id/final-approve', verifyToken, requireAdmin, requestController.finalAdminApproval);

module.exports = router;
