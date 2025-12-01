const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'InvoQuot Backend is running',
    company: 'AksagenSet Services',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', require('./routes/api'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 InvoQuot Backend running on port ${PORT}`);
  console.log(`🏢 ${process.env.COMPANY_NAME || 'AksagenSet Services'}`);
});