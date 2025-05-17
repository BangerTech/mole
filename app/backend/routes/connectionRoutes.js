const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all connection routes
router.use(authMiddleware);

// Get all connections
router.get('/', connectionController.getAllConnections);

// Get a specific connection
router.get('/:id', connectionController.getConnectionById);

// Create a new connection
router.post('/', connectionController.createConnection);

// Update an existing connection
router.put('/:id', connectionController.updateConnection);

// Delete a connection
router.delete('/:id', connectionController.deleteConnection);

// Update last used timestamp
router.put('/:id/used', connectionController.updateLastUsed);

module.exports = router; 