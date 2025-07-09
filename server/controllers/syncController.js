const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const Record = require('../models/export');
const axios = require('axios');

// Dummy enrichment
const enrichData = (data) => {
  return data.map(item => ({
    name: item.name,
    email: item.email,
    phone: item.phone,
    company: item.company || 'CMR Solutions',
    enriched: true
  }));
};


// File Upload and Save
exports.uploadAndParse = async (req, res) => {
  const file = req.file;
  let records = [];

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  if (file.mimetype === 'text/csv') {
    fs.createReadStream(file.path)
      .pipe(csv())
      .on('data', row => records.push(row))
      .on('end', async () => {
        const enriched = enrichData(records);
        await Record.insertMany(enriched);
        fs.unlinkSync(file.path);
        res.json({ message: 'CSV Uploaded and Synced', records: enriched });
      });
  } else {
    const workbook = XLSX.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    records = XLSX.utils.sheet_to_json(sheet);
    const enriched = enrichData(records);
    await Record.insertMany(enriched);
    fs.unlinkSync(file.path);
    res.json({ message: 'Excel Uploaded and Synced', records: enriched });
  }
};

// HubSpot Sync
exports.syncToHubSpot = async (req, res) => {
  const records = await Record.find({ enriched: true });
  const token = 'Bearer YOUR_HUBSPOT_PRIVATE_APP_TOKEN';

  const promises = records.map(record =>
    axios.post('https://api.hubapi.com/crm/v3/objects/contacts', {
      properties: {
        email: record.email,
        firstname: record.name,
        phone: record.phone,
        company: record.company
      }
    }, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    }).catch(err => console.log(`HubSpot error: ${err.message}`))
  );

  await Promise.all(promises);
  res.json({ message: 'Synced to HubSpot Successfully' });
};

// Zoho Sync
exports.syncToZoho = async (req, res) => {
  const records = await Record.find({ enriched: true });
  const token = 'Zoho-oauthtoken YOUR_ZOHO_ACCESS_TOKEN';

  const payload = {
    data: records.map(record => ({
      Last_Name: record.name,
      Email: record.email,
      Phone: record.phone,
      Account_Name: record.company || 'CMR Default',
    })),
    trigger: ['workflow']
  };

  try {
    await axios.post('https://www.zohoapis.com/crm/v2/Contacts', payload, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });

    res.json({ message: 'Synced to Zoho CRM Successfully' });
  } catch (err) {
    console.error('Zoho sync failed:', err.message);
    res.status(500).json({ error: 'Zoho sync failed' });
  }
};
