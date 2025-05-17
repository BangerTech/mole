import axios from 'axios';

// Base URL for system API endpoints - Point back to Node.js backend
const getSystemApiBaseUrl = () => {
  const hostname = window.location.hostname;
  // Node.js backend runs on 3001
  return `http://${hostname}:3001/api/system`; 
};

const API_URL = getSystemApiBaseUrl();

const SystemService = {
  /**
   * Fetches current system information via Node.js backend proxy.
   * @returns {Promise<Object>} Promise resolving to system info object.
   */
  async getSystemInfo() {
    try {
      // Call Node.js endpoint
      const response = await axios.get(`${API_URL}/info`);
      return response.data;
    } catch (error) {
      console.error('Error fetching system info via Node backend:', error);
      return { cpuUsage: 0, memoryUsage: 0, diskUsage: 0, uptime: 'N/A' }; 
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
      // Call Node.js endpoint
      const response = await axios.get(`${API_URL}/performance-history`, { 
        params: { metric, limit },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${metric} history via Node backend:`, error);
      return { success: false, history: [], message: error.message }; 
    }
  },
};

export default SystemService; 