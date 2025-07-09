const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  creditsPurchased: Number,
  date: { type: Date, default: Date.now },
  paymentTransactionId: String,
  status: { type: String, enum: ['Paid', 'Pending', 'Failed'], default: 'Pending' },
  downloadUrl: String,
});

module.exports = mongoose.model('Invoice', invoiceSchema);