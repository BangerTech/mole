const { DataTypes } = require('sequelize');
const { encrypt, decrypt } = require('../utils/encryptionUtil');

module.exports = (sequelize) => {
  const Connection = sequelize.define('Connection', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql']]
      }
    },
    host: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const value = this.getDataValue('host');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('host', value ? encrypt(value) : null);
      }
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    database: {
      type: DataTypes.STRING,
      allowNull: false,
      get() {
        const value = this.getDataValue('database');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('database', value ? encrypt(value) : null);
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const value = this.getDataValue('username');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('username', value ? encrypt(value) : null);
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const value = this.getDataValue('password');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('password', value ? encrypt(value) : null);
      }
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    paranoid: true,
    
    // Exclude sensitive data when converting to JSON
    defaultScope: {
      attributes: { exclude: ['password'] }
    },
    
    // Include methods for the model
    instanceMethods: {
      toConnectionConfig() {
        return {
          name: this.name,
          type: this.type,
          host: this.host,
          port: this.port,
          database: this.database,
          username: this.username,
          password: this.password,
          options: this.options || {}
        };
      }
    }
  });

  return Connection;
}; 