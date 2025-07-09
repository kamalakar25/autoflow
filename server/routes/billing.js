const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const bcrypt = require('bcrypt');
const UserCredits = require('../models/UserCredits');
const CreditTransaction = require('../models/CreditTransaction');
const Invoice = require('../models/Invoice');
const CreditPackage = require('../models/CreditPackage');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('Razorpay key_id or key_secret is missing in .env file');
  process.exit(1);
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Email user or password is missing in .env file');
  process.exit(1);
}

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('Email transporter ready');
  }
});

// Initialize credit packages
const initCreditPackages = async () => {
  try {
    const existingPackages = await CreditPackage.countDocuments();
    if (existingPackages === 0) {
      const packages = [
        {
          id: 'basic',
          name: 'Basic',
          credits: 1000,
          price: 500,
          popular: false,
          features: ['1,000 Credits', 'Email Support', 'Basic Analytics'],
        },
        {
          id: 'standard',
          name: 'Standard',
          credits: 2500,
          price: 1200,
          popular: true,
          features: [
            '2,500 Credits',
            'Priority Support',
            'Advanced Analytics',
            '25% Bonus Credits',
          ],
        },
        {
          id: 'premium',
          name: 'Premium',
          credits: 5000,
          price: 2200,
          popular: false,
          features: [
            '5,000 Credits',
            'Premium Support',
            'Custom Reports',
            '40% Bonus Credits',
          ],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          credits: 10000,
          price: 4000,
          popular: false,
          features: [
            '10,000 Credits',
            'Dedicated Support',
            'API Access',
            '50% Bonus Credits',
          ],
        },
      ];
      await CreditPackage.insertMany(packages);
      // console.log('Credit packages initialized');
    }
  } catch (error) {
    console.error('Error initializing credit packages:', error);
  }
};

initCreditPackages();

// Create Razorpay Order for Auto-Topup
const createAutoTopupOrder = async (userId, pkg) => {
  try {
    // Validate userId as ObjectId or string representation
    if (!mongoose.isValidObjectId(userId)) {
      // console.log(`Invalid userId format: ${userId}`);
      throw new Error('Invalid userId format');
    }

    // Convert userId to string if it's an ObjectId
    const userIdString = userId.toString ? userId.toString() : userId;

    // Generate a short receipt (max 40 characters)
    const shortUserId = userIdString.slice(-8); // Last 8 characters
    const shortUniqueId = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    const receipt = `at_${shortUserId}_${shortUniqueId}`; // e.g., at_4031b149_123456 (18 chars)

    if (receipt.length > 40) {
      // console.error('Generated receipt too long:', receipt);
      throw new Error('Failed to generate valid receipt');
    }

    const order = await razorpay.orders.create({
      amount: pkg.price * 100, // Convert to paise
      currency: 'INR',
      receipt,
      notes: {
        userId: userIdString,
        type: 'auto_topup',
        creditPackageId: pkg.id,
        credits: pkg.credits,
      },
    });

    // console.log('Auto-topup order created:', order.id);
    return order;
  } catch (error) {
    // console.error('Error creating auto-topup order:', error);
    throw error;
  }
};

// Process Auto-Topup Payment
const processAutoTopupPayment = async (userId, orderId, pkg) => {
  try {
    const order = await razorpay.orders.fetch(orderId);

    const userCredits = await UserCredits.findOneAndUpdate(
      { userId },
      {
        $inc: { currentCredits: pkg.credits, autoTopupCount: 1 },
        $set: {
          lastTopUpTransactionId: orderId,
          lastTopUpTimestamp: new Date(),
          topUpInProgress: false,
        },
      },
      { new: true, upsert: true }
    );

    const transaction = new CreditTransaction({
      userId,
      type: 'top-up',
      amount: pkg.credits,
      description: `Auto-Topup: ${pkg.name} Package - ${pkg.credits} Credits`,
      cost: pkg.price,
      paymentGatewayTransactionId: orderId,
      creditPackageId: pkg.id,
      timestamp: new Date(),
    });
    await transaction.save();

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}`;
    const invoice = new Invoice({
      invoiceNumber,
      userId,
      amount: pkg.price,
      creditsPurchased: pkg.credits,
      paymentTransactionId: orderId,
      status: 'Paid',
      downloadUrl: `/invoices/${invoiceNumber}.pdf`,
    });
    await invoice.save();

    return { userCredits, transaction, invoice };
  } catch (error) {
    // console.error('Error processing auto-topup payment:', error);
    throw error;
  }
};

// Auto-Topup Payment Processing with Razorpay
const processAutoTopupWithRazorpay = async (userId, pkg) => {
  try {
    const order = await createAutoTopupOrder(userId, pkg);
    const result = await processAutoTopupPayment(userId, order.id, pkg);
    return result;
  } catch (error) {
    // console.error('Error in auto-topup payment processing:', error);
    throw error;
  }
};

// Auto Top-up Trigger
const triggerAutoTopup = async (userId, io) => {
  try {
    // console.log(`Starting auto top-up process for user ${userId}`);

    // Validate userId as ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      // console.log(`Auto top-up failed: Invalid userId format for ${userId}`);
      throw new Error('Invalid userId format');
    }

    const userCredits = await UserCredits.findOne({ userId });
    if (!userCredits || !userCredits.autoTopUpEnabled) {
      // console.log(
      //   `Auto top-up skipped for user ${userId}: Not enabled or not found`
      // );
      return;
    }

    if (userCredits.topUpInProgress) {
      // console.log(
      //   `Auto top-up skipped for user ${userId}: Top-up already in progress`
      // );
      return;
    }

    if (userCredits.currentCredits > userCredits.autoTopUpThreshold) {
      // console.log(
      //   `Auto top-up skipped for user ${userId}: Credits above threshold`
      // );
      return;
    }

    // Mark top-up as in progress
    await UserCredits.updateOne(
      { userId },
      { $set: { topUpInProgress: true } }
    );

    const user = await User.findById(userId);
    if (!user || !user.email) {
      await UserCredits.updateOne(
        { userId },
        { $set: { topUpInProgress: false } }
      );
      throw new Error(`User ${userId} not found or email missing`);
    }

    // Find package by credits, not price
    const pkg = await CreditPackage.findOne({
      credits: userCredits.autoTopUpAmount,
    });
    if (!pkg) {
      await UserCredits.updateOne(
        { userId },
        { $set: { topUpInProgress: false } }
      );
      throw new Error(
        `No package found for ${userCredits.autoTopUpAmount} credits`
      );
    }

    const result = await processAutoTopupWithRazorpay(userId, pkg);
    await sendNotificationAndEmitEvent(userId, pkg, result, user.email, io);

    // Update UserCredits after successful top-up
    await UserCredits.updateOne(
      { userId },
      {
        $set: { topUpInProgress: false },
        $inc: {
          currentCredits: pkg.credits,
          autoTopupCount: 1,
          totalCreditsUsed: pkg.credits,
          monthlySpend: pkg.price,
        },
        $setOnInsert: { lastTopUpTimestamp: new Date() },
      }
    );

    // console.log(
    //   `Auto top-up completed for user ${userId}: Added ${pkg.credits} credits`
    // );
    return result;
  } catch (error) {
    await UserCredits.updateOne(
      { userId },
      { $set: { topUpInProgress: false } }
    );
    // console.error(`Auto top-up failed for user ${userId}:`, error);
    throw error;
  }
};

// Helper function for notification and Socket.IO event
const sendNotificationAndEmitEvent = async (userId, pkg, result, email, io) => {
  try {
    await transporter.sendMail({
      from: `"Billing System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Auto Top-up Confirmation',
      text: `Your account has been automatically topped up with ${pkg.credits} credits for ₹${pkg.price}. Invoice: ${result.invoice.invoiceNumber}. Your new balance is ${result.userCredits.currentCredits} credits.`,
    });
    // console.log(`Auto top-up email sent for user ${userId}`);
  } catch (emailError) {
    console.error(
      `Failed to send auto top-up email for user ${userId}:`,
      emailError
    );
  }

  if (io && typeof io.to === 'function') {
    io.to(userId).emit('autoTopup', {
      currentCredits: result.userCredits.currentCredits,
      autoTopupCount: result.userCredits.autoTopupCount,
      lastTopUpTimestamp: result.userCredits.lastTopUpTimestamp,
      transaction: { ...result.transaction.toObject(), credits: pkg.credits },
      invoice: result.invoice,
    });
  }
};

// Credit Deduction Logic
const deductCredits = async (userId, jobId, credits, description, io) => {
  try {
    // console.log(`Deducting ${credits} credits for user ${userId}`);

    const userCredits = await UserCredits.findOne({ userId });
    if (!userCredits) {
      throw new Error('User credits not found');
    }

    if (userCredits.currentCredits < credits && !userCredits.autoTopUpEnabled) {
      throw new Error(
        `Insufficient credits. Required: ${credits}, Available: ${userCredits.currentCredits}`
      );
    }

    if (userCredits.autoTopUpEnabled && userCredits.currentCredits < credits) {
      // console.log(`Triggering auto top-up before deduction for user ${userId}`);
      try {
        await triggerAutoTopup(userId, io);
        const updatedUserCredits = await UserCredits.findOne({ userId });
        if (updatedUserCredits.currentCredits < credits) {
          throw new Error('Insufficient credits even after auto-topup');
        }
      } catch (autoTopupError) {
        // console.error(`Auto top-up failed for user ${userId}:`, autoTopupError);
        throw new Error('Auto-topup failed, insufficient credits');
      }
    }

    const updatedUserCredits = await UserCredits.findOneAndUpdate(
      { userId },
      {
        $inc: {
          currentCredits: -credits,
          totalCreditsUsed: credits,
          apiCalls: 1,
          monthlySpend: credits,
        },
      },
      { new: true }
    );

    const transaction = new CreditTransaction({
      userId,
      type: 'deduction',
      amount: -credits,
      description,
      jobId,
      timestamp: new Date(),
    });
    await transaction.save();

    // console.log(
    //   `Credits deducted for user ${userId}. New balance: ${updatedUserCredits.currentCredits}`
    // );

    if (
      updatedUserCredits.autoTopUpEnabled &&
      updatedUserCredits.currentCredits <=
        updatedUserCredits.autoTopUpThreshold &&
      !updatedUserCredits.topUpInProgress
    ) {
      // console.log(`Scheduling auto top-up for user ${userId}`);
      setImmediate(async () => {
        try {
          await triggerAutoTopup(userId, io);
        } catch (error) {
          console.error(
            `Auto top-up trigger failed for user ${userId}:`,
            error
          );
        }
      });
    }

    return transaction;
  } catch (error) {
    // console.error(`Credit deduction failed for user ${userId}:`, error);
    throw new Error(`Credit deduction failed: ${error.message}`);
  }
};

// Auto Top-up Monitor Service
cron.schedule('*/5 * * * *', async () => {
  try {
    // console.log('Auto top-up monitor: Starting check...');

    const users = await UserCredits.find({
      autoTopUpEnabled: true,
      topUpInProgress: { $ne: true },
    });

    // console.log(`Auto top-up monitor: Checking ${users.length} users`);

    for (const userCredit of users) {
      try {
        if (userCredit.currentCredits <= userCredit.autoTopUpThreshold) {
          // console.log(`Triggering auto top-up for user ${userCredit.userId}`);
          await triggerAutoTopup(userCredit.userId, global.io);
        }
      } catch (error) {
        // console.error(
        //   `Auto top-up failed for user ${userCredit.userId}:`,
        //   error
        // );
        await UserCredits.updateOne(
          { userId: userCredit.userId },
          { $set: { topUpInProgress: false } }
        );
      }
    }
  } catch (error) {
    console.error('Auto top-up monitor error:', error);
  }
});

// Routes

// Signup Route


// Get credit usage
router.get('/credit-usage', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const userCredits = await UserCredits.findOne({ userId });
    const transactions = await CreditTransaction.find({ userId });
    const monthlySpend = transactions
      .filter(
        (t) =>
          t.type !== 'deduction' &&
          new Date(t.timestamp).getMonth() === new Date().getMonth()
      )
      .reduce((sum, t) => sum + (t.cost || 0), 0);
    const creditsPerDay =
      transactions
        .filter(
          (t) =>
            t.type === 'deduction' &&
            new Date(t.timestamp).getMonth() === new Date().getMonth()
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) / 30;
    const totalCreditsUsed = userCredits?.totalCreditsUsed || 0;
    const totalCredits = (userCredits?.currentCredits || 0) + totalCreditsUsed;

    res.json({
      currentCredits: userCredits?.currentCredits || 0,
      totalCreditsUsed,
      creditUsagePercentage:
        totalCredits > 0 ? (totalCreditsUsed / totalCredits) * 100 : 0,
      autoTopup: {
        enabled: userCredits?.autoTopUpEnabled || false,
        threshold: userCredits?.autoTopUpThreshold || 100,
        amount: userCredits?.autoTopUpAmount || 1000,
        lastTopUpTimestamp: userCredits?.lastTopUpTimestamp,
        count: userCredits?.autoTopupCount || 0,
      },
      monthlySpend,
      creditsPerDay: Math.round(creditsPerDay),
      apiCalls: userCredits?.apiCalls || 0,
    });
  } catch (error) {
    // console.error('Credit usage error for user', userId, ':', error);
    res.status(500).json({ error: 'Failed to fetch credit usage' });
  }
});

// Auto-topup configuration
router.post('/auto-topup-config', async (req, res) => {
  // console.log('Received /auto-topup-config request:', req.body);
  const { userId, enable, threshold, amount } = req.body;

  try {
    // Validate required fields
    if (!userId) {
      // console.log('Validation failed: userId missing');
      return res.status(400).json({ error: 'userId is required' });
    }

    // Validate userId as ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      // console.log('Validation failed: invalid userId format');
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    if (enable && (!threshold || !amount)) {
      // console.log('Validation failed: threshold or amount missing');
      return res.status(400).json({
        error: 'Threshold and amount are required when enabling auto top-up',
      });
    }

    if (enable && (threshold < 0 || amount <= 0)) {
      // console.log('Validation failed: invalid threshold or amount');
      return res.status(400).json({
        error: 'Threshold must be non-negative and amount must be positive',
      });
    }

    // Validate package when enabling auto top-up
    let pkg;
    if (enable) {
      pkg = await CreditPackage.findOne({ credits: amount });
      if (!pkg) {
        // console.log(`No package found for ${amount} credits`);
        return res
          .status(400)
          .json({ error: `No package found for ${amount} credits` });
      }
    }

    // Update UserCredits
    const updatedUserCredits = await UserCredits.findOneAndUpdate(
      { userId },
      {
        $set: {
          autoTopUpEnabled: enable,
          autoTopUpThreshold: enable ? threshold : null,
          autoTopUpAmount: enable ? amount : null,
        },
      },
      { new: true, upsert: true }
    );

    // console.log('Auto top-up config saved:', {
    //   enabled: updatedUserCredits.autoTopUpEnabled,
    //   threshold: updatedUserCredits.autoTopUpThreshold,
    //   amount: updatedUserCredits.autoTopUpAmount,
    // });

    res.json({
      success: true,
      config: {
        enabled: updatedUserCredits.autoTopUpEnabled,
        threshold: updatedUserCredits.autoTopUpThreshold,
        amount: updatedUserCredits.autoTopUpAmount,
      },
    });
  } catch (error) {
    // console.error('Auto top-up config error:', error);
    res.status(500).json({
      error: error.message || 'Failed to save auto top-up configuration',
    });
  }
});

// Manual purchase credits
router.post('/purchase-credits', async (req, res) => {
  const { userId, amount, creditPackageId } = req.body;

  // Validate required fields
  if (!userId || !amount || !creditPackageId) {
    return res.status(400).json({
      error: 'Missing required fields: userId, amount, creditPackageId',
    });
  }

  // Validate userId as ObjectId
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }

  // Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    return res
      .status(400)
      .json({ error: 'Invalid amount: must be a positive number' });
  }

  try {
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify credit package exists
    const pkg = await CreditPackage.findOne({ id: creditPackageId });
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid credit package' });
    }

    // Validate amount matches package price
    if (pkg.price !== amount) {
      return res
        .status(400)
        .json({ error: 'Amount does not match package price' });
    }

    // Generate a short receipt (max 40 characters)
    const shortUserId = userId.slice(-8); // Last 8 characters of ObjectId
    const shortUniqueId = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    const receipt = `rcpt_${shortUserId}_${shortUniqueId}`; // e.g., rcpt_4031b149_123456 (20 chars)

    if (receipt.length > 40) {
      // console.error('Generated receipt too long:', receipt);
      return res
        .status(500)
        .json({ error: 'Failed to generate valid receipt' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt,
    });

    res.json({ orderId: order.id });
  } catch (error) {
    // console.error('Purchase error:', error);
    if (
      error.statusCode === 400 &&
      error.error?.reason === 'input_validation_failed'
    ) {
      return res
        .status(400)
        .json({ error: `Razorpay error: ${error.error.description}` });
    }
    res.status(500).json({ error: 'Purchase initiation failed' });
  }
});

// Verify payment
router.post('/verify-payment', async (req, res) => {
  const {
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    creditPackageId,
  } = req.body;

  try {
    const pkg = await CreditPackage.findOne({ id: creditPackageId });
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const user = await User.findById(userId);
    if (!user || !user.email) {
      return res.status(400).json({ error: 'User not found or email missing' });
    }

    const userCredits = await UserCredits.findOneAndUpdate(
      { userId },
      {
        $inc: { currentCredits: pkg.credits },
        $set: { lastTopUpTimestamp: new Date() },
      },
      { upsert: true, new: true }
    );

    const transaction = new CreditTransaction({
      userId,
      type: 'purchase',
      amount: pkg.credits,
      description: `Purchased ${pkg.name} Package - ${pkg.credits} Credits`,
      cost: pkg.price,
      paymentGatewayTransactionId: razorpay_payment_id,
      creditPackageId: pkg.id,
      timestamp: new Date(),
    });
    await transaction.save();

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now()}`;
    const invoice = new Invoice({
      invoiceNumber,
      userId,
      amount: pkg.price,
      creditsPurchased: pkg.credits,
      paymentTransactionId: razorpay_payment_id,
      status: 'Paid',
      downloadUrl: `/invoices/${invoiceNumber}.pdf`,
    });
    await invoice.save();

    try {
      await transporter.sendMail({
        from: `"Billing System" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Credit Purchase Confirmation',
        text: `You have successfully purchased ${pkg.credits} credits for ₹${pkg.price}. Invoice: ${invoiceNumber}`,
      });
      // console.log(`Purchase confirmation email sent for user ${userId}`);
    } catch (emailError) {
      console.error(
        `Failed to send purchase confirmation email for user ${userId}:`,
        emailError
      );
    }

    if (global.io) {
      global.io.to(userId).emit('paymentVerified', {
        currentCredits: userCredits.currentCredits,
        transaction: { ...transaction.toObject(), credits: pkg.credits },
        invoice,
      });
    }

    res.json({
      success: true,
      credits: userCredits.currentCredits,
      transaction: { ...transaction.toObject(), credits: pkg.credits },
      invoice,
    });
  } catch (error) {
    // console.error('Verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Get transactions
router.get('/transactions', async (req, res) => {
  const { userId, page = 1, limit = 50, range = '6months' } = req.query;
  if (!userId) {
    // console.error('Transactions request failed: userId is required');
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();
    let startDate;
    if (range === '6months') {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth() - 6,
        now.getDate()
      );
    } else if (range === '1year') {
      startDate = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
    } else {
      return res
        .status(400)
        .json({ error: 'Invalid range parameter. Use "6months" or "1year".' });
    }

    const query = { userId, timestamp: { $gte: startDate } };
    const transactions = await CreditTransaction.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);
    const total = await CreditTransaction.countDocuments(query);

    // console.log(
    //   `Transactions for user ${userId}: page=${pageNum}, limit=${limitNum}, total=${total}`
    // );

    res.json({
      transactions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    // console.error('Transactions error for user', userId, ':', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get invoices
router.get('/invoices', async (req, res) => {
  const { userId, page = 1, limit = 10 } = req.query;
  if (!userId) {
    // console.error('Invoices request failed: userId is required');
    return res.status(400).json({ error: 'userId is required' });
  }
  try {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const invoices = await Invoice.find({ userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);
    const total = await Invoice.countDocuments({ userId });

    res.json({
      invoices,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    // console.error('Invoices error for user', userId, ':', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await CreditPackage.find();
    res.json(packages);
  } catch (error) {
    // console.error('Packages error:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Deduct credits
router.post('/deduct-credits', async (req, res) => {
  const { userId, jobId, credits, description } = req.body;
  try {
    const transaction = await deductCredits(
      userId,
      jobId,
      credits,
      description,
      global.io
    );
    res.json({ success: true, transaction: transaction });
  } catch (error) {
    // console.error('Deduct credits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger manual auto-topup
router.post('/trigger-auto-topup', async (req, res) => {
  const { userId } = req.body;
  try {
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await triggerAutoTopup(userId, global.io);
    res.json({ success: true, result });
  } catch (error) {
    // console.error('Manual auto-topup trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Middleware to ensure only one default payment method
const ensureSingleDefault = async (userId, newDefaultId = null) => {
  const update = newDefaultId
    ? { $set: { 'paymentMethods.$[].isDefault': false } }
    : {};
  await User.updateOne(
    { _id: userId, 'paymentMethods._id': { $ne: newDefaultId } },
    update
  );
};

// Get all payment methods for the user
router.get('/payment-methods', async (req, res) => {
  const { userId } = req.query;
  try {
    const user = await User.findById(userId).select('paymentMethods');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.paymentMethods || []);
  } catch (error) {
    // console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/payment-methods', async (req, res) => {
  const { type, cardNumber, expiry } = req.body;
  const { userId } = req.query;

  // Validate required fields
  if (!userId || !type || !cardNumber || !expiry) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate card type
  if (!['Visa', 'Mastercard', 'Amex'].includes(type)) {
    return res.status(400).json({ error: 'Invalid card type' });
  }

  // Validate card number
  if (!/^\d{16}$/.test(cardNumber)) {
    return res.status(400).json({ error: 'Card number must be 16 digits' });
  }

  // Validate expiry format
  if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry)) {
    return res.status(400).json({ error: 'Invalid expiry format (MM/YY)' });
  }

  // Validate expiry date is not in the past
  const [month, year] = expiry.split('/').map(Number);
  const fullYear = 2000 + year;
  const currentDate = new Date();
  if (
    fullYear < currentDate.getFullYear() ||
    (fullYear === currentDate.getFullYear() &&
      month < currentDate.getMonth() + 1)
  ) {
    return res.status(400).json({ error: 'Expiry date cannot be in the past' });
  }

  try {
    // Validate userId as a valid ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const last4 = cardNumber.slice(-4);
    const displayCardNumber = `**** **** **** ${last4}`;
    const isDefault = user.paymentMethods.length === 0;

    // Generate a unique numeric ID (e.g., increment based on existing payment methods)
    const paymentMethodId =
      user.paymentMethods.length > 0
        ? Math.max(...user.paymentMethods.map((pm) => pm.id)) + 1
        : 1;

    // Ensure only one default payment method
    if (isDefault) {
      await ensureSingleDefault(userId);
    }

    // Add new payment method with numeric id
    user.paymentMethods.push({
      id: paymentMethodId,
      type,
      last4,
      displayCardNumber,
      expiry,
      isDefault,
    });

    await user.save();
    res.json(user.paymentMethods);
  } catch (error) {
    // console.error('Error adding payment method:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a payment method
router.put('/payment-methods/:id', async (req, res) => {
  const { type, cardNumber, expiry, isDefault } = req.body;
  const paymentMethodId = parseInt(req.params.id); // Parse as number
  const { userId } = req.query;

  try {
    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    // Validate required fields
    if (!type || !cardNumber || !expiry) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: type, cardNumber, expiry' });
    }

    // Validate card type
    if (!['Visa', 'Mastercard', 'Amex'].includes(type)) {
      return res.status(400).json({ error: 'Invalid card type' });
    }

    // Validate card number
    if (!/^\d{16}$/.test(cardNumber)) {
      return res.status(400).json({ error: 'Card number must be 16 digits' });
    }

    // Validate Luhn algorithm
    const luhnCheck = (cardNumber) => {
      let sum = 0;
      let isEven = false;
      for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i]);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    };
    if (!luhnCheck(cardNumber)) {
      return res
        .status(400)
        .json({ error: 'Invalid card number (fails Luhn check)' });
    }

    // Validate expiry format
    if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry)) {
      return res.status(400).json({ error: 'Invalid expiry format (MM/YY)' });
    }

    // Validate expiry date
    const [month, year] = expiry.split('/').map(Number);
    const fullYear = 2000 + year;
    const currentDate = new Date();
    if (
      fullYear < currentDate.getFullYear() ||
      (fullYear === currentDate.getFullYear() &&
        month < currentDate.getMonth() + 1)
    ) {
      return res
        .status(400)
        .json({ error: 'Expiry date cannot be in the past' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find payment method by numeric id
    const paymentMethod = user.paymentMethods.find(
      (pm) => pm.id === paymentMethodId
    );
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Update payment method
    paymentMethod.type = type;
    paymentMethod.last4 = cardNumber.slice(-4);
    paymentMethod.displayCardNumber = `**** **** **** ${cardNumber.slice(-4)}`;
    paymentMethod.expiry = expiry;

    // Handle isDefault
    if (isDefault) {
      user.paymentMethods.forEach(
        (pm) => (pm.isDefault = pm.id === paymentMethodId)
      );
    }

    await user.save();
    res.json(user.paymentMethods);
  } catch (error) {
    // console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a payment method
router.delete('/payment-methods/:id', async (req, res) => {
  const paymentMethodId = parseInt(req.params.id); // Parse as number
  const { userId } = req.query;

  try {
    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find payment method by numeric id
    const paymentMethodIndex = user.paymentMethods.findIndex(
      (pm) => pm.id === paymentMethodId
    );
    if (paymentMethodIndex === -1) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const paymentMethod = user.paymentMethods[paymentMethodIndex];
    // Prevent deletion of the only default payment method
    if (paymentMethod.isDefault && user.paymentMethods.length === 1) {
      return res.status(400).json({
        error: 'Cannot delete the only default payment method',
      });
    }

    // Remove payment method
    user.paymentMethods.splice(paymentMethodIndex, 1);

    // Set a new default if the deleted method was default
    if (paymentMethod.isDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();
    res.json(user.paymentMethods);
  } catch (error) {
    // console.error('Error removing payment method:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set a payment method as default
router.put('/payment-methods/:id/set-default', async (req, res) => {
  const paymentMethodId = parseInt(req.params.id); // Parse as number
  const { userId } = req.query;

  try {
    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find payment method by numeric id
    const paymentMethod = user.paymentMethods.find(
      (pm) => pm.id === paymentMethodId
    );
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Set isDefault
    user.paymentMethods.forEach(
      (pm) => (pm.isDefault = pm.id === paymentMethodId)
    );

    await user.save();
    res.json(user.paymentMethods);
  } catch (error) {
    // console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /invoices - Fetch paginated invoices for a user
router.get('/invoices', async (req, res) => {
  const { userId, page = 1, limit = 10 } = req.query;

  try {
    // Validate userId
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    // Convert page and limit to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ error: 'Invalid page or limit' });
    }

    const skip = (pageNum - 1) * limitNum;
    const invoices = await Invoice.find({ userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Invoice.countDocuments({ userId });

    res.json({
      invoices,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    // console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
