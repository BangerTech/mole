import apiClient from './api'; // Import the new apiClient
// import AuthService from './AuthService'; // No longer needed for getToken here

const NOTIFICATIONS_API_URL_SUFFIX = '/notifications'; // Suffix for the notification endpoints

const NotificationService = {
  async getNotifications() {
    // const token = AuthService.getToken(); // Removed
    // const headers = token ? { Authorization: `Bearer ${token}` } : {}; // Removed
    try {
      // GET /api/notifications
      // Headers are now handled by the global Axios interceptor in AuthService
      const response = await apiClient.get(NOTIFICATIONS_API_URL_SUFFIX /*, { headers } */); // headers object removed
      return response.data.notifications || []; // Assuming backend returns { notifications: [...] }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Error object structure might differ slightly if it comes from apiClient vs raw axios
      throw error.response?.data || error.message || { message: 'Failed to load notifications' };
    }
  },

  async markAsRead(notificationId) {
    // const token = AuthService.getToken(); // Removed
    // const headers = token ? { Authorization: `Bearer ${token}` } : {}; // Removed
    try {
      // POST /api/notifications/:notificationId/read
      const response = await apiClient.post(`${NOTIFICATIONS_API_URL_SUFFIX}/${notificationId}/read`, {} /*, { headers } */); // headers object removed
      return response.data; // Assuming backend returns { success: true, notification: updatedNotification }
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as read:`, error);
      throw error.response?.data || error.message || { message: 'Failed to mark notification as read' };
    }
  },

  async markAllAsRead() {
    // const token = AuthService.getToken(); // Removed
    // const headers = token ? { Authorization: `Bearer ${token}` } : {}; // Removed
    try {
      // POST /api/notifications/mark-all-as-read
      const response = await apiClient.post(`${NOTIFICATIONS_API_URL_SUFFIX}/mark-all-as-read`, {} /*, { headers } */); // headers object removed
      return response.data; // Assuming backend returns { success: true, updatedCount: 0 }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error.response?.data || error.message || { message: 'Failed to mark all notifications as read' };
    }
  }
};

export default NotificationService; 