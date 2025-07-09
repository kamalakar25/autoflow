const mongoose = require('mongoose');

const userCreditsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
  currentCredits: { type: Number, default: 0 },
  apiCalls: { type: Number, default: 0 },
  totalCreditsUsed: { type: Number, default: 0 },
  monthlySpend: { type: Number, default: 0 },
  creditsPerDay: { type: Number, default: 0 },
  autoTopUpEnabled: { type: Boolean, default: false },
  autoTopUpThreshold: { type: Number, default: 100 },
  autoTopUpAmount: { type: Number, default: 1000 },
  autoTopupCount: { type: Number, default: 0 },
  lastTopUpTransactionId: { type: String, default: null },
  lastTopUpTimestamp: { type: Date, default: null },
  subscriptionId: { type: String, default: null },
  subscriptionStatus: { type: String, default: null },
  topUpInProgress: { type: Boolean, default: false },
});

module.exports = mongoose.model('UserCredits', userCreditsSchema);