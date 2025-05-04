/**
 * Sync Routes
 * Routes for handling synchronization tasks.
 */

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
// Optional: Add authentication middleware if needed
// const authMiddleware = require('../middleware/authMiddleware');
// router.use(authMiddleware); // Apply middleware to all sync routes

// Get sync settings for a specific source database connection
router.get('/:databaseId/settings', syncController.getSyncSettings);

// Update sync settings for a specific source database connection
router.put('/:databaseId/settings', syncController.updateSyncSettings);

// Trigger a manual sync for a specific source database connection
router.post('/:databaseId/trigger', syncController.triggerSync);

module.exports = router; 