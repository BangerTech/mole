import axios from 'axios';
import { getApiBaseUrl } from './AuthService';

const USER_API_URL = `${getApiBaseUrl()}/users`;

class UserService {
  /**
   * Alle Benutzer abrufen
   * @returns {Promise} Promise mit der Liste aller Benutzer
   */
  async getAllUsers() {
    return axios.get(USER_API_URL)
      .then(response => {
        return response.data.users;
      })
      .catch(error => {
        console.error('Error fetching users:', error);
        throw error.response?.data || { message: 'Failed to fetch users' };
      });
  }

  /**
   * Einzelnen Benutzer nach ID abrufen
   * @param {number} id - Benutzer-ID
   * @returns {Promise} Promise mit dem Benutzer
   */
  async getUserById(id) {
    return axios.get(`${USER_API_URL}/${id}`)
      .then(response => {
        return response.data.user;
      })
      .catch(error => {
        console.error(`Error fetching user ${id}:`, error);
        throw error.response?.data || { message: 'Failed to fetch user' };
      });
  }

  /**
   * Neuen Benutzer erstellen
   * @param {Object} userData - Benutzerdaten (name, email, password, role)
   * @returns {Promise} Promise mit dem erstellten Benutzer
   */
  async createUser(userData) {
    return axios.post(USER_API_URL, userData)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.error('Error creating user:', error);
        throw error.response?.data || { message: 'Failed to create user' };
      });
  }

  /**
   * Benutzer aktualisieren
   * @param {number} id - Benutzer-ID
   * @param {Object} userData - Aktualisierte Benutzerdaten
   * @returns {Promise} Promise mit dem aktualisierten Benutzer
   */
  async updateUser(id, userData) {
    return axios.put(`${USER_API_URL}/${id}`, userData)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.error(`Error updating user ${id}:`, error);
        throw error.response?.data || { message: 'Failed to update user' };
      });
  }

  /**
   * Benutzer löschen
   * @param {number} id - Benutzer-ID
   * @returns {Promise} Promise mit dem Löschstatus
   */
  async deleteUser(id) {
    return axios.delete(`${USER_API_URL}/${id}`)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.error(`Error deleting user ${id}:`, error);
        throw error.response?.data || { message: 'Failed to delete user' };
      });
  }
}

export default new UserService(); 