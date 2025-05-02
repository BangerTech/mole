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
  try {
    const connectionId = req.params.id;
    const connection = await databaseService.getConnectionById(connectionId);

    if (!connection) {
      return res.status(404).json({ message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = null;
    if (encrypted_password) {
      try {
        password = decrypt(encrypted_password);
      } catch (decryptError) {
        console.error(`Decryption failed for connection ${connectionId}:`, decryptError);
        return res.status(200).json({ 
          status: 'Error', 
          message: 'Failed to decrypt stored password.' 
        });
      }
    } else {
      // Handle cases where password might not be encrypted (legacy or test data)
      password = connection.password; 
    }

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
    res.status(200).json(healthStatus);

  } catch (error) {
    console.error(`Unexpected error during health check for ${req.params.id}:`, error);
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
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        message: 'No query provided' 
      });
    }
    
    // Get connection details
    const connection = await databaseService.getConnectionById(connectionId);
    
    if (!connection) {
      return res.status(404).json({ message: 'Database connection not found' });
    }
    
    const { engine, host, port, database, username, password, ssl_enabled } = connection;
    
    // Different connection logic based on database engine
    if (engine.toLowerCase() === 'mysql') {
      const mysqlConnection = await mysql.createConnection({
        host: host || 'localhost',
        port: port || 3306,
        database,
        user: username,
        password: connection.encrypted_password ? decrypt(connection.encrypted_password) : password,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 10000 // 10 seconds timeout
      });
      
      // Execute the query
      const [rows, fields] = await mysqlConnection.query(query);
      
      // Extract column names from fields
      const columns = fields ? fields.map(field => field.name) : [];
      
      await mysqlConnection.end();
      
      res.status(200).json({
        success: true,
        columns,
        rows,
        message: `Query executed successfully. ${rows.length} rows returned.`
      });
    } 
    else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
      const pool = new Pool({
        host: host || 'localhost',
        port: port || 5432,
        database,
        user: username,
        password: connection.encrypted_password ? decrypt(connection.encrypted_password) : password,
        ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 10000 // 10 seconds timeout
      });
      
      const client = await pool.connect();
      
      try {
        // Define orderByClause BEFORE using it in dataQuery
        const orderByClause = sortByClean ? `ORDER BY "${sortByClean}" ${sortOrderClean}` : ''; // Quote sortBy field
        
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

        // Count Query - Use decoded table name directly
        const countQuery = `SELECT COUNT(*) as count FROM ${decodedTableName}`;
        console.log('[getTableData] PostgreSQL Count Query:', countQuery); // DEBUG
        const countResult = await client.query(countQuery);
        totalRowCount = parseInt(countResult.rows[0].count, 10);

      } catch (queryError) {
        client.release();
        await pool.end();
        
        // Detaillierte Fehlerinformationen für besseres Debugging
        console.error('PostgreSQL query error:', queryError);
        
        // Prüfen, ob es ein Syntaxfehler ist, der mit Identifizierern zu tun haben könnte
        if (queryError.message.includes('syntax error') && 
            (queryError.message.includes('-') || queryError.message.includes('at or near'))) {
          
          // Hinweis für Frontend, wie Tabellen mit Bindestrichen zu verwenden sind
          res.status(500).json({
            success: false,
            message: 'SQL syntax error. For tables with hyphens, try surrounding names with double quotes.',
            error: queryError.message,
            detail: 'Example: SELECT * FROM "table-name" instead of SELECT * FROM table-name'
          });
        } else {
          // Allgemeiner Fehler
          res.status(500).json({
            success: false,
            message: queryError.message || 'Failed to execute query',
            error: queryError.message
          });
        }
      }
    }
    else if (engine.toLowerCase() === 'sqlite') {
      // For SQLite, we would use the sqlite3 module
      res.status(200).json({
        success: false,
        message: 'SQLite query execution is not fully implemented yet'
      });
    }
    else {
      res.status(400).json({ 
        success: false, 
        message: `Unsupported database engine: ${engine}` 
      });
    }
  }
  catch (error) {
    console.error('Query execution error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to execute query',
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
  const sortByClean = sortBy && /^[a-zA-Z0-9_]+$/.test(sortBy) ? sortBy : 'time';
  const finalSortOrder = sortBy ? sortOrderClean : 'DESC';
  
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
        // Construct ORDER BY clause
        const orderByClause = sortByClean ? `ORDER BY \\\`${sortByClean}\\\` ${finalSortOrder}` : ''; // Use backticks for MySQL
        
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

        // Count Query - Use decoded table name directly
        const countQuery = `SELECT COUNT(*) as count FROM ${decodedTableName}`;
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
  // Basic validation for column names and types (add more as needed)
  for (const col of columns) {
     if (!col.name || !/^[a-zA-Z0-9_]+$/.test(col.name)) {
         return res.status(400).json({ success: false, message: `Invalid column name: ${col.name}` });
     }
     // Whitelist allowed types or add more robust validation
     const allowedTypes = ['INT', 'VARCHAR(255)', 'TEXT', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL(10,2)'];
     if (!col.type || !allowedTypes.includes(col.type.toUpperCase())) {
          return res.status(400).json({ success: false, message: `Invalid or unsupported column type: ${col.type}` });
     }
  }

  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;
    
    let createTableSql = '';
    let client; // Pool client or MySQL connection

    // --- Construct Engine-Specific CREATE TABLE SQL --- 
    if (engine.toLowerCase() === 'mysql') {
        const columnDefs = columns.map(col => {
            let def = `\\\`${col.name}\\\` ${col.type}`;
            def += col.nullable ? ' NULL' : ' NOT NULL';
            if (col.default) def += ` DEFAULT ${mysql.escape(col.default)}`; // Escape default value
            if (col.isPrimary) def += ' PRIMARY KEY';
            if (col.autoIncrement && col.type.toUpperCase() === 'INT') def += ' AUTO_INCREMENT';
            return def;
        }).join(',\\n  ');
        createTableSql = `CREATE TABLE \\\`${tableName}\\\` (\\n  ${columnDefs}\\n);`;
        
        client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });

    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
        const columnDefs = columns.map(col => {
            // Use SERIAL for INT PRIMARY KEY AUTOINCREMENT
            let type = col.type;
            if (col.isPrimary && col.autoIncrement && col.type.toUpperCase() === 'INT') {
                type = 'SERIAL';
            } 
            let def = `\\\"${col.name}\\\" ${type}`;
            if (col.isPrimary && type !== 'SERIAL') def += ' PRIMARY KEY'; // Add PK only if not SERIAL
            def += col.nullable ? ' NULL' : ' NOT NULL';
            if (col.default) def += ` DEFAULT ${client.escapeLiteral(col.default)}`; // Use client.escapeLiteral if available
            // PostgreSQL doesn't have AUTO_INCREMENT keyword like MySQL, handled by SERIAL
            return def;
        }).join(',\\n  ');
         createTableSql = `CREATE TABLE public.\\\"${tableName}\\\" (\\n  ${columnDefs}\\n);`; // Assume public schema

         const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
         client = await pool.connect();

    } else {
        return res.status(400).json({ success: false, message: `CREATE TABLE not supported for engine: ${engine}` });
    }

    // --- Execute CREATE TABLE --- 
    console.log(`Executing Create Table (${engine}):`, createTableSql);
    try {
      if (engine.toLowerCase() === 'mysql') {
         await client.query(createTableSql);
      } else {
         await client.query(createTableSql);
      }
      res.status(201).json({ success: true, message: `Table \"${tableName}\" created successfully.` });
    } catch (execError) {
        console.error('Error executing CREATE TABLE:', execError);
        // Provide more specific error message if possible
        let userMessage = `Failed to create table \"${tableName}\".`;
        if (execError.message.includes('already exists') || execError.code === 'ER_TABLE_EXISTS_ERROR') {
            userMessage = `Table \"${tableName}\" already exists.`;
        }
        res.status(409).json({ success: false, message: userMessage, error: execError.message }); // 409 Conflict
    } finally {
         // --- Close Connection --- 
        if (client) {
            if (engine.toLowerCase() === 'mysql') await client.end();
            else client.release(); // Release PG client back to pool
            // We might not need pool.end() here if we reuse the pool
        }
    }

  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
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

  // Basic validation for table name
  if (!tableName) {
     return res.status(400).json({ success: false, message: 'Table name is required.' });
  }
  // Basic defense against unintended targets - adjust whitelist/blacklist as needed
  if (!/^[a-zA-Z0-9_\-]+$/.test(tableName)) { // Allow hyphen
     return res.status(400).json({ success: false, message: 'Invalid table name format.' });
  }

  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;
    
    let dropTableSql = '';
    let client;

    // Construct engine-specific DROP TABLE SQL (with proper quoting)
    if (engine.toLowerCase() === 'mysql') {
       dropTableSql = `DROP TABLE IF EXISTS \\\`${tableName}\\\``; 
       client = await mysql.createConnection({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectTimeout: 10000 });
    } else if (engine.toLowerCase() === 'postgresql' || engine.toLowerCase() === 'postgres') {
       dropTableSql = `DROP TABLE IF EXISTS public.\\\"${tableName}\\\"`; // Assume public schema
       const pool = new Pool({ host, port, database, user: username, password, ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined, connectionTimeoutMillis: 10000 });
       client = await pool.connect();
    } else {
        return res.status(400).json({ success: false, message: `DROP TABLE not supported for engine: ${engine}` });
    }

    // Execute DROP TABLE
    console.log(`Executing Drop Table (${engine}):`, dropTableSql);
    try {
      if (engine.toLowerCase() === 'mysql') {
         await client.query(dropTableSql);
      } else {
         await client.query(dropTableSql);
      }
      res.status(200).json({ success: true, message: `Table \"${tableName}\" deleted successfully.` });
    } catch (execError) {
       console.error('Error executing DROP TABLE:', execError);
       res.status(500).json({ success: false, message: `Failed to delete table \"${tableName}\".`, error: execError.message });
    } finally {
        if (client) {
            if (engine.toLowerCase() === 'mysql') await client.end();
            else client.release();
        }
    }

  } catch (error) {
    console.error(`Error deleting table ${tableName}:`, error);
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
  // Extract details provided by the user for the connection entry
  const { engine: userEngineChoice, name: connectionName, host: userHost, port: userPort, username: connectionUser, password: connectionPassword, ssl_enabled: userSslEnabled, notes: userNotes } = req.body;
  // Use the connection name as the database/bucket name to be created
  const dbNameToCreate = connectionName;

  console.log(`[createDatabaseInstance] Request received: Engine=${userEngineChoice}, Name=${dbNameToCreate}`);

  // --- Input Validation --- 
  if (!userEngineChoice || !dbNameToCreate || !connectionUser) { // Password can be empty
    console.error('[createDatabaseInstance] Missing required fields in request body (engine, name, username are required).');
    return res.status(400).json({ success: false, message: 'Missing required fields: engine, name, username are required.' });
  }
  // Strict validation for database/bucket name (alphanumeric + underscore ONLY)
  if (!/^[a-zA-Z0-9_]+$/.test(dbNameToCreate)) {
    console.error(`[createDatabaseInstance] Invalid database/bucket name format: ${dbNameToCreate}`);
    return res.status(400).json({ success: false, message: 'Invalid database name. Use only letters, numbers, and underscores.' });
  }

  let creationSuccess = false;
  let creationMessage = '';

  // --- Database/Bucket Creation Logic --- 
  try { // Outer try block for the creation process
    if (userEngineChoice.toLowerCase() === 'postgresql') {
      // Read PG Admin credentials and target from ENV vars
      const pgAdminUser = process.env.DB_CREATE_PG_USER || 'postgres';
      const pgAdminPassword = process.env.DB_CREATE_PG_PASSWORD;
      const pgHost = process.env.DB_CREATE_PG_HOST || 'mole-postgres';
      const pgPort = process.env.DB_CREATE_PG_PORT || 5432;

      if (!pgAdminPassword) {
        throw new Error('PostgreSQL admin password (DB_CREATE_PG_PASSWORD) not configured.');
      }

      const pool = new Pool({
        host: pgHost, port: pgPort, user: pgAdminUser, password: pgAdminPassword,
        database: 'postgres', // Connect to default db to create a new one
        connectionTimeoutMillis: 10000
      });
      const client = await pool.connect();
      console.log(`[createDatabaseInstance] Connected to PG admin@${pgHost} to check/create ${dbNameToCreate}`);
      try {
        const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbNameToCreate]);
        if (checkRes.rowCount > 0) {
          creationSuccess = true;
          creationMessage = `PostgreSQL database '${dbNameToCreate}' already exists.`;
          console.log(creationMessage);
        } else {
          // Since dbNameToCreate is validated, we can use it directly. PG identifiers are often case-insensitive unless quoted.
          // Using standard double quotes for safety, although potentially unnecessary for validated names.
          await client.query(`CREATE DATABASE \\\"${dbNameToCreate}\\\"` );
          creationSuccess = true;
          creationMessage = `PostgreSQL database '${dbNameToCreate}' created successfully.`;
          console.log(creationMessage);
        }
      } finally {
        client.release();
        await pool.end();
      }
    } else if (userEngineChoice.toLowerCase() === 'mysql') {
      // Read MySQL Admin credentials and target from ENV vars
      const mysqlAdminUser = process.env.DB_CREATE_MYSQL_USER || 'root';
      const mysqlAdminPassword = process.env.DB_CREATE_MYSQL_PASSWORD;
      const mysqlHost = process.env.DB_CREATE_MYSQL_HOST || 'mole-mysql';
      const mysqlPort = process.env.DB_CREATE_MYSQL_PORT || 3306;

      if (!mysqlAdminPassword) {
        throw new Error('MySQL admin password (DB_CREATE_MYSQL_PASSWORD) not configured.');
      }

      const connection = await mysql.createConnection({
          host: mysqlHost, port: mysqlPort, user: mysqlAdminUser, password: mysqlAdminPassword,
          connectTimeout: 10000
      });
      console.log(`[createDatabaseInstance] Connected to MySQL admin@${mysqlHost} to check/create ${dbNameToCreate}`);
      try {
        // Use CREATE DATABASE IF NOT EXISTS. Backticks are standard for MySQL identifiers.
        await connection.query(`CREATE DATABASE IF NOT EXISTS \\\`${dbNameToCreate}\\\``);
        creationSuccess = true;
        creationMessage = `MySQL database '${dbNameToCreate}' created or already exists.`;
        console.log(creationMessage);
      } finally {
          await connection.end();
      }
    } else if (userEngineChoice.toLowerCase() === 'influxdb') {
      // Read InfluxDB config from ENV vars
      const influxUrl = process.env.DB_CREATE_INFLUXDB_URL || 'http://mole-influxdb:8086';
      const influxToken = process.env.DB_CREATE_INFLUXDB_TOKEN;
      const influxOrgName = process.env.DB_CREATE_INFLUXDB_ORG; // Org Name is needed for bucket creation

      if (!influxToken || !influxOrgName) {
          throw new Error('InfluxDB config (URL, TOKEN, ORG) incomplete in ENV vars.');
      }

      console.log(`[createDatabaseInstance] Creating InfluxDB bucket '${dbNameToCreate}' in org '${influxOrgName}' at ${influxUrl}`);
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
          const connectionToSave = {
              name: connectionName, // User-provided connection name
              engine: userEngineChoice, // User-chosen engine
              host: userHost, // User-provided host for connecting later
              port: userPort || (userEngineChoice === 'PostgreSQL' ? 5432 : (userEngineChoice === 'MySQL' ? 3306 : 8086)), // User-provided port or default
              database: dbNameToCreate, // The name of the database/bucket created
              username: connectionUser, // User-provided username
              password: connectionPassword, // User-provided password
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

// ... rest of the controller ... 