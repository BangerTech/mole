const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Import routes
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Create Express app
const app = express();

// Define Python backend URL for proxying requests
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://db-sync:5000';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/ai', aiRoutes);

// System info route - proxies to db-sync service
app.get('/api/system/info', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_BACKEND_URL}/api/system/info`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching system info:', error.message);
    // Return fallback mock data if the db-sync service is not available
    res.json({
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      uptime: 'Not available'
    });
  }
});

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Mole Database Manager API' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 