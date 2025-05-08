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

// Get all configured sync tasks for overview
router.get('/tasks', syncController.getAllSyncTasks);

// Delete a specific sync task by its ID
router.delete('/tasks/:taskId', syncController.deleteSyncTask);

// Update a specific sync task by its ID (e.g., enable/disable, change schedule)
router.put('/tasks/:taskId', syncController.updateSyncTask);

module.exports = router; 