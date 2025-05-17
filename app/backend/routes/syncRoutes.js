/**
 * Sync Routes
 * Routes for handling synchronization tasks.
 */

const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const authMiddleware = require('../middleware/authMiddleware');

// Route for Python service to update job status (NO AUTH MIDDLEWARE - called by another backend service)
router.post('/job-status-update', syncController.handleJobStatusUpdate);

// User-facing sync routes - all protected by authMiddleware
router.get('/:databaseId/settings', authMiddleware, syncController.getSyncSettings);
router.put('/:databaseId/settings', authMiddleware, syncController.updateSyncSettings);
router.post('/:databaseId/trigger', authMiddleware, syncController.triggerSync);
router.get('/tasks', authMiddleware, syncController.getAllSyncTasks);
router.delete('/tasks/:taskId', authMiddleware, syncController.deleteSyncTask);
router.put('/tasks/:taskId', authMiddleware, syncController.updateSyncTask);

module.exports = router; 