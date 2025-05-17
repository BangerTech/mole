/**
 * AI Controller
 * Manages AI assistant settings and functionalities
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/encryptionUtil');
const databaseService = require('../services/databaseService'); // Import databaseService

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
      model: 'sonar-pro'
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
exports.getAIProviders = (req, res) => {
  try {
    const settings = loadAISettings();
    const providers = Object.keys(settings.providers);
    res.json({
      available_providers: providers,
      default_provider: settings.defaultProvider,
      providers: settings.providers
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI providers', details: error.message });
  }
};

// Test AI provider connection
exports.testAIProvider = async (req, res) => {
  try {
    const { provider, apiKey } = req.body; // Get apiKey from request body for testing
    const settings = loadAISettings(); // Load settings to get model etc.
    
    if (provider === 'sqlpal') {
      return res.json({ success: true, message: 'SQLPal is a local model and should be available' });
    }

    if (provider === 'perplexity') {
      if (!apiKey) {
        return res.json({ success: false, message: 'Perplexity API key is required for testing.' });
      }
      const model = settings.providers.perplexity?.model || 'sonar-pro';
      try {
        await axios.post('https://api.perplexity.ai/chat/completions', {
          model: model,
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 1
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        return res.json({ success: true, message: 'Perplexity connection successful.' });
      } catch (apiError) {
        console.error('Perplexity API test error:', apiError.response?.data || apiError.message);
        const errorMessage = apiError.response?.data?.error?.message || apiError.message;
        return res.json({ success: false, message: `Perplexity connection failed: ${errorMessage}` });
      }
    }
    
    // Placeholder for other providers (e.g., OpenAI)
    if (provider === 'openai') {
      // TODO: Implement OpenAI test
      return res.json({ success: false, message: 'Test for OpenAI provider is not implemented yet.'});
    }
    
    // Handle unknown providers
    return res.json({ success: false, message: `Test for unknown provider '${provider}' is not supported.` });

  } catch (error) {
    console.error('Error in testAIProvider:', error);
    res.status(500).json({ error: 'Failed to test AI provider', details: error.message });
  }
};

// Proxy AI queries
exports.queryAI = async (req, res) => {
  try {
    const settings = loadAISettings();
    const provider = req.body.provider || settings.defaultProvider;
    const queryText = req.body.query;
    const connectionId = req.body.connectionId;

    if (!queryText) {
      return res.status(400).json({ error: 'Query text is required.' });
    }

    if (provider === 'sqlpal') {
      // Platzhalter: Hier könnte SQLPal-Logik stehen
      return res.json({
        success: true,
        message: 'SQLPal query placeholder. No real AI executed.',
        sql: `SELECT \'SQLPal not implemented for query: ${queryText}\' as info;`,
        results: [],
        provider: 'sqlpal'
      });
    }

    if (provider === 'perplexity') {
      const apiKey = settings.providers.perplexity?.apiKey;
      const model = settings.providers.perplexity?.model || 'sonar-pro';
      if (!apiKey) {
        return res.status(400).json({ error: 'Perplexity API key is not configured in settings.' });
      }
      try {
        const aiApiResponse = await axios.post('https://api.perplexity.ai/chat/completions', {
          model: model,
          messages: [
            { role: "system", content: "Generate only SQL code based on the user query and database schema (if provided). Do not add explanations or markdown formatting. Just the SQL query." },
            { role: "user", content: queryText }
          ],
          max_tokens: settings.sqlGeneration?.maxTokens || 150,
          temperature: settings.sqlGeneration?.temperature || 0.1
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        const assistantMessage = aiApiResponse.data?.choices?.[0]?.message?.content;
        const generatedSql = assistantMessage ? assistantMessage.trim() : null;

        if (!generatedSql) {
          return res.json({
            success: false,
            query: queryText,
            sql: null,
            results: [],
            formatted_results: 'Perplexity did not return a SQL query.',
            provider: provider
          });
        }

        // Execute the generated SQL
        const dbResult = await databaseService.executeDbQuery(connectionId, generatedSql);

        return res.json({
          success: dbResult.success,
          query: queryText,
          sql: generatedSql,
          results: dbResult.rows || [],
          columns: dbResult.columns || [],
          affectedRows: dbResult.affectedRows,
          formatted_results: dbResult.success 
            ? `Generated SQL by ${provider}:
${generatedSql}

Execution Result:
${JSON.stringify(dbResult.rows, null, 2)}`
            : `Generated SQL by ${provider}:
${generatedSql}

Execution Failed: ${dbResult.message}`,
          provider: provider,
          db_message: dbResult.message // Include DB message for frontend
        });

      } catch (apiError) {
        console.error('Perplexity API query error:', apiError.response?.data || apiError.message);
        const errorMessage = apiError.response?.data?.error?.message || apiError.message;
        return res.status(500).json({ 
          error: `Failed to query Perplexity: ${errorMessage}`,
          query: queryText,
          sql: `SELECT \'Error querying Perplexity: ${errorMessage}\' as error;`,
          results: [],
          formatted_results: `Error: ${errorMessage}`,
          provider: provider
        });
      }
    }
    
    // Placeholder for other providers (e.g., OpenAI)
    if (provider === 'openai') {
      // TODO: Implement OpenAI query
      return res.json({
        success: false,
        message: `Query for provider '${provider}' is not implemented yet.`,
        sql: `SELECT \'OpenAI not implemented yet\' as info;`,
        results: [],
        provider
      });
    }

    // Handle unknown providers
    return res.status(400).json({ error: `Query for unknown provider '${provider}' is not supported.` });

  } catch (error) {
    console.error('Error in queryAI:', error);
    res.status(500).json({ error: 'Failed to query AI', details: error.message });
  }
}; 