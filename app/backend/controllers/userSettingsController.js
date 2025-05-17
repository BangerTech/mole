const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../utils/encryptionUtil');

const SETTINGS_DIR = path.join(__dirname, '../data/user_settings');

// Hilfsfunktion: Settings-Dateipfad für User
function getSettingsPath(userId) {
  return path.join(SETTINGS_DIR, `${userId}.json`);
}

// Hilfsfunktion: Sensible Felder verschlüsseln
function encryptSensitive(settings) {
  const copy = JSON.parse(JSON.stringify(settings));
  if (copy.ai) {
    if (copy.ai.openaiApiKey) copy.ai.openaiApiKey = encrypt(copy.ai.openaiApiKey);
    if (copy.ai.perplexityApiKey) copy.ai.perplexityApiKey = encrypt(copy.ai.perplexityApiKey);
    if (copy.ai.huggingfaceApiKey) copy.ai.huggingfaceApiKey = encrypt(copy.ai.huggingfaceApiKey);
  }
  if (copy.smtp && copy.smtp.password) copy.smtp.password = encrypt(copy.smtp.password);
  return copy;
}

// Hilfsfunktion: Sensible Felder entschlüsseln
function decryptSensitive(settings) {
  const copy = JSON.parse(JSON.stringify(settings));
  if (copy.ai) {
    if (copy.ai.openaiApiKey) copy.ai.openaiApiKey = decrypt(copy.ai.openaiApiKey);
    if (copy.ai.perplexityApiKey) copy.ai.perplexityApiKey = decrypt(copy.ai.perplexityApiKey);
    if (copy.ai.huggingfaceApiKey) copy.ai.huggingfaceApiKey = decrypt(copy.ai.huggingfaceApiKey);
  }
  if (copy.smtp && copy.smtp.password) copy.smtp.password = decrypt(copy.smtp.password);
  return copy;
}

// GET /api/user/settings
exports.getUserSettings = (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

  // Ensure directory exists
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }

  const filePath = getSettingsPath(userId);
  if (!fs.existsSync(filePath)) {
    // Return default settings if none exist
    return res.json({
      notifications: {},
      security: {},
      ai: {},
      smtp: {}
    });
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const settings = JSON.parse(raw);
    res.json(decryptSensitive(settings));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load user settings', error: error.message });
  }
};

// POST /api/user/settings
exports.saveUserSettings = (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

  // Ensure directory exists
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }

  const filePath = getSettingsPath(userId);
  try {
    const toSave = encryptSensitive(req.body);
    fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2));
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save user settings', error: error.message });
  }
}; 