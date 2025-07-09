const express = require('express');
const router = express.Router();
const EnrichmentConfig = require('../models/EnrichmentConfig');
const Provider = require('../models/Provider');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');
const Enrichment = require('../models/Enrichment');

// Create a new enrichment configuration
router.post('/new', authMiddleware, async (req, res) => {
  try {
    const { title, type, provider, inputField, outputFields, condition } = req.body;
    if (!title || !type || !provider || !inputField) {
      return res.status(400).json({ message: 'Title, type, provider, and inputField are required' });
    }
    const config = new EnrichmentConfig({
      userId: req.userId,
      title,
      type,
      provider,
      inputField,
      outputFields: outputFields || [],
      condition
    });
    await config.save();
    res.json(config);
  } catch (err) {
    console.error('Error creating enrichment config:', err);
    res.status(400).json({ message: 'Error creating enrichment config', error: err.message });
  }
});

// Get all configurations for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const configs = await EnrichmentConfig.find({ userId: req.userId });
    res.json(configs || []);
  } catch (err) {
    console.error('Error fetching enrichment configs:', err);
    res.status(500).json({ message: 'Error fetching enrichment configs', error: err.message });
  }
});

// Run an enrichment configuration
router.post('/run/:id', async (req, res) => {
  try {
    const config = await EnrichmentConfig.findById(req.params.id);
    if (!config) {
      console.error('Config not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Config not found' });
    }

    const provider = await Provider.findOne({ type: config.provider, status: 'active' });
    if (!provider) {
      console.error('Active provider not found for type:', config.provider);
      return res.status(404).json({ message: 'Active provider not found' });
    }

    const inputValue = req.body[config.inputField];
    if (!inputValue) {
      console.error('Missing input value for field:', config.inputField);
      return res.status(400).json({ message: `Missing input field: ${config.inputField}` });
    }

    // Build the provider API URL dynamically
    let url;
    console.log('Config:', { id: config._id, title: config.title, type: config.type, provider: config.provider, inputField: config.inputField, outputFields: config.outputFields });
    console.log('Provider:', { type: provider.type, endpoint: provider.endpoint, apiKey: provider.apiKey ? '[REDACTED]' : 'MISSING' });
    
    const providerType = provider.type.toLowerCase();
    const configType = config.type || 'person'; // Fallback to 'person' if type is invalid
    if (configType === 'person' && providerType.includes('hunter')) {
      url = `${provider.endpoint}/people/find?email=${encodeURIComponent(inputValue)}&api_key=${provider.apiKey}`;
    } else if (configType === 'email' && providerType.includes('hunter')) {
      url = `${provider.endpoint}/email-verifier?email=${encodeURIComponent(inputValue)}&api_key=${provider.apiKey}`;
    } else {
      console.error('Unsupported config type or provider:', { configType, providerType });
      return res.status(400).json({ message: `Unsupported enrichment type (${configType}) or provider (${provider.type})` });
    }

    console.log('Provider API URL:', url);
    const response = await axios.get(url);
    const data = response.data.data || {};

    console.log('API response data:', JSON.stringify(data, null, 2));

    // Helper to get nested values like "name.fullName" or "geo.city"
    const getNestedValue = (obj, path) => {
      return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj);
    };

    // Build output fields from nested paths
    const output = config.outputFields.reduce((acc, field) => {
      const value = getNestedValue(data, field);
      console.log(`Field ${field}:`, value);
      acc[field] = value;
      return acc;
    }, {});

    return res.json({
      input: inputValue,
      output
    });

  } catch (err) {
    console.error('Enrichment error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    return res.status(500).json({ message: 'Enrichment failed', error: err.message });
  }
});

// Delete an enrichment configuration
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const config = await EnrichmentConfig.findOne({ _id: req.params.id, userId: req.userId });
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found or unauthorized' });
    }
    await EnrichmentConfig.deleteOne({ _id: req.params.id });
    res.json({ message: 'Configuration deleted successfully' });
  } catch (err) {
    console.error('Error deleting enrichment config:', err);
    res.status(500).json({ message: 'Error deleting enrichment config', error: err.message });
  }
});

module.exports = router;