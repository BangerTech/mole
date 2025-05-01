/**
 * Database Model
 * SQLite database implementation for the Mole application
 */

const path = require('path');
const fs = require('fs');
const { getDirectSqliteConnection } = require('../config/database');

// Ensure data directory exists
const ensureDataDirExists = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize database and tables
const initDatabase = async () => {
  ensureDataDirExists();
  
  // Open database connection
  const db = await getDirectSqliteConnection();
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS database_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      engine TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      database TEXT NOT NULL,
      username TEXT,
      password TEXT,
      ssl_enabled BOOLEAN DEFAULT 0,
      notes TEXT,
      isSample BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_connected DATETIME,
      updated_at DATETIME,
      encrypted_password TEXT
    );
    
    CREATE TABLE IF NOT EXISTS sync_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source_connection_id INTEGER,
      target_connection_id INTEGER,
      tables TEXT,
      schedule TEXT,
      last_sync DATETIME,
      enabled BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_connection_id) REFERENCES database_connections(id),
      FOREIGN KEY (target_connection_id) REFERENCES database_connections(id)
    );
    
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      start_time DATETIME,
      end_time DATETIME,
      status TEXT,
      message TEXT,
      rows_synced INTEGER,
      FOREIGN KEY (task_id) REFERENCES sync_tasks(id)
    );
    
    -- Add new table for event logs
    CREATE TABLE IF NOT EXISTS event_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL, -- e.g., 'CONNECTION_CREATED', 'CONNECTION_DELETED', 'HEALTH_ERROR'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      message TEXT,
      connection_id INTEGER, -- Optional reference to the connection involved
      details TEXT -- Optional JSON string for extra details
    );
    
    -- Index for faster queries
    CREATE INDEX IF NOT EXISTS idx_is_sample ON database_connections(isSample);
  `);
  
  // Close database connection
  await db.close();
};

// Get database connection
const getDbConnection = async () => {
  ensureDataDirExists();
  return await getDirectSqliteConnection();
};

// Initialize database on module load
initDatabase().catch(err => {
  console.error('Error initializing database:', err);
});

module.exports = {
  getDbConnection,
  initDatabase
}; 