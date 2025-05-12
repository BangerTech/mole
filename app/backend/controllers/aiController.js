/**
 * AI Controller
 * Manages AI assistant settings and functionalities
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/encryptionUtil');

// Path to store AI settings
const AI_SETTINGS_PATH = path.join(__dirname, '../data/ai_settings.json');

// Default AI settings
const DEFAULT_AI_SETTINGS = {
  defaultProvider: 'sqlpal',
  providers: {
    openai: {
      enabled: true,
      apiKey: '',
      model: 'gpt-3.5-turbo'
    },
    perplexity: {
      enabled: true,
      apiKey: '',
      model: 'pplx-7b-online'
    },
    llama: {
      enabled: true,
      modelPath: '/app/models/llama'
    },
    sqlpal: {
      enabled: true,
      modelPath: '/app/models/sqlpal'
    }
  },
  sqlGeneration: {
    maxTokens: 150,
    temperature: 0.1,
    includeSchema: true,
    timeout: 10
  }
};

// Python backend URL
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://db-sync:5000';

// Helper function to load current AI settings
const loadAISettings = () => {
  try {
    if (fs.existsSync(AI_SETTINGS_PATH)) {
      const fileContent = fs.readFileSync(AI_SETTINGS_PATH, 'utf8');
      const settings = JSON.parse(fileContent);
      
      // Decrypt API keys if they're encrypted
      if (settings.providers) {
        if (settings.providers.openai && settings.providers.openai.apiKey) {
          try {
            settings.providers.openai.apiKey = decrypt(settings.providers.openai.apiKey);
          } catch (e) {
            // If decryption fails, it might not be encrypted yet
            console.log('Could not decrypt OpenAI API key, might not be encrypted');
          }
        }
        
        if (settings.providers.perplexity && settings.providers.perplexity.apiKey) {
          try {
            settings.providers.perplexity.apiKey = decrypt(settings.providers.perplexity.apiKey);
          } catch (e) {
            console.log('Could not decrypt Perplexity API key, might not be encrypted');
          }
        }
      }
      
      return settings;
    }
    return DEFAULT_AI_SETTINGS;
  } catch (error) {
    console.error('Error loading AI settings:', error);
    return DEFAULT_AI_SETTINGS;
  }
};

// Helper function to save AI settings
const saveAISettings = (settings) => {
  try {
    // Create a deep copy to avoid modifying the original
    const settingsToSave = JSON.parse(JSON.stringify(settings));
    
    // Encrypt API keys before saving
    if (settingsToSave.providers) {
      if (settingsToSave.providers.openai && settingsToSave.providers.openai.apiKey) {
        settingsToSave.providers.openai.apiKey = encrypt(settingsToSave.providers.openai.apiKey);
      }
      
      if (settingsToSave.providers.perplexity && settingsToSave.providers.perplexity.apiKey) {
        settingsToSave.providers.perplexity.apiKey = encrypt(settingsToSave.providers.perplexity.apiKey);
      }
    }
    
    // Ensure directory exists
    const dir = path.dirname(AI_SETTINGS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save settings to file
    fs.writeFileSync(AI_SETTINGS_PATH, JSON.stringify(settingsToSave, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return false;
  }
};

// Helper function to send settings to Python backend
const updatePythonBackendSettings = async (settings) => {
  try {
    const response = await axios.post(`${PYTHON_BACKEND_URL}/api/ai/settings`, settings);
    return response.data;
  } catch (error) {
    console.error('Error updating Python backend AI settings:', error);
    throw error;
  }
};

/**
 * Controller Methods
 */

// Get the current AI settings
exports.getAISettings = (req, res) => {
  try {
    const settings = loadAISettings();
    
    // Never expose API keys in response
    const safeSettings = JSON.parse(JSON.stringify(settings));
    
    // Replace actual API keys with masking if they exist
    if (safeSettings.providers) {
      if (safeSettings.providers.openai && safeSettings.providers.openai.apiKey) {
        safeSettings.providers.openai.hasApiKey = !!safeSettings.providers.openai.apiKey;
        safeSettings.providers.openai.apiKey = safeSettings.providers.openai.apiKey ? '••••••••' : '';
      }
      
      if (safeSettings.providers.perplexity && safeSettings.providers.perplexity.apiKey) {
        safeSettings.providers.perplexity.hasApiKey = !!safeSettings.providers.perplexity.apiKey;
        safeSettings.providers.perplexity.apiKey = safeSettings.providers.perplexity.apiKey ? '••••••••' : '';
      }
    }
    
    res.json(safeSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI settings', details: error.message });
  }
};

// Update AI settings
exports.updateAISettings = async (req, res) => {
  try {
    const newSettings = req.body;
    const currentSettings = loadAISettings();
    
    // Preserve API keys if they're masked in the request
    if (newSettings.providers) {
      if (newSettings.providers.openai && newSettings.providers.openai.apiKey === '••••••••') {
        newSettings.providers.openai.apiKey = currentSettings.providers.openai.apiKey;
      }
      
      if (newSettings.providers.perplexity && newSettings.providers.perplexity.apiKey === '••••••••') {
        newSettings.providers.perplexity.apiKey = currentSettings.providers.perplexity.apiKey;
      }
    }
    
    // Validate settings
    if (!newSettings.defaultProvider || !newSettings.providers) {
      return res.status(400).json({ error: 'Invalid AI settings format' });
    }
    
    // Save settings
    const saved = saveAISettings(newSettings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save AI settings' });
    }
    
    // Return success with masked API keys
    const safeSettings = JSON.parse(JSON.stringify(newSettings));
    
    if (safeSettings.providers) {
      if (safeSettings.providers.openai && safeSettings.providers.openai.apiKey) {
        safeSettings.providers.openai.hasApiKey = !!safeSettings.providers.openai.apiKey;
        safeSettings.providers.openai.apiKey = safeSettings.providers.openai.apiKey ? '••••••••' : '';
      }
      
      if (safeSettings.providers.perplexity && safeSettings.providers.perplexity.apiKey) {
        safeSettings.providers.perplexity.hasApiKey = !!safeSettings.providers.perplexity.apiKey;
        safeSettings.providers.perplexity.apiKey = safeSettings.providers.perplexity.apiKey ? '••••••••' : '';
      }
    }
    
    res.json({
      success: true,
      message: 'AI settings updated successfully',
      settings: safeSettings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update AI settings', details: error.message });
  }
};

// Get available AI providers from Python backend
exports.getAIProviders = async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_BACKEND_URL}/api/ai/providers`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get AI providers', 
      details: error.message,
      providers: {
        available_providers: ['sqlpal'],
        default_provider: 'sqlpal',
        providers: {
          'sqlpal': {
            name: 'sqlpal',
            available: true,
            model: 'default',
            is_default: true
          }
        }
      }
    });
  }
};

// Test AI provider connection
exports.testAIProvider = async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    // If testing SQLPal, always return success (local model)
    if (provider === 'sqlpal') {
      return res.json({ success: true, message: 'SQLPal is a local model and should be available' });
    }
    
    // For other providers, forward the test to Python backend
    const response = await axios.post(`${PYTHON_BACKEND_URL}/api/ai/test`, {
      provider,
      api_key: apiKey
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test AI provider', details: error.message });
  }
};

// Proxy AI queries to Python backend
exports.queryAI = async (req, res) => {
  try {
    // Get current settings
    const settings = loadAISettings();
    
    // Prepare the query data
    const queryData = {
      query: req.body.query,
      connectionId: req.body.connectionId,
      provider: req.body.provider || settings.defaultProvider
    };
    
    // Forward query to Python backend
    const response = await axios.post(`${PYTHON_BACKEND_URL}/api/ai/query`, queryData);
    
    // Return the response from Python backend
    res.json(response.data);
  } catch (error) {
    console.error('Error querying AI:', error);
    res.status(500).json({ 
      error: 'Failed to query AI', 
      details: error.message,
      query: req.body.query,
      sql: 'SELECT "Error querying AI" as error',
      results: [],
      formatted_results: `Error: ${error.message}`,
      provider: 'none'
    });
  }
}; 