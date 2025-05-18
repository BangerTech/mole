import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  Button, 
  Avatar, 
  Divider,
  Paper,
  Stack,
  Tabs,
  Tab,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Snackbar,
  Alert,
  useTheme,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Badge,
  Tooltip,
  ListItemAvatar,
  Link,
  RadioGroup,
  Radio
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Key as KeyIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  PhotoCamera as PhotoCameraIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import EmailService from '../services/EmailService';
import DatabaseService from '../services/DatabaseService';
import AuthService from '../services/AuthService';
import { getApiBaseUrl } from '../services/api';
import { UserContext } from '../components/UserContext';

// HIER die formatDateTime Funktion einfügen
const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    
    const formattedDate = date.toLocaleDateString('de-DE', optionsDate);
    const formattedTime = date.toLocaleTimeString('de-DE', optionsTime);
    
    return `${formattedDate} - ${formattedTime} Uhr`;
  } catch (e) {
    console.error("Error formatting date:", isoString, e);
    return 'Invalid Date';
  }
};

// Define default preferences structure locally for fallbacks if needed, mirroring UserContext
const defaultUserPreferences = {
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
  // other defaults can be added if Profile.js interacts with them directly via UserContext
};

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(0, 3, 3, 3)
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  border: `4px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[3]
}));

const ProfileCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}));

const LargeAvatar = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(12),
  height: theme.spacing(12),
  marginBottom: theme.spacing(2),
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      border: '1px solid currentColor',
      content: '""',
    },
  },
}));

// Mock user data
/*
const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  fullName: 'Administrator',
  role: 'Administrator',
  createdAt: '2023-01-15',
  lastLogin: '2023-05-22 15:43',
  profileImage: null,
  preferences: {
    darkMode: true,
    notifications: true,
    showSampleDatabases: true
  }
};
*/

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
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

export default function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user, updateUser: updateUserContext, updateUserPreferences, loading: userLoading } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState(null);
  const [databaseConnections, setDatabaseConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  // SMTP Settings state
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    encryption: 'tls', // 'tls', 'ssl', or 'none'
    fromEmail: '',
    fromName: 'Mole Database Manager'
  });
  const [smtpTestStatus, setSmtpTestStatus] = useState({
    testing: false,
    success: null,
    message: ''
  });
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    if (editMode) {
      // If we're exiting edit mode without saving, reset form data and preview
      setFormData({...userData}); // Reset formData to current actual userData
      setProfileImagePreview(null);
      setProfileImageFile(null);
    }
    setEditMode(!editMode);
  };

  const handleSaveProfile = async () => {
    setIsUploading(true);
    let latestUserData = { ...user }; // Start with current user from context
    let avatarUpdated = false;

    try {
      // Step 1: Handle Avatar Upload if a new file is selected
      if (profileImageFile && user && user.id) {
        const uploadResponse = await AuthService.uploadAvatar(user.id, profileImageFile);
        if (uploadResponse.success && uploadResponse.user) {
          latestUserData = uploadResponse.user; // This now has the new profileImage URL
          avatarUpdated = true;
          setSnackbar({
            open: true,
            message: 'Profile image updated successfully!',
            severity: 'success'
          });
          setProfileImagePreview(null);
          setProfileImageFile(null);
        } else {
          throw new Error(uploadResponse.message || 'Avatar upload failed during processing.');
        }
      }

      // Step 2: Handle other profile data changes (currently mocked by applying formData)
      // In a real app, this would be a separate API call if formData fields (name, email etc.) changed.
      // For example: if (formData.fullName !== latestUserData.fullName || formData.email !== latestUserData.email) {
      //   const detailsUpdateResponse = await AuthService.updateUserDetails(latestUserData.id, { fullName: formData.fullName, email: formData.email });
      //   latestUserData = detailsUpdateResponse.user;
      // }

      // Merge other form data changes into latestUserData
      // Ensure profileImage from avatar upload (if any) or existing is preserved.
      const otherFieldsChanged = formData.fullName !== latestUserData.fullName || formData.email !== latestUserData.email; // Add other fields as needed

      latestUserData = {
        ...latestUserData, // Contains new profileImage if avatar was uploaded, or original from context
        fullName: formData.fullName,
        email: formData.email
        // any other editable fields from formData must be explicitly merged here
        // Important: profileImage is already set correctly in latestUserData if uploaded,
        // or it's the original value from user context. This line doesn't overwrite it with an old formData value.
      };
      
      // Step 3: Update context and local state ONCE with the final user data
      // Only update if there were actual changes (avatar or other fields)
      if (avatarUpdated || otherFieldsChanged) {
        updateUserContext(latestUserData);
        setUserData(latestUserData); 
        setFormData(latestUserData); // Reset form with latest data for next edit

        // If only other fields were changed and no avatar message was shown
        if (otherFieldsChanged && !avatarUpdated) {
            setSnackbar({
              open: true,
              message: 'Profile details updated.',
              severity: 'success'
            });
        }
      } else if (!avatarUpdated) {
        // No changes were made
        setSnackbar({
            open: true,
            message: 'No changes to save.',
            severity: 'info'
          });
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to save profile.',
        severity: 'error'
      });
    } finally {
      setEditMode(false);
      setIsUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Handle profile image changes
  const handleProfileImageClick = () => {
    fileInputRef.current.click();
  };
  
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImageFile(null);
      setProfileImagePreview(null);
    }
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getConnectionColor = (engine) => {
    if (engine === 'PostgreSQL') return theme.palette.primary.main;
    if (engine === 'MySQL') return theme.palette.secondary.main;
    if (engine === 'InfluxDB') return theme.palette.warning.main;
    return theme.palette.info.main;
  };

  // Navigate to database connection page
  const goToNewDatabaseConnection = () => {
    navigate('/databases/create');
  };

  // SMTP related functions
  const loadSmtpSettings = async () => {
    try {
      const settings = await EmailService.getSmtpSettings();
      setSmtpSettings(settings);
    } catch (error) {
      console.error('Error loading SMTP settings:', error);
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
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

  // Load database connections from API
  const fetchDatabaseConnections = async () => {
    setLoadingConnections(true);
    try {
      const connections = await DatabaseService.getDatabaseConnections();
      setDatabaseConnections(connections);
    } catch (error) {
      console.error('Failed to fetch database connections:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load database connections',
        severity: 'error'
      });
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('[Profile.js] User from context received:', user);
      const enrichedUser = {
        ...user,
        fullName: user.name || user.fullName || '', // Fallback für fullName
        username: user.username || user.email?.split('@')[0] || '' // Fallback für username
      };
      setUserData(enrichedUser);
      setFormData(enrichedUser); // formData auch initial setzen
      if (user.profile_image) {
        setProfileImagePreview(`${getApiBaseUrl()}${user.profile_image}`);
      }
    } else {
      console.log('[Profile.js] No user in context, or user is null.');
      // Optional: Wenn kein User da ist (und nicht nur lädt), könnte man zu Login navigieren
      // if (!userLoading) navigate('/login');
      setUserData(null); // Sicherstellen, dass keine alten Daten angezeigt werden
      setFormData(null);
    }
  }, [user, userLoading, navigate]); // Abhängigkeit von user und userLoading

  // useEffect für das Laden der Datenbankverbindungen, nur wenn userData (und damit ein User) vorhanden ist
  useEffect(() => {
    if (userData) { // Nur ausführen, wenn userData (also ein User) vorhanden ist
      fetchDatabaseConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]); // Abhängigkeit von userData

  // useEffect für das Laden der SMTP-Einstellungen, nur wenn userData vorhanden ist
  useEffect(() => {
    if (userData) { // Nur ausführen, wenn userData (also ein User) vorhanden ist
      loadSmtpSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]); // Abhängigkeit von userData

  // Generic handler for profile notification switch changes
  const handleProfileNotificationPreferenceChange = async (key, value, isEvent = false) => {
    if (!user || !updateUserPreferences) return;

    // Get current notification settings from user context, or fall back to defaults
    const currentNotifications = user.preferences?.notifications || defaultUserPreferences.notifications;
    let newNotificationSettings = { ...currentNotifications };

    if (isEvent) {
      newNotificationSettings.events = {
        ...(currentNotifications.events || defaultUserPreferences.notifications.events),
        [key]: value,
      };
    } else {
      newNotificationSettings[key] = value;
    }
    
    try {
      await updateUserPreferences({ notifications: newNotificationSettings });
      setSnackbar({
        open: true,
        message: 'Notification preference updated.',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update notification preference.',
        severity: 'error',
      });
    }
  };

  // Ladezustand, wenn der Benutzer aus dem Context noch geladen wird oder nicht vorhanden ist
  if (userLoading) {
    return (
      <RootStyle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading user profile...</Typography>
      </RootStyle>
    );
  }

  // Wenn kein Benutzer vorhanden ist (nach dem Laden), zeige eine Meldung oder leite zum Login weiter
  if (!userData) { // userData statt user, da userData erst nach Anreicherung gesetzt wird
    return (
      <RootStyle sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>User profile not available.</Typography>
        <Typography sx={{ mb: 2 }}>Please log in to view your profile.</Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>Go to Login</Button>
      </RootStyle>
    );
  }

  return (
    <RootStyle>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and manage your profile information and connection history
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Left Column - User Info */}
        <Grid item xs={12} md={4}>
          <ProfileCard>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              {editMode ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleProfileImageChange}
                  />
                  <StyledBadge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      <IconButton 
                        sx={{ 
                          bgcolor: theme.palette.primary.main, 
                          color: 'white',
                          '&:hover': { bgcolor: theme.palette.primary.dark }
                        }}
                        size="small"
                        onClick={handleProfileImageClick}
                        disabled={isUploading}
                      >
                        {isUploading ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon fontSize="small" />}
                      </IconButton>
                    }
                  >
                    <LargeAvatar 
                      src={profileImagePreview || (userData.profile_image ? `${getApiBaseUrl().replace('/api', '')}${userData.profile_image}` : null)}
                      sx={{ cursor: 'pointer' }}
                      onClick={handleProfileImageClick}
                    >
                      {!profileImagePreview && !userData.profile_image && getInitials(userData.fullName)}
                    </LargeAvatar>
                  </StyledBadge>
                </>
              ) : (
                <LargeAvatar src={userData.profile_image ? `${getApiBaseUrl().replace('/api', '')}${userData.profile_image}` : null}>
                  {!userData.profile_image && getInitials(userData.fullName)}
                </LargeAvatar>
              )}
              
              <Typography variant="h5" gutterBottom>
                {userData.fullName}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {userData.role}
              </Typography>
              
              <Box sx={{ mt: 2, width: '100%' }}>
                <Typography variant="subtitle2">Email</Typography>
                <Typography variant="body2" gutterBottom>{userData.email}</Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Member Since</Typography>
                <Typography variant="body2" gutterBottom>{formatDateTime(userData.createdAt)}</Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Last Login</Typography>
                <Typography variant="body2">{formatDateTime(userData.lastLogin)}</Typography>
              </Box>
            </CardContent>
          </ProfileCard>
          
          <ProfileCard>
            <CardContent>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Database Connections</Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  {loadingConnections ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : (
                    <Typography>
                      You have <strong>{databaseConnections.length}</strong> active database connections.
                      <Link 
                        component={RouterLink} 
                        to="/databases" 
                        sx={{ ml: 1 }}
                      >
                        Manage connections
                      </Link>
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </ProfileCard>
        </Grid>
        
        {/* Right Column - Tabs */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label="Personal Information" />
              <Tab label="Notifications" />
              <Tab label="Security" />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                {!editMode ? (
                  <Button 
                    startIcon={<EditIcon />} 
                    variant="outlined" 
                    onClick={handleEditToggle}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Button 
                    startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />} 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSaveProfile}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </Box>
              
              <Grid container spacing={3} sx={{ px: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="fullName"
                    value={formData?.fullName || ''}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData?.username || ''}
                    onChange={handleInputChange}
                    disabled
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData?.email}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Role"
                    name="role"
                    value={formData?.role}
                    disabled
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Choose what notifications you want to receive. These settings are synced with the main application settings.
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user?.preferences?.notifications?.inApp ?? defaultUserPreferences.notifications.inApp} 
                          onChange={(e) => handleProfileNotificationPreferenceChange('inApp', e.target.checked)}
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
                          checked={user?.preferences?.notifications?.email ?? defaultUserPreferences.notifications.email}
                          onChange={(e) => handleProfileNotificationPreferenceChange('email', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Enable Email Notifications"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                      Receive important notifications via email.
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      To configure email notifications, please set up your SMTP server in the main <strong>Application Settings &gt; Email Settings</strong> tab.
                    </Alert>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Notify me about
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user?.preferences?.notifications?.events?.dbConnectionIssues ?? defaultUserPreferences.notifications.events.dbConnectionIssues} 
                          onChange={(e) => handleProfileNotificationPreferenceChange('dbConnectionIssues', e.target.checked, true)}
                          color="primary" 
                          disabled={!(user?.preferences?.notifications?.inApp || user?.preferences?.notifications?.email)}
                        />
                      }
                      label="Database connection issues"
                      sx={{ display: 'block', mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user?.preferences?.notifications?.events?.syncCompleted ?? defaultUserPreferences.notifications.events.syncCompleted} 
                          onChange={(e) => handleProfileNotificationPreferenceChange('syncCompleted', e.target.checked, true)}
                          color="primary" 
                          disabled={!(user?.preferences?.notifications?.inApp || user?.preferences?.notifications?.email)}
                        />
                      }
                      label="Completed synchronizations"
                      sx={{ display: 'block', mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user?.preferences?.notifications?.events?.newDbConnections ?? defaultUserPreferences.notifications.events.newDbConnections} 
                          onChange={(e) => handleProfileNotificationPreferenceChange('newDbConnections', e.target.checked, true)}
                          color="primary" 
                          disabled={!(user?.preferences?.notifications?.inApp || user?.preferences?.notifications?.email)}
                        />
                      }
                      label="New database connections (globally created)"
                      sx={{ display: 'block', mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={user?.preferences?.notifications?.events?.systemUpdates ?? defaultUserPreferences.notifications.events.systemUpdates} 
                          onChange={(e) => handleProfileNotificationPreferenceChange('systemUpdates', e.target.checked, true)}
                          color="primary" 
                          disabled={!(user?.preferences?.notifications?.inApp || user?.preferences?.notifications?.email)}
                        />
                      }
                      label="System updates and new features"
                      sx={{ display: 'block', mb: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                       {/* Save button for notifications is no longer needed as changes are instant via context 
                       <Button 
                        startIcon={<SaveIcon />}
                        variant="contained" 
                        color="primary"
                        onClick={handleSaveProfileNotificationSettings} // This handler was removed/repurposed
                        disabled={isUploading} 
                      >
                        Save Notification Settings
                      </Button> 
                      */}
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
                
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Change Password
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          type="password"
                          label="Current Password"
                          name="currentPassword"
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="password"
                          label="New Password"
                          name="newPassword"
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="password"
                          label="Confirm New Password"
                          name="confirmPassword"
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button 
                          startIcon={<KeyIcon />}
                          variant="contained" 
                          color="primary"
                        >
                          Update Password
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Divider />
                  
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Two-Factor Authentication
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Add an extra layer of security to your account
                    </Typography>
                    <Button 
                      startIcon={<SecurityIcon />} 
                      variant="outlined"
                    >
                      Enable 2FA
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </RootStyle>
  );
} 