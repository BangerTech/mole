/**
 * Database Controller
 * Handles all database connection management operations
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');

// Path for storing database connections in a JSON file
const DB_FILE_PATH = path.join(__dirname, '../data/database_connections.json');

// Ensure the data directory exists
const ensureDataDirExists = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize database file if it doesn't exist
const initDbFile = () => {
  ensureDataDirExists();
  if (!fs.existsSync(DB_FILE_PATH)) {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify([]));
  }
};

// Load connections from file
const loadConnections = () => {
  try {
    initDbFile();
    const data = fs.readFileSync(DB_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading database connections:', error);
    return [];
  }
};

// Save connections to file
const saveConnections = (connections) => {
  try {
    ensureDataDirExists();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(connections, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving database connections:', error);
    return false;
  }
};

/**
 * Get all database connections
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllConnections = (req, res) => {
  try {
    const connections = loadConnections();
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
exports.getConnectionById = (req, res) => {
  try {
    const connections = loadConnections();
    const connection = connections.find(conn => conn.id.toString() === req.params.id);
    
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
exports.createConnection = (req, res) => {
  try {
    const connections = loadConnections();
    
    // Create new connection with generated ID
    const newConnection = {
      ...req.body,
      id: Date.now(),
      created_at: new Date().toISOString(),
      last_connected: null
    };
    
    // Add to list and save
    connections.push(newConnection);
    saveConnections(connections);
    
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
exports.updateConnection = (req, res) => {
  try {
    const connections = loadConnections();
    const id = req.params.id;
    
    // Find the connection index
    const index = connections.findIndex(conn => conn.id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Database connection not found' });
    }
    
    // Update the connection
    const updatedConnection = {
      ...connections[index],
      ...req.body,
      updated_at: new Date().toISOString()
    };
    
    connections[index] = updatedConnection;
    saveConnections(connections);
    
    res.status(200).json(updatedConnection);
  } catch (error) {
    res.status(500).json({ message: 'Error updating database connection', error: error.message });
  }
};

/**
 * Delete a database connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteConnection = (req, res) => {
  try {
    let connections = loadConnections();
    const id = req.params.id;
    
    // Check if connection exists
    const connectionExists = connections.some(conn => conn.id.toString() === id);
    
    if (!connectionExists) {
      return res.status(404).json({ message: 'Database connection not found' });
    }
    
    // Filter out the connection to delete
    connections = connections.filter(conn => conn.id.toString() !== id);
    saveConnections(connections);
    
    res.status(200).json({ message: 'Database connection deleted successfully' });
  } catch (error) {
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
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to connect: ${error.message}` 
    });
  }
}; 