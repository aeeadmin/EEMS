const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, verifyTokenForLogout } = require('../middleware/auth');

router.post('/admin/login', authController.loginAdmin);
router.post('/manager/login', authController.loginManager);
router.post('/user/login', authController.loginUser);
router.post('/logout', verifyTokenForLogout, authController.logout);
router.get('/profile', verifyToken, authController.getProfile);

// Forgot Password Workflow Routes
router.post('/forgot-password/request', authController.forgotPasswordRequest);
router.post('/forgot-password/verify-otp', authController.forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', authController.forgotPasswordReset);

module.exports = router;
