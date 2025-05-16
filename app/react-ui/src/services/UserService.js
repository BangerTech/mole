import apiClient from './api'; // Import the centralized apiClient

const USERS_ENDPOINT_SUFFIX = '/users'; // Suffix for the users endpoint

class UserService {
  /**
   * Alle Benutzer abrufen
   * @returns {Promise} Promise mit der Liste aller Benutzer
   */
  async getAllUsers() {
    return apiClient.get(USERS_ENDPOINT_SUFFIX)
      .then(response => {
        return response.data.users;
      })
      .catch(error => {
        console.error('Error fetching users:', error.response?.data || error.message);
        throw error.response?.data || { message: 'Failed to fetch users' };
      });
  }

  /**
   * Einzelnen Benutzer nach ID abrufen
   * @param {number} id - Benutzer-ID
   * @returns {Promise} Promise mit dem Benutzer
   */
  async getUserById(id) {
    return apiClient.get(`${USERS_ENDPOINT_SUFFIX}/${id}`)
      .then(response => {
        return response.data.user;
      })
      .catch(error => {
        console.error(`Error fetching user ${id}:`, error.response?.data || error.message);
        throw error.response?.data || { message: 'Failed to fetch user' };
      });
  }

  /**
   * Neuen Benutzer erstellen
   * @param {Object} userData - Benutzerdaten (name, email, password, role)
   * @returns {Promise} Promise mit dem erstellten Benutzer
   */
  async createUser(userData) {
    return apiClient.post(USERS_ENDPOINT_SUFFIX, userData)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.error('Error creating user:', error.response?.data || error.message);
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
    return apiClient.put(`${USERS_ENDPOINT_SUFFIX}/${id}`, userData)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.error(`Error updating user ${id}:`, error.response?.data || error.message);
        throw error.response?.data || { message: 'Failed to update user' };
      });
  }

  /**
   * Benutzer löschen
   * @param {number} id - Benutzer-ID
   * @returns {Promise} Promise mit dem Löschstatus
   */
  async deleteUser(id) {
    return apiClient.delete(`${USERS_ENDPOINT_SUFFIX}/${id}`)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.error(`Error deleting user ${id}:`, error.response?.data || error.message);
        throw error.response?.data || { message: 'Failed to delete user' };
      });
  }
}

export default new UserService(); 