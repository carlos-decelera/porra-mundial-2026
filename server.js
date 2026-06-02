require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDb } = require('./db');
const api = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// HTML never cached; other static assets cached 1 hour
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use('/api', api);

initDb()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
