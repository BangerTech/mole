/**
 * Database Controller
 * Handles all database connection management operations
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const databaseService = require('../services/databaseService');

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