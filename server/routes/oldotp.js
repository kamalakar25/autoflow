const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const router = express.Router();

// Nodemailer configuration
const mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'lakshmiradha030@gmail.com',
    pass: 'lnum vmmk okjb hixf',
  },
});

// Middleware to verify JWT and check admin role
const isAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('Decoded JWT:', decoded);
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('User not found for ID:', decoded.id);
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'Admin') {
      console.log('User is not an admin:', user.email);
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Admin check error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Signup route
router.post('/users/signup', async (req, res) => {
  const { firstName, lastName, phone, email, password, role } = req.body;

  // Basic validation
  if (!firstName || !lastName || !phone || !email || !password) {
    console.log('Missing required fields:', { firstName, lastName, phone, email, password });
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Validate password
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    console.log('Invalid password format for:', email);
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
    });
  }

  try {
    // Check if email or phone already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      console.log('User already exists:', { email, phone });
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'Phone number already exists',
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      phone,
      email,
      password: await bcrypt.hash(password, 10),
      role: email === 'admin@gmail.com' ? 'Admin' : (role || 'Viewer'),
      status: email === 'admin@gmail.com' ? 'approved' : 'pending',
      createdAt: new Date(),
    });

    // Save user
    await user.save();
    console.log('User created:', { email, role: user.role, status: user.status });

    // Send confirmation email to user
    const mailOptions = {
      from: 'lakshmiradha030@gmail.com',
      to: user.email,
      subject: 'Signup Request Received',
      text: `Dear ${user.firstName},\n\nYour signup request has been received and is pending admin approval. You will be notified once your account is approved or rejected.\n\nBest regards,\nAutoFlow Team`,
    };
    await mailTransporter.sendMail(mailOptions);
    console.log('Signup confirmation email sent to:', user.email);

    res.status(201).json({ message: 'Signup submitted! Awaiting admin approval.' });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Sign-in route
router.post('/users/signin', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    console.log('Missing email or password:', { email, password });
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'User not found' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check user status
    console.log('User status:', { email, status: user.status, role: user.role });
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Your signup is under review.', status: 'pending' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Your signup was rejected by admin.', status: 'rejected' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '1h',
    });
    console.log('JWT generated for:', email);

    res.status(200).json({
      message: 'Sign-in successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      status: user.status,
    });
  } catch (error) {
    console.error('Sign-in error:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Get Pending Users (Admin Only)
router.get('/users/pending', isAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: 'pending' }).select('firstName lastName email phone role status createdAt');
    console.log('Fetched pending users:', pendingUsers.length);
    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve User (Admin Only)
router.put('/users/:id/approve', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', updatedAt: new Date() },
      { new: true }
    );
    if (!user) {
      console.log('User not found for approval:', req.params.id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Send approval email
    const mailOptions = {
      from: 'lakshmiradha030@gmail.com',
      to: user.email,
      subject: 'Account Approval Confirmation',
      text: `Dear ${user.firstName},\n\nYour account has been approved! You can now sign in to AutoFlow.\n\nBest regards,\nAutoFlow Team`,
    };
    await mailTransporter.sendMail(mailOptions);
    console.log('Approval email sent to:', user.email);

    res.status(200).json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Error approving user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject User (Admin Only)
router.put('/users/:id/reject', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', updatedAt: new Date() },
      { new: true }
    );
    if (!user) {
      console.log('User not found for rejection:', req.params.id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Send rejection email
    const mailOptions = {
      from: 'lakshmiradha030@gmail.com',
      to: user.email,
      subject: 'Account Rejection Notification',
      text: `Dear ${user.firstName},\n\nWe regret to inform you that your account signup request has been rejected. Please contact support for more details.\n\nBest regards,\nAutoFlow Team`,
    };
    await mailTransporter.sendMail(mailOptions);
    console.log('Rejection email sent to:', user.email);

    res.status(200).json({ message: 'User rejected successfully' });
  } catch (error) {
    console.error('Error rejecting user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get User Count (for dashboard stats)
router.get('/auth/users/count', isAdmin, async (req, res) => {
  try {
    const count = await User.countDocuments({ status: 'approved' });
    console.log('User count:', count);
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching user count:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Send OTP
router.post('/ForgotPassword/SendOTP', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    console.log('Email missing for OTP request');
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for OTP:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const OTP = crypto.randomInt(100000, 999999).toString();
    user.otp = OTP;
    user.otpTimestamp = new Date();
    await user.save();
    console.log('OTP generated for:', email);

    // Send OTP email
    const mailOptions = {
      from: 'lakshmiradha030@gmail.com',
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${OTP}. It is valid for 5 minutes.`,
    };
    await mailTransporter.sendMail(mailOptions);
    console.log('OTP email sent to:', email);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error. Could not send OTP.' });
  }
});

// Verify OTP
router.post('/get/otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    console.log('Missing email or OTP:', { email, otp });
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for OTP verification:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otp || !user.otpTimestamp) {
      console.log('No OTP found for:', email);
      return res.status(400).json({ message: 'No OTP found' });
    }

    // Check OTP expiration
    const currentTime = new Date();
    const otpTime = new Date(user.otpTimestamp);
    const timeDiff = currentTime - otpTime;
    if (timeDiff > 300000) {
      user.otp = null;
      user.otpTimestamp = null;
      await user.save();
      console.log('OTP expired for:', email);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    if (user.otp !== otp) {
      console.log('Invalid OTP for:', email);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    console.log('OTP verified for:', email);
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Password
router.put('/update/password', async (req, res) => {
  const { email, password, otp } = req.body;

  if (!email || !password || !otp) {
    console.log('Missing fields for password update:', { email, password, otp });
    return res.status(400).json({ message: 'Email, password, and OTP are required' });
  }

  // Validate password
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    console.log('Invalid password format for update:', email);
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for password update:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    if (!user.otp || !user.otpTimestamp || user.otp !== otp) {
      console.log('Invalid or missing OTP for:', email);
      return res.status(400).json({ message: 'Invalid or missing OTP' });
    }

    // Check OTP expiration
    const currentTime = new Date();
    const otpTime = new Date(user.otpTimestamp);
    const timeDiff = currentTime - otpTime;
    if (timeDiff > 300000) {
      user.otp = null;
      user.otpTimestamp = null;
      await user.save();
      console.log('OTP expired for password update:', email);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Update password
    user.password = await bcrypt.hash(password, 10);
    user.otp = null;
    user.otpTimestamp = null;
    await user.save();
    console.log('Password updated for:', email);

    // Send confirmation email
    const mailOptions = {
      from: 'lakshmiradha030@gmail.com',
      to: email,
      subject: 'Password Updated Successfully',
      text: 'Your password has been updated successfully. If you did not initiate this change, please contact support immediately.',
    };
    await mailTransporter.sendMail(mailOptions);
    console.log('Password update email sent to:', email);

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Placeholder for sync endpoints
router.post('/sync/start/:id', isAdmin, async (req, res) => {
  console.log('Sync started for user ID:', req.params.id);
  res.status(200).json({ message: 'Sync started ' });
});

router.get('/sync/:id', isAdmin, async (req, res) => {
  console.log('Sync status requested for user ID:', req.params.id);
  res.status(200).json({ status: 'connected', lastSync: 'Just now' });
});

module.exports = router;