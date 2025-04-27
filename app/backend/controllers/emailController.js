const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Path to store SMTP settings
const settingsPath = path.join(__dirname, '../data/smtp-settings.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Save SMTP settings to file
 * @param {Object} settings - SMTP settings object
 * @returns {Promise<boolean>} - Promise resolving to true if saved successfully
 */
const saveSettingsToFile = (settings) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a secure copy without exposing sensitive data in logs
      const settingsToSave = { ...settings };
      
      // Save settings to file
      fs.writeFileSync(settingsPath, JSON.stringify(settingsToSave, null, 2));
      resolve(true);
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      reject(error);
    }
  });
};

/**
 * Load SMTP settings from file
 * @returns {Promise<Object>} - Promise resolving to SMTP settings object
 */
const loadSettingsFromFile = () => {
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        resolve(JSON.parse(settingsData));
      } else {
        // Return default settings if file doesn't exist
        resolve({
          host: '',
          port: '587',
          username: '',
          password: '',
          encryption: 'tls',
          fromEmail: '',
          fromName: 'Mole Database Manager'
        });
      }
    } catch (error) {
      console.error('Error loading SMTP settings:', error);
      reject(error);
    }
  });
};

/**
 * Create a Nodemailer transporter with given settings
 * @param {Object} settings - SMTP settings object
 * @returns {Object} - Nodemailer transporter
 */
const createTransporter = (settings) => {
  // Configure secure connection options based on encryption setting
  let secure = false;
  if (settings.encryption === 'ssl') {
    secure = true;
  }

  // Create the transporter
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: secure, // true for 465, false for other ports
    auth: {
      user: settings.username,
      pass: settings.password,
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  });
};

// Controller methods
module.exports = {
  /**
   * Save SMTP settings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  saveSmtpSettings: async (req, res) => {
    try {
      const settings = req.body;
      
      // Validate required fields
      if (!settings.host || !settings.username || !settings.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required SMTP settings' 
        });
      }
      
      // Save settings to file
      await saveSettingsToFile(settings);
      
      res.json({ 
        success: true, 
        message: 'SMTP settings saved successfully' 
      });
    } catch (error) {
      console.error('Error in saveSmtpSettings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save SMTP settings' 
      });
    }
  },

  /**
   * Get SMTP settings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getSmtpSettings: async (req, res) => {
    try {
      const settings = await loadSettingsFromFile();
      res.json(settings);
    } catch (error) {
      console.error('Error in getSmtpSettings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to load SMTP settings' 
      });
    }
  },

  /**
   * Test SMTP connection
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  testSmtpConnection: async (req, res) => {
    try {
      const settings = req.body;
      
      // Validate required fields
      if (!settings.host || !settings.username || !settings.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please fill in all required fields' 
        });
      }
      
      // Create test transporter
      const transporter = createTransporter(settings);
      
      // Verify connection configuration
      await transporter.verify();
      
      res.json({ 
        success: true, 
        message: 'Connection successful' 
      });
    } catch (error) {
      console.error('Error in testSmtpConnection:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to connect to SMTP server' 
      });
    }
  },

  /**
   * Send email
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  sendEmail: async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      
      // Validate required fields
      if (!to || !subject || !body) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required email fields' 
        });
      }
      
      // Load settings
      const settings = await loadSettingsFromFile();
      
      // Check if SMTP is configured
      if (!settings.host || !settings.username || !settings.password) {
        return res.status(400).json({ 
          success: false, 
          message: 'SMTP settings not configured' 
        });
      }
      
      // Create transporter
      const transporter = createTransporter(settings);
      
      // Set the from email address
      const fromEmail = settings.fromEmail || settings.username;
      
      // Send email
      const info = await transporter.sendMail({
        from: `"${settings.fromName}" <${fromEmail}>`,
        to,
        subject,
        html: body,
      });
      
      res.json({ 
        success: true, 
        message: 'Email sent successfully',
        details: {
          messageId: info.messageId,
          to,
          subject,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in sendEmail:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to send email' 
      });
    }
  },

  /**
   * Send test email
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  sendTestEmail: async (req, res) => {
    try {
      const { to } = req.body;
      
      // If no recipient specified, load settings and use username
      let recipient = to;
      if (!recipient) {
        const settings = await loadSettingsFromFile();
        recipient = settings.username;
        
        if (!recipient) {
          return res.status(400).json({ 
            success: false, 
            message: 'No recipient email provided' 
          });
        }
      }
      
      // Create test email
      const testEmailBody = `
        <h1>Test Email from Mole Database Manager</h1>
        <p>This is a test email to verify your SMTP configuration.</p>
        <p>If you're receiving this email, your SMTP settings are working correctly!</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p>Sent from Mole Database Manager</p>
      `;
      
      // Send the email
      const emailResult = await module.exports.sendEmail({
        body: {
          to: recipient,
          subject: 'Test Email from Mole Database Manager',
          body: testEmailBody
        }
      }, { json: (data) => data });
      
      res.json(emailResult);
    } catch (error) {
      console.error('Error in sendTestEmail:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to send test email' 
      });
    }
  }
}; 