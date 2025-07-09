const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  workflows: { type: Number, required: true },
  members: [memberSchema], // Array of members embedded in project
  workflowIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workflow' }], // Add workflowIds
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  hasBookmark: { type: Boolean, default: false },
  hasLock: { type: Boolean, default: false },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }, // <-- reference to User
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);