const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: {
      values: ['Technical', 'Billing', 'General', 'Support', 'Other'],
      message: 'Category must be one of: Technical, Billing, General, Support, Other',
    },
    trim: true,
  },
  ticketQuery: {
    type: String,
    required: [true, 'Please provide a ticket query'],
    trim: true,
    minlength: [10, 'Query must be at least 10 characters long'],
    maxlength: [1000, 'Query cannot exceed 1000 characters'],
  },
  ticketAnswer: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'answered', 'closed'],
      message: 'Status must be one of: open, answered, closed',
    },
    default: 'open',
  },
  repliedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for performance
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ user: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;