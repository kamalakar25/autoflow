// syncRoutes.js
const express = require('express');
const multer = require('multer');
const {
  uploadAndParse,
  syncToHubSpot,
  syncToZoho
} = require('../controllers/syncController');
const {
  exportToCSV,
  exportToExcel
} = require('../controllers/exportController');
const { exportToGoogleSheets } = require('../controllers/googleController');
const { syncToSalesforce } = require('../controllers/sfNotionController'); // Remove syncToNotion

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadAndParse);
router.post('/sync/hubspot', syncToHubSpot);
router.post('/sync/zoho', syncToZoho);
router.post('/sync/salesforce', syncToSalesforce);
// router.post('/sync/notion', syncToNotion); // Comment out or remove

router.get('/export/csv', exportToCSV);
router.get('/export/excel', exportToExcel);
router.post('/export/google', exportToGoogleSheets);

module.exports = router;