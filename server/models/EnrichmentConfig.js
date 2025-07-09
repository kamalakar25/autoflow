const mongoose = require('mongoose');

const enrichmentConfigSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['person', 'email', 'domain'], required: true },
  provider: { type: String, required: true },
  inputField: { type: String, required: true },
  outputFields: [{ type: String }],
  condition: { type: String },
  
});

module.exports = mongoose.model('EnrichmentConfig', enrichmentConfigSchema);