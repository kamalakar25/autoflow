const mongoose = require('mongoose');

const exportSyncSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  company: String,
  enriched: Boolean,
});

module.exports = mongoose.model('ExportSync', exportSyncSchema);
