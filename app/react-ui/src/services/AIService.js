/**
 * AI Service
 * Handles AI assistant settings and queries
 */

import apiClient from './api'; // Import the centralized apiClient

const AI_ENDPOINT_SUFFIX = '/ai';

const AIService = {
  /**
   * Get AI settings
   * @returns {Promise<Object>} AI settings
   */
  getSettings: async () => {
    try {
      const response = await apiClient.get(`${AI_ENDPOINT_SUFFIX}/settings`);
      return response.data;
    } catch (error) {
      console.error('Error getting AI settings:', error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  },

  /**
   * Update AI settings
   * @param {Object} settings - New AI settings
   * @returns {Promise<Object>} Updated settings
   */
  updateSettings: async (settings) => {
    try {
      const response = await apiClient.post(`${AI_ENDPOINT_SUFFIX}/settings`, settings);
      return response.data;
    } catch (error) {
      console.error('Error updating AI settings:', error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  },

  /**
   * Get available AI providers
   * @returns {Promise<Object>} Available providers
   */
  getProviders: async () => {
    try {
      const response = await apiClient.get(`${AI_ENDPOINT_SUFFIX}/providers`);
      return response.data;
    } catch (error) {
      console.error('Error getting AI providers:', error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  },

  /**
   * Test AI provider connection
   * @param {string} provider - Provider name
   * @param {string} apiKey - API key
   * @param {string} [model] - Optional model name
   * @returns {Promise<Object>} Test result
   */
  testProvider: async (provider, apiKey, model = null) => {
    try {
      const payload = { provider, apiKey };
      if (model) {
        payload.model = model;
      }
      const response = await apiClient.post(`${AI_ENDPOINT_SUFFIX}/test`, payload);
      return response.data;
    } catch (error) {
      console.error(`Error testing ${provider} connection:`, error.response?.data || error.message);
      throw error.response?.data || error.message || error;
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
      
      const response = await apiClient.post(`${AI_ENDPOINT_SUFFIX}/query`, data);
      return response.data;
    } catch (error) {
      console.error('Error querying AI:', error.response?.data || error.message);
      throw error.response?.data || error.message || error;
    }
  }
};

export default AIService; 