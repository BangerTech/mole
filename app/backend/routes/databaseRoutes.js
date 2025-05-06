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

// Get database schema (tables, columns, etc.)
router.get('/:id/schema', databaseController.getDatabaseSchema);
router.get('/connections/:id/schema', databaseController.getDatabaseSchema);

// Get database health status
router.get('/:id/health', databaseController.getDatabaseHealth);

// Get paginated/sorted data for a specific table
router.get('/:id/tables/:tableName/data', databaseController.getTableData);

// Create a new table
router.post('/:id/tables', databaseController.createTable);

// Insert a new row into a table
router.post('/:id/tables/:tableName/rows', databaseController.insertTableRow);

// Add a new column to a table
router.post('/:id/tables/:tableName/columns', databaseController.addColumnToTable);

// Edit an existing column in a table
router.put('/:id/tables/:tableName/columns/:columnName', databaseController.editColumnInTable);

// Delete a column from a table
router.delete('/:id/tables/:tableName/columns/:columnName', databaseController.deleteColumnFromTable);

// Delete a table
router.delete('/:id/tables/:tableName', databaseController.deleteTable);

// Get top N largest tables across all databases
router.get('/top-tables', databaseController.getTopTables);

// Execute SQL query
router.post('/:id/execute', databaseController.executeQuery);
router.post('/connections/:id/execute', databaseController.executeQuery);

// Routes for specific database connection by ID
// Compatibility with both new and old API paths
router.get('/:id', databaseController.getConnectionById);
router.put('/:id', databaseController.updateConnection);
router.delete('/:id', databaseController.deleteConnection);

router.get('/connections/:id', databaseController.getConnectionById);
router.put('/connections/:id', databaseController.updateConnection);
router.delete('/connections/:id', databaseController.deleteConnection);

// New route for creating database instances
router.post('/create-instance', databaseController.createDatabaseInstance);

// New route for getting database storage information
router.get('/:id/storage-info', databaseController.getDatabaseStorageInfo);

// New route for getting database transaction statistics
router.get('/:id/transaction-stats', databaseController.getDatabaseTransactionStats);

module.exports = router; 