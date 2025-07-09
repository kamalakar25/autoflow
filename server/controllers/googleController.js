const { GoogleSpreadsheet } = require('google-spreadsheet');
const Record = require('../models/export');

exports.exportToGoogleSheets = async (req, res) => {
  try {
    const creds = require('../credentials/google-service-account.json');
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['Leads'];
    if (!sheet) {
      sheet = await doc.addSheet({ title: 'Leads', headerValues: ['name', 'email', 'phone', 'company', 'enriched'] });
    }

    const records = await Record.find();
    await sheet.clear(); // clear existing
    await sheet.setHeaderRow(['name', 'email', 'phone', 'company', 'enriched']);
    await sheet.addRows(records.map(r => r.toObject()));

    res.json({ message: 'Exported to Google Sheets successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google Sheets export failed' });
  }
};
