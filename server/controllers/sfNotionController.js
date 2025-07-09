require('dotenv').config();
const jsforce = require('jsforce');
const { Client } = require('@notionhq/client');
const Record = require('../models/export');

// Salesforce Sync
exports.syncToSalesforce = async (req, res) => {
  const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL
  });

  try {
    await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD + process.env.SF_TOKEN);

    const recs = await Record.find({ enriched: true });
    const contacts = recs.map(r => ({
      FirstName: r.name,
      LastName: r.company.substr(0,1) || ' ',
      Email: r.email,
      Phone: r.phone,
      AccountId: process.env.SF_ACCOUNT_ID // optional
    }));

    const result = await conn.sobject('Contact').create(contacts);
    res.json({ message: 'Synced to Salesforce successfully', result });
  } catch (err) {
    console.error('SF sync error', err);
    res.status(500).json({ error: 'Salesforce sync failed' });
  }
};
