const crypto = require('crypto');

// Use environment variables or default values for encryption keys
// Ensure the key is exactly 32 bytes (256 bits) for AES-256-CBC
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'a-default-key-that-should-be-changed-in-prod';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest('hex').substring(0, 32);
const IV_LENGTH = 16; // For AES, this is the standard IV length

/**
 * Verschlüsselt einen String mit AES-256-CBC
 * @param {string} text - Der zu verschlüsselnde Text
 * @returns {string} - Der verschlüsselte Text (Base64-kodiert)
 */
function encrypt(text) {
  if (!text) return '';
  
  // Erstelle einen zufälligen Initialisierungsvektor
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Erstelle den Verschlüsselungsverschlüsseler
  const cipher = crypto.createCipheriv(
    'aes-256-cbc', 
    Buffer.from(ENCRYPTION_KEY), 
    iv
  );
  
  // Verschlüssele den Text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Gebe die verschlüsselten Daten zurück: IV + verschlüsselter Text
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Entschlüsselt einen mit AES-256-CBC verschlüsselten String
 * @param {string} encryptedText - Der verschlüsselte Text (Base64-kodiert)
 * @returns {string} - Der entschlüsselte Text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';
  
  try {
    // Extrahiere IV und verschlüsselten Text
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    
    // Erstelle den Entschlüsselungsentschlüsseler
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(ENCRYPTION_KEY), 
      iv
    );
    
    // Entschlüssele den Text
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Fehler beim Entschlüsseln:', error);
    return '';
  }
}

module.exports = {
  encrypt,
  decrypt
}; 