const { models } = require('../db');
const { Connection } = models;

const connectionService = {
  /**
   * Get all connections for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of connections
   */
  async getAllConnections(userId) {
    return await Connection.findAll({
      where: { userId },
      order: [['lastUsed', 'DESC']]
    });
  },

  /**
   * Get a connection by id
   * @param {string} id - Connection ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Connection object
   */
  async getConnectionById(id, userId) {
    return await Connection.findOne({
      where: { id, userId }
    });
  },

  /**
   * Create a new connection
   * @param {Object} connectionData - Connection data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - New connection object
   */
  async createConnection(connectionData, userId) {
    return await Connection.create({
      ...connectionData,
      userId,
      lastUsed: new Date()
    });
  },

  /**
   * Update an existing connection
   * @param {string} id - Connection ID
   * @param {Object} connectionData - Connection data to update
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated connection object
   */
  async updateConnection(id, connectionData, userId) {
    const connection = await Connection.findOne({
      where: { id, userId }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    await connection.update(connectionData);
    return connection;
  },

  /**
   * Delete a connection
   * @param {string} id - Connection ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteConnection(id, userId) {
    const connection = await Connection.findOne({
      where: { id, userId }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    await connection.destroy();
    return true;
  },

  /**
   * Mark a connection as used
   * @param {string} id - Connection ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Updated connection
   */
  async updateLastUsed(id, userId) {
    const connection = await Connection.findOne({
      where: { id, userId }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    await connection.update({ lastUsed: new Date() });
    return connection;
  }
};

module.exports = connectionService; 