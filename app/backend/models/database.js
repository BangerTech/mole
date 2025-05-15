/**
 * Database Model
 * SQLite database implementation for the Mole application
 */

const path = require('path');
const fs = require('fs');
const { getDirectSqliteConnection } = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');

// Ensure data directory exists
const ensureDataDirExists = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize Sequelize
const dataDir = path.join(__dirname, '../data');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dataDir, 'mole.db'), // Path to your SQLite database file
  logging: false, // Set to console.log to see SQL queries
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'user',
  },
  profile_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  preferences: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('preferences');
      try {
        return rawValue ? JSON.parse(rawValue) : null;
      } catch (e) {
        console.error("Error parsing user preferences JSON:", e);
        return null;
      }
    },
    set(value) {
      this.setDataValue('preferences', value ? JSON.stringify(value) : null);
    }
  }
}, {
  tableName: 'users',
  timestamps: false, // We have created_at, last_login manually for now
});

// Initialize database and tables
let isDatabaseInitialized = false;

const initDatabase = async () => {
  if (isDatabaseInitialized) {
    console.log('initDatabase already called. Skipping.');
    return;
  }
  isDatabaseInitialized = true;

  ensureDataDirExists();
  
  // Open database connection
  const db = await getDirectSqliteConnection();
  
  // Ensure foreign key support is on
  await db.exec('PRAGMA foreign_keys = ON;');
  console.log('PRAGMA foreign_keys = ON; executed.');
  
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
      -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Added in migration below
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
      FOREIGN KEY (source_connection_id) REFERENCES database_connections(id) ON DELETE CASCADE,
      FOREIGN KEY (target_connection_id) REFERENCES database_connections(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      start_time DATETIME,
      end_time DATETIME,
      status TEXT,
      message TEXT,
      rows_synced INTEGER,
      FOREIGN KEY (task_id) REFERENCES sync_tasks(id) ON DELETE CASCADE
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
    
    CREATE TABLE IF NOT EXISTS user_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- e.g., 'db_connection_issue', 'sync_complete', 'system_update'
      title TEXT NOT NULL,
      message TEXT,
      link TEXT,
      read_status BOOLEAN DEFAULT 0, -- 0 for unread, 1 for read
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      preferences_key TEXT, -- To match against user notification settings
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      profile_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      preferences TEXT -- JSON string for UI preferences, consider moving fully to user_settings if not already
    );
    
    -- Index for faster queries
    CREATE INDEX IF NOT EXISTS idx_is_sample ON database_connections(isSample);
  `);
  
  // Migration step 1: Add user_id column to database_connections if it doesn't exist
  try {
    const columnExists = await db.get('SELECT COUNT(*) AS count FROM PRAGMA_TABLE_INFO(\'database_connections\') WHERE name=\'user_id\'');

    if (columnExists.count === 0) {
        console.log('Migration: Adding user_id column to database_connections table...');
        await db.exec('ALTER TABLE database_connections ADD COLUMN user_id INTEGER');
        console.log('Migration: user_id column added.');
        
        // Note: Adding FOREIGN KEY constraint via ALTER TABLE is complex in SQLite
        // A separate step/tool might be needed for existing databases if strict FK enforcement is required.
        // For now, rely on application-level checks and the constraint in the CREATE TABLE for new installs.
    } else {
        console.log('Migration: user_id column already exists in database_connections table.');
    }
  } catch (migrationError) {
    console.error('Migration Error (Add user_id column):', migrationError);
  }

  // Migration step 2: Assign existing connections (with NULL user_id) to the first user
  try {
    const firstUser = await db.get('SELECT id FROM users LIMIT 1');
    if (firstUser) {
        console.log(`Migration: Assigning existing database connections without user_id to user ${firstUser.id}...`);
        const result = await db.run(
            'UPDATE database_connections SET user_id = ? WHERE user_id IS NULL',
            firstUser.id
        );
        console.log(`Migration: Assigned ${result.changes} connections to user ${firstUser.id}.`);
    } else {
        console.warn('Migration: No users found in the users table. Cannot assign existing connections.');
    }
  } catch (migrationError) {
    console.error('Migration Error (Assign user_id):', migrationError);
  }
  
  // Migration logic for users from users.json to users table
  try {
    const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
    const usersJsonPath = path.join(__dirname, '../data/users.json');

    if (usersCount.count === 0 && fs.existsSync(usersJsonPath)) {
      console.log('Migrating users from users.json to users table...');
      const usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf-8'));
      
      const stmt = await db.prepare(
        'INSERT INTO users (id, name, email, password_hash, role, profile_image, created_at, last_login, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );

      for (const user of usersData) {
        // Ensure all fields have a default if not present in JSON
        const id = user.id;
        const name = user.name || user.fullName || 'User'; // Added fullName fallback
        const email = user.email;
        // In users.json, password might be stored as 'password' (hashed) or 'passwordHash'
        const passwordHash = user.passwordHash || user.password; 
        const role = user.role || 'user';
        const profileImage = user.profileImage || null;
        const createdAt = user.createdAt || new Date().toISOString();
        const lastLogin = user.lastLogin || null;
        const preferences = user.preferences ? JSON.stringify(user.preferences) : null;

        if (!email || !passwordHash) {
            console.warn(`Skipping user due to missing email or passwordHash: ${JSON.stringify(user)}`);
            continue;
        }

        try {
            await stmt.run(id, name, email, passwordHash, role, profileImage, createdAt, lastLogin, preferences);
            console.log(`Migrated user: ${email}`);
        } catch (runError) {
            // Check for UNIQUE constraint failure for email
            if (runError.message && runError.message.includes('UNIQUE constraint failed: users.email')) {
                console.warn(`User with email ${email} already exists. Skipping.`);
            } else if (runError.message && runError.message.includes('UNIQUE constraint failed: users.id')) {
                 console.warn(`User with ID ${id} already exists. Attempting to insert with new ID for email ${email}.`);
                 // Try inserting without specifying ID, letting AUTOINCREMENT work
                 // This case is tricky if IDs must be preserved. For now, we prioritize email uniqueness.
                 // A more robust migration might handle ID conflicts differently.
                 try {
                    const stmtNoId = await db.prepare(
                        'INSERT INTO users (name, email, password_hash, role, profile_image, created_at, last_login, preferences) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                    );
                    await stmtNoId.run(name, email, passwordHash, role, profileImage, createdAt, lastLogin, preferences);
                    console.log(`Migrated user (with new ID): ${email}`);
                    await stmtNoId.finalize();
                 } catch (noIdInsertError) {
                    console.error(`Failed to migrate user ${email} even with new ID:`, noIdInsertError);
                 }
            } else {
                console.error(`Failed to migrate user ${email}:`, runError);
            }
        }
      }
      await stmt.finalize();
      fs.renameSync(usersJsonPath, `${usersJsonPath}.migrated_to_db`);
      console.log('Users migration completed. users.json renamed.');
    }
  } catch (migrationError) {
    console.error('Error during user migration process:', migrationError);
  }
  
  // Close database connection
  await db.close();
  
  // Sync Sequelize models (optional if tables created manually but good practice)
  try {
    // await sequelize.sync({ alter: true }); // This was causing issues with SQLite and existing data
    await sequelize.sync(); // Use default behavior: create if not exists, do nothing if a table with the same name already exists.
    console.log('Sequelize models synced with database.');
  } catch (syncError) {
    console.error('Error syncing Sequelize models:', syncError);
  }
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
  initDatabase,
  sequelize, // Export sequelize instance
  User,      // Export User model
}; 