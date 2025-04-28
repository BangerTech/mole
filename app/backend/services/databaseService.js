/**
 * Database Service
 * Provides methods for database connection management with support for both
 * direct SQLite and Sequelize ORM implementations
 */

const { getDbConnection } = require('../models/database');
const DatabaseConnection = require('../models/DatabaseConnection');
const { encrypt, decrypt } = require('../utils/encryptionUtil');

// Flag to determine which implementation to use
// This can be switched in the future when fully migrated to Sequelize
const USE_SEQUELIZE = false; // Set to true when ready to use Sequelize implementation

const databaseService = {
  /**
   * Get all database connections
   * @returns {Promise<Array>} List of database connections
   */
  async getAllConnections() {
    if (USE_SEQUELIZE) {
      // Sequelize implementation
      return await DatabaseConnection.findAll({
        order: [['name', 'ASC']]
      });
    } else {
      // Direct SQLite implementation
      const db = await getDbConnection();
      const connections = await db.all('SELECT * FROM database_connections ORDER BY name');
      await db.close();
      
      // Sanitize password fields for security
      return connections.map(conn => {
        const result = { ...conn };
        result.password = undefined;
        return result;
      });
    }
  },
  
  /**
   * Get a database connection by ID
   * @param {number} id - Connection ID
   * @returns {Promise<Object>} Database connection
   */
  async getConnectionById(id) {
    if (USE_SEQUELIZE) {
      // Sequelize implementation
      return await DatabaseConnection.findByPk(id);
    } else {
      // Direct SQLite implementation
      const db = await getDbConnection();
      const connection = await db.get(
        'SELECT * FROM database_connections WHERE id = ?',
        id
      );
      await db.close();
      
      // Sanitize password
      if (connection) {
        connection.password = undefined;
      }
      
      return connection;
    }
  },
  
  /**
   * Create a new database connection
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Object>} Created database connection
   */
  async createConnection(connectionData) {
    const now = new Date().toISOString();
    
    if (USE_SEQUELIZE) {
      // Sequelize implementation
      return await DatabaseConnection.create({
        ...connectionData,
        created_at: now,
        updated_at: now
      });
    } else {
      // Direct SQLite implementation
      const db = await getDbConnection();
      
      // Encrypt sensitive data
      const encrypted_password = connectionData.password ? encrypt(connectionData.password) : null;
      
      // Insert new connection
      const result = await db.run(
        `INSERT INTO database_connections
         (name, engine, host, port, database, username, password, ssl_enabled, notes, isSample, 
          created_at, updated_at, encrypted_password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          connectionData.name,
          connectionData.engine,
          connectionData.host,
          connectionData.port,
          connectionData.database,
          connectionData.username,
          connectionData.password, // Keep for backward compatibility
          connectionData.ssl_enabled ? 1 : 0,
          connectionData.notes || '',
          connectionData.isSample ? 1 : 0,
          now,
          now,
          encrypted_password
        ]
      );
      
      // Get the newly created connection
      const newConnection = await db.get(
        'SELECT * FROM database_connections WHERE id = ?',
        result.lastID
      );
      
      await db.close();
      
      // Sanitize password
      if (newConnection) {
        newConnection.password = undefined;
      }
      
      return newConnection;
    }
  },
  
  /**
   * Update a database connection
   * @param {number} id - Connection ID
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Object>} Updated database connection
   */
  async updateConnection(id, connectionData) {
    const now = new Date().toISOString();
    
    if (USE_SEQUELIZE) {
      // Sequelize implementation
      const connection = await DatabaseConnection.findByPk(id);
      
      if (!connection) {
        throw new Error('Database connection not found');
      }
      
      await connection.update({
        ...connectionData,
        updated_at: now
      });
      
      return connection;
    } else {
      // Direct SQLite implementation
      const db = await getDbConnection();
      
      // Check if connection exists
      const connection = await db.get(
        'SELECT * FROM database_connections WHERE id = ?',
        id
      );
      
      if (!connection) {
        await db.close();
        throw new Error('Database connection not found');
      }
      
      // Encrypt password if provided
      let encrypted_password = connection.encrypted_password;
      if (connectionData.password) {
        encrypted_password = encrypt(connectionData.password);
      }
      
      // Update the connection
      await db.run(
        `UPDATE database_connections SET
         name = ?,
         engine = ?,
         host = ?,
         port = ?,
         database = ?,
         username = ?,
         password = ?,
         ssl_enabled = ?,
         notes = ?,
         isSample = ?,
         updated_at = ?,
         encrypted_password = ?
         WHERE id = ?`,
        [
          connectionData.name || connection.name,
          connectionData.engine || connection.engine,
          connectionData.host || connection.host,
          connectionData.port || connection.port,
          connectionData.database || connection.database,
          connectionData.username || connection.username,
          connectionData.password || connection.password, // Keep for backward compatibility
          connectionData.ssl_enabled !== undefined ? (connectionData.ssl_enabled ? 1 : 0) : connection.ssl_enabled,
          connectionData.notes || connection.notes,
          connectionData.isSample !== undefined ? (connectionData.isSample ? 1 : 0) : connection.isSample,
          now,
          encrypted_password,
          id
        ]
      );
      
      // Get the updated connection
      const updatedConnection = await db.get(
        'SELECT * FROM database_connections WHERE id = ?',
        id
      );
      
      await db.close();
      
      // Sanitize password
      if (updatedConnection) {
        updatedConnection.password = undefined;
      }
      
      return updatedConnection;
    }
  },
  
  /**
   * Delete a database connection
   * @param {number} id - Connection ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteConnection(id) {
    if (USE_SEQUELIZE) {
      // Sequelize implementation
      const connection = await DatabaseConnection.findByPk(id);
      
      if (!connection) {
        throw new Error('Database connection not found');
      }
      
      await connection.destroy();
      return true;
    } else {
      // Direct SQLite implementation
      const db = await getDbConnection();
      
      // Check if connection exists
      const connection = await db.get(
        'SELECT id FROM database_connections WHERE id = ?',
        id
      );
      
      if (!connection) {
        await db.close();
        throw new Error('Database connection not found');
      }
      
      // Delete the connection
      await db.run(
        'DELETE FROM database_connections WHERE id = ?',
        id
      );
      
      await db.close();
      return true;
    }
  },
  
  /**
   * Test a database connection
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Object>} Test result
   */
  async testConnection(connectionData) {
    // This function is implemented in databaseController.js
    // We're not moving it to the service layer because it has specific
    // external dependencies (mysql2, pg) and doesn't involve our database models
    throw new Error('Not implemented in the service layer');
  }
};

module.exports = databaseService; 