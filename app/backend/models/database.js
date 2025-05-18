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

// Helper function to contain migration logic
const runMigrations = async (db) => {
  console.log("Starting migration checks...");
  // Migration step 1: Add user_id column to database_connections if it doesn't exist
  try {
    const columnExists = await db.get('SELECT COUNT(*) AS count FROM PRAGMA_TABLE_INFO(\'database_connections\') WHERE name=\'user_id\'');

    if (columnExists.count === 0) {
        console.log('Migration: Adding user_id column to database_connections table...');
        await db.exec('ALTER TABLE database_connections ADD COLUMN user_id INTEGER');
        console.log('Migration: user_id column added.');
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
        const id = user.id;
        const name = user.name || user.fullName || 'User';
        const email = user.email;
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
            if (runError.message && runError.message.includes('UNIQUE constraint failed: users.email')) {
                console.warn(`User with email ${email} already exists. Skipping.`);
            } else if (runError.message && runError.message.includes('UNIQUE constraint failed: users.id')) {
                 console.warn(`User with ID ${id} already exists. Attempting to insert with new ID for email ${email}.`);
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
    } else if (usersCount.count > 0) {
      console.log('Users table already populated. Skipping users.json migration.');
    } else if (!fs.existsSync(usersJsonPath)) {
      console.log('users.json not found. Skipping users.json migration.');
    }
  } catch (migrationError) {
    console.error('Migration Error (Users from JSON):', migrationError);
  }
  console.log("Migration checks finished.");
};

let initializationPromise = null;

const initDatabaseInternal = async () => {
  ensureDataDirExists();
  const db = await getDirectSqliteConnection();
  let mainTableExists = false;
  try {
    const result = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users';"); 
    if (result) {
      mainTableExists = true;
      console.log("'users' table already exists. Database appears to be initialized.");
    } else {
      console.log("'users' table not found. Proceeding with new database initialization.");
    }
  } catch (e) {
    console.error("Error checking for 'users' table, proceeding with initialization to be safe:", e);
  }

  await db.exec('PRAGMA foreign_keys = ON;');

  if (!mainTableExists) {
    console.log("Executing full schema creation...");
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        profile_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        preferences TEXT 
      );
      
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
        encrypted_password TEXT,
        user_id INTEGER
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
      
      CREATE TABLE IF NOT EXISTS event_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        message TEXT,
        connection_id INTEGER,
        details TEXT
      );
      
      CREATE TABLE IF NOT EXISTS user_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        read_status BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        preferences_key TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_is_sample ON database_connections(isSample);
    `);
    console.log("Schema creation SQL executed.");
  }
  
  await runMigrations(db);
  
  try {
    await sequelize.sync();
    console.log('Sequelize models synced with database.');
  } catch (syncError) {
    console.error('Error syncing Sequelize models:', syncError);
  }
  console.log("Database initialization process finished.");
};

const initDatabase = () => {
  if (!initializationPromise) {
    console.log("Attempting new database initialization call...");
    initializationPromise = initDatabaseInternal().catch(err => {
      console.error('CRITICAL: Database initialization internal promise failed:', err);
      initializationPromise = null;
      throw err;
    });
  } else {
    console.log("Database initialization already in progress or completed, returning existing promise.");
  }
  return initializationPromise;
};

// Get database connection
const getDbConnection = async () => {
  ensureDataDirExists();
  return await getDirectSqliteConnection();
};

// Initialize database on module load
initDatabase().catch(err => {
  // This initial call is to trigger it on module load.
  // Errors are logged within the promise chain.
});

module.exports = {
  getDbConnection,
  initDatabase,
  sequelize, // Export sequelize instance
  User,      // Export User model
}; 