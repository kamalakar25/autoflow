const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['purchase', 'deduction', 'top-up'], required: true },
  amount: { type: Number, required: true },
  description: String,
  cost: Number,
  timestamp: { type: Date, default: Date.now },
  jobId: String,
  paymentGatewayTransactionId: String,
});

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);