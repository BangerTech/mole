const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Erstelle das Data-Verzeichnis, falls es nicht existiert
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Standard-Datenbankpfad, wird für SQLite verwendet
const dbPath = path.join(dataDir, 'mole.db');

// Umgebungsvariablen für Datenbankverbindung
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let sequelize;

// Wähle den richtigen Datenbanktyp basierend auf der Umgebungsvariable
if (DB_TYPE === 'postgres' && DB_HOST && DB_NAME && DB_USER) {
  // PostgreSQL-Verbindung
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  });
} else if (DB_TYPE === 'mysql' && DB_HOST && DB_NAME && DB_USER) {
  // MySQL-Verbindung
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
} else {
  // SQLite für Entwicklung und Tests (Standardoption)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
  
  console.log(`Using SQLite database at: ${dbPath}`);
}

// Testverbindung beim Start
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Sequelize database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database with Sequelize:', error);
  }
};

// Kompatibilitätsfunktion für die direkte SQLite-Verbindung
const getDirectSqliteConnection = async () => {
  try {
    return await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (error) {
    console.error('Error opening direct SQLite connection:', error);
    throw error;
  }
};

// Initialize Sequelize
testConnection();

module.exports = {
  sequelize,
  getDirectSqliteConnection,
  dbPath
}; 