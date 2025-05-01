import axios from 'axios';

// Base URL for system API endpoints
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  // Assuming backend runs on port 3001
  return `http://${hostname}:3001/api`; 
};

const API_URL = getApiBaseUrl();

const EventService = {
  /**
   * Fetches the most recent event log entries.
   * @param {number} limit - The maximum number of entries to fetch.
   * @returns {Promise<Array>} Promise resolving to an array of event objects.
   */
  async getRecentEvents(limit = 15) {
    try {
      const response = await axios.get(`${API_URL}/events`, {
        params: { limit },
      });
      // Return the events array, or an empty array if the request failed or returned no events
      return response.data?.events || []; 
    } catch (error) {
      console.error('Error fetching recent events:', error);
      return []; // Return empty array on error
    }
  },
};

export default EventService; 