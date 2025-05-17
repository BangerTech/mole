import axios from 'axios';
import AuthService from './AuthService';

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api/user/settings`;
};

const API_URL = getApiBaseUrl();

const UserSettingsService = {
  async getSettings() {
    const token = AuthService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await axios.get(API_URL, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to load user settings' };
    }
  },
  async saveSettings(settings) {
    const token = AuthService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await axios.post(API_URL, settings, { headers });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to save user settings' };
    }
  }
};

export default UserSettingsService; 