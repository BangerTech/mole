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
  try {
    const connectionId = req.params.id;
    
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
      
      // Get tables
      const [tablesResult] = await mysqlConnection.query(`
        SELECT 
          table_name AS name, 
          table_type AS type,
          table_rows AS row_count,
          ROUND((data_length + index_length) / 1024) AS size_kb
        FROM 
          information_schema.tables 
        WHERE 
          table_schema = ?
        ORDER BY
          table_name
      `, [database]);
      
      // Get columns for the tables
      const [columnsResult] = await mysqlConnection.query(`
        SELECT 
          table_name,
          column_name AS name, 
          data_type AS type,
          is_nullable AS nullable,
          column_default AS default_value,
          column_key AS key,
          extra
        FROM 
          information_schema.columns 
        WHERE 
          table_schema = ?
        ORDER BY
          table_name, ordinal_position
      `, [database]);
      
      // Group columns by table
      const tableColumns = {};
      columnsResult.forEach(column => {
        if (!tableColumns[column.table_name]) {
          tableColumns[column.table_name] = [];
        }
        tableColumns[column.table_name].push({
          name: column.name,
          type: column.type,
          nullable: column.nullable === 'YES',
          default: column.default_value,
          key: column.key,
          extra: column.extra
        });
      });
      
      // Format the final result
      const tables = tablesResult.map(table => ({
        name: table.name,
        type: table.type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
        rows: table.row_count || 0,
        size: `${Math.max(1, table.size_kb)} KB`,
        columns: tableColumns[table.name]?.length || 0,
        lastUpdated: new Date().toISOString().split('T')[0] // Just use today's date as we don't have actual update info
      }));
      
      await mysqlConnection.end();
      
      res.status(200).json({
        tables,
        tableColumns,
        success: true
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
        // Get tables and views - Verbesserte Abfrage, die alle Tabellennamen als Identifizierer behandelt (mit Anführungszeichen)
        const tablesQuery = `
          SELECT 
            table_name AS name,
            table_type AS type,
            (SELECT count(*) FROM information_schema.columns 
             WHERE table_schema = $1 AND table_name = t.table_name) AS columns
          FROM 
            information_schema.tables t
          WHERE 
            table_schema = $1
            AND table_type IN ('BASE TABLE', 'VIEW')
          ORDER BY 
            table_name
        `;
        
        const tablesResult = await client.query(tablesQuery, ['public']);
        
        // Get size and row counts - Verbesserte Abfrage für pg_class
        const sizeQuery = `
          SELECT
            c.relname AS name,
            pg_size_pretty(pg_total_relation_size(c.oid)) AS size
          FROM
            pg_class c
          JOIN
            pg_namespace n ON n.oid = c.relnamespace
          WHERE
            n.nspname = $1
            AND c.relkind IN ('r', 'v')  -- Tables and views
          ORDER BY
            c.relname
        `;
        
        const sizeResult = await client.query(sizeQuery, ['public']);
        
        // Combine the results
        const sizeMap = {};
        sizeResult.rows.forEach(row => {
          sizeMap[row.name] = {
            rows: 0, // Default to 0 since n_live_tup is removed
            size: row.size || '0 KB'
          };
        });
        
        // Get column information - Verbesserte Abfrage für Spalteninformationen
        // Behandelt besser Identifizierer mit Sonderzeichen
        const columnsQuery = `
          SELECT 
            c.table_name,
            c.column_name AS name,
            c.data_type AS type,
            c.is_nullable AS nullable,
            c.column_default AS default_value,
            CASE 
              WHEN pk.column_name IS NOT NULL THEN 'PRI'
              WHEN uk.column_name IS NOT NULL THEN 'UNI'
              WHEN fk.column_name IS NOT NULL THEN 'FOR'
              ELSE ''
            END AS key
          FROM 
            information_schema.columns c
          LEFT JOIN (
            SELECT 
              kcu.column_name,
              kcu.table_name
            FROM 
              information_schema.table_constraints tc
            JOIN 
              information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
            WHERE 
              tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = $1
          ) pk ON pk.column_name = c.column_name AND pk.table_name = c.table_name
          LEFT JOIN (
            SELECT 
              kcu.column_name,
              kcu.table_name
            FROM 
              information_schema.table_constraints tc
            JOIN 
              information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
            WHERE 
              tc.constraint_type = 'UNIQUE'
              AND tc.table_schema = $1
          ) uk ON uk.column_name = c.column_name AND uk.table_name = c.table_name
          LEFT JOIN (
            SELECT 
              kcu.column_name,
              kcu.table_name
            FROM 
              information_schema.table_constraints tc
            JOIN 
              information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
            WHERE 
              tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = $1
          ) fk ON fk.column_name = c.column_name AND fk.table_name = c.table_name
          WHERE 
            c.table_schema = $1
          ORDER BY
            c.table_name, c.ordinal_position
        `;
        
        const columnsResult = await client.query(columnsQuery, ['public']);
        
        // Group columns by table
        const tableColumns = {};
        columnsResult.rows.forEach(column => {
          const tableName = column.table_name;
          if (!tableColumns[tableName]) {
            tableColumns[tableName] = [];
          }
          tableColumns[tableName].push({
            name: column.name,
            type: column.type,
            nullable: column.nullable === 'YES',
            default: column.default_value,
            key: column.key,
            extra: ''
          });
        });
        
        // Format the final result
        const tables = tablesResult.rows.map(table => ({
          name: table.name,
          type: table.type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
          rows: sizeMap[table.name]?.rows || 0,
          size: sizeMap[table.name]?.size || '0 KB',
          columns: table.columns || 0,
          lastUpdated: new Date().toISOString().split('T')[0] // Use today's date
        }));
        
        // Calculate total size (approximation from fetched tables/views)
        let totalSizeRaw = 0;
        sizeResult.rows.forEach(row => {
          // Convert human-readable size back to bytes (approximate)
          const sizeMatch = row.size?.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
          if (sizeMatch) {
            const value = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();
            switch (unit) {
              case 'KB': totalSizeRaw += value * 1024; break;
              case 'MB': totalSizeRaw += value * 1024 * 1024; break;
              case 'GB': totalSizeRaw += value * 1024 * 1024 * 1024; break;
              case 'TB': totalSizeRaw += value * 1024 * 1024 * 1024 * 1024; break;
            }
          }
        });
        // Convert total bytes back to human-readable format
        const formatBytes = (bytes, decimals = 2) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }
        const totalSizeFormatted = formatBytes(totalSizeRaw);

        client.release();
        await pool.end();
        
        res.status(200).json({
          tables,
          tableColumns,
          success: true,
          totalSize: totalSizeFormatted // Add total size to response
        });
      } catch (error) {
        client.release();
        await pool.end();
        console.error('PostgreSQL schema error:', error);
        
        // Falls es ein Fehler wegen der Identifizierer ist, versuchen wir eine einfachere Abfrage
        try {
          // Verbindung erneut herstellen
          const fallbackPool = new Pool({
            host: host || 'localhost',
            port: port || 5432,
            database,
            user: username,
            password: connection.encrypted_password ? decrypt(connection.encrypted_password) : password,
            ssl: ssl_enabled ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: 10000
          });
          
          const fallbackClient = await fallbackPool.connect();
          
          // Einfachere Abfrage, die keine Identifizierer mit Bindestrichen verwendet
          const simplifiedTablesQuery = `
            SELECT table_name::text AS name 
            FROM information_schema.tables 
            WHERE table_schema = $1
          `;
          
          const fallbackResult = await fallbackClient.query(simplifiedTablesQuery, ['public']);
          
          // Erstelle vereinfachte Tabellenliste
          const simpleTables = fallbackResult.rows.map(row => ({
            name: row.name,
            type: 'TABLE',
            rows: 0,
            size: 'Unknown',
            columns: 0,
            lastUpdated: new Date().toISOString().split('T')[0]
          }));
          
          fallbackClient.release();
          await fallbackPool.end();
          
          // Rückgabe der vereinfachten Daten ohne Spaltendetails (und ohne Gesamtgröße)
          res.status(200).json({
            tables: simpleTables,
            tableColumns: {},
            success: true,
            message: 'Simplified schema returned due to error with detailed query',
            totalSize: 'N/A' // Indicate size couldn't be calculated
          });
          
        } catch (fallbackError) {
          console.error('Fallback schema error:', fallbackError);
          res.status(200).json({
            tables: [],
            tableColumns: {},
            success: true,
            message: 'Failed to retrieve schema details: ' + error.message,
            totalSize: 'N/A' // Indicate size couldn't be calculated
          });
        }
      }
    }
    else if (engine.toLowerCase() === 'sqlite') {
      // For SQLite, we would use the sqlite3 module to connect
      // This is a simplified implementation since SQLite is less common
      res.status(200).json({
        tables: [],
        tableColumns: {},
        success: true,
        message: 'SQLite schema retrieval is not fully implemented yet'
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
    console.error('Database schema error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to retrieve database schema' 
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
        // Verbessere die Fehlerbehandlung bei SQL-Ausführung
        console.log('Executing PostgreSQL query:', query);
        
        // Execute the query
        const result = await client.query(query);
        
        client.release();
        await pool.end();
        
        // Extract column names
        const columns = result.fields ? result.fields.map(field => field.name) : [];
        
        res.status(200).json({
          success: true,
          columns,
          rows: result.rows,
          message: `Query executed successfully. ${result.rows.length} rows returned.`
        });
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

  // Validate and sanitize input
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const sortOrderClean = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  // Basic validation for sortBy to prevent injection (allow only alphanumeric and underscore)
  const sortByClean = sortBy && /^[a-zA-Z0-9_]+$/.test(sortBy) ? sortBy : null;
  
  if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters.' });
  }

  const offset = (pageNum - 1) * limitNum;

  try {
    const connection = await databaseService.getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Database connection not found' });
    }

    const { engine, host, port, database, username, encrypted_password, ssl_enabled } = connection;
    let password = encrypted_password ? decrypt(encrypted_password) : connection.password;

    let client; // General client/connection variable
    let rows = [];
    let columns = [];
    let totalRowCount = 0;

    // Sanitize table name - simple quote escaping, adjust based on engine if needed
    // A more robust solution might involve checking information_schema first
    const safeTableName = tableName.replace(/\"/g, '\\"'); // Basic defense

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
        const orderByClause = sortByClean ? `ORDER BY \`${sortByClean}\` ${sortOrderClean}` : ''; // Use backticks for MySQL
        
        // Data Query
        const dataQuery = `SELECT * FROM \`${safeTableName}\` ${orderByClause} LIMIT ? OFFSET ?`;
        console.log('MySQL Data Query:', dataQuery, [limitNum, offset]);
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
        console.log('MySQL Count Query:', countQuery);
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
        // Construct ORDER BY clause - Use double quotes for PostgreSQL identifiers
        const orderByClause = sortByClean ? `ORDER BY \"${sortByClean}\" ${sortOrderClean}` : '';
        
        // Data Query
        const dataQuery = `SELECT * FROM \"${safeTableName}\" ${orderByClause} LIMIT $1 OFFSET $2`;
        console.log('PostgreSQL Data Query:', dataQuery, [limitNum, offset]);
        const dataResult = await client.query(dataQuery, [limitNum, offset]);
        rows = dataResult.rows;

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
              ORDER BY ordinal_position;`, [safeTableName]);
            columns = colsInfo.rows.map(r => r.column_name);
        }

        // Count Query
        const countQuery = `SELECT COUNT(*) as count FROM \"${safeTableName}\"`;
        console.log('PostgreSQL Count Query:', countQuery);
        const countResult = await client.query(countQuery);
        totalRowCount = parseInt(countResult.rows[0].count, 10);

      } finally {
        client.release();
        await pool.end();
      }
    } else {
      return res.status(400).json({ success: false, message: `Unsupported database engine for table data: ${engine}` });
    }

    res.status(200).json({
      success: true,
      rows,
      columns, // Send column names along with data
      totalRowCount
    });

  } catch (error) {
    console.error(`Error fetching data for table ${tableName}:`, error);
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