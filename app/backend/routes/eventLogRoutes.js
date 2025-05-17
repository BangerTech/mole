/**
 * Event Log Routes
 */

const express = require('express');
const router = express.Router();
const eventLogController = require('../controllers/eventLogController');

// GET recent event logs
router.get('/', eventLogController.getRecentEvents);

module.exports = router; 