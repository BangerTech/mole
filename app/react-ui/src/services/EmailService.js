import axios from 'axios';

// API-Basis-URL
const API_URL = 'http://localhost:3001/api/email';

/**
 * Service für die Verwaltung von E-Mail-Funktionalitäten
 */
class EmailService {
  /**
   * SMTP-Einstellungen speichern
   * @param {Object} settings - Die SMTP-Einstellungen
   * @returns {Promise} Promise mit der Antwort des Servers
   */
  saveSmtpSettings(settings) {
    return axios.post(`${API_URL}/smtp/save`, settings)
      .then(response => response.data)
      .catch(error => {
        console.error('Error saving SMTP settings:', error);
        throw error.response?.data || { success: false, message: 'Failed to save SMTP settings' };
      });
  }

  /**
   * SMTP-Einstellungen laden
   * @returns {Promise} Promise mit den SMTP-Einstellungen
   */
  getSmtpSettings() {
    return axios.get(`${API_URL}/smtp/get`)
      .then(response => response.data)
      .catch(error => {
        console.error('Error loading SMTP settings:', error);
        // Fallback to default settings if failed to load
        return {
          host: '',
          port: '587',
          username: '',
          password: '',
          encryption: 'tls',
          fromEmail: '',
          fromName: 'Mole Database Manager'
        };
      });
  }

  /**
   * SMTP-Verbindung testen
   * @param {Object} settings - Die zu testenden SMTP-Einstellungen
   * @returns {Promise} Promise mit dem Ergebnis des Tests
   */
  testSmtpConnection(settings) {
    return axios.post(`${API_URL}/smtp/test`, settings)
      .then(response => response.data)
      .catch(error => {
        console.error('Error testing SMTP connection:', error);
        throw error.response?.data || { 
          success: false, 
          message: error.message || 'Failed to connect to SMTP server' 
        };
      });
  }

  /**
   * E-Mail senden
   * @param {Object} emailData - Die E-Mail-Daten (to, subject, body)
   * @returns {Promise} Promise mit dem Ergebnis des Versands
   */
  sendEmail(emailData) {
    return axios.post(`${API_URL}/send`, emailData)
      .then(response => response.data)
      .catch(error => {
        console.error('Error sending email:', error);
        throw error.response?.data || { 
          success: false, 
          message: error.message || 'Failed to send email' 
        };
      });
  }

  /**
   * Test-E-Mail an die angegebene Adresse senden
   * @param {string} toEmail - Die Empfänger-E-Mail-Adresse
   * @returns {Promise} Promise mit dem Ergebnis des Versands
   */
  sendTestEmail(toEmail) {
    return axios.post(`${API_URL}/send-test`, { to: toEmail })
      .then(response => response.data)
      .catch(error => {
        console.error('Error sending test email:', error);
        throw error.response?.data || { 
          success: false, 
          message: error.message || 'Failed to send test email' 
        };
      });
  }
}

export default new EmailService(); 