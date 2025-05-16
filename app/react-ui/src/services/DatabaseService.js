import apiClient from './api'; // Import the centralized apiClient

// API Endpoint Suffixes (relative to apiClient.defaults.baseURL)
const DATABASES_ENDPOINT_SUFFIX = '/databases';
const SYNC_ENDPOINT_SUFFIX = '/sync';

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
      const response = await apiClient.get(DATABASES_ENDPOINT_SUFFIX);
      return response.data;
    } catch (error) {
      console.error('Error fetching connections from API:', error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  }

  /**
   * Get a single database connection by ID from the API
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise with the database connection object
   */
  async getConnectionById(id) {
    try {
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching connection ${id} from API:`, error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  }

  /**
   * Save a database connection via the API
   * @param {Object} connection - Database connection details
   * @returns {Promise} Promise with the saved connection object from the API
   */
  async saveConnection(connection) {
    try {
      const response = await apiClient.post(DATABASES_ENDPOINT_SUFFIX, connection);
      return response.data;
    } catch (error) {
      console.error('Error saving connection to API:', error.response?.data || error.message);
      throw error.response?.data || error.message || error;
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
      const response = await apiClient.put(`${DATABASES_ENDPOINT_SUFFIX}/${id}`, connection);
      return response.data;
    } catch (error) {
      console.error(`Error updating connection ${id} in API:`, error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  }

  /**
   * Delete database connection via the API
   * @param {string|number} id - Connection ID
   * @returns {Promise} Promise with delete result from the API
   */
  async deleteConnection(id) {
    try {
      const response = await apiClient.delete(`${DATABASES_ENDPOINT_SUFFIX}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting connection ${id} from API:`, error.response?.data || error.message);
      throw error.response?.data || error.message || error;
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
      const response = await apiClient.post(`${DATABASES_ENDPOINT_SUFFIX}/test`, connectionData);
      console.log('Test connection response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error testing connection:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to test connection due to an unknown error.';
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
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/${id}/schema`);
      console.log('Schema response:', response.data);
      return { success: true, ...response.data };
    } catch (error) {
      console.error('Error fetching database schema:', error.response?.data || error.message);
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
      const response = await apiClient.post(`${DATABASES_ENDPOINT_SUFFIX}/${id}/execute`, { query });
      console.log('Query execution response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error executing query:', error.response?.data || error.message);
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
    console.log(`Fetching health for database ID: ${id}`);
    try {
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/${id}/health`);
      console.log('Health check response:', response.data);
      return response.data; 
    } catch (error) {
      console.error('Error fetching database health:', error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error during health check.';
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
    const encodedTableName = encodeURIComponent(tableName);
    console.log(`Fetching data for table: ${tableName}`, params);
    try {
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/${id}/tables/${encodedTableName}/data`, { params });
      console.log('Get table data response:', response.data);
      return response.data; 
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error fetching table data.';
      return { 
        success: false, 
        message: message, 
        rows: [], 
        columns: [],
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
    console.log(`Creating table for DB ID: ${id}`, tableDefinition);
    try {
      const response = await apiClient.post(`${DATABASES_ENDPOINT_SUFFIX}/${id}/tables`, tableDefinition);
      console.log('Create table response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating table:', error.response?.data || error.message);
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
    console.log(`Deleting table: ${tableName} for DB ID: ${id}`);
    try {
      const response = await apiClient.delete(`${DATABASES_ENDPOINT_SUFFIX}/${id}/tables/${encodedTableName}`);
      console.log('Delete table response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error deleting table ${tableName}:`, error.response?.data || error.message);
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
    try {
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/top-tables`);
      return response.data?.topTables || [];
    } catch (error) {
      console.error('Error fetching top tables:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetches storage size information for a specific database connection.
   * @param {string|number} id - Connection ID.
   * @returns {Promise<Object>} Promise resolving to { success, sizeBytes, sizeFormatted, message? }.
   */
  async getStorageInfo(id) {
    console.log(`Fetching storage info for DB ID: ${id}`);
    try {
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/${id}/storage-info`);
      console.log('Get storage info response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching storage info for DB ${id}:`, error.response?.data || error.message);
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
    console.log(`Fetching transaction stats for DB ID: ${id}`);
    try {
      const response = await apiClient.get(`${DATABASES_ENDPOINT_SUFFIX}/${id}/transaction-stats`);
      console.log('Get transaction stats response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching transaction stats for DB ${id}:`, error.response?.data || error.message);
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

  // --- Synchronization Methods (Using Axios) ---

  /**
   * Get sync settings for a specific database ID.
   * @param {string} databaseId 
   * @returns {Promise<object>} Sync settings object
   */
  async getSyncSettings(databaseId) {
    try {
      const response = await apiClient.get(`${SYNC_ENDPOINT_SUFFIX}/${databaseId}/settings`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching sync settings for DB ${databaseId}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch sync settings');
    }
  }

  /**
   * Update sync settings for a specific database ID.
   * @param {string} databaseId 
   * @param {object} settings - { enabled: boolean, schedule: string, target_connection_id: number | string }
   * @returns {Promise<object>} Response data from backend
   */
  async updateSyncSettings(databaseId, settings) {
    try {
      const response = await apiClient.put(`${SYNC_ENDPOINT_SUFFIX}/${databaseId}/settings`, settings);
      return response.data;
    } catch (error) {
      console.error(`Error updating sync settings for DB ${databaseId}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update sync settings');
    }
  }

  /**
   * Trigger a manual sync for a specific database ID.
   * @param {string} databaseId 
   * @returns {Promise<object>} Response data from backend
   */
  async triggerSync(databaseId) {
    console.log(`[DatabaseService] POST ${SYNC_ENDPOINT_SUFFIX}/${databaseId}/trigger`);
    try {
      const response = await apiClient.post(`${SYNC_ENDPOINT_SUFFIX}/${databaseId}/trigger`, {});
      return response.data;
    } catch (error) {
      console.error('Error triggering sync:', error.response?.data || error.message);
      if (error.response?.status === 404 && error.response?.data?.message?.includes('No sync task configured')) {
        throw new Error('No sync task configured for this database.');
      }
      throw new Error(error.response?.data?.message || 'Failed to trigger sync');
    }
  }

  /**
   * Get all configured sync tasks for the overview page.
   * @returns {Promise<object>} Object containing success status and tasks array
   */
  async getAllSyncTasks() {
    console.log(`[DatabaseService] GET ${SYNC_ENDPOINT_SUFFIX}/tasks`);
    try {
      const response = await apiClient.get(`${SYNC_ENDPOINT_SUFFIX}/tasks`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all sync tasks:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch sync tasks');
    }
  }

  /**
   * Update specific fields of a sync task by its ID.
   * @param {number|string} taskId The ID of the sync task.
   * @param {object} updates Object containing fields to update (e.g., { enabled: boolean, schedule: string }).
   * @returns {Promise<object>} Response data from backend.
   */
  async updateSyncTask(taskId, updates) {
    console.log(`[DatabaseService] PUT ${SYNC_ENDPOINT_SUFFIX}/tasks/${taskId}`, updates);
    try {
      const response = await apiClient.put(`${SYNC_ENDPOINT_SUFFIX}/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      console.error(`Error updating sync task ${taskId}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update sync task');
    }
  }

  /**
   * Delete a specific sync task by its ID.
   * @param {number|string} taskId The ID of the sync task.
   * @returns {Promise<object>} Response data from backend.
   */
  async deleteSyncTask(taskId) {
    console.log(`[DatabaseService] DELETE ${SYNC_ENDPOINT_SUFFIX}/tasks/${taskId}`);
    try {
      const response = await apiClient.delete(`${SYNC_ENDPOINT_SUFFIX}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting sync task ${taskId}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to delete sync task');
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
    console.log(`[DatabaseService] Inserting row into ${tableName} for DB ID ${databaseId}:`, rowData);
    try {
      const response = await apiClient.post(`${DATABASES_ENDPOINT_SUFFIX}/${databaseId}/tables/${encodedTableName}/rows`, rowData);
      console.log('Insert row response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error inserting row into ${tableName}:`, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error inserting row.';
      const errorCode = error.response?.data?.code;
      return { success: false, message: message, code: errorCode, error: error.response?.data?.error };
    }
  }

  /**
   * Updates an existing row in a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {object} primaryKeyCriteria - An object identifying the row, likely containing primary key column(s) and values.
   * @param {object} rowData - An object containing the updated column data.
   * @returns {Promise<object>} - The result from the API.
   */
  async updateRow(databaseId, tableName, primaryKeyCriteria, rowData) {
    const encodedTableName = encodeURIComponent(tableName);
    console.log(`[DatabaseService] Updating row in ${tableName} for DB ID ${databaseId}. PK:`, primaryKeyCriteria, 'New data:', rowData);
    try {
      // Encode primaryKeyCriteria as query parameters
      const queryParams = new URLSearchParams(primaryKeyCriteria).toString();
      const response = await apiClient.put(`${DATABASES_ENDPOINT_SUFFIX}/${databaseId}/tables/${encodedTableName}/row?${queryParams}`, rowData);
      console.log('Update row response:', response.data);
      return response.data; // Expects { success: true, message: '...', affectedRows: X } or { success: false, message: '...' }
    } catch (error) {
      console.error(`Error updating row in ${tableName}:`, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error updating row.';
      const errorCode = error.response?.data?.code;
      return { success: false, message: message, code: errorCode, error: error.response?.data?.error };
    }
  }

  /**
   * Deletes a row from a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {object} primaryKeyCriteria - An object identifying the row, likely containing primary key column(s) and values.
   * @returns {Promise<object>} - The result from the API.
   */
  async deleteRow(databaseId, tableName, primaryKeyCriteria) {
    try {
      // Encode primaryKeyCriteria as query parameters
      const queryParams = new URLSearchParams(primaryKeyCriteria).toString();
      const response = await apiClient.delete(`${DATABASES_ENDPOINT_SUFFIX}/${databaseId}/tables/${tableName}/row?${queryParams}`);
      return response.data; // Expects { success: true, message: '...' } or { success: false, message: '...' }
    } catch (error) {
      console.error('Error deleting row:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete row'
      };
    }
  }
  
  // --- End Placeholders --- 

  /**
   * Adds a new column to a specific table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {object} columnDefinition - Object containing column details (name, type, nullable, defaultValue).
   * @returns {Promise<Object>} Promise resolving to { success: boolean, message?: string }.
   */
  async addColumn(databaseId, tableName, columnDefinition) {
    const encodedTableName = encodeURIComponent(tableName);
    console.log(`[DatabaseService] Adding column to ${tableName} for DB ID ${databaseId}:`, columnDefinition);
    try {
      const response = await apiClient.post(`${DATABASES_ENDPOINT_SUFFIX}/${databaseId}/tables/${encodedTableName}/columns`, columnDefinition);
      console.log('Add column response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error adding column to ${tableName}:`, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error adding column.';
      const errorCode = error.response?.data?.code;
      return { success: false, message: message, code: errorCode, error: error.response?.data?.error };
    }
  }

  /**
   * Deletes a specific column from a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {string} columnName - The name of the column to delete.
   * @returns {Promise<Object>} Promise resolving to { success: boolean, message?: string }.
   */
  async deleteColumn(databaseId, tableName, columnName) {
    const encodedTableName = encodeURIComponent(tableName);
    const encodedColumnName = encodeURIComponent(columnName);
    console.log(`[DatabaseService] Deleting column ${columnName} from ${tableName} for DB ID ${databaseId}`);
    try {
      const response = await apiClient.delete(`${DATABASES_ENDPOINT_SUFFIX}/${databaseId}/tables/${encodedTableName}/columns/${encodedColumnName}`);
      console.log('Delete column response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error deleting column ${columnName} from ${tableName}:`, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error deleting column.';
      const errorCode = error.response?.data?.code;
      return { success: false, message: message, code: errorCode, error: error.response?.data?.error };
    }
  }

  /**
   * Edits an existing column in a table.
   * @param {string|number} databaseId - The ID of the database connection.
   * @param {string} tableName - The name of the table.
   * @param {string} columnName - The current name of the column to edit.
   * @param {object} changes - Object containing the changes (e.g., { newName, newType, newNullable, newDefault, dropDefault }).
   * @returns {Promise<Object>} Promise resolving to { success: boolean, message?: string }.
   */
  async editColumn(databaseId, tableName, columnName, changes) {
    const encodedTableName = encodeURIComponent(tableName);
    const encodedColumnName = encodeURIComponent(columnName);
    console.log(`[DatabaseService] Editing column ${columnName} in ${tableName} for DB ID ${databaseId}:`, changes);
    try {
      const response = await apiClient.put(`${DATABASES_ENDPOINT_SUFFIX}/${databaseId}/tables/${encodedTableName}/columns/${encodedColumnName}`, changes);
      console.log('Edit column response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error editing column ${columnName} in ${tableName}:`, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Network or API error editing column.';
      const errorCode = error.response?.data?.code;
      return { success: false, message: message, code: errorCode, error: error.response?.data?.error };
    }
  }
}

const databaseService = new DatabaseService();
export default databaseService; 