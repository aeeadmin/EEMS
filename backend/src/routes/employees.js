const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin, requireAny } = require('../middleware/rbac');

router.get('/', verifyToken, requireAny, employeeController.getAllEmployees);
router.get('/stats/dashboard', verifyToken, requireAny, employeeController.getDashboardStats);
router.get('/:id', verifyToken, requireAny, employeeController.getEmployeeById);

router.post('/', verifyToken, requireAdmin, employeeController.createEmployee);
router.put('/:id', verifyToken, requireAdmin, employeeController.updateEmployee);
router.delete('/:id', verifyToken, requireAdmin, employeeController.deleteEmployee);

module.exports = router;
