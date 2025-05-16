import apiClient from './api'; // Import the centralized apiClient

const EVENTS_ENDPOINT_SUFFIX = '/events'; // Suffix for the events endpoint

const EventService = {
  /**
   * Fetches the most recent event log entries.
   * @param {number} limit - The maximum number of entries to fetch.
   * @returns {Promise<Array>} Promise resolving to an array of event objects.
   */
  async getRecentEvents(limit = 15) {
    try {
      // Headers are handled by the apiClient interceptor
      const response = await apiClient.get(EVENTS_ENDPOINT_SUFFIX, {
        params: { limit },
      });
      return response.data?.events || []; 
    } catch (error) {
      console.error('Error fetching recent events:', error.response?.data || error.message);
      // Consistently throw the error or a more structured error object
      throw error.response?.data || error.message || error; 
    }
  },
};

export default EventService; 