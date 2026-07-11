const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));


// gives back a usable URL in dev, swap this out once STORAGE_DRIVER=s3
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api', candidateRoutes); 
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// multer errors (bad file type, too big) land here instead of crashing
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || 'something went wrong' });
  }
  next();
});

app.use((req, res) => res.status(404).json({ error: 'route not found' }));

module.exports = app;
