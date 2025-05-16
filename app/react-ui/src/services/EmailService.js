import apiClient from './api'; // Import the centralized apiClient

const EMAIL_ENDPOINT_SUFFIX = '/email';

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
    return apiClient.post(`${EMAIL_ENDPOINT_SUFFIX}/smtp/save`, settings)
      .then(response => response.data)
      .catch(error => {
        console.error('Error saving SMTP settings:', error.response?.data || error.message);
        throw error.response?.data || { success: false, message: 'Failed to save SMTP settings' };
      });
  }

  /**
   * SMTP-Einstellungen laden
   * @returns {Promise} Promise mit den SMTP-Einstellungen
   */
  getSmtpSettings() {
    return apiClient.get(`${EMAIL_ENDPOINT_SUFFIX}/smtp/get`)
      .then(response => response.data)
      .catch(error => {
        console.error('Error loading SMTP settings:', error.response?.data || error.message);
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
    return apiClient.post(`${EMAIL_ENDPOINT_SUFFIX}/smtp/test`, settings)
      .then(response => response.data)
      .catch(error => {
        console.error('Error testing SMTP connection:', error.response?.data || error.message);
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
    return apiClient.post(`${EMAIL_ENDPOINT_SUFFIX}/send`, emailData)
      .then(response => response.data)
      .catch(error => {
        console.error('Error sending email:', error.response?.data || error.message);
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
    return apiClient.post(`${EMAIL_ENDPOINT_SUFFIX}/send-test`, { to: toEmail })
      .then(response => response.data)
      .catch(error => {
        console.error('Error sending test email:', error.response?.data || error.message);
        throw error.response?.data || { 
          success: false, 
          message: error.message || 'Failed to send test email' 
        };
      });
  }
}

export default new EmailService(); 