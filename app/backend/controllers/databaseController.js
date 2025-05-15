/**
 * Database Controller
 * Handles all database connection management operations
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const databaseService = require('../services/databaseService');
const { encrypt, decrypt } = require('../utils/encryptionUtil');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const notificationController = require('./notificationController'); // Import notificationController

// Path for storing database connections in a JSON file (for migration/fallback)
const DB_FILE_PATH = path.join(__dirname, '../data/database_connections.json');

// Ensure the data directory exists
const ensureDataDirExists = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Migration helpers
const migrateLegacyData = async () => {
  try {
    // Check if legacy JSON file exists
    if (fs.existsSync(DB_FILE_PATH)) {
      const legacyData = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf8'));
      
      if (legacyData && legacyData.length > 0) {
        console.log(`Migrating ${legacyData.length} legacy database connections...`);
        
        const db = await getDbConnection();
        
        // For each legacy connection, insert into the database if not exists
        for (const connection of legacyData) {
          // Check if connection already exists in the database
          const existingConnection = await db.get(
            'SELECT id FROM database_connections WHERE id = ?',
            connection.id
          );
          
          if (!existingConnection) {
            // Insert the connection
            await db.run(
              `INSERT INTO database_connections
               (id, name, engine, host, port, database, username, password, ssl_enabled, notes, isSample, created_at, last_connected, encrypted_password)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                connection.id,
                connection.name,
                connection.engine,
                connection.host,
                connection.port,
                connection.database,
                connection.username,
                connection.password, // Keep original password for backward compatibility
                connection.ssl_enabled ? 1 : 0,
                connection.notes || '',
                connection.isSample ? 1 : 0,
                connection.created_at || new Date().toISOString(),
                connection.last_connected || null,
                connection.password ? encrypt(connection.password) : null // Store encrypted version
              ]
            );
          }
        }
        
        await db.close();
        
        // Rename the JSON file to indicate it's been migrated
        fs.renameSync(DB_FILE_PATH, `${DB_FILE_PATH}.migrated`);
        console.log('Legacy data migration completed.');
      }
    }
  } catch (error) {
    console.error('Error migrating legacy data:', error);
  }
};

// Run migration on module initialization
migrateLegacyData().catch(err => {
  console.error('Migration error:', err);
});

/**
 * Get all database connections
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllConnections = async (req, res) => {
  try {
    const connections = await databaseService.getAllConnections();
    res.status(200).json(connections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching database connections', error: error.message });
  }
};

/**
 * Get a single database connection by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getConnectionById = async (req, res) => {
  try {
    const connection = await databaseService.getConnectionById(req.params.id);
    
    if (!connection) {
      return res.status(404).json({ message: 'Database connection not found' });
    }
    
    res.status(200).json(connection);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching database connection', error: error.message });
  }
};

/**
 * Create a new database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createConnection = async (req, res) => {
  try {
    const newConnection = await databaseService.createConnection(req.body);
    
    console.log('[databaseController.createConnection] newConnection created:', newConnection); // NEUES LOG
    console.log('[databaseController.createConnection] req.userId:', req.userId); // NEUES LOG

    // Create a notification for the new connection
    if (req.userId && newConnection && newConnection.id) {
      console.log('[databaseController.createConnection] Attempting to create notification...'); // NEUES LOG
      try {
        await notificationController.createNotification(
          req.userId, // Assuming userId is available on req object via auth middleware
          'new_db_connection', // Type of the notification
          `Connection '${newConnection.name}' Created`, // More specific title
          `Details: A new database connection named "${newConnection.name}" (Engine: ${newConnection.engine}) has been successfully created.`,
          `/databases/${newConnection.id}`, // Link to the new connection
          'newDbConnections' // preferencesKey matching user settings
        );
        console.log('[databaseController.createConnection] Notification creation call completed.'); // NEUES LOG
      } catch (notificationError) {
        // Log the error but don't let it fail the main operation
        console.error('[databaseController.createConnection] Failed to create notification for new connection:', notificationError);
      }
    } else {
      console.log('[databaseController.createConnection] Skipping notification creation due to missing userId, newConnection, or newConnection.id.'); // NEUES LOG
    }
    
    res.status(201).json(newConnection);
  } catch (error) {
    res.status(500).json({ message: 'Error creating database connection', error: error.message });
  }
};

/**
 * Update an existing database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateConnection = async (req, res) => {
  try {
    const updatedConnection = await databaseService.updateConnection(req.params.id, req.body);
    res.status(200).json(updatedConnection);
  } catch (error) {
    if (error.message === 'Database connection not found') {
      return res.status(404).json({ message: 'Database connection not found' });
    }
    res.status(500).json({ message: 'Error updating database connection', error: error.message });
  }
};

/**
 * Delete a database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteConnection = async (req, res) => {
  try {
    await databaseService.deleteConnection(req.params.id);
    res.status(200).json({ message: 'Database connection deleted successfully' });
  } catch (error) {
    if (error.message === 'Database connection not found') {
      return res.status(404).json({ message: 'Database connection not found' });
    }
    res.status(500).json({ message: 'Error deleting database connection', error: error.message });
  }
};

/**
 * Test a database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.testConnection = async (req, res) => {
  try {
    const { engine, host, port, database, username, password, ssl_enabled } = req.body;
    
    if (!engine || !database) {
      return res.status(400).json({ message: 'Missing required connection parameters' });
    }
    
    // Different connection logic based on database engine
    if (engine.toLowerCase() === 'mysql') {
      const connection = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        database,
        user: username,
        password,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 10000 // 10 seconds timeout
      });
      
      await connection.end();
      res.status(200).json({ success: true, message: 'MySQL connection successful' });
    } 
    else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      const pool = new Pool({
        host: host || 'localhost',
        port: port || 5432,
        database,
        user: username,
        password,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000 // 10 seconds timeout
      });
      
      let client;
      try {
        client = await pool.connect();
        // Connection successful, send response immediately
        res.status(200).json({ success: true, message: 'PostgreSQL connection successful' });
      } finally {
        // Ensure client is released and pool is ended regardless of response sending
        if (client) {
      client.release();
        }
      await pool.end();
      }
    }
    else if (engine.toLowerCase() === 'sqlite') {
      // For SQLite, we just check if the file exists
      if (fs.existsSync(database)) {
        res.status(200).json({ success: true, message: 'SQLite file exists' });
      } else {
        res.status(400).json({ success: false, message: 'SQLite file not found' });
      }
    }
    else {
      res.status(400).json({ success: false, message: `Unsupported database engine: ${engine}` });
    }
  }
  catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to connect to database' 
    });
  }
};

/**
 * Get schema information (tables, views, columns) for a database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDatabaseSchema = async (req, res) => {
  const connectionId = req.params.id;
  try {
    // Call the service function to handle schema fetching logic
    const schemaInfo = await databaseService.fetchSchemaForConnection(connectionId);
    
    if (!schemaInfo) { // Should not happen if service handles errors, but safety check
        return res.status(404).json({ success: false, message: 'Connection or schema not found.' });
    }

    // Return the result from the service
    if (schemaInfo.success) {
        if (connectionId !== 'sample') {
            try {
                await databaseService.updateLastConnected(connectionId);
            } catch (updateError) {
                console.error(`[databaseController.getDatabaseSchema] Failed to update last_connected for ${connectionId}:`, updateError);
            }
        }
        res.status(200).json(schemaInfo); // Contains { success, tables, tableColumns, totalSize, message? }
    } else {
        // Determine appropriate status code based on message or keep it simple
        res.status(500).json(schemaInfo); // Contains { success: false, message, ... }
    }

  } catch (error) {
    // Catch unexpected errors during the process
    console.error(`Unexpected error in getDatabaseSchema controller for ${connectionId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error fetching schema.' 
    });
  }
};

/**
 * Get health status for a specific database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDatabaseHealth = async (req, res) => {
  const connectionId = req.params.id;

  // Handle Sample DB directly
  if (connectionId === 'sample') {
    console.log("[Controller:getDatabaseHealth] Reporting OK for Sample DB.");
    return res.status(200).json({ status: 'OK', message: 'Sample DB is virtual and always available.' });
  }

  // Proceed with checks for real connections
  try {
    // Use the service to get full connection details (including password if needed for checks)
    // Note: Using service.getConnectionByIdFull might be better if password needed
    const connection = await databaseService.getConnectionById(connectionId); 

    if (!connection) {
      return res.status(404).json({ message: 'Database connection not found' });
    }

    // --- Decrypt password --- 
    let password = null;
    // Need full details for encrypted_password, refetch using internal service method
    const fullConnection = await databaseService.getConnectionByIdFull(connectionId);
    if (!fullConnection) { 
         // Should not happen if getConnectionById succeeded, but safety check
         return res.status(404).json({ message: 'Database connection details missing' });
    }
    if (fullConnection.encrypted_password) {
      try {
        password = decrypt(fullConnection.encrypted_password);
      } catch (decryptError) {
        console.error(`Decryption failed for connection ${connectionId}:`, decryptError);
        // Return OK status but with a warning message about decryption failure
        return res.status(200).json({ 
          status: 'Warning', 
          message: 'Connection found, but failed to decrypt stored password for health check.' 
        });
      }
    } else {
      password = fullConnection.password; // Use plain password if not encrypted
    }
    // ----------------------

    const { engine, host, port, database, username, ssl_enabled } = connection;

    if (!engine || !database) {
      return res.status(400).json({ 
        status: 'Error',
        message: 'Incomplete connection parameters in database.' 
      });
    }

    let healthStatus = { status: 'Unknown', message: 'Health check not implemented for this engine.' };

    // Engine-specific connection logic
    if (engine.toLowerCase() === 'mysql') {
      let mysqlConnection;
      try {
        mysqlConnection = await mysql.createConnection({
          host: host || 'localhost',
          port: port || 3306,
          database,
          user: username,
          password: password, // Use decrypted password
          ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
          connectTimeout: 5000 // 5 seconds timeout for health check
        });
        // Ping the server to confirm connectivity
        await mysqlConnection.ping(); 
        healthStatus = { status: 'OK', message: 'Connection successful.' };
      } catch (error) {
        console.warn(`MySQL health check failed for ${connectionId}:`, error.message);
        healthStatus = { status: 'Error', message: `Connection failed: ${error.message}` };
      } finally {
        if (mysqlConnection) await mysqlConnection.end();
      }
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      const pool = new Pool({
        host: host || 'localhost',
        port: port || 5432,
        database,
        user: username,
        password: password, // Use decrypted password
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000, // 5 seconds timeout
        // Prevent pool from keeping idle connections after check
        idleTimeoutMillis: 1000, 
        max: 1 // Use only one connection for the check
      });
      let client;
      try {
        client = await pool.connect();
        // Simple query to confirm connectivity
        await client.query('SELECT 1'); 
        healthStatus = { status: 'OK', message: 'Connection successful.' };
      } catch (error) {
        console.warn(`PostgreSQL health check failed for ${connectionId}:`, error.message);
        healthStatus = { status: 'Error', message: `Connection failed: ${error.message}` };
      } finally {
        if (client) client.release();
        // Ensure pool drains and closes connections
        await pool.end(); 
      }
    } else if (engine.toLowerCase() === 'sqlite') {
      try {
        if (fs.existsSync(database)) {
          // Basic check: does the file exist?
          // Could be expanded to try opening the DB if needed.
          healthStatus = { status: 'OK', message: 'SQLite file exists.' };
        } else {
          healthStatus = { status: 'Error', message: 'SQLite file not found.' };
        }
      } catch (error) {
          console.warn(`SQLite health check failed for ${connectionId}:`, error.message);
          healthStatus = { status: 'Error', message: `File check failed: ${error.message}` };
      }
    } else {
       healthStatus = { status: 'Unknown', message: `Unsupported engine: ${engine}` };
    }
    
    // Return 200 OK with the status payload
    if (healthStatus.status === 'OK' && connectionId !== 'sample') {
      try {
        await databaseService.updateLastConnected(connectionId);
      } catch (updateError) {
        console.error(`[databaseController.getDatabaseHealth] Failed to update last_connected for ${connectionId}:`, updateError);
        // Non-critical error, so we don't fail the health check response itself.
      }
    }
    res.status(200).json(healthStatus);

  } catch (error) {
    console.error(`Unexpected error during health check for ${connectionId}:`, error);
    res.status(500).json({ 
      status: 'Error', 
      message: 'Internal server error during health check.' 
    });
  }
};

/**
 * Execute a SQL query on a database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.executeQuery = async (req, res) => {
  try {
    const connectionId = req.params.id;
    const { query } = req.body;

    const result = await databaseService.executeDbQuery(connectionId, query);

    if (result.success) {
      if (connectionId !== 'sample') {
        try {
          await databaseService.updateLastConnected(connectionId);
        } catch (updateError) {
          console.error(`[databaseController.executeQuery] Failed to update last_connected for ${connectionId}:`, updateError);
        }
      }
      res.status(200).json(result);
    } else {
      // Determine status code based on the error message or type if available
      let statusCode = 500;
      if (result.message && result.message.toLowerCase().includes('not found')) {
        statusCode = 404;
      } else if (result.message && result.message.toLowerCase().includes('no query')) {
        statusCode = 400;
      }
      // Add more specific error handling if needed (e.g., for syntax errors from DB)
      res.status(statusCode).json(result);
    }
  } catch (error) {
    // This catch block is for unexpected errors in the controller itself
    console.error('Unexpected error in executeQuery controller:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during query execution.',
      error: error.message
    });
  }
};

/**
 * Get paginated and sorted data for a specific table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTableData = async (req, res) => {
  const { id: connectionId, tableName } = req.params;
  const { page = 1, limit = 25, sortBy = null, sortOrder = 'asc' } = req.query;
  console.log(`[getTableData] Received request for DB ID: ${connectionId}, Table: ${tableName}`); // DEBUG
  console.log(`[getTableData] Query Params: page=${page}, limit=${limit}, sortBy=${sortBy}, sortOrder=${sortOrder}`); // DEBUG

  // Validate and sanitize input
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const sortOrderClean = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  
  // Only use sortBy if it's a valid string, otherwise, no default sort column.
  const sortByClean = (sortBy && typeof sortBy === 'string' && /^[a-zA-Z0-9_]+$/.test(sortBy)) ? sortBy : null;
  // If sortByClean is null, finalSortOrder is irrelevant for building the clause.
  const finalSortOrder = sortOrderClean; 
  
  if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      console.error(`[getTableData] Invalid pagination params: page=${page}, limit=${limit}`); // DEBUG
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters.' });
  }

  const offset = (pageNum - 1) * limitNum;

  try {
    console.log(`[getTableData] Fetching connection details for ID: ${connectionId}`); // DEBUG
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      console.error(`[getTableData] Connection not found for ID: ${connectionId}`); // DEBUG
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }
    // Log retrieved connection details (excluding password for security)
    const { encrypted_password, password: plainPassword, ...connDetailsToLog } = connection; 
    console.log(`[getTableData] Found connection details:`, connDetailsToLog); // DEBUG

    const { engine, host, port, database, username, ssl_enabled } = connection;
    // Decrypt password carefully
    let password = null;
    try {
        password = connection.encrypted_password ? decrypt(connection.encrypted_password) : connection.password;
    } catch (decryptErr) {
        console.error(`[getTableData] Decryption failed for connection ${connectionId}:`, decryptErr.message);
        return res.status(500).json({ success: false, message: 'Failed to decrypt password for connection.' });
    }

    let client; // General client/connection variable
    let rows = [];
    let columns = [];
    let totalRowCount = 0;

    // Use decodeURIComponent on tableName from params, as it might be encoded by the service
    const decodedTableName = decodeURIComponent(tableName);
    // Sanitize table name - more robust quoting needed based on engine
    let safeTableName = decodedTableName.replace(/`/g, '``').replace(/\"/g, "\"\"").replace(/\'/g, "''"); // Basic defense, needs improvement
    if (engine.toLowerCase() === 'mysql') {
        safeTableName = `\\\`${decodedTableName.replace(/`/g, '``')}\\\``;
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
         safeTableName = `\\\"${decodedTableName.replace(/\"/g, "\"\"")}\\\"`;
    }
    console.log(`[getTableData] Using safe table name: ${safeTableName}`); // DEBUG

    if (engine.toLowerCase() === 'mysql') {
      const mysqlConnection = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        database,
        user: username,
        password,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 10000
      });
      client = mysqlConnection; // Assign to general client

      try {
        // Construct ORDER BY clause only if sortByClean is valid
        const orderByClause = sortByClean ? `ORDER BY \`${sortByClean}\` ${finalSortOrder}` : ''; // Use backticks for MySQL
        
        // Data Query
        const dataQuery = `SELECT * FROM ${safeTableName} ${orderByClause} LIMIT ? OFFSET ?`;
        console.log('[getTableData] MySQL Data Query:', dataQuery, [limitNum, offset]);
        const [dataResult] = await client.query(dataQuery, [limitNum, offset]);
        rows = dataResult;

        // Columns (extract from result fields if rows were returned)
        if (dataResult.length > 0 && dataResult.fields) {
            columns = dataResult.fields.map(field => field.name);
        } else if (rows.length > 0) {
            // Fallback if fields aren't available but rows are
            columns = Object.keys(rows[0]);
        } else {
             // If no rows, try getting columns from schema (less efficient)
             const [colsInfo] = await client.query(`DESCRIBE \`${safeTableName}\``);
             columns = colsInfo.map(c => c.Field);
        }

        // Count Query
        const countQuery = `SELECT COUNT(*) as count FROM \`${safeTableName}\``;
        console.log('[getTableData] MySQL Count Query:', countQuery);
        const [countResult] = await client.query(countQuery);
        totalRowCount = countResult[0].count;

      } finally {
        await client.end();
      }
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      const pool = new Pool({
        host: host || 'localhost',
        port: port || 5432,
        database,
        user: username,
        password,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000
      });
      client = await pool.connect(); // Assign to general client

      try {
        // Define orderByClause BEFORE using it in dataQuery
        // Construct ORDER BY clause only if sortByClean is valid
        const orderByClause = sortByClean ? `ORDER BY "${sortByClean}" ${finalSortOrder}` : ''; // Quote sortBy field
        
        // Data Query - Use the decoded table name directly. Select columns explicitly if needed.
        // Remove COALESCE to return actual NULL values. Quote identifiers properly.
        const dataQuery = `SELECT * FROM public."${decodedTableName}" ${orderByClause} LIMIT $1 OFFSET $2`;
        console.log('[getTableData] PostgreSQL Data Query:', dataQuery, [limitNum, offset]); // DEBUG
        const dataResult = await client.query(dataQuery, [limitNum, offset]);
        rows = dataResult.rows;

        // --- Log RAW first row data ---
        if (rows.length > 0) {
          console.log('[getTableData RAW Row 0]:', rows[0]); 
        }
        // --- End Log RAW ---

        // Columns (extract from result fields)
        if (dataResult.fields) {
            columns = dataResult.fields.map(field => field.name);
        } else if (rows.length > 0) {
             columns = Object.keys(rows[0]);
        } else {
            // If no rows, try getting columns from schema (less efficient)
            const colsInfo = await client.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = $1 
              ORDER BY ordinal_position;`, [decodedTableName]);
            columns = colsInfo.rows.map(r => r.column_name);
        }

        // Count Query - Use decoded table name directly, but ensure it's quoted for PostgreSQL
        const countQuery = `SELECT COUNT(*) as count FROM public."${decodedTableName}"`; // Corrected: Added public schema and quotes
        console.log('[getTableData] PostgreSQL Count Query:', countQuery); // DEBUG
        const countResult = await client.query(countQuery);
        totalRowCount = parseInt(countResult.rows[0].count, 10);

      } finally {
        client.release();
        await pool.end();
      }
    } else {
      console.warn(`[getTableData] Unsupported engine: ${engine}`); // DEBUG
      return res.status(400).json({ success: false, message: `Unsupported database engine for table data: ${engine}` });
    }

    console.log(`[getTableData] Successfully fetched ${rows.length} rows, total count: ${totalRowCount}`); // DEBUG

    // --- Process rows before sending ---
    const processedRows = rows.map(row => {
      const newRow = {};
      for (const key in row) {
        const value = row[key];
        if (value instanceof Date) {
          // Convert Date objects to ISO strings
          newRow[key] = value.toISOString();
        } else if (typeof value === 'bigint') {
            // Convert BigInt to number (potential precision loss) or string
             newRow[key] = Number(value); // Or String(value) if precision is critical
        } else {
          // Keep other types (number, string, null, boolean) as they are
          newRow[key] = value;
        }
      }
      return newRow;
    });

    // Log types of critical fields in the first PROCESSED row before sending
    if (processedRows.length > 0) {
      const firstRow = processedRows[0];
      console.log(`[getTableData Type Check - Processed] First row types - time: ${typeof firstRow.time}, uptime: ${typeof firstRow.uptime}, raw_uptime: ${typeof firstRow.raw_uptime}, total_kwh: ${typeof firstRow.total_kwh}`);
      // --- Log PROCESSED first row data ---
      console.log('[getTableData PROCESSED Row 0]:', firstRow); 
      // --- End Log PROCESSED ---
    }

    res.status(200).json({
      success: true,
      rows: processedRows, // Send processed rows
      columns, // Send column names along with data
      totalRowCount
    });

  } catch (error) {
    console.error(`[getTableData] Error fetching data for table ${tableName}:`, error); // DEBUG with context
    // Provide more specific error if possible (e.g., table not found)
    let errorMessage = 'Internal server error fetching table data.';
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMessage = `Table "${tableName}" not found.`;
    } else if (error.code === 'ER_NO_SUCH_TABLE') { // MySQL specific
         errorMessage = `Table "${tableName}" not found.`;
    } else if (error.code === '42703' || error.code === 'ER_BAD_FIELD_ERROR') { // Column not found (e.g., in ORDER BY)
         errorMessage = `Sort column "${sortBy}" not found in table "${tableName}".`;
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: error.message // Include original error for debugging 
    });
  }
};

/**
 * Create a new table in a specific database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createTable = async (req, res) => {
  const { id: connectionId } = req.params;
  const { tableName, columns } = req.body;

  // --- Basic Input Validation --- 
  if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ success: false, message: 'Invalid table name. Use only letters, numbers, and underscores.' });
  }
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or empty columns definition.' });
  }
  for (const col of columns) {
     if (!col.name || !/^[a-zA-Z0-9_]+$/.test(col.name)) {
         return res.status(400).json({ success: false, message: `Invalid column name: ${col.name}` });
     }
     const allowedTypes = ['INT', 'VARCHAR(255)', 'TEXT', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL(10,2)', 'SERIAL']; // Added SERIAL as an allowed type
     if (!col.type || !allowedTypes.includes(col.type.toUpperCase())) {
          return res.status(400).json({ success: false, message: `Invalid or unsupported column type: ${col.type}` });
     }
  }

  let mainClient; // Renamed to avoid conflict, will hold MySQL connection or PG Pool client

  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;
    
    let createTableSql = '';

    if (engine.toLowerCase() === 'mysql') {
        const columnDefs = columns.map(col => {
            let def = `\`${col.name}\` ${col.type}`;
            def += col.nullable ? ' NULL' : ' NOT NULL';
            if (col.default) def += ` DEFAULT ${mysql.escape(col.default)}`; // Escape default value
            if (col.isPrimary) def += ' PRIMARY KEY';
            if (col.autoIncrement && col.type.toUpperCase() === 'INT') def += ' AUTO_INCREMENT';
            return def;
        }).join(',\n  ');
        createTableSql = `CREATE TABLE \`${tableName}\` (\n  ${columnDefs}\n);`;
        
        mainClient = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });

    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
        const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
        mainClient = await pool.connect(); // Connect before mapping columns
        try {
            const columnDefPromises = columns.map(async col => { // map callback is now async
                let type = col.type.toUpperCase(); // Normalize type
                if (col.isPrimary && col.autoIncrement && type === 'INT') {
                    type = 'SERIAL';
                } 
                let def = `"${col.name}" ${type}`;
                if (col.isPrimary && type !== 'SERIAL') def += ' PRIMARY KEY'; // Add PK only if not SERIAL
                def += col.nullable ? ' NULL' : ' NOT NULL';
                if (col.default) {
                    def += ` DEFAULT ${mainClient.escapeLiteral(col.default)}`; // Use the established mainClient
                }
                return def;
            });
            const columnDefs = (await Promise.all(columnDefPromises)).join(',\n  ');
            createTableSql = `CREATE TABLE public."${tableName}" (\n  ${columnDefs}\n);`; // Assume public schema
        } finally {
            // Release client only if CREATE TABLE fails before execution, or if it's not used further.
            // Actual release is in the main finally block after query execution.
        }
    } else {
        return res.status(400).json({ success: false, message: `CREATE TABLE not supported for engine: ${engine}` });
    }

    console.log(`Executing Create Table (${engine}):`, createTableSql);
    try {
      if (engine.toLowerCase() === 'mysql') {
         await mainClient.query(createTableSql);
      } else {
         await mainClient.query(createTableSql);
      }
      res.status(201).json({ success: true, message: `Table "${tableName}" created successfully.` });
    } catch (execError) {
        console.error('Error executing CREATE TABLE:', execError);
        let userMessage = `Failed to create table "${tableName}".`;
        if (execError.message.includes('already exists') || execError.code === 'ER_TABLE_EXISTS_ERROR' || (execError.code === '42P07' /* PostgreSQL duplicate_table */)) {
            userMessage = `Table "${tableName}" already exists.`;
        }
        res.status(409).json({ success: false, message: userMessage, error: execError.message, code: execError.code });
    } finally {
        if (mainClient) {
            if (engine.toLowerCase() === 'mysql') await mainClient.end();
            else if (mainClient.release) mainClient.release(); // Release PG client back to pool
        }
    }

  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
    // Ensure client is released if error happens before the main finally block
    if (mainClient && engine.toLowerCase() !== 'mysql' && mainClient.release) {
        mainClient.release();
    }
    res.status(500).json({ success: false, message: 'Internal server error creating table.', error: error.message });
  }
};

/**
 * Delete a specific table from a database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteTable = async (req, res) => {
  const { id: connectionId, tableName } = req.params;

  if (!tableName) {
     return res.status(400).json({ success: false, message: 'Table name is required.' });
  }
  if (!/^[a-zA-Z0-9_\-]+$/.test(tableName)) {
     return res.status(400).json({ success: false, message: 'Invalid table name format.' });
  }
  
  let client; // For MySQL connection or PG Pool client

  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;
    
    let dropTableSql = '';

    if (engine.toLowerCase() === 'mysql') {
       dropTableSql = `DROP TABLE IF EXISTS \`${tableName}\``; 
       client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
       dropTableSql = `DROP TABLE IF EXISTS public."${tableName}"`;
       const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
       client = await pool.connect();
    } else {
        return res.status(400).json({ success: false, message: `DROP TABLE not supported for engine: ${engine}` });
    }

    console.log(`Executing Drop Table (${engine}):`, dropTableSql);
    try {
      if (engine.toLowerCase() === 'mysql') {
         await client.query(dropTableSql);
      } else {
         await client.query(dropTableSql);
      }
      res.status(200).json({ success: true, message: `Table "${tableName}" deleted successfully.` });
    } catch (execError) {
       console.error('Error executing DROP TABLE:', execError);
       res.status(500).json({ success: false, message: `Failed to delete table "${tableName}".`, error: execError.message });
    } finally {
        if (client) {
            if (engine.toLowerCase() === 'mysql') await client.end();
            else if (client.release) client.release();
        }
    }

  } catch (error) {
    console.error(`Error deleting table ${tableName}:`, error);
    if (client && engine.toLowerCase() !== 'mysql' && client.release) {
        client.release();
    }
    res.status(500).json({ success: false, message: 'Internal server error deleting table.', error: error.message });
  }
};

// Helper function (can be kept here or moved to utils if needed elsewhere)
const parseSizeToBytes = (sizeStr) => {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  // Relaxed regex to handle potential missing space
  const sizeMatch = sizeStr.match(/([\\d.]+)\\s*(Bytes|KB|MB|GB|TB)/i);
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
  // Handle cases like 'N/A' or 'Unknown' gracefully
  return 0;
};

/**
 * Get the top N largest tables across all real database connections.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTopTables = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10; // Default to top 10

  try {
    const connections = await databaseService.getAllConnections();
    const realConnections = connections.filter(conn => conn.id && !conn.isSample);

    if (realConnections.length === 0) {
      // No real connections, return empty list immediately
      return res.status(200).json({ success: true, topTables: [] });
    }

    let allTables = [];

    // Fetch schema details for all connections concurrently
    const schemaPromises = realConnections.map(conn => 
      databaseService.fetchSchemaForConnection(conn.id)
        // Add error handling for individual schema fetches
        .catch(err => {
          console.error(`Schema fetch failed for DB ID ${conn.id} (${conn.name}):`, err.message);
          return { success: false, message: err.message, tables: [] }; // Return a standard error structure
        })
    );

    const results = await Promise.all(schemaPromises);
    
    results.forEach((schemaInfo, index) => {
      const connection = realConnections[index];
      // Check explicitly for success and tables array existence
      if (schemaInfo && schemaInfo.success && Array.isArray(schemaInfo.tables)) {
        schemaInfo.tables.forEach(table => {
          // Ensure table size is handled gracefully before parsing
          const sizeFormatted = table.size || '0 Bytes'; // Default to '0 Bytes' if size is missing
          const sizeBytes = parseSizeToBytes(sizeFormatted);

          allTables.push({
            tableName: table.name,
            dbName: connection.name, // Use the connection name
            dbId: connection.id,
            sizeFormatted: sizeFormatted, // Use the potentially defaulted value
            sizeBytes: sizeBytes
          });
        });
      } else {
        // Log failure but continue aggregation
        console.warn(`Skipping tables for ${connection.name} (ID: ${connection.id}) due to schema fetch issue: ${schemaInfo?.message || 'Unknown error'}`);
      }
    });

    // Sort by size descending and take limit
    const topTables = allTables
      .sort((a, b) => b.sizeBytes - a.sizeBytes)
      .slice(0, limit);

    res.status(200).json({ success: true, topTables });

  } catch (error) {
    console.error('Error fetching top tables:', error);
    res.status(500).json({ success: false, message: 'Internal server error fetching top tables.', error: error.message });
  }
};

/**
 * Create a new database instance (PostgreSQL, MySQL) or Bucket (InfluxDB)
 * Uses admin credentials from environment variables.
 * After successful creation, saves a connection entry using user-provided details.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createDatabaseInstance = async (req, res) => {
  // Host and Port are no longer expected from req.body for the final connection
  const { 
    engine: userEngineChoice, 
    name: connectionName, 
    // host: userHost, // Removed
    // port: userPort, // Removed
    username: connectionUser, 
    password: connectionPassword, 
    ssl_enabled: userSslEnabled, 
    notes: userNotes
  } = req.body;
  const dbNameToCreate = connectionName;

  console.log(`[createDatabaseInstance] Request received: Engine=${userEngineChoice}, Name=${dbNameToCreate}. Using default backend admin credentials and default service target.`);

  if (!userEngineChoice || !dbNameToCreate || !connectionUser) {
    console.error('[createDatabaseInstance] Missing required fields in request body (engine, name, username are required).');
    return res.status(400).json({ success: false, message: 'Missing required fields: engine, name, username are required.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(dbNameToCreate)) {
    console.error(`[createDatabaseInstance] Invalid database/bucket name format: ${dbNameToCreate}`);
    return res.status(400).json({ success: false, message: 'Invalid database name. Use only letters, numbers, and underscores.' });
  }

  let creationSuccess = false;
  let creationMessage = '';
  let adminClient; // For PG or MySQL admin operations

  try {
    if (userEngineChoice.toLowerCase() === 'postgresql') {
      // Always use default admin credentials and target from environment
      const pgAdminHost = process.env.DB_CREATE_PG_HOST || 'mole-postgres';
      const pgAdminPort = process.env.DB_CREATE_PG_PORT || 5432;
      const pgAdminUser = process.env.DEFAULT_PG_ADMIN_USER || 'mole';
      const pgAdminPassword = process.env.DEFAULT_PG_ADMIN_PASSWORD;
      
      if (!pgAdminPassword) {
        console.error('[createDatabaseInstance] Default PostgreSQL admin password (DEFAULT_PG_ADMIN_PASSWORD) not configured in backend environment.');
        return res.status(500).json({ success: false, message: 'Default PostgreSQL admin password (DEFAULT_PG_ADMIN_PASSWORD) not configured in backend environment.'});
      }
      console.log(`[createDatabaseInstance] Using default PG admin credentials for target: ${pgAdminUser}@${pgAdminHost}:${pgAdminPort}`);

      const pool = new Pool({
        host: pgAdminHost, port: pgAdminPort, user: pgAdminUser, password: pgAdminPassword,
        database: 'postgres', // Connect to the default 'postgres' db to perform admin tasks
        connectionTimeoutMillis: 10000
      });
      adminClient = await pool.connect();
      console.log(`[createDatabaseInstance] Connected to PG admin@${pgAdminHost}:${pgAdminPort} to check/create ${dbNameToCreate}`);
      try {
        const checkRes = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbNameToCreate]);
        if (checkRes.rowCount > 0) {
          creationSuccess = true;
          creationMessage = `PostgreSQL database '${dbNameToCreate}' already exists.`;
          console.log(creationMessage);
        } else {
          await adminClient.query(`CREATE DATABASE "${dbNameToCreate}"`);
          if (connectionUser) { // connectionUser is the user for the *newly created* database
            // Check if user already exists before trying to create
            const userExistsRes = await adminClient.query('SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1', [connectionUser]);
            if (userExistsRes.rowCount === 0) {
              // User does not exist, create them
              await adminClient.query(`CREATE USER "${connectionUser}" WITH PASSWORD '${connectionPassword}';`);
              console.log(`User '${connectionUser}' created.`);
            } else {
              console.log(`User '${connectionUser}' already exists. Skipping creation.`);
              // Optionally, you could update the password here if needed:
              // await adminClient.query(`ALTER USER "${connectionUser}" WITH PASSWORD '${connectionPassword}';`);
            }
            // Grant privileges regardless of whether user was just created or already existed
            await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbNameToCreate}" TO "${connectionUser}";`);
            console.log(`Privileges granted on '${dbNameToCreate}' to user '${connectionUser}'.`);
          } else {
            console.warn(`[createDatabaseInstance] No connectionUser provided to create/grant privileges for the new PostgreSQL database '${dbNameToCreate}'.`);
          }
          creationSuccess = true;
          creationMessage = `PostgreSQL database '${dbNameToCreate}' created successfully.`;
          console.log(creationMessage);
        }
      } finally {
        if (adminClient) adminClient.release();
        await pool.end();
      }
    } else if (userEngineChoice.toLowerCase() === 'mysql') {
      // Always use default admin credentials and target from environment
      const mysqlAdminHost = process.env.DB_CREATE_MYSQL_HOST || 'mole-mysql';
      const mysqlAdminPort = process.env.DB_CREATE_MYSQL_PORT || 3306;
      const mysqlAdminUser = process.env.DEFAULT_MYSQL_ADMIN_USER || 'root';
      const mysqlAdminPassword = process.env.DEFAULT_MYSQL_ADMIN_PASSWORD;

      if (!mysqlAdminPassword) {
        console.error('[createDatabaseInstance] Default MySQL admin password (DEFAULT_MYSQL_ADMIN_PASSWORD) not configured in backend environment.');
        return res.status(500).json({ success: false, message: 'Default MySQL admin password (DEFAULT_MYSQL_ADMIN_PASSWORD) not configured in backend environment.'});
      }
      console.log(`[createDatabaseInstance] Using default MySQL admin credentials for target: ${mysqlAdminUser}@${mysqlAdminHost}:${mysqlAdminPort}`);

      adminClient = await mysql.createConnection({
          host: mysqlAdminHost, port: mysqlAdminPort, user: mysqlAdminUser, password: mysqlAdminPassword,
          connectTimeout: 10000
      });
      console.log(`[createDatabaseInstance] Connected to MySQL admin@${mysqlAdminHost}:${mysqlAdminPort} to check/create ${dbNameToCreate}`);
      try {
        await adminClient.query(`CREATE DATABASE IF NOT EXISTS \`${dbNameToCreate}\``);
        if (connectionUser && connectionPassword) {
          // MySQL's CREATE USER IF NOT EXISTS handles the existence check
          await adminClient.query(`CREATE USER IF NOT EXISTS '${connectionUser}'@'%' IDENTIFIED BY '${connectionPassword}';`);
          await adminClient.query(`GRANT ALL PRIVILEGES ON \`${dbNameToCreate}\`.* TO '${connectionUser}'@'%';`);
          await adminClient.query(`FLUSH PRIVILEGES;`);
          console.log(`User '${connectionUser}' created/updated and granted privileges on MySQL database '${dbNameToCreate}'.`);
        } else {
          console.warn(`[createDatabaseInstance] No connectionUser/Password provided to create/grant privileges for the new MySQL database '${dbNameToCreate}'.`);
        }
        creationSuccess = true;
        creationMessage = `MySQL database '${dbNameToCreate}' created or already exists.`;
        console.log(creationMessage);
      } finally {
          if (adminClient) await adminClient.end();
      }
    } else if (userEngineChoice.toLowerCase() === 'influxdb') {
      // Always use default admin credentials and target from environment
      const influxUrl = process.env.DB_CREATE_INFLUXDB_URL || 'http://mole-influxdb:8086';
      const influxToken = process.env.DEFAULT_INFLUXDB_ADMIN_TOKEN;
      const influxOrgName = process.env.DEFAULT_INFLUXDB_ADMIN_ORG;

      if (!influxToken || !influxOrgName) {
        console.error('[createDatabaseInstance] Default InfluxDB admin token (DEFAULT_INFLUXDB_ADMIN_TOKEN) or organization (DEFAULT_INFLUXDB_ADMIN_ORG) not configured in backend environment.');
        return res.status(500).json({ success: false, message: 'Default InfluxDB admin token (DEFAULT_INFLUXDB_ADMIN_TOKEN) or organization (DEFAULT_INFLUXDB_ADMIN_ORG) not configured in backend environment.'});
      }
      console.log(`[createDatabaseInstance] Using default InfluxDB admin credentials for target: Org '${influxOrgName}' at ${influxUrl}`);

      const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
      const bucketsAPI = influxDB.getBucketsApi();

      try {
          const buckets = await bucketsAPI.getBuckets({ name: dbNameToCreate, orgName: influxOrgName });
          if (buckets && buckets.buckets && buckets.buckets.length > 0) {
              creationSuccess = true;
              creationMessage = `InfluxDB bucket '${dbNameToCreate}' already exists.`;
              console.log(creationMessage);
          } else {
              await bucketsAPI.createBucket({ orgName: influxOrgName, name: dbNameToCreate, retentionRules: [] });
              creationSuccess = true;
              creationMessage = `InfluxDB bucket '${dbNameToCreate}' created successfully.`;
              console.log(creationMessage);
          }
      } catch (influxError) {
          console.error(`[createDatabaseInstance] Error with InfluxDB API:`, influxError);
          creationMessage = `Failed to create InfluxDB bucket: ${influxError.message || 'InfluxDB API error'}`;
          // Do not set creationSuccess = true
          throw influxError; // Rethrow to be caught by the outer catch block
      }
    } else {
      // Handle unsupported engine
      creationMessage = `Unsupported database engine for creation: ${userEngineChoice}`;
      return res.status(400).json({ success: false, message: creationMessage });
    }

    // --- If creation step was successful, save the connection entry --- 
    if (creationSuccess) {
      console.log('[createDatabaseInstance] Proceeding to save connection entry.');
      try {
          // Determine the correct host and port for the connection based on the engine
          let connectionHost, connectionPort;
          if (userEngineChoice.toLowerCase() === 'postgresql') {
              connectionHost = process.env.DB_CREATE_PG_HOST || 'mole-postgres';
              connectionPort = parseInt(process.env.DB_CREATE_PG_PORT || '5432', 10);
          } else if (userEngineChoice.toLowerCase() === 'mysql') {
              connectionHost = process.env.DB_CREATE_MYSQL_HOST || 'mole-mysql';
              connectionPort = parseInt(process.env.DB_CREATE_MYSQL_PORT || '3306', 10);
          } else if (userEngineChoice.toLowerCase() === 'influxdb') {
              // For InfluxDB, host/port might be less relevant than URL, but store service name for consistency
              connectionHost = 'mole-influxdb'; // Usually accessed via URL, but store service name
              connectionPort = 8086; // Default InfluxDB port
          } else {
               // Should not happen if validation is correct, but set defaults
               connectionHost = 'unknown-host';
               connectionPort = 0;
          }

          const connectionToSave = {
              name: connectionName, 
              engine: userEngineChoice, 
              host: connectionHost, // Use determined service name
              port: connectionPort, // Use determined default port
              database: dbNameToCreate, 
              username: connectionUser, 
              password: connectionPassword, 
              ssl_enabled: userSslEnabled || false,
              notes: userNotes || '',
              isSample: false
          };
          const savedConnection = await databaseService.createConnection(connectionToSave);
          console.log('[createDatabaseInstance] Saved connection entry:', savedConnection);
          // Return success with the original creation message and the new connection details
          return res.status(201).json({ success: true, message: creationMessage, connection: savedConnection });
      } catch (saveError) {
          // Log the error but inform the user the DB was created
          console.error('[createDatabaseInstance] Error saving connection entry after successful DB/Bucket creation:', saveError);
          return res.status(207).json({ 
              success: true, 
              message: `${creationMessage}. However, failed to save connection details automatically: ${saveError.message}. Please add the connection manually.`,
              warning: 'Failed to save connection details automatically.' 
          }); // 207 Multi-Status
      }
    } else {
       // This case should ideally not be reached if errors are thrown above, but acts as a safeguard
       console.error(`[createDatabaseInstance] Reached end without success flag for ${dbNameToCreate}. Message: ${creationMessage}`);
       return res.status(500).json({ success: false, message: creationMessage || 'Database/Bucket creation failed for an unknown reason.' });
    } // Close if(creationSuccess)

  } catch (error) { // Outer catch block for the entire process
    console.error(`[createDatabaseInstance] General error during instance creation for ${dbNameToCreate}:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during database creation.',
      error: error.message // Provide error message for debugging
    });
  } // Close outer catch block
};

/**
 * Get storage size information for a specific database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDatabaseStorageInfo = async (req, res) => {
  const connectionId = req.params.id;
  try {
    const storageInfo = await databaseService.fetchStorageInfoForConnection(connectionId);
    
    if (!storageInfo.success) {
      // Use 404 if connection not found, 500 otherwise
      const statusCode = storageInfo.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(storageInfo);
    }
    
    res.status(200).json(storageInfo); // { success: true, sizeBytes: number, sizeFormatted: string }

  } catch (error) {
    console.error(`Unexpected error in getDatabaseStorageInfo controller for ${connectionId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error fetching storage info.' 
    });
  }
};

/**
 * Get transaction statistics for a specific database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDatabaseTransactionStats = async (req, res) => {
  const connectionId = req.params.id;
  try {
    const stats = await databaseService.fetchTransactionStatsForConnection(connectionId);
    
    if (!stats.success) {
      const statusCode = stats.message.includes('not found') ? 404 : 500;
      return res.status(statusCode).json(stats);
    }
    
    res.status(200).json(stats); // { success: true, activeTransactions: number, totalCommits: number, totalRollbacks: number }

  } catch (error) {
    console.error(`Unexpected error in getDatabaseTransactionStats controller for ${connectionId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error fetching transaction stats.' 
    });
  }
};

/**
 * Insert a new row into a specific table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.insertTableRow = async (req, res) => {
  const { id: connectionId, tableName } = req.params;
  const rowData = req.body; // Expects an object like { column1: value1, column2: value2 }

  if (!rowData || typeof rowData !== 'object' || Object.keys(rowData).length === 0) {
    return res.status(400).json({ success: false, message: 'Row data is required and must be a non-empty object.' });
  }
  // Further validation: ensure tableName is valid (e.g., /^[a-zA-Z0-9_]+$/)
  if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ success: false, message: 'Invalid table name.' });
  }

  let client;
  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;

    const columns = Object.keys(rowData);
    const values = columns.map(col => rowData[col]);

    let insertSql = '';
    let placeholderChar = '?'; // Default for MySQL parameterization

    if (engine.toLowerCase() === 'mysql') {
      const columnNames = columns.map(col => `\`${col}\``).join(', ');
      const valuePlaceholders = columns.map(() => placeholderChar).join(', ');
      insertSql = `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${valuePlaceholders})`;
      client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      placeholderChar = '$'; // PostgreSQL uses $1, $2, etc.
      const columnNames = columns.map(col => `"${col}"`).join(', ');
      const valuePlaceholders = columns.map((_, i) => `${placeholderChar}${i + 1}`).join(', ');
      // Assuming public schema, and table name is already validated (no need to re-quote tableName here for PG)
      // However, `tableName` in the route might be case sensitive, and it was created quoted.
      // So, we should quote it here to match.
      insertSql = `INSERT INTO public."${tableName}" (${columnNames}) VALUES (${valuePlaceholders})`;
      const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
      client = await pool.connect();
    } else {
      return res.status(400).json({ success: false, message: `INSERT INTO not supported for engine: ${engine}` });
    }

    console.log(`Executing Insert Row (${engine}):`, insertSql, values);
    try {
      let result;
      if (engine.toLowerCase() === 'mysql') {
        [result] = await client.execute(insertSql, values); // Use execute for parameterized queries
      } else {
        result = await client.query(insertSql, values); // pg library handles parameterization
      }
      // MySQL result: { affectedRows: 1, insertId: X, ... }
      // PostgreSQL result: { command: 'INSERT', rowCount: 1, ... }
      const affectedRows = result.affectedRows || result.rowCount || 0;
      if (affectedRows > 0) {
        res.status(201).json({ success: true, message: `Row inserted successfully into "${tableName}".`, affectedRows });
      } else {
        res.status(400).json({ success: false, message: `Failed to insert row into "${tableName}". No rows affected.` });
      }
    } catch (execError) {
      console.error(`Error executing INSERT INTO for table "${tableName}":`, execError);
      res.status(500).json({ success: false, message: `Failed to insert row into "${tableName}".`, error: execError.message, code: execError.code });
    } finally {
      if (client) {
        if (engine.toLowerCase() === 'mysql') await client.end();
        else if (client.release) client.release();
      }
    }
  } catch (error) {
    console.error(`Error inserting row into table ${tableName}:`, error);
    if (client && engine.toLowerCase() !== 'mysql' && client.release) {
        client.release();
    }
    res.status(500).json({ success: false, message: 'Internal server error inserting row.', error: error.message });
  }
};

/**
 * Add a new column to a specific table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addColumnToTable = async (req, res) => {
  const { id: connectionId, tableName } = req.params;
  const { name: columnName, type: columnType, nullable, defaultValue } = req.body; // Column definition from request body

  // --- Basic Input Validation ---
  if (!columnName || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
    return res.status(400).json({ success: false, message: 'Invalid column name. Use only letters, numbers, and underscores.' });
  }
  if (!columnType) { // Add more robust type validation/whitelisting as needed
    return res.status(400).json({ success: false, message: 'Column type is required.' });
  }
  // Example: Whitelist allowed types (should match frontend options)
  const allowedTypes = ['INT', 'VARCHAR(255)', 'TEXT', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL(10,2)'];
  if (!allowedTypes.includes(columnType.toUpperCase())) {
      return res.status(400).json({ success: false, message: `Invalid or unsupported column type: ${columnType}` });
  }
  if (typeof nullable === 'undefined') {
      return res.status(400).json({ success: false, message: 'Nullable property is required (true or false).' });
  }

  let client;
  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;

    let alterTableSql = '';
    let columnDefinitionSql = '';

    // Construct column definition part (common for both PG and MySQL with slight variations)
    if (engine.toLowerCase() === 'mysql') {
      columnDefinitionSql = `\`${columnName}\` ${columnType.toUpperCase()}`;
      columnDefinitionSql += nullable ? ' NULL' : ' NOT NULL';
      if (typeof defaultValue !== 'undefined' && defaultValue !== null) {
        // For MySQL, strings need to be escaped and quoted, numbers can be direct
        if (typeof defaultValue === 'string') {
          columnDefinitionSql += ` DEFAULT \'${mysql.escape(defaultValue).slice(1, -1)}\'`; // mysql.escape adds its own quotes, remove them and add ours
        } else {
          columnDefinitionSql += ` DEFAULT ${defaultValue}`;
        }
      }
      alterTableSql = `ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinitionSql};`;
      client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      columnDefinitionSql = `\"${columnName}\" ${columnType.toUpperCase()}`;
      columnDefinitionSql += nullable ? ' NULL' : ' NOT NULL';
      if (typeof defaultValue !== 'undefined' && defaultValue !== null) {
        // For PostgreSQL, use escapeLiteral for string defaults
        // Need a temporary client to use escapeLiteral if the main client isn't connected yet for this specific operation
        const tempPool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 5000 });
        const tempClient = await tempPool.connect();
        try {
            if (typeof defaultValue === 'string') {
                columnDefinitionSql += ` DEFAULT ${tempClient.escapeLiteral(defaultValue)}`;
            } else { // Numbers, booleans
                columnDefinitionSql += ` DEFAULT ${defaultValue}`;
            }
        } finally {
            tempClient.release();
            await tempPool.end();
        }
      }
      alterTableSql = `ALTER TABLE public.\"${tableName}\" ADD COLUMN ${columnDefinitionSql};`;
      const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
      client = await pool.connect();
    } else {
      return res.status(400).json({ success: false, message: `ALTER TABLE ADD COLUMN not supported for engine: ${engine}` });
    }

    console.log(`Executing Add Column (${engine}):`, alterTableSql);
    try {
      await client.query(alterTableSql);
      res.status(200).json({ success: true, message: `Column "${columnName}" added successfully to table "${tableName}".` });
    } catch (execError) {
      console.error(`Error executing ADD COLUMN for table "${tableName}":`, execError);
      res.status(500).json({ success: false, message: `Failed to add column "${columnName}" to table "${tableName}".`, error: execError.message, code: execError.code });
    } finally {
      if (client) {
        if (engine.toLowerCase() === 'mysql') await client.end();
        else if (client.release) client.release();
      }
    }
  } catch (error) {
    console.error(`Error adding column to table ${tableName}:`, error);
    if (client && engine.toLowerCase() !== 'mysql' && client.release) {
        client.release();
    }
    res.status(500).json({ success: false, message: 'Internal server error adding column.', error: error.message });
  }
};

/**
 * Delete a column from a specific table
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteColumnFromTable = async (req, res) => {
  const { id: connectionId, tableName, columnName } = req.params;

  // --- Basic Input Validation ---
  if (!columnName || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
    return res.status(400).json({ success: false, message: 'Invalid column name provided for deletion.' });
  }
  if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ success: false, message: 'Invalid table name.' });
  }

  let client;
  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;

    let alterTableSql = '';

    if (engine.toLowerCase() === 'mysql') {
      alterTableSql = `ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\`;`;
      client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      alterTableSql = `ALTER TABLE public.\"${tableName}\" DROP COLUMN \"${columnName}\";`;
      const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
      client = await pool.connect();
    } else {
      return res.status(400).json({ success: false, message: `ALTER TABLE DROP COLUMN not supported for engine: ${engine}` });
    }

    console.log(`Executing Drop Column (${engine}):`, alterTableSql);
    try {
      await client.query(alterTableSql);
      res.status(200).json({ success: true, message: `Column "${columnName}" deleted successfully from table "${tableName}".` });
    } catch (execError) {
      console.error(`Error executing DROP COLUMN for table "${tableName}":`, execError);
      // Check for common errors like column not existing
      let userMessage = `Failed to delete column "${columnName}" from table "${tableName}".`;
      if (execError.code === 'ER_BAD_FIELD_ERROR' || execError.code === '42703') { // MySQL: ER_BAD_FIELD_ERROR, PG: 42703 (undefined_column)
        userMessage = `Column "${columnName}" does not exist in table "${tableName}".`;
      }
      res.status(500).json({ success: false, message: userMessage, error: execError.message, code: execError.code });
    } finally {
      if (client) {
        if (engine.toLowerCase() === 'mysql') await client.end();
        else if (client.release) client.release();
      }
    }
  } catch (error) {
    console.error(`Error deleting column from table ${tableName}:`, error);
    if (client && engine.toLowerCase() !== 'mysql' && client.release) {
        client.release();
    }
    res.status(500).json({ success: false, message: 'Internal server error deleting column.', error: error.message });
  }
};

/**
 * Edit an existing column in a specific table
 * Supports changing type, nullability, and default value.
 * Renaming is more complex and might need a separate handler or careful syntax.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.editColumnInTable = async (req, res) => {
  const { id: connectionId, tableName, columnName } = req.params;
  const { newName, newType, newNullable, newDefault, dropDefault } = req.body; // Properties to change

  // --- Basic Input Validation ---
  if (!columnName || !/^[a-zA-Z0-9_]+$/.test(columnName)) {
    return res.status(400).json({ success: false, message: 'Invalid current column name.' });
  }
  if (newName && !/^[a-zA-Z0-9_]+$/.test(newName)) {
    return res.status(400).json({ success: false, message: 'Invalid new column name.' });
  }
  if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
    return res.status(400).json({ success: false, message: 'Invalid table name.' });
  }
  // At least one modifiable property must be present
  if (typeof newName === 'undefined' && typeof newType === 'undefined' && typeof newNullable === 'undefined' && typeof newDefault === 'undefined' && typeof dropDefault === 'undefined') {
    return res.status(400).json({ success: false, message: 'No column modification specified.' });
  }
  const allowedTypes = ['INT', 'VARCHAR(255)', 'TEXT', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL(10,2)'];
  if (newType && !allowedTypes.includes(newType.toUpperCase())) {
      return res.status(400).json({ success: false, message: `Invalid or unsupported new column type: ${newType}` });
  }

  let client;
  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;

    let alterClauses = [];

    if (engine.toLowerCase() === 'mysql') {
      client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });
      let columnDefinition = `\`${newName || columnName}\` ${newType ? newType.toUpperCase() : ''}`;
      
      if (newNullable !== undefined) {
        columnDefinition += newNullable ? ' NULL' : ' NOT NULL';
      }
      if (dropDefault) {
        columnDefinition += ` DEFAULT NULL`; // Or another way to remove default, depending on exact need / existing default
      } else if (typeof newDefault !== 'undefined' && newDefault !== null) {
        if (typeof newDefault === 'string') {
          columnDefinition += ` DEFAULT '${mysql.escape(newDefault).slice(1, -1)}'`;
        } else {
          columnDefinition += ` DEFAULT ${newDefault}`;
        }
      }
      alterClauses.push(`CHANGE COLUMN \`${columnName}\` ${columnDefinition}`);
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      client = await new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 }).connect();
      if (newType) {
        // PostgreSQL might need USING clause for type conversion if data exists
        alterClauses.push(`ALTER COLUMN "${columnName}" TYPE ${newType.toUpperCase()}`); // Add USING old_column::new_type if needed
      }
      if (newNullable !== undefined) {
        alterClauses.push(newNullable ? `ALTER COLUMN "${columnName}" DROP NOT NULL` : `ALTER COLUMN "${columnName}" SET NOT NULL`);
      }
      if (dropDefault) {
        alterClauses.push(`ALTER COLUMN "${columnName}" DROP DEFAULT`);
      } else if (typeof newDefault !== 'undefined' && newDefault !== null) {
        let defaultValStr = '';
        if (typeof newDefault === 'string') {
            defaultValStr = client.escapeLiteral(newDefault);
        } else { // Numbers, booleans
            defaultValStr = newDefault.toString();
        }
        alterClauses.push(`ALTER COLUMN "${columnName}" SET DEFAULT ${defaultValStr}`);
      }
      if (newName && newName !== columnName) {
        alterClauses.push(`RENAME COLUMN "${columnName}" TO "${newName}"`);
      }
    } else {
      return res.status(400).json({ success: false, message: `ALTER TABLE operations not fully supported for engine: ${engine}` });
    }

    if (alterClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid column alterations found for the given engine.' });
    }

    // Execute alter clauses sequentially (important for PostgreSQL)
    console.log(`Executing Edit Column (${engine}):`);
    try {
      for (const clause of alterClauses) {
        const fullSql = engine.toLowerCase() === 'mysql' ? `ALTER TABLE \`${tableName}\` ${clause};` : `ALTER TABLE public."${tableName}" ${clause};`;
        console.log(fullSql);
        await client.query(fullSql);
      }
      res.status(200).json({ success: true, message: `Column "${columnName}" in table "${tableName}" modified successfully.` });
    } catch (execError) {
      console.error(`Error executing ALTER TABLE for column "${columnName}" in table "${tableName}":`, execError);
      res.status(500).json({ success: false, message: `Failed to modify column "${columnName}".`, error: execError.message, code: execError.code });
    } finally {
      if (client) {
        if (engine.toLowerCase() === 'mysql') await client.end();
        else if (client.release) client.release();
      }
    }
  } catch (error) {
    console.error(`Error editing column ${columnName} in table ${tableName}:`, error);
    if (client && engine.toLowerCase() !== 'mysql' && client.release) {
        client.release();
    }
    res.status(500).json({ success: false, message: 'Internal server error editing column.', error: error.message });
  }
};

// ... rest of the controller ... 