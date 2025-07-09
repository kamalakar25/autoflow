const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const Record = require('../models/export');

// CSV Export
exports.exportToCSV = async (req, res) => {
  const records = await Record.find();
  const parser = new Parser();
  const csv = parser.parse(records.map(r => r.toObject()));

  res.header('Content-Type', 'text/csv');
  res.attachment('records.csv');
  res.send(csv);
};

// Excel Export
exports.exportToExcel = async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leads');

  worksheet.columns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Company', key: 'company' },
    { header: 'Enriched', key: 'enriched' }
  ];

  const records = await Record.find();
  records.forEach(record => worksheet.addRow(record.toObject()));

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename=records.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};
