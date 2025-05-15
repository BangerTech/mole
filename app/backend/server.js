const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const { initDatabase } = require('./models/database');
const fs = require('fs');
const authMiddleware = require('./middleware/authMiddleware'); // Import authMiddleware

// Load environment variables
dotenv.config();

// Import routes
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const aiRoutes = require('./routes/aiRoutes');
const eventLogRoutes = require('./routes/eventLogRoutes');
// Import sync routes
const syncRoutes = require('./routes/syncRoutes');
const userSettingsRoutes = require('./routes/userSettingsRoutes');
// Import user management routes
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // Import notification routes

// Create Express app
const app = express();

// Define Python backend URL for proxying requests
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://db-sync:5000';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure data/avatars directory exists (changed from public/avatars)
const dataAvatarsDir = path.join(__dirname, 'data/avatars');
if (!fs.existsSync(dataAvatarsDir)){
    fs.mkdirSync(dataAvatarsDir, { recursive: true });
    console.log(`Created directory: ${dataAvatarsDir}`);
}

// Serve static files from 'data' directory (for avatars etc. accessible via /data/avatars/...)
app.use('/data', express.static(path.join(__dirname, 'data')));

// Initialize database
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Serve static files from the React app build directory
// Use path.resolve from __dirname to get the correct absolute path
const buildPath = path.resolve(__dirname, '..', 'react-ui', 'build');
console.log(`Serving static files from: ${buildPath}`); 
app.use(express.static(buildPath));

// --- API Routes --- 
app.use('/api/databases', authMiddleware, databaseRoutes); // Apply authMiddleware
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventLogRoutes);
// Mount sync routes under /api/sync
app.use('/api/sync', syncRoutes);
app.use('/api/user/settings', userSettingsRoutes);
// Mount user management routes under /api/users
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes); // Mount notification routes

// --- System Info Proxy Routes --- 
// Proxy GET /api/system/info to Python backend
app.get('/api/system/info', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_BACKEND_URL}/api/system/info`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying /api/system/info:', error.message);
    res.status(error.response?.status || 502).json({
      message: 'Failed to fetch system info from service.',
      error: error.message
    });
  }
});

// Proxy GET /api/system/performance-history to Python backend
app.get('/api/system/performance-history', async (req, res) => {
    const { metric, limit } = req.query;
    try {
        const response = await axios.get(`${PYTHON_BACKEND_URL}/api/system/performance-history`, {
            params: { metric, limit } // Forward query params
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error proxying /api/system/performance-history:', error.message);
        res.status(error.response?.status || 502).json({
            message: 'Failed to fetch performance history from service.',
            error: error.message
        });
    }
});
// --- End System Info Proxy --- 

// Base route
app.get('/', (req, res) => {
  // Send index.html for root path as well to handle direct access
  const indexPath = path.resolve(__dirname, '..', 'react-ui', 'build', 'index.html');
  res.sendFile(indexPath, (err) => {
      if (err) {
          console.error('Error sending index.html for root:', err);
          res.status(500).send(err.message);
      }
  });
});

// The "catchall" handler: for any other request that doesn't
// match one above, send back React's index.html file.
app.get('*' , (req, res) => {
  const indexPath = path.resolve(__dirname, '..', 'react-ui', 'build', 'index.html');
  res.sendFile(indexPath, (err) => {
      if (err) {
          // Avoid sending error if it's just a typical 404 for an asset not found
          if (!err.message.includes('no such file or directory')) {
             console.error('Error sending index.html catchall:', err);
          }
          // Gracefully handle not found without crashing if possible
          if (!res.headersSent) {
             res.status(404).send('Not Found');
          }
      }
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 