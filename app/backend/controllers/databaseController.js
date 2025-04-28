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
      
      const client = await pool.connect();
      client.release();
      await pool.end();
      
      res.status(200).json({ success: true, message: 'PostgreSQL connection successful' });
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
        
        const tablesResult = await client.query(tablesQuery, [database === 'public' ? 'public' : database]);
        
        // Get size and row counts - Verbesserte Abfrage für pg_class
        const sizeQuery = `
          SELECT
            c.relname AS name,
            n_live_tup AS row_count,
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
        
        const sizeResult = await client.query(sizeQuery, [database === 'public' ? 'public' : database]);
        
        // Combine the results
        const sizeMap = {};
        sizeResult.rows.forEach(row => {
          sizeMap[row.name] = {
            rows: row.row_count || 0,
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
        
        const columnsResult = await client.query(columnsQuery, [database === 'public' ? 'public' : database]);
        
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
        
        client.release();
        await pool.end();
        
        res.status(200).json({
          tables,
          tableColumns,
          success: true
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
          
          const fallbackResult = await fallbackClient.query(simplifiedTablesQuery, [database === 'public' ? 'public' : database]);
          
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
          
          // Rückgabe der vereinfachten Daten ohne Spaltendetails
          res.status(200).json({
            tables: simpleTables,
            tableColumns: {},
            success: true,
            message: 'Simplified schema returned due to error with detailed query'
          });
          
        } catch (fallbackError) {
          console.error('Fallback schema error:', fallbackError);
          res.status(200).json({
            tables: [],
            tableColumns: {},
            success: true,
            message: 'Failed to retrieve schema details: ' + error.message
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