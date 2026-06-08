const User = require('../models/Users');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendOTPEmail, sendWelcomeEmail, sendForgotPasswordEmail } = require('../utils/emailService');
const { validationResult } = require('express-validator');

// Generate short-lived access token
const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

// Generate long-lived refresh token
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

// Register user
const handleRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { fullName, email, phoneNumber, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
      // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Create user
    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      otp,
      otpExpires,
      role: 'user',
    });
      
    await user.save();
        try {
            await sendOTPEmail(email, otp);
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
        }
        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email for OTP verification.',
          user: {
            fullName: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber
            }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// Login user
const handleUserLogin = async (req, res) => {
    try {
      
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email and password are required" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    const isMatch = await bcrypt.compare(password, user?.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    if (!user.isEmailVerified || !user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: "Email not verified. Please verify to login.",
        requiresVerification: true,
        email: user.email
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
        
    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        kycVerified: user.kycVerified,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error during login" 
    });
  }
};

// Get current user
const handleGetMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Update user profile
const handleUpdateProfile = async (req, res) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      phoneNumber: req.body.phoneNumber,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
      emergencyContact: req.body.emergencyContact,
      bloodGroup: req.body.bloodGroup,
      allergies: req.body.allergies,
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// Change password
const handleChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// LOGOUT
const logoutUser = (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
};


// VERIFY EMAIL
const handleVerifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: "Email and OTP are required" 
      });
    }

    // Validate OTP format
    if (otp.length !== 6 || isNaN(otp)) {
      return res.status(400).json({ 
        success: false,
        message: "OTP must be a 6-digit number" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "User not found with this email" 
      });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ 
        success: false,
        message: "No OTP found. Please request a new OTP." 
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: "Incorrect OTP. Please check and try again." 
      });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ 
        success: false,
        message: "OTP has expired. Please request a new OTP." 
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    
    await user.save();


    // Send welcome email
    try {
      await sendWelcomeEmail(email,  user.fullName);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    res.status(200).json({ 
      success: true,
      message: "Email verified successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error during verification" 
    });
  }
};

// RESEND OTP
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({ 
        success: false,
        message: "User not found with this email" 
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please login instead."
      });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
    }

    res.status(200).json({ 
      success: true,
      message: "OTP resent successfully",
      expiresIn: 10 * 60 * 1000
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false,
      message: "Failed to resend OTP. Please try again." 
    });
  }
};


// Forgot Password
const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Always return the same message regardless of whether email exists
    const message = "If an account exists with this email, a password reset code has been sent.";
    
    if (!email) {
      return res.status(200).json({ success: true, message });
    }

    const user = await User.findOne({ email });
    
    if (user) {
      const otp = crypto.randomInt(100000, 999999).toString();
      user.resetPasswordToken = otp;
      user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
      await user.save();
      
      try {
        await sendForgotPasswordEmail(email, otp);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }
    
    // Always return success to prevent email enumeration
    res.status(200).json({ success: true, message });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Reset Password
const handleResetPassword = async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: "Email, OTP and new password are required" });
      }
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found with this email" });
      }

      if (user.resetPasswordToken !== otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      if (Date.now() > user.resetPasswordExpire) {
        return res.status(400).json({ success: false, message: "OTP has expired" });
      }

      user.password = await bcrypt.hash(newPassword, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

module.exports = {
  handleRegister,
  handleUserLogin,
  handleGetMe,
  handleUpdateProfile,
  handleChangePassword,
  logoutUser,
    handleVerifyOTP,
    resendOTP,
    handleForgotPassword,
    handleResetPassword
};