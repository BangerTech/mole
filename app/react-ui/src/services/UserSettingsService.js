import apiClient from './api'; // Import the centralized apiClient

// API Endpoint Suffix (relative to apiClient.defaults.baseURL)
// Assuming /api is the base, then /user/settings is the specific path
const USER_SETTINGS_ENDPOINT_SUFFIX = '/user/settings'; 

const UserSettingsService = {
  async getSettings() {
    // Headers are now handled by the global Axios interceptor in apiClient
    try {
      const response = await apiClient.get(USER_SETTINGS_ENDPOINT_SUFFIX);
      return response.data;
    } catch (error) {
      console.error('Failed to load user settings:', error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to load user settings' };
    }
  },
  async saveSettings(settings) {
    // Headers are now handled by the global Axios interceptor in apiClient
    try {
      const response = await apiClient.post(USER_SETTINGS_ENDPOINT_SUFFIX, settings);
      return response.data;
    } catch (error) {
      console.error('Failed to save user settings:', error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to save user settings' };
    }
  }
};

export default UserSettingsService; 