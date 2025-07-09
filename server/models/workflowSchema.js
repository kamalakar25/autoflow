const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true, // Matches workflowId used in DataEnrichment.js
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  steps: [{
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: { type: String, default: 'Pending' },
    icon: { type: String, default: 'FaCog' },
    color: { type: String, default: '#000000' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }],
  status: {
    type: String,
    default: 'Ready',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

workflowSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.Workflow || mongoose.model('Workflow', workflowSchema);