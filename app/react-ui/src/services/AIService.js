/**
 * AI Service
 * Handles AI assistant settings and queries
 */

import axios from 'axios';

// Dynamically generate API URL based on current hostname
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  // If running in development mode (localhost)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api/ai';
  }
  // For production docker environment, use the same hostname with backend port
  return `http://${hostname}:3001/api/ai`;
};

const AIService = {
  /**
   * Get AI settings
   * @returns {Promise<Object>} AI settings
   */
  getSettings: async () => {
    try {
      const response = await axios.get(`${getBaseUrl()}/settings`);
      return response.data;
    } catch (error) {
      console.error('Error getting AI settings:', error);
      throw error;
    }
  },

  /**
   * Update AI settings
   * @param {Object} settings - New AI settings
   * @returns {Promise<Object>} Updated settings
   */
  updateSettings: async (settings) => {
    try {
      const response = await axios.post(`${getBaseUrl()}/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating AI settings:', error);
      throw error;
    }
  },

  /**
   * Get available AI providers
   * @returns {Promise<Object>} Available providers
   */
  getProviders: async () => {
    try {
      const response = await axios.get(`${getBaseUrl()}/providers`);
      return response.data;
    } catch (error) {
      console.error('Error getting AI providers:', error);
      throw error;
    }
  },

  /**
   * Test AI provider connection
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key
   * @returns {Promise<Object>} Test result
   */
  testProvider: async (provider, apiKey) => {
    try {
      const response = await axios.post(`${getBaseUrl()}/test`, { provider, apiKey });
      return response.data;
    } catch (error) {
      console.error(`Error testing ${provider} connection:`, error);
      throw error;
    }
  },

  /**
   * Query AI with natural language
   * @param {string} query - Natural language query
   * @param {string} connectionId - Database connection ID
   * @param {string} [provider] - Optional provider name to use
   * @returns {Promise<Object>} Query result
   */
  query: async (query, connectionId, provider = null) => {
    try {
      const data = {
        query,
        connectionId
      };
      
      // Only add provider if specified
      if (provider) {
        data.provider = provider;
      }
      
      const response = await axios.post(`${getBaseUrl()}/query`, data);
      return response.data;
    } catch (error) {
      console.error('Error querying AI:', error);
      throw error;
    }
  }
};

export default AIService; 