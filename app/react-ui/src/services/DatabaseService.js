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
 * Relies solely on the backend API.
 */
class DatabaseService {
  /**
   * Get all database connections from the API
   * @returns {Promise} Promise with all database connections
   */
  async getDatabaseConnections() {
    try {
      const response = await axios.get(`${API_URL}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching connections from API:', error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Get a single database connection by ID from the API
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise with the database connection object
   */
  async getConnectionById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching connection ${id} from API:`, error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Save a database connection via the API
   * @param {Object} connection - Database connection details
   * @returns {Promise} Promise with the saved connection object from the API
   */
  async saveConnection(connection) {
    try {
      const response = await axios.post(`${API_URL}`, connection);
      return response.data;
    } catch (error) {
      console.error('Error saving connection to API:', error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Update a database connection via the API
   * @param {string|number} id - Connection ID
   * @param {Object} connection - Updated connection details
   * @returns {Promise} Promise with the updated connection object from the API
   */
  async updateConnection(id, connection) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, connection);
      return response.data;
    } catch (error) {
      console.error(`Error updating connection ${id} in API:`, error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Delete database connection via the API
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise with delete result from the API
   */
  async deleteConnection(id) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting connection ${id} from API:`, error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Test a database connection via the API
   * @param {Object} connectionData - Connection details (engine, host, port, database, username, password, ssl_enabled)
   * @returns {Promise} Promise with the test result { success: boolean, message: string }
   */
  async testConnection(connectionData) {
    try {
      console.log('Testing connection with data:', connectionData);
      const testApiUrl = `${API_URL.replace('/databases', '')}/databases/test`; 
      console.log('Test API URL:', testApiUrl);
      const response = await axios.post(testApiUrl, connectionData);
      console.log('Test connection response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error testing connection:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to test connection due to an unknown error.';
      // Return error details in the expected format for the form handler
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * Get database schema (tables, columns, etc.) for a specific connection via the API
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise with database schema information
   */
  async getDatabaseSchema(id) {
    try {
      console.log('Fetching schema for database ID:', id);
      const apiUrl = `${API_URL}/${id}/schema`;
      console.log('API URL used:', apiUrl);
      const response = await axios.get(apiUrl);
      console.log('Schema response:', response.data);
      // Ensure success field is present for compatibility, default to true if API returns data
      return { success: true, ...response.data };
    } catch (error) {
      console.error('Error fetching database schema:', error);
      // Return a standardized error format
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch database schema',
        tables: [],
        tableColumns: {}
      };
    }
  }

  /**
   * Execute a SQL query on a database via the API
   * @param {string|number} id - Connection ID
   * @param {string} query - SQL query to execute
   * @returns {Promise} Promise with query results
   */
  async executeQuery(id, query) {
    try {
      console.log('Executing query for database ID:', id);
      const apiUrl = `${API_URL}/${id}/execute`;
      console.log('API URL used:', apiUrl);
      const response = await axios.post(apiUrl, { query });
      console.log('Query execution response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error executing query:', error);
      // Return a standardized error format
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to execute query',
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Fetches the health status for a specific database connection.
   * @param {string} id The ID of the database connection.
   * @returns {Promise<Object>} A promise that resolves to the health status object.
   */
  async getDatabaseHealth(id) {
    // Use the API_URL constant, adjusting the path as needed
    const healthApiUrl = `${API_URL}/${id}/health`; 
    console.log(`Fetching health for database ID: ${id}`);
    console.log(`API URL used: ${healthApiUrl}`);
    try {
      // Use axios for consistency with other methods
      const response = await axios.get(healthApiUrl);
      console.log('Health check response:', response.data);
      // Return the data directly assuming backend sends { status, message }
      return response.data; 
    } catch (error) {
      console.error('Error fetching database health:', error);
      // Extract error message from axios error response if available
      const message = error.response?.data?.message || error.message || 'Network or API error during health check.';
      // Return a generic error status for the frontend to handle
      return { status: 'Error', message: message };
    }
  }

  /**
   * Fetches paginated and sorted data for a specific table.
   * @param {string|number} id - Connection ID.
   * @param {string} tableName - Name of the table.
   * @param {object} params - Parameters for pagination and sorting.
   * @param {number} params.page - Page number (1-based).
   * @param {number} params.limit - Rows per page.
   * @param {string|null} params.sortBy - Column to sort by.
   * @param {'asc'|'desc'|null} params.sortOrder - Sort direction.
   * @returns {Promise<Object>} Promise resolving to { success: boolean, rows: array, columns: array, totalRowCount: number, message?: string }.
   */
  async getTableData(id, tableName, params) {
    // Encode table name in case it has special characters
    const encodedTableName = encodeURIComponent(tableName);
    const apiUrl = `${API_URL}/${id}/tables/${encodedTableName}/data`;
    console.log(`Fetching data for table: ${tableName}`, params);
    console.log(`API URL used: ${apiUrl}`);
    try {
      // Pass params as query parameters
      const response = await axios.get(apiUrl, { params });
      console.log('Get table data response:', response.data);
      // Assume backend returns { success: true, rows: [], columns: [], totalRowCount: 0 }
      return response.data; 
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
      const message = error.response?.data?.message || error.message || 'Network or API error fetching table data.';
      return { 
        success: false, 
        message: message, 
        rows: [], 
        columns: [], // Include empty columns array on error
        totalRowCount: 0 
      };
    }
  }

  /**
   * Creates a new table for a specific database connection.
   * @param {string|number} id - Connection ID.
   * @param {object} tableDefinition - Object containing tableName and columns array.
   * @param {string} tableDefinition.tableName - The name for the new table.
   * @param {Array<object>} tableDefinition.columns - Array of column definitions.
   * @returns {Promise<Object>} Promise resolving to { success: boolean, message?: string }.
   */
  async createTable(id, tableDefinition) {
    const apiUrl = `${API_URL}/${id}/tables`;
    console.log(`Creating table for DB ID: ${id}`, tableDefinition);
    console.log(`API URL used: ${apiUrl}`);
    try {
      const response = await axios.post(apiUrl, tableDefinition);
      console.log('Create table response:', response.data);
      return response.data; // { success: true, message: '...' }
    } catch (error) {
      console.error('Error creating table:', error);
      const message = error.response?.data?.message || error.message || 'Network or API error creating table.';
      return { success: false, message: message };
    }
  }

  /**
   * Deletes a specific table for a database connection.
   * @param {string|number} id - Connection ID.
   * @param {string} tableName - Name of the table to delete.
   * @returns {Promise<Object>} Promise resolving to { success: boolean, message?: string }.
   */
  async deleteTable(id, tableName) {
    const encodedTableName = encodeURIComponent(tableName);
    const apiUrl = `${API_URL}/${id}/tables/${encodedTableName}`;
    console.log(`Deleting table: ${tableName} for DB ID: ${id}`);
    console.log(`API URL used: ${apiUrl}`);
    try {
      const response = await axios.delete(apiUrl);
      console.log('Delete table response:', response.data);
      return response.data; // { success: true, message: '...' }
    } catch (error) {
      console.error(`Error deleting table ${tableName}:`, error);
      const message = error.response?.data?.message || error.message || 'Network or API error deleting table.';
      return { success: false, message: message };
    }
  }
}

// Singleton instance
const databaseService = new DatabaseService();
export default databaseService; 