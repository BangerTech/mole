/**
 * Database Routes
 * Routes for handling database connection operations
 */

const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');

// Test a database connection - specific routes should come before parameterized routes
router.post('/test', databaseController.testConnection);
// Also support the frontend expected path
router.post('/test-connection', databaseController.testConnection);

// Get all database connections
router.get('/', databaseController.getAllConnections);
// Also support the frontend expected path
router.get('/connections', databaseController.getAllConnections);

// Create a new database connection
router.post('/', databaseController.createConnection);
// Also support the frontend expected path
router.post('/connections', databaseController.createConnection);

// Routes with connection ID parameters should come after fixed paths
// Get a single database connection by ID
router.get('/:id', databaseController.getConnectionById);
// Also support the frontend expected path
router.get('/connections/:id', databaseController.getConnectionById);

// Update an existing database connection
router.put('/:id', databaseController.updateConnection);
// Also support the frontend expected path
router.put('/connections/:id', databaseController.updateConnection);

// Delete a database connection
router.delete('/:id', databaseController.deleteConnection);
// Also support the frontend expected path
router.delete('/connections/:id', databaseController.deleteConnection);

module.exports = router; 