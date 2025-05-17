const express = require('express');
const router = express.Router();
const userSettingsController = require('../controllers/userSettingsController');
const authMiddleware = require('../middleware/authMiddleware');

// Get user settings
router.get('/', authMiddleware, userSettingsController.getUserSettings);

// Save user settings
router.post('/', authMiddleware, userSettingsController.saveUserSettings);

module.exports = router; 