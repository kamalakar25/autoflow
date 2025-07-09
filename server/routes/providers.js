const express = require('express');
const router = express.Router();
const Provider = require('../models/Provider');
const authMiddleware = require('../middleware/auth');

// Get all providers for the authenticated user
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const providers = await Provider.find({ userId: req.userId });
    res.json(providers || []);
  } catch (err) {
    console.error('Error fetching providers:', err);
    res.status(500).json({ message: 'Error fetching providers', error: err.message });
  }
});

// Add a new provider for the authenticated user
router.post('/new', authMiddleware, async (req, res) => {
  try {
    const { type, endpoint, apiKey, status } = req.body;
    if (!type || !endpoint || !apiKey) {
      return res.status(400).json({ message: 'Type, endpoint, and apiKey are required' });
    }
    const provider = new Provider({
      userId: req.userId,
      type,
      endpoint,
      apiKey,
      status: status || 'active'
    });
    await provider.save();
    res.json({
      _id: provider._id,
      type: provider.type,
      endpoint: provider.endpoint,
      status: provider.status
    });
  } catch (err) {
    console.error('Error adding provider:', err);
    res.status(400).json({ message: 'Error adding provider', error: err.message });
  }
});

// Update provider for the authenticated user
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await Provider.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Provider not found or not authorized' });
    }
    res.json({
      _id: updated._id,
      type: updated.type,
      endpoint: updated.endpoint,
      status: updated.status
    });
  } catch (err) {
    console.error('Error updating provider:', err);
    res.status(400).json({ message: 'Failed to update provider', error: err.message });
  }
});

// Get only active providers for the authenticated user
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const activeProviders = await Provider.find({ userId: req.userId, status: 'active' });
    console.log('Active providers:', activeProviders);
    res.json(activeProviders || []);
  } catch (err) {
    console.error('Error fetching active providers:', err);
    res.status(500).json({ message: 'Error fetching active providers', error: err.message });
  }
});

// Seed dummy providers for the authenticated user
router.post('/seed', authMiddleware, async (req, res) => {
  const dummyProviders = [
    {
      userId: req.userId,
      type: 'Hunter',
      status: 'active',
      apiKey: 'c7ab61c7f2c4c0192a36852dcf47f4414a585b60',
      endpoint: 'https://api.hunter.io/v2'
    }
  ];
  try {
    await Provider.deleteMany({ userId: req.userId }); // Clear only user's providers
    await Provider.insertMany(dummyProviders);
    res.json({ message: 'Dummy providers seeded successfully', providers: dummyProviders });
  } catch (err) {
    console.error('Error seeding providers:', err);
    res.status(500).json({ message: 'Failed to seed providers', error: err.message });
  }
});

module.exports = router;