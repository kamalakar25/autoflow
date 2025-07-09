const express = require('express');
const router = express.Router();
const Ticket = require('../models/TicketModel');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Middleware to validate user exists
const validateUserExists = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// POST: Create a new ticket
router.post(
  '/',
  [
    body('userId').notEmpty().withMessage('User ID is required').custom(validateUserExists),
    body('category').isIn(['Technical', 'Billing', 'General', 'Support', 'Other']).withMessage('Invalid category'),
    body('ticketQuery').trim().isLength({ min: 10, max: 1000 }).withMessage('Query must be between 10 and 1000 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    try {
      const { userId, category, ticketQuery, createdAt } = req.body;

      const newTicket = new Ticket({
        user: userId,
        category,
        ticketQuery,
        createdAt: createdAt || Date.now(),
        status: 'open',
      });

      console.log('Saving ticket:', newTicket);
      await newTicket.save();

      // Update the User document to include the new ticket
      await User.findByIdAndUpdate(
        userId,
        { $push: { tickets: newTicket._id } },
        { new: true }
      );

      console.log('Ticket saved successfully and added to user:', newTicket);
      res.status(201).json({ message: 'Ticket created successfully', ticket: newTicket });
    } catch (error) {
      console.error('Error saving ticket:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// GET: Fetch all tickets for a given user with non-empty ticketAnswer
router.get('/inbox', async (req, res) => {
  const { userId, email } = req.query;

  if (!userId && !email) {
    console.log('No userId or email provided in query');
    return res.status(400).json({ message: 'User ID or email is required' });
  }

  try {
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      console.log('User not found for provided userId or email');
      return res.status(404).json({ message: 'User not found' });
    }

    const query = {
      user: user._id,
      ticketAnswer: { $ne: '' },
    };
    const tickets = await Ticket.find(query)
      .select('category ticketQuery ticketAnswer repliedAt createdAt status')
      .sort({ createdAt: -1 });

    console.log(`Fetched ${tickets.length} tickets for user: ${user._id}`, tickets);
    res.status(200).json({ message: 'Tickets fetched successfully', tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Add a ticket answer (for testing purposes)
router.post('/answer', async (req, res) => {
  const { ticketId, ticketAnswer } = req.body;

  if (!ticketId || !ticketAnswer) {
    console.log('Missing ticketId or ticketAnswer');
    return res.status(400).json({ message: 'Ticket ID and answer are required' });
  }

  try {
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { ticketAnswer, repliedAt: Date.now(), status: 'answered' },
      { new: true }
    );

    if (!ticket) {
      console.log('Ticket not found:', ticketId);
      return res.status(404).json({ message: 'Ticket not found' });
    }

    console.log('Updated ticket with answer:', ticket);
    res.status(200).json({ message: 'Ticket answer updated', ticket });
  } catch (error) {
    console.error('Error updating ticket answer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;