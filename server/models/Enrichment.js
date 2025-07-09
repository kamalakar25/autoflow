const mongoose = require('mongoose');

const enrichmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add user reference
  type: String,
  source: String,
  status: String,
  accuracy: Number,
  enrichedFields: {
    email: String,
    company: String,
    social: String
  }
}, { timestamps: true }); // ✅ Important


module.exports = mongoose.model('Enrichment', enrichmentSchema);
