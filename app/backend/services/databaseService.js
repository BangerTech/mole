/**
 * Database Service
 * Provides methods for database connection management with support for both
 * direct SQLite and Sequelize ORM implementations
 */

const { getDbConnection } = require('../models/database');
const DatabaseConnection = require('../models/DatabaseConnection');
const { encrypt, decrypt } = require('../utils/encryptionUtil');
const eventLogService = require('./eventLogService'); // Import Event Log Service
// Import DB drivers needed for internal schema fetch
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const fs = require('fs'); // Needed for SQLite check
const { formatBytes } = require('../utils/formatUtils'); // Import from backend utils

// Flag to determine which implementation to use
// This can be switched in the future when fully migrated to Sequelize
const USE_SEQUELIZE = false; // Set to true when ready to use Sequelize implementation

// Helper function to parse size string (e.g., "22 MB", "1.5 GB") into bytes
// Moved from controller to be reusable here
const parseSizeToBytes = (sizeStr) => {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  const sizeMatch = sizeStr.match(/([\d.]+)\s*(Bytes|KB|MB|GB|TB)/i);
  if (sizeMatch) {
    const value = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toUpperCase();
    switch (unit) {
      case 'BYTES': return value;
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      case 'TB': return value * 1024 * 1024 * 1024 * 1024;
      default: return 0;
    }
  }
  return 0;
};

// Internal helper function to fetch schema details from a target DB
async function _fetchSchemaDetails(connectionConfig) {
    const { engine, host, port, database, username, password, ssl_enabled } = connectionConfig;
    let tables = [];
    let tableColumns = {};
    let totalSizeFormatted = 'N/A';
    let success = false;
    let message = null;

    // Decrypt password if necessary (assuming password passed here is already decrypted)
    const plainPassword = password; 

    try {
        if (engine.toLowerCase() === 'mysql') {
            const mysqlConnection = await mysql.createConnection({
                 host: host || 'localhost', port: port || 3306, database, user: username,
                 password: plainPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
                 connectTimeout: 10000
            });
            try {
                const [tablesResult] = await mysqlConnection.query('SELECT table_name AS name, table_type AS type, table_rows AS row_count, ROUND((data_length + index_length) / 1024) AS size_kb FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name', [database]);
                const [columnsResult] = await mysqlConnection.query('SELECT table_name, column_name AS name, data_type AS type, is_nullable AS nullable, column_default AS default_value, column_key AS key, extra FROM information_schema.columns WHERE table_schema = ? ORDER BY table_name, ordinal_position', [database]);
                
                columnsResult.forEach(column => {
                    if (!tableColumns[column.table_name]) tableColumns[column.table_name] = [];
                    tableColumns[column.table_name].push({ name: column.name, type: column.type, nullable: column.nullable === 'YES', default: column.default_value, key: column.key, extra: column.extra });
                });

                let totalSizeRaw = 0;
                tables = tablesResult.map(table => {
                    const sizeKb = Math.max(1, table.size_kb || 0);
                    totalSizeRaw += sizeKb * 1024;
                    return {
                        name: table.name,
                        type: table.type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
                        rows: table.row_count || 0,
                        size: `${sizeKb} KB`,
                        columns: tableColumns[table.name]?.length || 0,
                        lastUpdated: new Date().toISOString().split('T')[0] 
                    };
                });
                totalSizeFormatted = formatBytes(totalSizeRaw);
                success = true;
            } finally {
                await mysqlConnection.end();
            }
        } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
            const pool = new Pool({ host: host || 'localhost', port: port || 5432, database, user: username, password: plainPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
            const client = await pool.connect();
            try {
                const tablesQuery = `SELECT table_name AS name, table_type AS type, (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) AS columns FROM information_schema.tables t WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW') ORDER BY table_name`;
                const tablesResult = await client.query(tablesQuery);
                
                const sizeQuery = `SELECT c.relname AS name, pg_size_pretty(pg_total_relation_size(c.oid)) AS size FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v') ORDER BY c.relname`;
                const sizeResult = await client.query(sizeQuery);
                const sizeMap = {};
                 let totalSizeRaw = 0;
                sizeResult.rows.forEach(row => {
                     sizeMap[row.name] = { size: row.size || '0 KB' };
                     totalSizeRaw += parseSizeToBytes(row.size);
                });
                totalSizeFormatted = formatBytes(totalSizeRaw);

                const columnsQuery = `SELECT c.table_name, c.column_name AS name, c.data_type AS type, c.is_nullable AS nullable, c.column_default AS default_value, CASE WHEN pk.column_name IS NOT NULL THEN 'PRI' WHEN uk.column_name IS NOT NULL THEN 'UNI' WHEN fk.column_name IS NOT NULL THEN 'FOR' ELSE '' END AS key FROM information_schema.columns c LEFT JOIN (SELECT kcu.column_name, kcu.table_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public') pk ON pk.column_name = c.column_name AND pk.table_name = c.table_name LEFT JOIN (SELECT kcu.column_name, kcu.table_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public') uk ON uk.column_name = c.column_name AND uk.table_name = c.table_name LEFT JOIN (SELECT kcu.column_name, kcu.table_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public') fk ON fk.column_name = c.column_name AND fk.table_name = c.table_name WHERE c.table_schema = 'public' ORDER BY c.table_name, c.ordinal_position`;
                const columnsResult = await client.query(columnsQuery);
                
                columnsResult.rows.forEach(column => {
                    if (!tableColumns[column.table_name]) tableColumns[column.table_name] = [];
                    tableColumns[column.table_name].push({ name: column.name, type: column.type, nullable: column.nullable === 'YES', default: column.default_value, key: column.key, extra: '' });
                });

                tables = tablesResult.rows.map(table => ({
                    name: table.name,
                    type: table.type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
                    rows: 0, // Row count removed earlier
                    size: sizeMap[table.name]?.size || '0 KB',
                    columns: table.columns || 0,
                    lastUpdated: new Date().toISOString().split('T')[0]
                }));
                totalSizeFormatted = formatBytes(totalSizeRaw);
                success = true;
            } catch(pgError) {
                 console.error('Internal PostgreSQL schema error:', pgError);
                 message = pgError.message; // Store error message
                 // Try simplified query on error
                 try {
                    const simplifiedTablesQuery = `SELECT table_name::text AS name FROM information_schema.tables WHERE table_schema = 'public'`;
                    const fallbackResult = await client.query(simplifiedTablesQuery);
                    tables = fallbackResult.rows.map(row => ({ name: row.name, type: 'TABLE', rows: 0, size: 'Unknown', columns: 0, lastUpdated: new Date().toISOString().split('T')[0] }));
                    tableColumns = {}; // No column info in fallback
                    totalSizeFormatted = 'N/A';
                    success = true; // Partial success
                    message = 'Simplified schema returned due to error with detailed query';
                 } catch (fallbackErr) {
                    console.error('Internal PostgreSQL fallback schema error:', fallbackErr);
                    message = `Failed to retrieve schema details: ${pgError.message}`; // Report original error
                 }
            } finally {
                client.release();
                await pool.end();
            }
        } else if (engine.toLowerCase() === 'sqlite') {
            // Basic check: does the file exist?
             if (fs.existsSync(database)) {
                 // TODO: Implement actual SQLite schema fetching if needed
                 success = true;
                 message = 'SQLite schema retrieval not fully implemented.';
             } else {
                 message = 'SQLite file not found.';
             }
             totalSizeFormatted = 'N/A'; // Size not calculated for SQLite
        } else {
            message = `Unsupported engine: ${engine}`; 
        }
    } catch (error) {
        console.error('Error fetching schema details internally:', error);
        message = error.message || 'Failed to retrieve database schema';
    }

    return { success, tables, tableColumns, totalSize: totalSizeFormatted, message };
}

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
      
      // Log event
      await eventLogService.addEntry('CONNECTION_CREATED', `Connection \"${newConnection.name}\" created.`, newConnection.id);

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
      
      // Log event
      await eventLogService.addEntry('CONNECTION_UPDATED', `Connection \"${updatedConnection.name}\" updated.`, id);

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
      
      // Log event
      await eventLogService.addEntry('CONNECTION_DELETED', `Connection with ID ${id} deleted.`, id);

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
  },

  /**
   * Fetches schema details for a connection (used internally and by controller).
   * Handles fetching connection details and decryption.
   * @param {number} connectionId - The ID of the connection.
   * @returns {Promise<Object>} Schema details object.
   */
  async fetchSchemaForConnection(connectionId) {
    try {
        const connection = await this.getConnectionByIdFull(connectionId); // Fetch full details including password
        if (!connection) {
             throw new Error('Database connection not found');
        }
        if (connection.isSample) {
            // Handle mock schema for Sample DB if needed, or return empty
             return { success: true, tables: [], tableColumns: {}, totalSize: 'N/A', message: 'Schema not applicable for Sample DB' };
        }
        
        let decryptedPassword = '';
        if (connection.encrypted_password) {
            try {
                decryptedPassword = decrypt(connection.encrypted_password);
            } catch (e) {
                console.error('Decryption failed in fetchSchemaForConnection', e);
                throw new Error('Password decryption failed');
            }
        } else {
             decryptedPassword = connection.password; // Use plain password if no encrypted one
        }

        const config = { ...connection, password: decryptedPassword };
        return await _fetchSchemaDetails(config);

    } catch (error) {
        console.error(`Error fetching schema for connection ${connectionId}:`, error);
         return { success: false, tables: [], tableColumns: {}, totalSize: 'N/A', message: error.message };
    }
  },

   /**
    * Internal helper to get full connection details including encrypted password.
    * @param {number} id - Connection ID
    * @returns {Promise<Object>} Full database connection object (or null)
    */
   async getConnectionByIdFull(id) {
       // Assuming direct SQLite implementation for simplicity
       const db = await getDbConnection();
       try {
         const connection = await db.get(
           'SELECT * FROM database_connections WHERE id = ?',
           id
         );
         return connection; // Return full object including passwords
       } finally {
         await db.close();
       }
   },
};

module.exports = databaseService; 