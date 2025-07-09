const express = require('express');
const app = express();
const port = 5000;

app.use(express.json());

app.get('/api/scraper', (req, res) => {
  res.json({ message: 'Scraper API endpoint' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});