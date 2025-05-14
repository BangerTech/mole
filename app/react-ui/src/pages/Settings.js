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
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
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
  Check as CheckIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import EmailService from '../services/EmailService';
import AIService from '../services/AIService';
import DatabaseService from '../services/DatabaseService';
import UserSettingsService from '../services/UserSettingsService';

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
  const [successMessage, setSuccessMessage] = useState('');
  const [aiProvider, setAiProvider] = useState('sqlpal');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [huggingfaceApiKey, setHuggingfaceApiKey] = useState('');
  const [perplexityApiKey, setPerplexityApiKey] = useState('');
  const [huggingfaceModel, setHuggingfaceModel] = useState('mistralai/Mistral-7B-Instruct-v0.2');
  const [localModelPath, setLocalModelPath] = useState('/models/llama-2-7b');
  const [aiPrecision, setAiPrecision] = useState(7);
  const [customPromptTemplate, setCustomPromptTemplate] = useState('Analyze the database and tell me about {query}');
  const [userSettings, setUserSettings] = useState({
    notifications: {
      inApp: true,
      email: false,
      events: {
        dbConnectionIssues: true,
        syncCompleted: true,
        newDbConnections: true,
        systemUpdates: true,
      },
    },
    ai: {},
    smtp: {},
    security: {},
  });
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [notifyDbConnectionIssues, setNotifyDbConnectionIssues] = useState(true);
  const [notifySyncCompleted, setNotifySyncCompleted] = useState(true);
  const [notifyNewDbConnections, setNotifyNewDbConnections] = useState(true);
  const [notifySystemUpdates, setNotifySystemUpdates] = useState(true);
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    encryption: 'tls',
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
  const [syncTasks, setSyncTasks] = useState([]);
  const [loadingSyncTasks, setLoadingSyncTasks] = useState(false);
  const [errorSyncTasks, setErrorSyncTasks] = useState(null);
  const [taskBeingProcessed, setTaskBeingProcessed] = useState(null);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [aiTestStatus, setAiTestStatus] = useState({});

  // Handle tab selection from URL query parameters
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    
    if (tab === 'notifications') {
      setActiveTab(0);
    } else if (tab === 'databases') {
      setActiveTab(1);
    } else if (tab === 'synchronization') {
      setActiveTab(2);
    } else if (tab === 'ai') {
      setActiveTab(3);
    } else if (tab === 'security') {
      setActiveTab(4);
    } else if (tab === 'email') {
      setActiveTab(5);
    }
  }, [location]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSave = async () => {
    try {
      await UserSettingsService.saveSettings(userSettings);
      setSuccessMessage('Settings successfully saved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save settings',
        severity: 'error',
      });
    }
  };

  useEffect(() => {
    const loadAllUserSettings = async () => {
      try {
        const settings = await UserSettingsService.getSettings();
        console.log("Loaded UserSettings:", settings);
        setUserSettings(settings);

        setInAppNotificationsEnabled(settings.notifications?.inApp ?? true);
        setEmailNotificationsEnabled(settings.notifications?.email ?? false);
        setNotifyDbConnectionIssues(settings.notifications?.events?.dbConnectionIssues ?? true);
        setNotifySyncCompleted(settings.notifications?.events?.syncCompleted ?? true);
        setNotifyNewDbConnections(settings.notifications?.events?.newDbConnections ?? true);
        setNotifySystemUpdates(settings.notifications?.events?.systemUpdates ?? true);
        
        if (settings.ai) {
          setAiProvider(settings.ai.defaultProvider || settings.ai.provider || 'sqlpal');
          setOpenaiApiKey(settings.ai.providers?.openai?.apiKey || settings.ai.openaiApiKey || '');
          setPerplexityApiKey(settings.ai.providers?.perplexity?.apiKey || settings.ai.perplexityApiKey || '');
          setHuggingfaceApiKey(settings.ai.providers?.huggingface?.apiKey || settings.ai.huggingfaceApiKey || '');
          setHuggingfaceModel(settings.ai.providers?.huggingface?.model || settings.ai.huggingfaceModel || 'mistralai/Mistral-7B-Instruct-v0.2');
          setLocalModelPath(settings.ai.providers?.llama?.modelPath || settings.ai.localModelPath || '/models/llama-2-7b');
        }

        if (settings.smtp) {
          setSmtpSettings(prev => ({ ...prev, ...settings.smtp }));
        }

      } catch (error) {
        console.error('Error loading UserSettings:', error);
        setSnackbar({
          open: true,
          message: 'Could not load user settings. Using defaults.',
          severity: 'warning',
        });
        setInAppNotificationsEnabled(userSettings.notifications.inApp);
        setEmailNotificationsEnabled(userSettings.notifications.email);
        setNotifyDbConnectionIssues(userSettings.notifications.events.dbConnectionIssues);
        setNotifySyncCompleted(userSettings.notifications.events.syncCompleted);
        setNotifyNewDbConnections(userSettings.notifications.events.newDbConnections);
        setNotifySystemUpdates(userSettings.notifications.events.systemUpdates);
      }
    };
    loadAllUserSettings();
  }, []);

  useEffect(() => {
    const loadAiSpecificSettings = async () => {
      try {
        const settings = await AIService.getSettings();
        console.log("Loaded AI specific settings (AIService):", settings);
      } catch (error) {
        console.error('Error loading AI specific settings (AIService):', error);
      }
    };
  }, []);

  const handleTestAIProvider = async (provider) => {
    let apiKeyToTest = '';
    switch (provider) {
      case 'openai': apiKeyToTest = openaiApiKey; break;
      case 'perplexity': apiKeyToTest = perplexityApiKey; break;
      case 'huggingface': apiKeyToTest = huggingfaceApiKey; break;
      default: return;
    }

    if (!apiKeyToTest) {
      setSnackbar({
        open: true,
        message: `Please enter an API key for ${provider} first.`,
        severity: 'warning'
      });
      return;
    }

    setAiTestStatus(prev => ({ ...prev, [provider]: { testing: true, success: null, message: 'Testing...' } }));
    try {
      const result = await AIService.testProvider(provider, apiKeyToTest);
      setAiTestStatus(prev => ({ ...prev, [provider]: { testing: false, ...result } }));
    } catch (error) {
      setAiTestStatus(prev => ({ 
        ...prev, 
        [provider]: { 
          testing: false, 
          success: false, 
          message: error.response?.data?.message || error.message || 'Test failed' 
        } 
      }));
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
    setUserSettings(currentSettings => ({
      ...currentSettings,
      smtp: {
        ...currentSettings.smtp,
        [name]: value,
      }
    }));
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

  useEffect(() => {
    const loadSmtpSpecificSettings = async () => {
      try {
      } catch (error) {
        console.error('Error loading SMTP settings (EmailService):', error);
      }
    };
  }, []);

  const handleSaveAISettings = async () => {
    try {
      const aiSettingsToSave = {
        defaultProvider: aiProvider,
        provider: aiProvider,
        providers: {
          openai: { apiKey: openaiApiKey, model: 'gpt-3.5-turbo' },
          perplexity: { apiKey: perplexityApiKey, model: 'sonar-pro' },
          huggingface: { apiKey: huggingfaceApiKey, model: huggingfaceModel },
          llama: { modelPath: localModelPath },
          sqlpal: { modelPath: '/app/models/sqlpal' },
        },
      };
      
      const updatedUserSettings = {
        ...userSettings,
        ai: aiSettingsToSave,
      };
      await UserSettingsService.saveSettings(updatedUserSettings);
      setUserSettings(updatedUserSettings);

      setSuccessMessage('AI settings successfully saved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save AI settings',
        severity: 'error',
      });
    }
  };

  const handleSaveSmtpSettings = async () => {
    try {
      const updatedUserSettings = {
        ...userSettings,
        smtp: smtpSettings,
      };
      await UserSettingsService.saveSettings(updatedUserSettings);
      setUserSettings(updatedUserSettings);

      setSuccessMessage('SMTP settings successfully saved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save SMTP settings',
        severity: 'error',
      });
    }
  };

  const handleSaveNotificationSettings = async () => {
    try {
      const notificationSettingsPayload = {
        inApp: inAppNotificationsEnabled,
        email: emailNotificationsEnabled,
        events: {
          dbConnectionIssues: notifyDbConnectionIssues,
          syncCompleted: notifySyncCompleted,
          newDbConnections: notifyNewDbConnections,
          systemUpdates: notifySystemUpdates,
        },
      };
      const updatedUserSettings = {
        ...userSettings,
        notifications: notificationSettingsPayload,
      };
      await UserSettingsService.saveSettings(updatedUserSettings);
      setUserSettings(updatedUserSettings);

      setSnackbar({
        open: true,
        message: 'Notification settings saved successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save notification settings.',
        severity: 'error',
      });
    }
  };
  
  const createToggleHandler = (setter, settingsKey, eventKey) => (event) => {
    const newValue = event.target.checked;
    setter(newValue);
    setUserSettings(prev => {
      const newSettings = JSON.parse(JSON.stringify(prev));
      if (!newSettings.notifications) newSettings.notifications = {};
      if (eventKey) {
        if (!newSettings.notifications.events) newSettings.notifications.events = {};
        newSettings.notifications.events[eventKey] = newValue;
      } else {
        newSettings.notifications[settingsKey] = newValue;
      }
      return newSettings;
    });
  };

  const handleInAppNotificationsChange = createToggleHandler(setInAppNotificationsEnabled, 'inApp');
  const handleEmailNotificationsChange = createToggleHandler(setEmailNotificationsEnabled, 'email');
  const handleDbConnectionIssuesChange = createToggleHandler(setNotifyDbConnectionIssues, 'events', 'dbConnectionIssues');
  const handleSyncCompletedChange = createToggleHandler(setNotifySyncCompleted, 'events', 'syncCompleted');
  const handleNewDbConnectionsChange = createToggleHandler(setNotifyNewDbConnections, 'events', 'newDbConnections');
  const handleSystemUpdatesChange = createToggleHandler(setNotifySystemUpdates, 'events', 'systemUpdates');

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

  const fetchSyncTasks = async () => {
    setLoadingSyncTasks(true);
    setErrorSyncTasks(null);
    try {
      const data = await DatabaseService.getAllSyncTasks();
      if (data.success) {
        setSyncTasks(data.tasks);
      } else {
        throw new Error(data.message || 'Failed to fetch sync tasks');
      }
    } catch (error) {
      console.error('Error fetching sync tasks:', error);
      setErrorSyncTasks(error.message || 'Could not load synchronization tasks.');
      setSyncTasks([]);
    } finally {
      setLoadingSyncTasks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 2) {
      fetchSyncTasks();
    }
  }, [activeTab]);

  const handleToggleSyncTask = async (taskId, currentEnabledStatus) => {
    setTaskBeingProcessed(taskId);
    setSnackbar({ open: false, message: '', severity: 'info' });
    try {
      const updates = { enabled: !currentEnabledStatus };
      await DatabaseService.updateSyncTask(taskId, updates);
      setSnackbar({ open: true, message: `Sync task ${currentEnabledStatus ? 'disabled' : 'enabled'} successfully.`, severity: 'success' });
      fetchSyncTasks();
    } catch (error) {
      console.error(`Error toggling sync task ${taskId}:`, error);
      setSnackbar({ open: true, message: error.message || 'Failed to update task status.', severity: 'error' });
    } finally {
      setTaskBeingProcessed(null);
    }
  };

  const openDeleteConfirmDialog = (task) => {
    setTaskToDelete(task);
    setConfirmDeleteDialogOpen(true);
  };

  const closeDeleteConfirmDialog = () => {
    setTaskToDelete(null);
    setConfirmDeleteDialogOpen(false);
  };

  const handleDeleteSyncTask = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete.task_id;
    setTaskBeingProcessed(taskId);
    closeDeleteConfirmDialog();
    setSnackbar({ open: false, message: '', severity: 'info' });
    try {
      await DatabaseService.deleteSyncTask(taskId);
      setSnackbar({ open: true, message: 'Sync task deleted successfully.', severity: 'success' });
      fetchSyncTasks();
    } catch (error) {
      console.error(`Error deleting sync task ${taskId}:`, error);
      setSnackbar({ open: true, message: error.message || 'Failed to delete task.', severity: 'error' });
    } finally {
      setTaskBeingProcessed(null);
    }
  };

  const renderApiKeyField = () => {
    switch (aiProvider) {
      case 'openai':
        return (
          <Paper sx={{ p: 2, mt: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>OpenAI API Key</Typography>
            <TextField
              fullWidth
              type="password"
              label="OpenAI API Key"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              variant="outlined"
              sx={{ mb: 1 }}
              helperText="Enter your OpenAI API key."
            />
            <Button 
              variant="outlined" 
              onClick={() => handleTestAIProvider('openai')}
              disabled={aiTestStatus.openai?.testing}
              startIcon={aiTestStatus.openai?.testing ? <CircularProgress size={20}/> : (aiTestStatus.openai?.success === true ? <CheckIcon color="success"/> : aiTestStatus.openai?.success === false ? <HelpIcon color="error"/> : null) }
            >
              Test OpenAI Key
            </Button>
            {aiTestStatus.openai?.message && (
                <Alert severity={aiTestStatus.openai.success ? 'success' : 'error'} sx={{mt:1}}>
                    {aiTestStatus.openai.message}
                </Alert>
            )}
          </Paper>
        );
      case 'perplexity':
        return (
          <Paper sx={{ p: 2, mt: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>Perplexity API Key</Typography>
            <TextField
              fullWidth
              type="password"
              label="Perplexity API Key"
              value={perplexityApiKey}
              onChange={(e) => setPerplexityApiKey(e.target.value)}
              variant="outlined"
              sx={{ mb: 1 }}
              helperText="Enter your Perplexity API key."
            />
            <Button 
              variant="outlined" 
              onClick={() => handleTestAIProvider('perplexity')}
              disabled={aiTestStatus.perplexity?.testing}
              startIcon={aiTestStatus.perplexity?.testing ? <CircularProgress size={20}/> : (aiTestStatus.perplexity?.success === true ? <CheckIcon color="success"/> : aiTestStatus.perplexity?.success === false ? <HelpIcon color="error"/> : null) }
            >
              Test Perplexity Key
            </Button>
             {aiTestStatus.perplexity?.message && (
                <Alert severity={aiTestStatus.perplexity.success ? 'success' : 'error'} sx={{mt:1}}>
                    {aiTestStatus.perplexity.message}
                </Alert>
            )}
          </Paper>
        );
      case 'huggingface':
        return (
          <Paper sx={{ p: 2, mt: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>Hugging Face</Typography>
            <TextField
              fullWidth
              type="password"
              label="Hugging Face API Key (Optional)"
              value={huggingfaceApiKey}
              onChange={(e) => setHuggingfaceApiKey(e.target.value)}
              variant="outlined"
              sx={{ mb: 1 }}
              helperText="Enter your Hugging Face API key if required by the model."
            />
            <TextField
              fullWidth
              label="Hugging Face Model ID"
              value={huggingfaceModel}
              onChange={(e) => setHuggingfaceModel(e.target.value)}
              variant="outlined"
              sx={{ mb: 1 }}
              helperText="e.g., mistralai/Mistral-7B-Instruct-v0.2"
            />
            <Button 
              variant="outlined" 
              onClick={() => handleTestAIProvider('huggingface')}
              disabled={aiTestStatus.huggingface?.testing || !huggingfaceApiKey} // Disable if no key for HF generally
              startIcon={aiTestStatus.huggingface?.testing ? <CircularProgress size={20}/> : (aiTestStatus.huggingface?.success === true ? <CheckIcon color="success"/> : aiTestStatus.huggingface?.success === false ? <HelpIcon color="error"/> : null) }
            >
              Test Hugging Face Key
            </Button>
            {aiTestStatus.huggingface?.message && (
                <Alert severity={aiTestStatus.huggingface.success ? 'success' : 'error'} sx={{mt:1}}>
                    {aiTestStatus.huggingface.message}
                </Alert>
            )}
          </Paper>
        );
      case 'local':
         return (
          <Paper sx={{ p: 2, mt: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>Local Model Path</Typography>
            <TextField
              fullWidth
              label="Local Model Path"
              value={localModelPath}
              onChange={(e) => setLocalModelPath(e.target.value)}
              variant="outlined"
              sx={{ mb: 1 }}
              helperText="Path to the local model directory or file."
            />
            {/* No test button for local model for now, could be complex to implement client-side */}
          </Paper>
        );
      case 'sqlpal':
        return (
            <Alert severity="info" sx={{mt:1}}>
                SQLPal is an integrated model and requires no additional API key configuration.
            </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ pt: 0, pb: 3, px: { xs: 2, md: 3 } }}>
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
          <StyledTab icon={<NotificationsIcon sx={{ mr: 1 }} />} iconPosition="start" label="Notifications" />
          <StyledTab icon={<SyncIcon sx={{ mr: 1 }} />} iconPosition="start" label="Synchronization" />
          <StyledTab icon={<SmartToyIcon sx={{ mr: 1 }} />} iconPosition="start" label="AI Assistant" />
          <StyledTab icon={<SecurityIcon sx={{ mr: 1 }} />} iconPosition="start" label="Security" />
          <StyledTab icon={<EmailIcon sx={{ mr: 1 }} />} iconPosition="start" label="Email Settings" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
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
                      checked={inAppNotificationsEnabled} 
                      onChange={handleInAppNotificationsChange}
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
                      checked={emailNotificationsEnabled}
                      onChange={handleEmailNotificationsChange}
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
                  control={
                    <Switch 
                      checked={notifyDbConnectionIssues} 
                      onChange={handleDbConnectionIssuesChange}
                      color="primary" 
                    />}
                  label="Database connection issues"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={notifySyncCompleted} 
                      onChange={handleSyncCompletedChange}
                      color="primary" 
                    />}
                  label="Completed synchronizations"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={notifyNewDbConnections} 
                      onChange={handleNewDbConnectionsChange}
                      color="primary" 
                    />}
                  label="New database connections"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={notifySystemUpdates} 
                      onChange={handleSystemUpdatesChange}
                      color="primary" 
                    />}
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
                    onClick={handleSaveNotificationSettings}
                  >
                    Save Notification Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Synchronization Task Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Below is a list of all configured database synchronization tasks.
              You can manage individual task settings within the detail view of each database connection.
            </Typography>
            
            {loadingSyncTasks && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            {errorSyncTasks && (
              <Alert severity="error" sx={{ my: 2 }}>{errorSyncTasks}</Alert>
            )}
            
            {!loadingSyncTasks && !errorSyncTasks && (
              <TableContainer component={Paper} sx={{ mt: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                <Table sx={{ minWidth: 750 }} aria-label="synchronization tasks table">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Source Database</TableCell>
                      <TableCell>Target Database</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell align="center">Enabled</TableCell>
                      <TableCell>Last Sync</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          No synchronization tasks configured yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncTasks.map((task) => (
                        <TableRow
                          key={task.task_id}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell component="th" scope="row">
                            {task.source_db_name || `(ID: ${task.source_connection_id})`}
                            <Typography variant="caption" display="block" color="text.secondary">
                              ({task.source_db_engine || 'N/A'})
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {task.target_db_name || `(ID: ${task.target_connection_id})`}
                            <Typography variant="caption" display="block" color="text.secondary">
                              ({task.target_db_engine || 'N/A'})
                            </Typography>
                          </TableCell>
                          <TableCell>{task.schedule || 'never'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title={task.enabled ? 'Disable Task' : 'Enable Task'}>
                              <span>
                                <IconButton 
                                  color={task.enabled ? 'success' : 'default'}
                                  onClick={() => handleToggleSyncTask(task.task_id, task.enabled)}
                                  disabled={taskBeingProcessed === task.task_id}
                                  size="small"
                                >
                                  {taskBeingProcessed === task.task_id ? 
                                    <CircularProgress size={20} color="inherit" /> : 
                                    (task.enabled ? <ToggleOnIcon /> : <ToggleOffIcon />)
                                  }
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{task.last_sync ? new Date(task.last_sync).toLocaleString() : 'Never'}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Delete Task">
                              <span>
                                <IconButton 
                                  color="error"
                                  onClick={() => openDeleteConfirmDialog(task)}
                                  disabled={taskBeingProcessed === task.task_id}
                                  size="small"
                                >
                                  {taskBeingProcessed === task.task_id && taskToDelete?.task_id !== task.task_id ? 
                                    <CircularProgress size={20} color="inherit" /> : 
                                    <DeleteIcon />
                                  }
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </SettingCard>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
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
                {aiProvider !== 'sqlpal' && aiProvider !== 'local' && aiTestStatus[aiProvider]?.message && (
                  <Alert 
                    severity={aiTestStatus[aiProvider].success ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    {aiTestStatus[aiProvider].message}
                  </Alert>
                )}
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveAISettings}
                  >
                    Save AI Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
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

      <TabPanel value={activeTab} index={4}>
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
                    Save SMTP Settings
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure user-specific settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Auto Sync
                </Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={autoSync} 
                      onChange={(e) => setAutoSync(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Auto Sync"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Sync Interval
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Sync Interval (hours)"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Language
                </Typography>
                <TextField
                  fullWidth
                  label="Language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Dark Mode
                </Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={darkMode} 
                      onChange={(e) => setDarkMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable Dark Mode"
                />
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      <Dialog
        open={confirmDeleteDialogOpen}
        onClose={closeDeleteConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the sync task for source database "{taskToDelete?.source_db_name || 'Unknown'}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteConfirmDialog}>Cancel</Button>
          <Button onClick={handleDeleteSyncTask} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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