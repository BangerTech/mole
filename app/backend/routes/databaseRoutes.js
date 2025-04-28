/**
 * Database Routes
 * Routes for handling database connection operations
 */

const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');

// Test a database connection - specific routes should come before parameterized routes
router.post('/test', databaseController.testConnection);
router.post('/test-connection', databaseController.testConnection); // Maintain backward compatibility

// Route for all database connections
// Compatibility with both new and old API paths
router.get('/', databaseController.getAllConnections);
router.get('/connections', databaseController.getAllConnections);

// Create a new database connection
// Compatibility with both new and old API paths
router.post('/', databaseController.createConnection);
router.post('/connections', databaseController.createConnection);

// Routes for specific database connection by ID
// Compatibility with both new and old API paths
router.get('/:id', databaseController.getConnectionById);
router.put('/:id', databaseController.updateConnection);
router.delete('/:id', databaseController.deleteConnection);

router.get('/connections/:id', databaseController.getConnectionById);
router.put('/connections/:id', databaseController.updateConnection);
router.delete('/connections/:id', databaseController.deleteConnection);

module.exports = router; 