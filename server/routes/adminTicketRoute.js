const express = require('express');
const router = express.Router();
const Ticket = require('../models/TicketModel');

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

// Update ticketAnswer and repliedAt
router.put('/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { ticketAnswer } = req.body;

  try {
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      {
        ticketAnswer,
        repliedAt: new Date(), // ✅ Store reply timestamp
      },
      { new: true, runValidators: true }
    );

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.status(200).json({ message: 'Reply added successfully', ticket });
  } catch (error) {
    res.status(500).json({ message: 'Error updating ticket', error: error.message });
  }
});

module.exports = router;
