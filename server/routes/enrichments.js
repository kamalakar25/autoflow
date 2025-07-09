const express = require('express');
const router = express.Router();
const Enrichment = require('../models/Enrichment');
const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const authMiddleware = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// Get all enrichments for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const enrichments = await Enrichment.find({ userId: req.userId });
    res.json(enrichments || []);
  } catch (err) {
    console.error('Error fetching enrichments:', err);
    res.status(500).json({ message: 'Error fetching enrichments', error: err.message });
  }
});

// Create a new enrichment for the authenticated user
router.post('/', authMiddleware, async (req, res) => {
  try {
    const enrichment = new Enrichment({
      ...req.body,
      userId: req.userId
    });
    await enrichment.save();
    res.json(enrichment);
  } catch (err) {
    console.error('Error saving enrichment:', err);
    res.status(500).json({ message: 'Error saving enrichment', error: err.message });
  }
});

// Upload and process CSV for the authenticated user
router.post('/upload-csv/:configId', authMiddleware, upload.single('file'), async (req, res) => {
  const configId = req.params.config;
  const filePath = req.file.path;

  const records = [];
  try {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => records.push(data))
      .on('end', async () => {
        const enrichedResults = [];

        for (const record of records) {
          try {
            const response = await axios.post(
              `http://localhost:5000/api/enrichment-configs/run/${configId}`,
              { ...record, userId: req.userId },
              { headers: { 'Content-Type':req.headers['content-type'] || 'application/json', 'Authorization': req.header('Authorization') } }
            );

            // Save enrichment record
            const enrichment = new Enrichment({
              userId: req.userId,
              type: response.data.type || 'unknown',
              source: response.data.source || 'csv',
              status: 'completed',
              enrichedFields: response.data.output,
              accuracy: response.data.accuracy || 0
            });
            await enrichment.save();

            enrichedResults.push({
              input: record,
              output: response.data.output
            });
          } catch (err) {
            enrichedResults.push({
              input: record,
              error: err.response?.data || err.message
            });
          }
        }

        res.json({ success: true, enrichedResults });
        fs.unlinkSync(filePath); // Clean up
      })
      .on('error', (err) => {
        console.error('Error processing CSV:', err);
        res.status(500).json({ message: 'Error processing CSV', error: err.message });
        fs.unlinkSync(filePath);
      });
  } catch (err) {
    console.error('Error in upload-csv:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

module.exports = router;