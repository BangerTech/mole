import axios from 'axios';

// API Basis URL
const API_URL = 'http://localhost:3001/api/auth';

// Token-Speicherung in localStorage
const TOKEN_KEY = 'mole_auth_token';
const USER_KEY = 'mole_auth_user';

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
    return axios.post(`${API_URL}/register`, {
      name,
      email,
      password
    })
      .then(response => {
        if (response.data.token) {
          this.setToken(response.data.token);
          this.setUser(response.data.user);
        }
        return response.data;
      })
      .catch(error => {
        console.error('Registration error:', error);
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
    return axios.post(`${API_URL}/login`, {
      email,
      password
    })
      .then(response => {
        if (response.data.token) {
          this.setToken(response.data.token);
          this.setUser(response.data.user);
        }
        return response.data;
      })
      .catch(error => {
        console.error('Login error:', error);
        throw error.response?.data || { success: false, message: 'Login failed' };
      });
  }

  /**
   * Benutzer ausloggen
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Optional: Hier könnte ein API-Aufruf erfolgen, um den Token zu invalidieren
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
    const token = this.getToken();
    if (!token) {
      return Promise.reject({ message: 'No auth token found' });
    }

    return axios.get(`${API_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (response.data.user) {
          this.setUser(response.data.user);
          return response.data.user;
        }
        return null;
      })
      .catch(error => {
        console.error('Error refreshing user info:', error);
        // Bei Authentifizierungsfehler automatisch ausloggen
        if (error.response?.status === 401) {
          this.logout();
        }
        throw error;
      });
  }

  /**
   * Axios-Request-Interceptor einrichten
   * Fügt automatisch den Auth-Token zu allen API-Anfragen hinzu
   */
  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      config => {
        const token = this.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        Promise.reject(error);
      }
    );

    // Response-Interceptor für Fehlerbehandlung
    axios.interceptors.response.use(
      response => response,
      error => {
        // Bei 401-Fehlern (Unauthorized) automatisch ausloggen
        if (error.response?.status === 401) {
          this.logout();
          // Optional: Hier könnte eine Weiterleitung zur Login-Seite erfolgen
        }
        return Promise.reject(error);
      }
    );
  }
}

const authService = new AuthService();
// Gleich beim Import den Interceptor einrichten
authService.setupAxiosInterceptors();

export default authService; 