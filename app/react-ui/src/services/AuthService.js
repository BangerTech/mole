import apiClient from './api'; // Import the centralized apiClient

// Token-Speicherung in localStorage
const TOKEN_KEY = 'mole_auth_token';
const USER_KEY = 'mole_auth_user';

// API Endpunkt Suffixe
const AUTH_ENDPOINT_SUFFIX = '/auth';
const USER_ENDPOINT_SUFFIX = '/users';

/**
 * Service für die Authentifizierung
 */
class AuthService {
  /**
   * Benutzer registrieren
   * @param {string} name - Name des Benutzers
   * @param {string} email - E-Mail-Adresse
   * @param {string} password - Passwort
   * @returns {Promise} Promise mit der Antwort des Servers
   */
  register(name, email, password) {
    return apiClient.post(`${AUTH_ENDPOINT_SUFFIX}/register`, {
      name,
      email,
      password
    })
      .then(response => {
        if (response.data.token && response.data.user) {
          this.setToken(response.data.token);
          this.setUser(response.data.user);
        }
        return response.data;
      })
      .catch(error => {
        console.error('Registration error:', error.response?.data || error.message);
        throw error.response?.data || { success: false, message: 'Registration failed' };
      });
  }

  /**
   * Benutzer einloggen
   * @param {string} email - E-Mail-Adresse
   * @param {string} password - Passwort
   * @returns {Promise} Promise mit der Antwort des Servers
   */
  login(email, password) {
    return apiClient.post(`${AUTH_ENDPOINT_SUFFIX}/login`, {
      email,
      password
    })
      .then(response => {
        console.log('[AuthService] Login API response:', response.data);
        if (response.data.token && response.data.user) {
          console.log('[AuthService] User data from backend:', response.data.user);
          this.setToken(response.data.token);
          this.setUser(response.data.user);
        }
        return response.data;
      })
      .catch(error => {
        console.error('Login error:', error.response?.data || error.message);
        throw error.response?.data || { success: false, message: 'Login failed' };
      });
  }

  /**
   * Benutzer ausloggen
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Aktuellen Benutzer abrufen
   * @returns {Promise} Promise mit dem aktuellen Benutzer
   */
  getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Token setzen
   * @param {string} token - JWT-Token
   */
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Token abrufen
   * @returns {string|null} JWT-Token oder null
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Benutzer setzen
   * @param {Object} user - Benutzerobjekt
   */
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Prüfen, ob Benutzer eingeloggt ist
   * @returns {boolean} true, wenn eingeloggt
   */
  isLoggedIn() {
    return !!this.getToken();
  }

  /**
   * Benutzerinformationen aktualisieren
   * @returns {Promise} Promise mit dem aktualisierten Benutzer
   */
  refreshUserInfo() {
    // Token wird automatisch durch apiClient interceptor hinzugefügt
    return apiClient.get(`${AUTH_ENDPOINT_SUFFIX}/user`)
      .then(response => {
        if (response.data.user) {
          this.setUser(response.data.user);
          return response.data.user;
        }
        return null;
      })
      .catch(error => {
        console.error('Error refreshing user info:', error.response?.data || error.message);
        if (error.response?.status === 401) {
          this.logout(); // Logout bei 401 bleibt sinnvoll
        }
        // Weiterwerfen, damit der Response Interceptor in apiClient ggf. auch reagieren kann
        // oder die aufrufende Stelle
        throw error.response?.data || error.message || error;
      });
  }

  // Neue Methode hinzufügen, um zu prüfen, ob ein Admin-Account existiert
  async checkAdminExists() {
    try {
      // Der apiClient verwendet bereits die korrekte base URL
      const response = await apiClient.get(`${AUTH_ENDPOINT_SUFFIX}/check-admin-exists`);
      return response.data;
    } catch (error) {
      console.error('Error checking if admin account exists:', error.response?.data || error.message);
      return { success: false, adminExists: false, message: error.message || 'Could not connect to server to check admin status.' };
    }
  }

  /**
   * Uploads a user's avatar.
   * @param {number} userId - The ID of the user.
   * @param {File} avatarFile - The avatar file to upload.
   * @returns {Promise} Promise with the server response (including updated user).
   */
  uploadAvatar(userId, avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    // Token und Content-Type Header werden durch apiClient interceptor bzw. automatisch von Axios für FormData gesetzt
    return apiClient.post(`${USER_ENDPOINT_SUFFIX}/${userId}/avatar`, formData, {
      // Expliziter Content-Type Header hier nicht mehr unbedingt nötig, wenn apiClient FormData korrekt behandelt.
      // Ggf. kann Axios das bei FormData automatisch setzen. Testen!
      // headers: {
      //   'Content-Type': 'multipart/form-data',
      // }
    })
    .then(response => {
      if (response.data.user && response.data.user.profileImage) {
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === response.data.user.id) {
          const updatedUser = { ...currentUser, profileImage: response.data.user.profileImage };
          this.setUser(updatedUser);
        }
      }
      return response.data; 
    })
    .catch(error => {
      console.error('Avatar upload error:', error.response?.data || error.message);
      throw error.response?.data || { success: false, message: 'Avatar upload failed' };
    });
  }
}

const authService = new AuthService();
// authService.setupAxiosInterceptors(); // Dieser Aufruf wird entfernt.

export default authService; 