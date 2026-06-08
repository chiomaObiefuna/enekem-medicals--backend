const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  handleRegister,
  handleUserLogin,
  handleGetMe,
  handleUpdateProfile,
  handleChangePassword,
  handleResetPassword,
    handleForgotPassword,
    handleVerifyOTP,
    resendOTP,
} = require('../controllers/authController');

// Validation rules
const registerValidation = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Routes
router.post('/register', registerValidation, handleRegister);
router.post('/login', loginValidation, handleUserLogin);
router.get('/me', protect, handleGetMe);
router.put('/profile', protect, handleUpdateProfile);
router.put('/change-password', protect, handleChangePassword);
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);
router.post('/verify-otp', handleVerifyOTP);
router.post('/resend-otp', resendOTP);

module.exports = router;