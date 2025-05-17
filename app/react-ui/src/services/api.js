import axios from 'axios';

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
      // Potentially logout user or refresh token
      // For now, just log and let UserContext/AuthService handle logout logic if needed
      console.warn('[APIClient Interceptor] Unauthorized access - 401. Token might be invalid or expired.');
      // localStorage.removeItem(TOKEN_KEY); // Avoid direct logout here, let AuthService manage state
      // window.location.href = '/login'; // Avoid direct navigation here
    }
    return Promise.reject(error);
  }
);

export default apiClient; 