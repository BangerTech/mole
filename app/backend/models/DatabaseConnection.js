const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryptionUtil');

/**
 * Sequelize Model für Datenbankverbindungen
 * Dies ist das ORM-Modell für die künftige Verwendung.
 * 
 * Hinweis: Dieses Modell wird parallel zur direkten SQLite-Implementierung 
 * verwendet, um einen sanften Übergang zur ORM-basierten Architektur zu ermöglichen.
 */
const DatabaseConnection = sequelize.define('DatabaseConnection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  engine: {
    type: DataTypes.STRING,
    allowNull: false
  },
  host: {
    type: DataTypes.STRING,
    allowNull: true
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  database: {
    type: DataTypes.STRING,
    allowNull: false
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
    get() {
      // Passwort wird nie direkt zurückgegeben
      return undefined;
    },
    set(value) {
      if (value) {
        // Legacy-Passwort-Feld für Kompatibilität
        this.setDataValue('password', '[REDACTED]');
        // Verschlüsseltes Passwort wird in encrypted_password gespeichert
        this.setDataValue('encrypted_password', encrypt(value));
      }
    }
  },
  ssl_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'ssl_enabled'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isSample: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'isSample'
  },
  encrypted_password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_connected: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_connected'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  timestamps: false, // Wir verwenden eigene created_at/updated_at Felder für Kompatibilität
  freezeTableName: true,
  tableName: 'database_connections',
  
  // Methoden für Instanzen
  instanceMethods: {
    // Methode zum Entschlüsseln des Passworts für die Verbindung
    decryptPassword: function() {
      if (!this.getDataValue('encrypted_password')) return null;
      
      try {
        return decrypt(this.getDataValue('encrypted_password'));
      } catch (error) {
        console.error('Error decrypting password:', error);
        return null;
      }
    }
  }
});

// Synchronisiere das Modell mit der Datenbank, ohne bestehende Daten zu verlieren
// force: false bedeutet, dass Tabellen nicht überschrieben werden
sequelize.sync({ force: false })
  .then(() => {
    console.log('Database Connection model synced with database');
  })
  .catch(err => {
    console.error('Error syncing Database Connection model:', err);
  });

module.exports = DatabaseConnection; 