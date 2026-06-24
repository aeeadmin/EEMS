const express = require('express');
const router = express.Router();
const retirementController = require('../controllers/retirementController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

router.get('/upcoming', verifyToken, requireAdmin, retirementController.getUpcomingRetirements);
router.get('/archive', verifyToken, requireAdmin, retirementController.getRetirementArchive);

module.exports = router;
