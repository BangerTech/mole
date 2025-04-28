import axios from 'axios';

// Dynamically determine the API base URL based on the current hostname
// This ensures the app works on any IP address or domain name
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api/databases`;
};

// API Base URL - dynamically determined
const API_URL = getApiBaseUrl();

/**
 * Service for database connection management
 * 
 * Note: The backend has been updated to support both /api/databases and 
 * /api/databases/connections endpoints to maintain compatibility
 * with this service implementation. The localStorage fallback
 * will be used if the API is unavailable.
 */
class DatabaseService {
  /**
   * Get all database connections
   * @returns {Promise} Promise with all database connections
   */
  async getDatabaseConnections() {
    try {
      // Try to fetch from API first
      const response = await axios.get(`${API_URL}/connections`);
      return response.data;
    } catch (error) {
      console.warn('Error fetching from API, using localStorage:', error);
      // Fallback to localStorage if API is not available
      return this.getConnectionsFromLocalStorage();
    }
  }

  /**
   * Get database connections from localStorage
   * @returns {Array} Array of database connections
   */
  getConnectionsFromLocalStorage() {
    try {
      const stored = localStorage.getItem('mole_database_connections');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Save a database connection
   * @param {Object} connection - Database connection details
   * @returns {Promise} Promise with the saved connection
   */
  async saveConnection(connection) {
    try {
      // Try to save to API
      const response = await axios.post(`${API_URL}/connections`, connection);
      return response.data;
    } catch (error) {
      console.warn('Error saving to API, using localStorage:', error);
      // Fallback to localStorage
      return this.saveConnectionToLocalStorage(connection);
    }
  }

  /**
   * Save connection to localStorage
   * @param {Object} connection - Database connection details
   * @returns {Object} Saved connection with generated ID
   */
  saveConnectionToLocalStorage(connection) {
    try {
      const connections = this.getConnectionsFromLocalStorage();
      
      // Generate an ID if not provided
      const newConnection = { 
        ...connection,
        id: connection.id || Date.now(),
        created_at: connection.created_at || new Date().toISOString()
      };
      
      // Add to the list
      connections.push(newConnection);
      
      // Save back to localStorage
      localStorage.setItem('mole_database_connections', JSON.stringify(connections));
      
      return newConnection;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  }

  /**
   * Update a database connection
   * @param {string|number} id - Connection ID
   * @param {Object} connection - Updated connection details
   * @returns {Promise} Promise with the updated connection
   */
  async updateConnection(id, connection) {
    try {
      // Try to update via API
      const response = await axios.put(`${API_URL}/connections/${id}`, connection);
      return response.data;
    } catch (error) {
      console.warn('Error updating in API, using localStorage:', error);
      // Fallback to localStorage
      return this.updateConnectionInLocalStorage(id, connection);
    }
  }

  /**
   * Update connection in localStorage
   * @param {string|number} id - Connection ID
   * @param {Object} connection - Updated connection details
   * @returns {Object} Updated connection
   */
  updateConnectionInLocalStorage(id, connection) {
    try {
      let connections = this.getConnectionsFromLocalStorage();
      
      // Find and update the connection
      connections = connections.map(conn => 
        conn.id.toString() === id.toString() ? { ...conn, ...connection } : conn
      );
      
      // Save back to localStorage
      localStorage.setItem('mole_database_connections', JSON.stringify(connections));
      
      // Return the updated connection
      return connections.find(conn => conn.id.toString() === id.toString());
    } catch (error) {
      console.error('Error updating in localStorage:', error);
      throw error;
    }
  }

  /**
   * Delete a database connection
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise indicating success
   */
  async deleteConnection(id) {
    try {
      // Try to delete via API
      await axios.delete(`${API_URL}/connections/${id}`);
      return { success: true };
    } catch (error) {
      console.warn('Error deleting in API, using localStorage:', error);
      // Fallback to localStorage
      return this.deleteConnectionFromLocalStorage(id);
    }
  }

  /**
   * Delete connection from localStorage
   * @param {string|number} id - Connection ID
   * @returns {Object} Success indicator
   */
  deleteConnectionFromLocalStorage(id) {
    try {
      // Get connections from both storage locations
      let connections = this.getConnectionsFromLocalStorage();
      
      // Get real databases from localStorage
      const storedRealDatabases = localStorage.getItem('mole_real_databases');
      let realDatabases = storedRealDatabases ? JSON.parse(storedRealDatabases) : [];
      
      // Filter out the connection to delete from both storage locations
      connections = connections.filter(conn => conn.id.toString() !== id.toString());
      realDatabases = realDatabases.filter(db => db.id.toString() !== id.toString());
      
      // Save back to both localStorage keys
      localStorage.setItem('mole_database_connections', JSON.stringify(connections));
      localStorage.setItem('mole_real_databases', JSON.stringify(realDatabases));
      
      console.log('Database connection deleted successfully from both storage locations');
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test a database connection
   * @param {Object} connectionDetails - Connection details to test
   * @returns {Promise} Promise with test result
   */
  async testConnection(connectionDetails) {
    try {
      // Try to test via API
      const response = await axios.post(`${API_URL}/test-connection`, connectionDetails);
      return response.data;
    } catch (error) {
      console.error('Error testing connection:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to test connection'
      };
    }
  }

  /**
   * Synchronize between mole_real_databases and mole_database_connections
   * This ensures that both localStorage items are kept in sync
   */
  syncStoredDatabases() {
    try {
      // Get databases from both storage locations
      const storedRealDatabases = localStorage.getItem('mole_real_databases');
      const storedConnections = localStorage.getItem('mole_database_connections');
      
      const realDatabases = storedRealDatabases ? JSON.parse(storedRealDatabases) : [];
      const connections = storedConnections ? JSON.parse(storedConnections) : [];
      
      // Merge databases from both sources by ID
      const mergedDatabases = [...realDatabases];
      
      // Add connections that don't exist in realDatabases
      for (const conn of connections) {
        if (!mergedDatabases.some(db => db.id.toString() === conn.id.toString())) {
          mergedDatabases.push(conn);
        }
      }
      
      // Update both localStorage items with the merged data
      localStorage.setItem('mole_real_databases', JSON.stringify(mergedDatabases));
      localStorage.setItem('mole_database_connections', JSON.stringify(mergedDatabases));
      
      console.log('Database synchronization complete:', {
        databaseCount: mergedDatabases.length
      });
      
      return true;
    } catch (error) {
      console.error('Error synchronizing databases:', error);
      return false;
    }
  }

  /**
   * Get database schema (tables, columns, etc.) for a specific connection
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise with database schema information
   */
  async getDatabaseSchema(id) {
    try {
      // Debug connection information
      console.log('Fetching schema for database ID:', id);
      
      // Fix: Use the correct API path format with /connections/
      const apiUrl = `${API_URL}/connections/${id}/schema`;
      console.log('API URL used:', apiUrl);
      
      // Try to fetch from API
      const response = await axios.get(apiUrl);
      console.log('Schema response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching database schema:', error);
      
      // Return a fallback with empty data
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch database schema',
        tables: [],
        tableColumns: {}
      };
    }
  }

  /**
   * Execute a SQL query on a database
   * @param {string|number} id - Connection ID
   * @param {string} query - SQL query to execute
   * @returns {Promise} Promise with query results
   */
  async executeQuery(id, query) {
    try {
      // Debug connection information
      console.log('Executing query for database ID:', id);
      
      // Fix: Use the correct API path format with /connections/
      const apiUrl = `${API_URL}/connections/${id}/execute`;
      console.log('API URL used:', apiUrl);
      
      // Try to execute via API
      const response = await axios.post(apiUrl, { query });
      console.log('Query execution response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error executing query:', error);
      
      // Return error details
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to execute query',
        error: error.response?.data?.error || error.message
      };
    }
  }
}

export default new DatabaseService(); 