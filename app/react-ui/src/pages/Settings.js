import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Stack,
  Alert,
  IconButton,
  Paper,
  RadioGroup,
  Radio,
  Tooltip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Notifications as NotificationsIcon,
  SmartToy as SmartToyIcon,
  Key as KeyIcon,
  Help as HelpIcon,
  Email as EmailIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import EmailService from '../services/EmailService';
import AIService from '../services/AIService';

// Styled Components
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  marginRight: theme.spacing(1),
}));

const SettingCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}));

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Settings() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('en');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(24);
  const [notifications, setNotifications] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [aiProvider, setAiProvider] = useState('sqlpal');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [huggingfaceApiKey, setHuggingfaceApiKey] = useState('');
  const [perplexityApiKey, setPerplexityApiKey] = useState('');
  const [huggingfaceModel, setHuggingfaceModel] = useState('mistralai/Mistral-7B-Instruct-v0.2');
  const [localModelPath, setLocalModelPath] = useState('/models/llama-2-7b');
  const [aiPrecision, setAiPrecision] = useState(7);
  const [customPromptTemplate, setCustomPromptTemplate] = useState('Analyze the database and tell me about {query}');
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    encryption: 'tls', // 'tls', 'ssl', oder 'none'
    fromEmail: '',
    fromName: 'Mole Database Manager'
  });
  const [smtpTestStatus, setSmtpTestStatus] = useState({
    testing: false,
    success: null,
    message: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Handle tab selection from URL query parameters
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    
    if (tab === 'notifications') {
      setActiveTab(1); // Notifications tab index is 1
    } else if (tab === 'email') {
      setActiveTab(7); // Email Settings tab index is 7
    }
  }, [location]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSave = () => {
    setSuccessMessage('Settings successfully saved');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const renderApiKeyField = () => {
    switch (aiProvider) {
      case 'openai':
        return (
          <TextField
            fullWidth
            label="OpenAI API Key"
            variant="outlined"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            type="password"
            placeholder="sk-..."
            sx={{ mt: 2 }}
          />
        );
      case 'perplexity':
        return (
          <TextField
            fullWidth
            label="Perplexity API Key"
            variant="outlined"
            value={perplexityApiKey}
            onChange={(e) => setPerplexityApiKey(e.target.value)}
            type="password"
            placeholder="pplx-..."
            sx={{ mt: 2 }}
          />
        );
      case 'huggingface':
        return (
          <>
            <TextField
              fullWidth
              label="Hugging Face API Key"
              variant="outlined"
              value={huggingfaceApiKey}
              onChange={(e) => setHuggingfaceApiKey(e.target.value)}
              type="password"
              placeholder="hf_..."
              sx={{ mt: 2, mb: 2 }}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Model</InputLabel>
              <Select
                value={huggingfaceModel}
                onChange={(e) => setHuggingfaceModel(e.target.value)}
                label="Model"
              >
                <MenuItem value="mistralai/Mistral-7B-Instruct-v0.2">Mistral 7B Instruct</MenuItem>
                <MenuItem value="microsoft/phi-2">Phi-2</MenuItem>
                <MenuItem value="meta-llama/Llama-2-7b-chat-hf">Llama 2 7B Chat</MenuItem>
                <MenuItem value="tiiuae/falcon-7b-instruct">Falcon 7B Instruct</MenuItem>
                <MenuItem value="bigcode/starcoder2-15b">StarCoder2 15B</MenuItem>
              </Select>
            </FormControl>
          </>
        );
      case 'local':
        return (
          <TextField
            fullWidth
            label="Local Model Path"
            variant="outlined"
            value={localModelPath}
            onChange={(e) => setLocalModelPath(e.target.value)}
            placeholder="/path/to/model"
            sx={{ mt: 2 }}
          />
        );
      default:
        return null;
    }
  };

  const handleTestSmtpConnection = async () => {
    setSmtpTestStatus({
      testing: true,
      success: null,
      message: 'Testing connection...'
    });
    
    try {
      const result = await EmailService.testSmtpConnection(smtpSettings);
      setSmtpTestStatus({
        testing: false,
        success: result.success,
        message: result.message
      });
    } catch (error) {
      setSmtpTestStatus({
        testing: false,
        success: false,
        message: error.message || 'An error occurred during the test'
      });
    }
  };
  
  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveSmtpSettings = async () => {
    try {
      const result = await EmailService.saveSmtpSettings(smtpSettings);
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save SMTP settings',
        severity: 'error'
      });
    }
  };

  const handleSendTestEmail = async () => {
    if (!smtpSettings.host || !smtpSettings.username || !smtpSettings.password) {
      setSnackbar({
        open: true,
        message: 'Please configure and save SMTP settings first',
        severity: 'warning'
      });
      return;
    }
    
    try {
      await EmailService.sendTestEmail(smtpSettings.username);
      setSnackbar({
        open: true,
        message: 'Test email sent successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to send test email',
        severity: 'error'
      });
    }
  };

  // useEffect für das Laden der SMTP-Einstellungen
  useEffect(() => {
    // Lade SMTP-Einstellungen
    const loadSmtpSettings = async () => {
      try {
        const settings = await EmailService.getSmtpSettings();
        setSmtpSettings(settings);
      } catch (error) {
        console.error('Error loading SMTP settings:', error);
      }
    };
    
    loadSmtpSettings();
  }, []);

  return (
    <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure your application settings and preferences
      </Typography>

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <StyledTab icon={<PaletteIcon sx={{ mr: 1 }} />} iconPosition="start" label="Appearance" />
          <StyledTab icon={<NotificationsIcon sx={{ mr: 1 }} />} iconPosition="start" label="Notifications" />
          <StyledTab icon={<StorageIcon sx={{ mr: 1 }} />} iconPosition="start" label="Databases" />
          <StyledTab icon={<SyncIcon sx={{ mr: 1 }} />} iconPosition="start" label="Synchronization" />
          <StyledTab icon={<SmartToyIcon sx={{ mr: 1 }} />} iconPosition="start" label="AI Assistant" />
          <StyledTab icon={<SecurityIcon sx={{ mr: 1 }} />} iconPosition="start" label="Security" />
          <StyledTab icon={<InfoIcon sx={{ mr: 1 }} />} iconPosition="start" label="About" />
          <StyledTab icon={<EmailIcon sx={{ mr: 1 }} />} iconPosition="start" label="Email Settings" />
        </Tabs>
      </Box>

      {/* Appearance Tab */}
      <TabPanel value={activeTab} index={0}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Theme and Display
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={darkMode} 
                      onChange={() => setDarkMode(!darkMode)}
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Enable dark mode for a more eye-friendly display in low light conditions.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    label="Language"
                  >
                    <MenuItem value="de">Deutsch</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Font Size
                </Typography>
                <Slider
                  defaultValue={14}
                  step={1}
                  min={12}
                  max={20}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 12, label: 'Small' },
                    { value: 14, label: 'Default' },
                    { value: 16, label: 'Medium' },
                    { value: 20, label: 'Large' },
                  ]}
                />
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Notifications Tab */}
      <TabPanel value={activeTab} index={1}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notification Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={notifications} 
                      onChange={() => setNotifications(!notifications)}
                      color="primary"
                    />
                  }
                  label="Enable In-App Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Receive notifications within the application for important events.
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch 
                      defaultChecked 
                      color="primary"
                    />
                  }
                  label="Enable Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Receive important notifications via email (requires SMTP configuration).
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  To configure email notifications, please set up your SMTP server in the <strong>Email Settings</strong> tab.
                </Alert>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Notifications for
                </Typography>
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Database connection issues"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Completed synchronizations"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="New database connections"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="System updates"
                  sx={{ display: 'block', mb: 1 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    Save Notification Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Databases Tab */}
      <TabPanel value={activeTab} index={2}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Database Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Default Database Type</InputLabel>
                  <Select
                    defaultValue="mysql"
                    label="Default Database Type"
                  >
                    <MenuItem value="mysql">MySQL</MenuItem>
                    <MenuItem value="postgresql">PostgreSQL</MenuItem>
                    <MenuItem value="sqlite">SQLite</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Character Set</InputLabel>
                  <Select
                    defaultValue="utf8mb4"
                    label="Character Set"
                  >
                    <MenuItem value="utf8mb4">UTF-8 Unicode (utf8mb4)</MenuItem>
                    <MenuItem value="utf8">UTF-8 Unicode (utf8)</MenuItem>
                    <MenuItem value="latin1">Latin1</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Automatically index new tables"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Automatically creates indexes for new tables to improve performance.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Force SSL connections (when available)"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Increases security by using SSL for database connections.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>

        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Backup
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Automatic Backups"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Regularly creates backups of your databases.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Backup Interval</InputLabel>
                  <Select
                    defaultValue="weekly"
                    label="Backup Interval"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Backup Location"
                  variant="outlined"
                  defaultValue="/backups"
                />
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Synchronization Tab */}
      <TabPanel value={activeTab} index={3}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Synchronization Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={autoSync} 
                      onChange={() => setAutoSync(!autoSync)}
                      color="primary"
                    />
                  }
                  label="Automatic Synchronization"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Automatically synchronizes your databases at regular intervals.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Synchronization Interval (Hours)
                </Typography>
                <Slider
                  value={syncInterval}
                  onChange={(e, newValue) => setSyncInterval(newValue)}
                  step={1}
                  min={1}
                  max={48}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 1, label: '1h' },
                    { value: 12, label: '12h' },
                    { value: 24, label: '24h' },
                    { value: 48, label: '48h' },
                  ]}
                  disabled={!autoSync}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Conflict Resolution
                </Typography>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Strategy for Conflicts</InputLabel>
                  <Select
                    defaultValue="ask"
                    label="Strategy for Conflicts"
                  >
                    <MenuItem value="ask">Ask</MenuItem>
                    <MenuItem value="source">Prefer Source</MenuItem>
                    <MenuItem value="target">Prefer Target</MenuItem>
                    <MenuItem value="newer">Prefer Newer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* AI Assistant Tab */}
      <TabPanel value={activeTab} index={4}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Assistant Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure the AI assistant for natural language database queries
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  AI Provider
                </Typography>
                <RadioGroup
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      border: aiProvider === 'sqlpal' ? '2px solid' : '1px solid',
                      borderColor: aiProvider === 'sqlpal' ? 'primary.main' : 'divider',
                      bgcolor: aiProvider === 'sqlpal' ? 'action.selected' : 'inherit'
                    }}
                  >
                    <FormControlLabel
                      value="sqlpal"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="subtitle2">SQLPal (Integrated Model)</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Lightweight SQL-specialized model - no additional configuration required
                          </Typography>
                        </Box>
                      }
                      sx={{ flexGrow: 1, mr: 0 }}
                    />
                    <Tooltip title="Recommended for most users">
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          bgcolor: 'success.main', 
                          color: 'white', 
                          py: 0.5, 
                          px: 1, 
                          borderRadius: 1 
                        }}
                      >
                        Default
                      </Typography>
                    </Tooltip>
                  </Paper>
                  
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 1, 
                      display: 'flex', 
                      alignItems: 'center',
                      border: aiProvider === 'openai' ? '2px solid' : '1px solid',
                      borderColor: aiProvider === 'openai' ? 'primary.main' : 'divider',
                      bgcolor: aiProvider === 'openai' ? 'action.selected' : 'inherit'
                    }}
                  >
                    <FormControlLabel
                      value="openai"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="subtitle2">OpenAI API (GPT Models)</Typography>
                          <Typography variant="body2" color="text.secondary">
                            High-precision language processing for complex queries - requires API key
                          </Typography>
                        </Box>
                      }
                      sx={{ flexGrow: 1, mr: 0 }}
                    />
                    <Tooltip title="Best results, but requires payment">
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          bgcolor: 'primary.main', 
                          color: 'white', 
                          py: 0.5, 
                          px: 1, 
                          borderRadius: 1 
                        }}
                      >
                        Premium
                      </Typography>
                    </Tooltip>
                  </Paper>
                  
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 1,
                      display: 'flex',
                      alignItems: 'center',
                      border: aiProvider === 'perplexity' ? '2px solid' : '1px solid',
                      borderColor: aiProvider === 'perplexity' ? 'primary.main' : 'divider',
                      bgcolor: aiProvider === 'perplexity' ? 'action.selected' : 'inherit'
                    }}
                  >
                    <FormControlLabel
                      value="perplexity"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="subtitle2">Perplexity AI</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Powerful AI search model for database analyses - requires API key
                          </Typography>
                        </Box>
                      }
                      sx={{ flexGrow: 1, mr: 0 }}
                    />
                    <Tooltip title="Well suited for analyses and summaries">
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          bgcolor: 'info.main', 
                          color: 'white', 
                          py: 0.5, 
                          px: 1, 
                          borderRadius: 1 
                        }}
                      >
                        Recommended
                      </Typography>
                    </Tooltip>
                  </Paper>
                  
                  <Paper 
                    sx={{ 
                      p: 2, 
                      mb: 1,
                      border: aiProvider === 'huggingface' ? '2px solid' : '1px solid',
                      borderColor: aiProvider === 'huggingface' ? 'primary.main' : 'divider',
                      bgcolor: aiProvider === 'huggingface' ? 'action.selected' : 'inherit'
                    }}
                  >
                    <FormControlLabel
                      value="huggingface"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="subtitle2">Hugging Face Models</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Various open-source models - may require an API key
                          </Typography>
                        </Box>
                      }
                      sx={{ flexGrow: 1 }}
                    />
                  </Paper>
                  
                  <Paper 
                    sx={{ 
                      p: 2,
                      border: aiProvider === 'local' ? '2px solid' : '1px solid',
                      borderColor: aiProvider === 'local' ? 'primary.main' : 'divider',
                      bgcolor: aiProvider === 'local' ? 'action.selected' : 'inherit'
                    }}
                  >
                    <FormControlLabel
                      value="local"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="subtitle2">Local Model</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Use a locally installed model for increased data security
                          </Typography>
                        </Box>
                      }
                      sx={{ flexGrow: 1 }}
                    />
                  </Paper>
                </RadioGroup>
              </Grid>
              
              <Grid item xs={12}>
                {renderApiKeyField()}
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Advanced Settings
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Accuracy vs. Speed
                </Typography>
                <Slider
                  value={aiPrecision}
                  onChange={(e, newValue) => setAiPrecision(newValue)}
                  step={1}
                  min={1}
                  max={10}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 1, label: 'Fast' },
                    { value: 10, label: 'Precise' },
                  ]}
                  sx={{ mb: 3 }}
                />
                
                <Typography variant="subtitle2" gutterBottom>
                  Custom Prompt Template
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  value={customPromptTemplate}
                  onChange={(e) => setCustomPromptTemplate(e.target.value)}
                  placeholder="Use {query} as a placeholder for the user query"
                  helperText="Use {query} as a placeholder for the user query"
                />
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setAiProvider('sqlpal');
                      setAiPrecision(7);
                      setCustomPromptTemplate('Analyze the database and tell me about {query}');
                    }}
                  >
                    Reset
                  </Button>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={activeTab} index={5}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Change Password
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  label="Current Password"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="primary">
                  Update Password
                </Button>
              </Grid>
              <Grid item xs={12} sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Session Management
                </Typography>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Auto-Logout on Inactivity"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Automatically log out after a certain period of inactivity.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
                  <InputLabel>Inactivity Period</InputLabel>
                  <Select
                    defaultValue={30}
                    label="Inactivity Period"
                  >
                    <MenuItem value={15}>15 Minutes</MenuItem>
                    <MenuItem value={30}>30 Minutes</MenuItem>
                    <MenuItem value={60}>1 Hour</MenuItem>
                    <MenuItem value={120}>2 Hours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* About Tab */}
      <TabPanel value={activeTab} index={6}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              About Mole Database Manager
            </Typography>
            <Typography variant="body1" paragraph>
              Version: 1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Mole Database Manager is a modern tool for managing and synchronizing database connections. With a user-friendly interface, you can effortlessly manage various database types and interact with them.
            </Typography>
            
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Environment Information
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Operating System:</strong> Linux
                </Typography>
                <Typography variant="body2">
                  <strong>Browser:</strong> Chrome 96.0.4664.110
                </Typography>
                <Typography variant="body2">
                  <strong>Node.js:</strong> 18.15.0
                </Typography>
                <Typography variant="body2">
                  <strong>React:</strong> 18.2.0
                </Typography>
              </Stack>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" startIcon={<InfoIcon />}>
                Release Notes
              </Button>
              <Button variant="outlined" sx={{ ml: 2 }} startIcon={<InfoIcon />}>
                License
              </Button>
            </Box>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Email Settings Tab */}
      <TabPanel value={activeTab} index={7}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              SMTP Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure your SMTP server for sending email notifications
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="SMTP Server"
                  name="host"
                  value={smtpSettings.host}
                  onChange={handleSmtpChange}
                  placeholder="smtp.example.com"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Port"
                  name="port"
                  value={smtpSettings.port}
                  onChange={handleSmtpChange}
                  placeholder="587"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={smtpSettings.username}
                  onChange={handleSmtpChange}
                  placeholder="your-email@example.com"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={smtpSettings.password}
                  onChange={handleSmtpChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  name="fromEmail"
                  value={smtpSettings.fromEmail}
                  onChange={handleSmtpChange}
                  placeholder="notifications@yourdomain.com"
                  helperText="Leave empty to use username as from address"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Name"
                  name="fromName"
                  value={smtpSettings.fromName}
                  onChange={handleSmtpChange}
                  placeholder="Mole Database Manager"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="encryption-label">Encryption</InputLabel>
                  <Select
                    labelId="encryption-label"
                    id="encryption"
                    name="encryption"
                    value={smtpSettings.encryption}
                    onChange={handleSmtpChange}
                    label="Encryption"
                  >
                    <MenuItem value="tls">TLS</MenuItem>
                    <MenuItem value="ssl">SSL</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {smtpTestStatus.message && (
                <Grid item xs={12}>
                  <Alert 
                    severity={smtpTestStatus.success ? "success" : "error"}
                    sx={{ mt: 2 }}
                  >
                    {smtpTestStatus.message}
                  </Alert>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestSmtpConnection}
                    disabled={smtpTestStatus.testing}
                    startIcon={smtpTestStatus.testing ? <CircularProgress size={20} /> : <CheckIcon />}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleSendTestEmail}
                    disabled={!smtpSettings.host || !smtpSettings.username || !smtpSettings.password}
                  >
                    Send Test Email
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveSmtpSettings}
                    startIcon={<SaveIcon />}
                  >
                    Save Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="large"
        >
          Save All Settings
        </Button>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 