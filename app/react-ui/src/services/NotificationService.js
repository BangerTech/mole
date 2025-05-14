import axios from 'axios';
import AuthService from './AuthService';

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  // Assuming notification endpoints will be under /api/notifications
  return `http://${hostname}:3001/api`; 
};

const NOTIFICATIONS_API_URL = `${getApiBaseUrl()}/notifications`;

const NotificationService = {
  async getNotifications() {
    const token = AuthService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // GET /api/notifications
      const response = await axios.get(NOTIFICATIONS_API_URL, { headers });
      return response.data.notifications || []; // Assuming backend returns { notifications: [...] }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      throw error.response?.data || { message: 'Failed to load notifications' };
    }
  },

  async markAsRead(notificationId) {
    const token = AuthService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // POST /api/notifications/:notificationId/read
      const response = await axios.post(`${NOTIFICATIONS_API_URL}/${notificationId}/read`, {}, { headers });
      return response.data; // Assuming backend returns { success: true, notification: updatedNotification }
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as read:`, error);
      throw error.response?.data || { message: 'Failed to mark notification as read' };
    }
  },

  async markAllAsRead() {
    const token = AuthService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // POST /api/notifications/mark-all-as-read
      const response = await axios.post(`${NOTIFICATIONS_API_URL}/mark-all-as-read`, {}, { headers });
      return response.data; // Assuming backend returns { success: true, updatedCount: 0 }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error.response?.data || { message: 'Failed to mark all notifications as read' };
    }
  }
};

export default NotificationService; 