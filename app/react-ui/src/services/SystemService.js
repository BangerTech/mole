import apiClient from './api'; // Import the centralized apiClient

// API Endpoint Suffix (relative to apiClient.defaults.baseURL)
const SYSTEM_ENDPOINT_SUFFIX = '/system';

const SystemService = {
  /**
   * Fetches current system information via Node.js backend proxy.
   * @returns {Promise<Object>} Promise resolving to system info object.
   */
  async getSystemInfo() {
    try {
      // Headers are handled by the apiClient interceptor
      const response = await apiClient.get(`${SYSTEM_ENDPOINT_SUFFIX}/info`);
      return response.data;
    } catch (error) {
      console.error('Error fetching system info via Node backend:', error.response?.data || error.message);
      // Fallback to default values on error to prevent UI crashes
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, uptime: 'N/A', success: false, message: error.response?.data?.message || error.message }; 
    }
  },

  /**
   * Fetches historical performance data via Node.js backend proxy.
   * @param {string} metric - The metric to fetch ('cpu' or 'memory').
   * @param {number} limit - The maximum number of data points to fetch.
   * @returns {Promise<Object>} Promise resolving to { success: boolean, history: Array }.
   */
  async getPerformanceHistory(metric, limit = 60) {
    try {
      // Headers are handled by the apiClient interceptor
      const response = await apiClient.get(`${SYSTEM_ENDPOINT_SUFFIX}/performance-history`, { 
        params: { metric, limit },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${metric} history via Node backend:`, error.response?.data || error.message);
      return { success: false, history: [], message: error.response?.data?.message || error.message }; 
    }
  },
};

export default SystemService; 