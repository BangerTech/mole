import axios from 'axios';

// Dynamically determine the API base URL based on the current hostname
// This ensures the app works on any IP address or domain name
export const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api`;
};

// API Basis URL für Authentifizierung - dynamically determined
const AUTH_API_URL = `${getApiBaseUrl()}/auth`;

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
    return axios.post(`${AUTH_API_URL}/register`, {
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
    return axios.post(`${AUTH_API_URL}/login`, {
      email,
      password
    })
      .then(response => {
        console.log('[AuthService] Login API response:', response.data); // Log der gesamten Backend-Antwort
        if (response.data.token && response.data.user) { // Sicherstellen, dass user-Objekt vorhanden ist
          console.log('[AuthService] User data from backend:', response.data.user); // Log des User-Objekts
          this.setToken(response.data.token);
          this.setUser(response.data.user); // Speichert das User-Objekt im localStorage
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

    return axios.get(`${AUTH_API_URL}/user`, {
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

  // Neue Methode hinzufügen, um zu prüfen, ob ein Admin-Account existiert
  async checkAdminExists() {
    try {
      const response = await axios.get(`${AUTH_API_URL}/check-admin-exists`);
      return response.data; // Erwartet { success: true, adminExists: boolean }
    } catch (error) {
      console.error('Error checking if admin account exists:', error);
      // Im Fehlerfall (z.B. Server nicht erreichbar) ist es sicherer anzunehmen,
      // dass das Setup benötigt wird, oder einen spezifischen Fehler zu werfen.
      // Für den InitialRouteHandler ist { adminExists: false } ein sicherer Fallback.
      return { success: false, adminExists: false, message: error.message || 'Could not connect to server to check admin status.' };
    }
  }
}

const authService = new AuthService();
// Gleich beim Import den Interceptor einrichten
authService.setupAxiosInterceptors();

export default authService; 