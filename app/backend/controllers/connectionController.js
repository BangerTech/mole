const connectionService = require('../services/connectionService');

const connectionController = {
  /**
   * Get all connections for a user
   */
  async getAllConnections(req, res) {
    try {
      const userId = req.user.id;
      const connections = await connectionService.getAllConnections(userId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get a connection by id
   */
  async getConnectionById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const connection = await connectionService.getConnectionById(id, userId);
      
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      
      res.json(connection);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Create a new connection
   */
  async createConnection(req, res) {
    try {
      const userId = req.user.id;
      const connectionData = req.body;
      
      const newConnection = await connectionService.createConnection(connectionData, userId);
      res.status(201).json(newConnection);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Update an existing connection
   */
  async updateConnection(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const connectionData = req.body;
      
      const updatedConnection = await connectionService.updateConnection(id, connectionData, userId);
      res.json(updatedConnection);
    } catch (error) {
      if (error.message === 'Connection not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Delete a connection
   */
  async deleteConnection(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      await connectionService.deleteConnection(id, userId);
      res.status(204).end();
    } catch (error) {
      if (error.message === 'Connection not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Mark a connection as used (update lastUsed timestamp)
   */
  async updateLastUsed(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const connection = await connectionService.updateLastUsed(id, userId);
      res.json(connection);
    } catch (error) {
      if (error.message === 'Connection not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = connectionController; 