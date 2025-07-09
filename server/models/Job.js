
const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  selectors: [{ element: String, selector: String }],
  status: { type: String, enum: ['running', 'completed', 'failed', 'paused'], default: 'running' },
  results: [{ element: String, values: [String] }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Job', JobSchema);
