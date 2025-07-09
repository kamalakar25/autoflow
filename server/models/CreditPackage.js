const mongoose = require('mongoose');

const creditPackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  credits: Number,
  price: Number,
  popular: Boolean,
  features: [String],
});

module.exports = mongoose.model('CreditPackage', creditPackageSchema);