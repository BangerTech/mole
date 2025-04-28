const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const emailRoutes = require('./routes/emailRoutes');
const authRoutes = require('./routes/authRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.use('/api/email', emailRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/ai', aiRoutes);

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