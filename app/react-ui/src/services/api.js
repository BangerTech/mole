import axios from 'axios';
import authService from './AuthService'; // Import authService

export const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api`;
};

const TOKEN_KEY = 'mole_auth_token'; // Should be consistent with AuthService

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
});

apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('[APIClient Interceptor] Request Config:', config); // Logging
    return config;
  },
  error => {
    console.error('[APIClient Interceptor] Request Error:', error); // Logging
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    console.log('[APIClient Interceptor] Response:', response); // Logging
    return response;
  },
  error => {
    console.error('[APIClient Interceptor] Response Error:', error.response || error.message); // Logging
    if (error.response?.status === 401) {
      console.warn('[APIClient Interceptor] Unauthorized access - 401. Token might be invalid or expired.');
      authService.logout(); // Call logout
      // Optionally, redirect to login. Ensure this path is correct for your router.
      // Check if already on login page to prevent loop, though AuthService.logout should prevent further 401s quickly.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient; 