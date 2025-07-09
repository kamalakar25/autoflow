const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^[6-9]\d{9}$/,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z-]{2,}\.[a-zA-Z]{2,}$/,
  },
  password: {
    type: String,
    required: true,
    match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  },
  role: {
    type: String,
    enum: ['Admin', 'Viewer'],
    default: 'Viewer',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  otp: {
    type: String,
    default: null,
  },
  otpTimestamp: {
    type: Date,
    default: null,
  },
  // 👇 Add this line
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  workflows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' }], // Added workflows field
  savedResults: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Result' }], // New field for saved results
  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }], // New field for tickets
  paymentMethods: [
    {
      id: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        enum: ["Visa", "Mastercard", "Amex"],
        required: true,
      },
      last4: {
        type: String,
        required: true,
        match: /^\d{4}$/,
      },
      displayCardNumber: {
        type: String,
        required: true,
      },
      expiry: {
        type: String,
        required: true,
        match: /^(0[1-9]|1[0-2])\/[0-9]{2}$/,
      },
      isDefault: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

// Pre-save hook to automatically create UserCredits entry
userSchema.post('save', async function(doc) {
  const UserCredits = require("./UserCredits");
  try {
    const existingCredits = await UserCredits.findOne({ userId: doc._id });
    if (!existingCredits) {
      await UserCredits.create({
        userId: doc._id,
        currentCredits: 0,
        apiCalls: 0,
        totalCreditsUsed: 0,
        monthlySpend: 0,
        creditsPerDay: 0,
        autoTopUpEnabled: false,
        autoTopUpThreshold: 100,
        autoTopUpAmount: 1000,
        autoTopupCount: 0,
        lastTopUpTimestamp: null,
        lastTopUpTransactionId: null,
        subscriptionId: null,
        subscriptionStatus: null,
        topUpInProgress: false,
      });
      console.log(`UserCredits created for user ${doc._id}`);
    }
  } catch (error) {
    console.error(`Error creating UserCredits for user ${doc._id}:`, error);
  }
});


module.exports = mongoose.models.User || mongoose.model('User', userSchema);