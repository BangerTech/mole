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
const path = require('path'); // Import path module for sample query handling

// Flag to determine which implementation to use
// This can be switched in the future when fully migrated to Sequelize
const USE_SEQUELIZE = false; // Set to true when ready to use Sequelize implementation

// Define the sample database object
const SAMPLE_DB = {
  id: 'sample', // Unique ID for the sample
  name: 'Sample Database (SQLite)',
  engine: 'SQLite',
  host: null,
  port: null,
  database: '/app/data/sample_mole.db', // Example path, adjust if needed
  username: null,
  password: undefined, // Ensure password is not sent
  ssl_enabled: false,
  notes: 'A sample database included with Mole.',
  isSample: true, // Mark as sample
  created_at: new Date().toISOString(),
  last_connected: null,
  encrypted_password: null // No encrypted password for sample
};

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
                const tablesQuery = `
                  SELECT
                    t.table_name AS name,
                    t.table_type AS type,
                    (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) AS columns
                  FROM information_schema.tables t
                  WHERE t.table_schema = 'public' AND t.table_type IN ('BASE TABLE', 'VIEW')
                  ORDER BY t.table_name`;
                const tablesResult = await client.query(tablesQuery);
                console.log('[DBService_FetchSchemaPG] Raw tablesResult.rows:', JSON.stringify(tablesResult.rows.slice(0, 2), null, 2)); // Log first 2 raw rows

                // Fetch exact row counts separately (can be slow for many tables)
                const countPromises = tablesResult.rows.map(table =>
                    client.query(`SELECT count(*) AS exact_row_count FROM public."${table.name}"`)
                        .then(res => ({ name: table.name, count: parseInt(res.rows[0].exact_row_count, 10) || 0 }))
                        .catch(err => {
                            console.warn(`Could not get count for table ${table.name}: ${err.message}`);
                            return { name: table.name, count: -1 }; // Indicate error getting count
                        })
                );
                const counts = await Promise.all(countPromises);
                const countMap = counts.reduce((acc, curr) => {
                    acc[curr.name] = curr.count;
                    return acc;
                }, {});

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

                tables = tablesResult.rows.map(table => {
                    // Log individual table estimate before rounding - REMOVED ESTIMATE LOGGING
                    console.log(`[DBService_FetchSchemaPG] Table: ${table.name}, Exact count: ${countMap[table.name]}`);
                    return {
                        name: table.name,
                        type: table.type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
                        rows: countMap[table.name], // Verwende exact_row_count
                        size: sizeMap[table.name]?.size || '0 KB',
                        columns: parseInt(table.columns, 10) || 0, // Stelle sicher, dass columns eine Zahl ist
                        lastUpdated: new Date().toISOString().split('T')[0]
                    };
                });
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
      let connections = await db.all('SELECT * FROM database_connections ORDER BY name');
      await db.close();
      
      // Sanitize password fields and ensure isSample is boolean
      connections = connections.map(conn => {
        const result = { ...conn };
        result.password = undefined; // Remove plain password field
        // Ensure isSample flag is boolean (SQLite might store as 0/1)
        result.isSample = !!result.isSample;
        return result;
      });

      // If no real connections, add the sample one
      if (connections.length === 0) {
        console.log("No real connections found, adding Sample DB.");
        connections.push(SAMPLE_DB);
      }

      return connections;
    }
  },
  
  /**
   * Get a database connection by ID
   * @param {string|number} id - Connection ID
   * @returns {Promise<Object>} Database connection
   */
  async getConnectionById(id) {
     // Handle request for the Sample DB specifically
    if (id === 'sample') {
        console.log("Fetching Sample DB details.");
        return SAMPLE_DB; // Return the predefined sample object
    }
    
    // Proceed with DB lookup for real IDs
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
        connection.isSample = !!connection.isSample; // Ensure boolean
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
    // Handle test for Sample DB
    if (connectionData.id === 'sample') {
        return { success: true, message: 'Sample DB connection is always available.' };
    }
    // ... Existing test logic in databaseController.js needs to be called or moved here ...
    // For now, retain the error as it points to controller logic
    throw new Error('Test connection logic resides in databaseController.js');
  },

  /**
   * Fetches the health status for a specific database connection.
   * Uses the controller logic for actual checks, handles Sample DB here.
   * @param {string|number} connectionId The ID of the database connection.
   * @returns {Promise<Object>} A promise that resolves to the health status object { status, message }.
   */
  async getDatabaseHealth(connectionId) {
    // Handle Sample DB directly
    if (connectionId === 'sample') {
      console.log("[getDatabaseHealth] Reporting OK for Sample DB.");
      return { status: 'OK', message: 'Sample DB is virtual and always available.' };
    }

    // For real connections, we rely on the controller's implementation which handles connections
    // This service method primarily exists for consistency but might need refactoring
    // if we move all connection logic fully into the service.
    // For now, we assume the controller handles the actual check.
    // Let's simulate fetching the connection and performing a basic check here for completeness,
    // acknowledging this duplicates controller logic.
    console.log(`[getDatabaseHealth] Checking health for real connection: ${connectionId}`);
    try {
      const connection = await this.getConnectionByIdFull(connectionId);
      if (!connection) {
        return { status: 'Error', message: 'Connection not found.' };
      }

      // Minimal check: Can we fetch the connection?
      // More robust checks (ping, simple query) should ideally live here or be called from here.
      // Replicating controller logic partially:
      const { engine, database } = connection;
      if (engine && engine.toLowerCase() === 'sqlite') {
          if (fs.existsSync(database)) {
              return { status: 'OK', message: 'SQLite file exists.' };
          } else {
              // This is the case causing the user's reported error for Sample DB (now fixed above)
              return { status: 'Error', message: 'SQLite file not found.' }; 
          }
      } else {
          // Placeholder for other DB types - ideally call a real check
          // Simulating OK for now if connection details exist
          return { status: 'OK', message: 'Connection details found (real check pending).' };
      }

    } catch (error) {
      console.error(`[getDatabaseHealth] Error checking health for ${connectionId}:`, error);
      return { status: 'Error', message: `Health check failed: ${error.message}` };
    }
  },

  /**
   * Fetches schema details for a connection (used internally and by controller).
   * Handles fetching connection details and decryption.
   * @param {string|number} connectionId - The ID of the connection.
   * @returns {Promise<Object>} Schema details object.
   */
  async fetchSchemaForConnection(connectionId) {
    // Handle schema for Sample DB
    if (connectionId === 'sample') {
        console.log("Fetching schema for Sample DB.");
        // Return a predefined mock schema for the sample database (NOW WITH 6 TABLES)
        return { 
            success: true, 
            tables: [
                { name: 'users', type: 'TABLE', rows: 10, size: '1.2 MB', columns: 3, lastUpdated: '2024-01-15' },
                { name: 'products', type: 'TABLE', rows: 150, size: '15.5 MB', columns: 3, lastUpdated: '2024-01-14' },
                { name: 'orders', type: 'TABLE', rows: 500, size: '30.8 MB', columns: 3, lastUpdated: '2024-01-16' },
                { name: 'customers', type: 'TABLE', rows: 25, size: '2.1 MB', columns: 4, lastUpdated: '2024-01-10' },
                { name: 'sessions', type: 'TABLE', rows: 1000, size: '40.0 MB', columns: 5, lastUpdated: '2024-01-17' },
                { name: 'logs', type: 'TABLE', rows: 5000, size: '38.4 MB', columns: 6, lastUpdated: '2024-01-17' }
            ], 
            tableColumns: {
                'users': [ { name: 'id', type: 'INTEGER', nullable: false, default: null, key: 'PRI', extra: '' }, { name: 'name', type: 'TEXT', nullable: false }, { name: 'email', type: 'TEXT', nullable: true } ],
                'products': [ { name: 'id', type: 'INTEGER', nullable: false, default: null, key: 'PRI', extra: '' }, { name: 'name', type: 'TEXT', nullable: false }, { name: 'price', type: 'DECIMAL', nullable: true } ],
                'orders': [ { name: 'id', type: 'INTEGER', nullable: false, default: null, key: 'PRI', extra: '' }, { name: 'user_id', type: 'INTEGER', nullable: true }, { name: 'order_date', type: 'TIMESTAMP', nullable: true } ],
                'customers': [ { name: 'id', type: 'INTEGER', nullable: false, key: 'PRI' }, { name: 'first_name', type: 'TEXT' }, { name: 'last_name', type: 'TEXT' }, { name: 'signup_date', type: 'DATE' } ],
                'sessions': [ { name: 'session_id', type: 'TEXT', nullable: false, key: 'PRI' }, { name: 'user_id', type: 'INTEGER' }, { name: 'ip_address', type: 'TEXT' }, { name: 'start_time', type: 'TIMESTAMP' }, { name: 'end_time', type: 'TIMESTAMP' } ],
                'logs': [ { name: 'log_id', type: 'INTEGER', nullable: false, key: 'PRI' }, { name: 'timestamp', type: 'TIMESTAMP' }, { name: 'level', type: 'TEXT' }, { name: 'source', type: 'TEXT' }, { name: 'message', type: 'TEXT' }, { name: 'user_id', type: 'INTEGER' } ]
            },
            totalSize: '128 MB', // Keep total size consistent for now
            message: 'Displaying schema for Sample DB.' 
        };
    }

    // Proceed with fetching for real connections
    try {
        const connection = await this.getConnectionByIdFull(connectionId); // Fetch full details
        if (!connection) {
             throw new Error('Database connection not found');
        }
        // No need to check isSample here again, ID 'sample' is handled above
        
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
    * @param {string|number} id - Connection ID
    * @returns {Promise<Object>} Full database connection object (or null)
    */
   async getConnectionByIdFull(id) {
       // Handle Sample DB case
       if (id === 'sample') {
           return SAMPLE_DB;
       }
       // Assuming direct SQLite implementation for simplicity
       const db = await getDbConnection();
       try {
         const connection = await db.get(
           'SELECT * FROM database_connections WHERE id = ?',
           id
         );
         if (connection) {
             connection.isSample = !!connection.isSample;
         }
         return connection; // Return full object including passwords
       } finally {
         if (db) await db.close(); // Close connection
       }
   },

  /**
   * Fetches storage size information for a connection.
   * @param {string|number} connectionId - The ID of the connection.
   * @returns {Promise<Object>} Storage info object { success, sizeBytes, sizeFormatted, message? }.
   */
  async fetchStorageInfoForConnection(connectionId) {
    // Handle Sample DB
    if (connectionId === 'sample') {
        console.log("Fetching storage info for Sample DB.");
        const sizeBytes = 128 * 1024 * 1024; // 128 MB in bytes
        return { 
            connectionId: connectionId, // Add ID
            success: true, 
            sizeBytes: sizeBytes, 
            sizeFormatted: formatBytes(sizeBytes), 
            message: 'Displaying size for Sample DB.' 
        };
    }

    // Proceed with real connections
    let sizeBytes = 0;
    let success = false;
    let message = null;

    try {
      const connection = await this.getConnectionByIdFull(connectionId);
      if (!connection) {
        throw new Error('Database connection not found');
      }
      // No need to check isSample here again

      let decryptedPassword = '';
      if (connection.encrypted_password) {
        try {
          decryptedPassword = decrypt(connection.encrypted_password);
        } catch (e) {
          throw new Error('Password decryption failed');
        }
      } else {
        decryptedPassword = connection.password; // Use plain password
      }

      const { engine, host, port, database, username, ssl_enabled } = connection;

      if (engine.toLowerCase() === 'mysql') {
        const mysqlConnection = await mysql.createConnection({
          host: host || 'localhost', port: port || 3306, database, user: username,
          password: decryptedPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 5000 // Shorter timeout for simple query
        });
        try {
          const [rows] = await mysqlConnection.query(
            'SELECT SUM(data_length + index_length) AS size_bytes FROM information_schema.tables WHERE table_schema = ?',
            [database]
          );
          sizeBytes = rows[0]?.size_bytes || 0;
          success = true;
        } finally {
          await mysqlConnection.end();
        }
      } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
        const pool = new Pool({
          host: host || 'localhost', port: port || 5432, database, user: username,
          password: decryptedPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000
        });
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT pg_database_size(current_database()) AS size_bytes');
          sizeBytes = result.rows[0]?.size_bytes || 0;
          success = true;
        } finally {
          client.release();
          await pool.end();
        }
      } else if (engine.toLowerCase() === 'sqlite') {
        try {
          if (fs.existsSync(database)) {
            const stats = fs.statSync(database);
            sizeBytes = stats.size;
            success = true;
          } else {
            message = 'SQLite file not found.';
          }
        } catch (fileError) {
          message = `Error accessing SQLite file: ${fileError.message}`;
        }
      } else {
        message = `Storage info not supported for engine: ${engine}`;
      }
    } catch (error) {
      console.error(`Error fetching storage info for connection ${connectionId}:`, error);
      message = error.message || 'Failed to retrieve storage information';
      success = false; // Ensure success is false on error
    }

    // Ensure connectionId is included in the final return object
    return {
      connectionId: connectionId, // Add ID here for real connections too
      success,
      sizeBytes: Number(sizeBytes),
      sizeFormatted: success ? formatBytes(Number(sizeBytes)) : 'N/A',
      message
    };
  },

  /**
   * Fetches transaction statistics for a connection.
   * @param {string|number} connectionId - The ID of the connection.
   * @returns {Promise<Object>} Stats object { success, activeTransactions, totalCommits, totalRollbacks, message? }.
   */
  async fetchTransactionStatsForConnection(connectionId) {
    // Handle Sample DB
    if (connectionId === 'sample') {
        console.log("Fetching transaction stats for Sample DB.");
        return { success: true, activeTransactions: 0, totalCommits: 0, totalRollbacks: 0, message: 'Stats not applicable for Sample DB.' };
    }

    // Proceed with real connections
    let activeTransactions = 0;
    let totalCommits = 0;
    let totalRollbacks = 0;
    let success = false;
    let message = null;

    try {
      const connection = await this.getConnectionByIdFull(connectionId);
      if (!connection) {
        throw new Error('Database connection not found');
      }
      // No need to check isSample here

      let decryptedPassword = '';
      if (connection.encrypted_password) {
        try {
          decryptedPassword = decrypt(connection.encrypted_password);
        } catch (e) {
          throw new Error('Password decryption failed');
        }
      } else {
        decryptedPassword = connection.password;
      }

      const { engine, host, port, database, username, ssl_enabled } = connection;

      if (engine.toLowerCase() === 'mysql') {
        const mysqlConnection = await mysql.createConnection({
          host: host || 'localhost', port: port || 3306, database, user: username,
          password: decryptedPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 5000
        });
        try {
          const [statusRows] = await mysqlConnection.query(
            "SHOW GLOBAL STATUS WHERE Variable_name IN ('Com_commit', 'Com_rollback', 'Threads_connected')"
          );
          statusRows.forEach(row => {
            if (row.Variable_name === 'Com_commit') totalCommits = Number(row.Value);
            if (row.Variable_name === 'Com_rollback') totalRollbacks = Number(row.Value);
            // Using Threads_connected as approximation for active transactions/connections
            if (row.Variable_name === 'Threads_connected') activeTransactions = Number(row.Value);
          });
          success = true;
        } finally {
          await mysqlConnection.end();
        }
      } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
        const pool = new Pool({
          host: host || 'localhost', port: port || 5432, database, user: username,
          password: decryptedPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000
        });
        const client = await pool.connect();
        try {
          // Fetch commit/rollback counts for the current database
          const statsResult = await client.query(
            'SELECT xact_commit, xact_rollback FROM pg_stat_database WHERE datname = current_database()'
          );
          if (statsResult.rows.length > 0) {
            totalCommits = Number(statsResult.rows[0].xact_commit);
            totalRollbacks = Number(statsResult.rows[0].xact_rollback);
          }
          // Fetch active connection count (excluding idle)
          const activityResult = await client.query(
            "SELECT count(*) AS active_connections FROM pg_stat_activity WHERE state <> 'idle' AND datname = current_database()"
          );
          activeTransactions = Number(activityResult.rows[0].active_connections);
          success = true;
        } finally {
          client.release();
          await pool.end();
        }
      } else if (engine.toLowerCase() === 'sqlite') {
        // Transaction stats are not readily available for SQLite
        success = true; // Indicate success but with zero values
        message = 'Transaction stats not available for SQLite.';
      } else {
        message = `Transaction stats not supported for engine: ${engine}`;
      }
    } catch (error) {
      console.error(`Error fetching transaction stats for connection ${connectionId}:`, error);
      message = error.message || 'Failed to retrieve transaction stats';
      success = false;
    }

    return {
      success,
      activeTransactions,
      totalCommits,
      totalRollbacks,
      message
    };
  },

  /**
   * Executes a SQL query against a specified database connection.
   * @param {string|number} connectionId - The ID of the connection (or 'sample').
   * @param {string} queryString - The SQL query to execute.
   * @returns {Promise<Object>} An object { success, columns, rows, affectedRows, message, error? }.
   */
  async executeDbQuery(connectionId, queryString) {
    if (!queryString) {
      return { success: false, message: 'No query string provided', rows: [], columns: [] };
    }

    let connectionDetails;
    try {
      // For the sample database, we need a specific handling for query execution
      if (connectionId === 'sample') {
        // This requires a mechanism to query the actual sample SQLite database.
        // Assuming SAMPLE_DB contains path or connection info for the actual sample DB.
        // For now, let's assume we have a helper for sample DB or handle it directly.
        const sampleDbPath = path.join(__dirname, '../data/mole.db'); // Path to the actual users.json or a sample SQLite DB
        
        // If users.json is used, we need to simulate SQL or use an in-memory SQLite with users.json data
        // For simplicity, if the query is SELECT COUNT(*) FROM users, we use users.json
        if (queryString.trim().toUpperCase() === 'SELECT COUNT(*) FROM USERS') {
          try {
            const usersJsonPath = path.join(__dirname, '../data/users.json');
            if (fs.existsSync(usersJsonPath)) {
              const usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
              return {
                success: true,
                columns: [{ name: 'COUNT(*)' }],
                rows: [{ 'COUNT(*)': usersData.length }],
                affectedRows: 0,
                message: `Query executed successfully on sample data. ${usersData.length} rows returned.`
              };
            }
          } catch (jsonError) {
            console.error('Error reading or parsing users.json for sample query:', jsonError);
            return { success: false, message: 'Error querying sample data (users.json)', error: jsonError.message, rows: [], columns: [] };
          }
        }
        // For other queries on sample DB, return not implemented or specific error
        return { 
          success: false, 
          message: `Query execution for sample database with query \'${queryString}\' is not fully implemented for this specific query. Only COUNT(*) FROM users is supported for users.json.`, 
          rows: [], 
          columns: [] 
        };
      }

      connectionDetails = await this.getConnectionByIdFull(connectionId); // Use internal method to get full details
      if (!connectionDetails) {
        return { success: false, message: 'Database connection not found', rows: [], columns: [] };
      }
    } catch (error) {
      console.error(`Error fetching connection details for query execution (ID: ${connectionId}):`, error);
      return { success: false, message: `Error fetching connection details: ${error.message}`, error: error.message, rows: [], columns: [] };
    }

    const { engine, host, port, database, username, encrypted_password, password: plainPassword, ssl_enabled } = connectionDetails;
    let decryptedPassword = '';
    try {
      decryptedPassword = encrypted_password ? decrypt(encrypted_password) : plainPassword;
    } catch (e) {
      return { success: false, message: 'Password decryption failed', error: e.message, rows: [], columns: [] };
    }

    try {
      if (engine.toLowerCase() === 'mysql') {
        const mysqlConnection = await mysql.createConnection({
          host: host || 'localhost', port: port || 3306, database,
          user: username, password: decryptedPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 10000
        });
        try {
          const [rows, fields] = await mysqlConnection.query(queryString);
          // Keep MySQL format as { name, type }
          const mysqlColumns = fields ? fields.map(field => ({ name: field.name, type: field.type })) : []; 
          return {
            success: true, columns: mysqlColumns, rows,
            affectedRows: rows.affectedRows !== undefined ? rows.affectedRows : (Array.isArray(rows) ? 0 : null), // MySQL specific for affected rows
            message: `Query executed successfully. ${Array.isArray(rows) ? rows.length : 0} rows returned.`
          };
        } finally {
          await mysqlConnection.end();
        }
      } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
        const pool = new Pool({
          host: host || 'localhost', port: port || 5432, database,
          user: username, password: decryptedPassword, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 10000
        });
        const client = await pool.connect();
        try {
          const result = await client.query(queryString);
          // Change the PG column format to be simpler { name }, expected by the frontend
          const pgColumns = result.fields ? result.fields.map(field => ({ name: field.name })) : []; 
          return {
            success: true, columns: pgColumns, rows: result.rows,
            affectedRows: result.rowCount !== null ? result.rowCount : 0,
            message: `Query executed successfully.`
          };
        } finally {
          client.release();
          await pool.end();
        }
      } else {
        return { success: false, message: `Unsupported database engine for query: ${engine}`, rows: [], columns: [] };
      }
    } catch (error) {
      console.error(`Query execution error for connection ${connectionId} (${engine}):`, error);
      return { 
        success: false, 
        message: `Failed to execute query: ${error.message}`,
        error: error.message,
        rows: [], 
        columns: [] 
      };
    }
  },
};

module.exports = databaseService; 