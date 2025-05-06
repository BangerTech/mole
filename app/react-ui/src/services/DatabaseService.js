import axios from 'axios';

// Dynamically determine the API base URL based on the current hostname
// This ensures the app works on any IP address or domain name
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api/databases`;
};

// API Base URL - dynamically determined
const API_URL = getApiBaseUrl();

// Helper to get base URL for different services if needed
const getServiceBaseUrl = (service) => {
    const hostname = window.location.hostname;
    const port = 3001; // Assuming backend runs on 3001
    switch (service) {
        case 'sync':
            return `http://${hostname}:${port}/api/sync`;
        case 'databases':
        default:
            return `http://${hostname}:${port}/api/databases`;
    }
};

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
      const apiUrl = getServiceBaseUrl('databases');
      const response = await axios.get(apiUrl);
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
      const apiUrl = `${getServiceBaseUrl('databases')}/${id}`;
      const response = await axios.get(apiUrl);
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
      const apiUrl = getServiceBaseUrl('databases');
      const response = await axios.post(apiUrl, connection);
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
      const apiUrl = `${getServiceBaseUrl('databases')}/${id}`;
      const response = await axios.put(apiUrl, connection);
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
      const apiUrl = `${getServiceBaseUrl('databases')}/${id}`;
      const response = await axios.delete(apiUrl);
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
      const testApiUrl = `${getServiceBaseUrl('databases')}/test`; 
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
      const apiUrl = `${getServiceBaseUrl('databases')}/${id}/schema`;
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
      const apiUrl = `${getServiceBaseUrl('databases')}/${id}/execute`;
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
    const healthApiUrl = `${getServiceBaseUrl('databases')}/${id}/health`; 
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
    const apiUrl = `${getServiceBaseUrl('databases')}/${id}/tables/${encodedTableName}/data`;
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
    const apiUrl = `${getServiceBaseUrl('databases')}/${id}/tables`;
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
    const apiUrl = `${getServiceBaseUrl('databases')}/${id}/tables/${encodedTableName}`;
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

  /**
   * Fetches the top N largest tables across all connections.
   * @param {number} limit - The maximum number of tables to fetch.
   * @returns {Promise<Array>} Promise resolving to an array of top table objects.
   */
  async getTopTables(limit = 10) {
    const apiUrl = `${getServiceBaseUrl('databases')}/top-tables`;
    try {
      const response = await axios.get(apiUrl);
      return response.data?.topTables || []; // Return the topTables array
    } catch (error) {
      console.error('Error fetching top tables:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Fetches storage size information for a specific database connection.
   * @param {string|number} id - Connection ID.
   * @returns {Promise<Object>} Promise resolving to { success, sizeBytes, sizeFormatted, message? }.
   */
  async getStorageInfo(id) {
    const apiUrl = `${getServiceBaseUrl('databases')}/${id}/storage-info`;
    console.log(`Fetching storage info for DB ID: ${id}`);
    console.log(`API URL used: ${apiUrl}`);
    try {
      const response = await axios.get(apiUrl);
      console.log('Get storage info response:', response.data);
      return response.data; // { success: true, sizeBytes: ..., sizeFormatted: '...' }
    } catch (error) {
      console.error(`Error fetching storage info for DB ${id}:`, error);
      const message = error.response?.data?.message || error.message || 'Network or API error fetching storage info.';
      return { 
        success: false, 
        message: message, 
        sizeBytes: 0,
        sizeFormatted: 'N/A'
      };
    }
  }

  /**
   * Fetches transaction statistics for a specific database connection.
   * @param {string|number} id - Connection ID.
   * @returns {Promise<Object>} Promise resolving to { success, activeTransactions, totalCommits, totalRollbacks, message? }.
   */
  async getTransactionStats(id) {
    const apiUrl = `${getServiceBaseUrl('databases')}/${id}/transaction-stats`;
    console.log(`Fetching transaction stats for DB ID: ${id}`);
    console.log(`API URL used: ${apiUrl}`);
    try {
      const response = await axios.get(apiUrl);
      console.log('Get transaction stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching transaction stats for DB ${id}:`, error);
      const message = error.response?.data?.message || error.message || 'Network or API error fetching transaction stats.';
      return { 
        success: false, 
        message: message, 
        activeTransactions: 0,
        totalCommits: 0,
        totalRollbacks: 0
      };
    }
  }

  // Helper to get Axios config with auth (if implemented in AuthService or interceptor)
  // For now, just return empty object, assuming Axios interceptor handles auth
  getAuthConfig() {
      // Example if AuthService provides token:
      // const token = AuthService.getToken();
      // if (token) {
      //     return { headers: { Authorization: `Bearer ${token}` } };
      // }
      return {}; // Assume interceptor handles it
  }

  // --- Synchronization Methods (Using Axios) ---

  async getSyncSettings(databaseId) {
    // Use the /api/sync endpoint
    const url = `${getServiceBaseUrl('sync')}/${databaseId}/settings`;
    console.log(`[DatabaseService] GET ${url}`);
    try {
      // Use axios and assume auth is handled by interceptor
      const response = await axios.get(url, this.getAuthConfig());
      return response.data; // Assuming API returns { enabled: boolean, schedule: string, last_sync: string | null, target_connection_id: number | null }
    } catch (error) {
      console.error('Error fetching sync settings:', error);
      // Rethrow a more informative error if possible
      const message = error.response?.data?.message || error.message || 'Failed to fetch sync settings.';
      throw new Error(message);
    }
  }

  async updateSyncSettings(databaseId, settings) {
    // Use the /api/sync endpoint
    const url = `${getServiceBaseUrl('sync')}/${databaseId}/settings`;
    console.log(`[DatabaseService] PUT ${url}`, settings);
    try {
      // Use axios and assume auth is handled by interceptor
      const response = await axios.put(url, settings, this.getAuthConfig());
      return response.data; // Assuming API returns { success: boolean, message: string, newTargetId?: number }
    } catch (error) {
      console.error('Error updating sync settings:', error);
      const message = error.response?.data?.message || error.message || 'Failed to update sync settings.';
      throw new Error(message);
    }
  }

  async triggerSync(databaseId) {
    // Use the /api/sync endpoint
    const url = `${getServiceBaseUrl('sync')}/${databaseId}/trigger`;
    console.log(`[DatabaseService] POST ${url}`);
    try {
      // Use axios and assume auth is handled by interceptor
      const response = await axios.post(url, {}, this.getAuthConfig()); // Empty payload for trigger
      return response.data; // Assuming API returns { success: boolean, message: string }
    } catch (error) {
      console.error('Error triggering sync:', error);
      const message = error.response?.data?.message || error.message || 'Failed to trigger sync.';
      throw new Error(message);
    }
  }

  // --- Placeholders for Row Operations --- 
  
  /**
   * Inserts a new row into a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {object} rowData - An object where keys are column names and values are the data to insert.
   * @returns {Promise<object>} - The result from the API (e.g., { success: boolean, message: string, affectedRows?: number }).
   */
  async insertRow(databaseId, tableName, rowData) {
    const encodedTableName = encodeURIComponent(tableName);
    const apiUrl = `${getServiceBaseUrl('databases')}/${databaseId}/tables/${encodedTableName}/rows`;
    console.log(`[DatabaseService] Inserting row into ${tableName} for DB ID ${databaseId}:`, rowData);
    console.log(`API URL used: ${apiUrl}`);
    try {
      const response = await axios.post(apiUrl, rowData, this.getAuthConfig());
      console.log('Insert row response:', response.data);
      return response.data; // Expected: { success: true, message: '...', affectedRows: 1 }
    } catch (error) {
      console.error(`Error inserting row into ${tableName}:`, error);
      const message = error.response?.data?.message || error.message || 'Network or API error inserting row.';
      const errorCode = error.response?.data?.code; // Include error code if backend provides it
      return { success: false, message: message, code: errorCode, error: error.response?.data?.error };
    }
  }

  /**
   * Updates an existing row in a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {object} primaryKeyData - An object identifying the row, likely containing primary key column(s) and values.
   * @param {object} rowData - An object containing the updated column data.
   * @returns {Promise<object>} - The result from the API.
   */
  async updateRow(databaseId, tableName, primaryKeyData, rowData) {
    console.log('DatabaseService.updateRow called:', { databaseId, tableName, primaryKeyData, rowData });
    // TODO: Implement actual API call. Needs careful handling of primary keys.
    // Might need a specific endpoint like PUT /api/databases/:id/tables/:tableName/rows/:pkValue or pass PK in body/params.
    // const endpoint = `/databases/${databaseId}/tables/${encodeURIComponent(tableName)}/rows`; // Needs PK info
    // return this.request(endpoint, { method: 'PUT', body: { primaryKey: primaryKeyData, updates: rowData } });
    return Promise.resolve({ success: false, message: 'Update Row API call not implemented yet (needs PK handling).' }); // Placeholder
  }

  /**
   * Deletes a row from a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {object} primaryKeyData - An object identifying the row, likely containing primary key column(s) and values.
   * @returns {Promise<object>} - The result from the API.
   */
  async deleteRow(databaseId, tableName, primaryKeyData) {
    console.log('DatabaseService.deleteRow called:', { databaseId, tableName, primaryKeyData });
    // TODO: Implement actual API call. Needs careful handling of primary keys.
    // Might need a specific endpoint like DELETE /api/databases/:id/tables/:tableName/rows/:pkValue or pass PK in body/params.
    // const endpoint = `/databases/${databaseId}/tables/${encodeURIComponent(tableName)}/rows`; // Needs PK info
    // return this.request(endpoint, { method: 'DELETE', body: { primaryKey: primaryKeyData } });
    return Promise.resolve({ success: false, message: 'Delete Row API call not implemented yet (needs PK handling).' }); // Placeholder
  }
  
  // --- End Placeholders --- 
}

// Singleton instance
const databaseService = new DatabaseService();
export default databaseService; 