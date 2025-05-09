import React, { useState, useEffect, useRef } from 'react';
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
  Link
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

// Styled components
const RootStyle = styled('div')({
  height: '100%',
  padding: '24px'
});

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
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState(mockUser);
  const [formData, setFormData] = useState({...mockUser});
  const [databaseConnections, setDatabaseConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    if (editMode) {
      // If we're exiting edit mode without saving, reset form data
      setFormData({...userData});
      setProfileImagePreview(null);
    }
    setEditMode(!editMode);
  };

  const handleSaveProfile = () => {
    // In a real application, this would make an API call to update user data
    const updatedUserData = {...formData};
    
    // Save profile image if there's a preview
    if (profileImagePreview) {
      updatedUserData.profileImage = profileImagePreview;
    }
    
    setUserData(updatedUserData);
    setEditMode(false);
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'Profile updated successfully',
      severity: 'success'
    });
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
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
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
  useEffect(() => {
    // Load SMTP settings
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
                      >
                        <PhotoCameraIcon fontSize="small" />
                      </IconButton>
                    }
                  >
                    <LargeAvatar 
                      src={profileImagePreview || userData.profileImage}
                      sx={{ cursor: 'pointer' }}
                      onClick={handleProfileImageClick}
                    >
                      {!profileImagePreview && !userData.profileImage && getInitials(userData.fullName)}
                    </LargeAvatar>
                  </StyledBadge>
                </>
              ) : (
                <LargeAvatar src={userData.profileImage}>
                  {!userData.profileImage && getInitials(userData.fullName)}
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
                <Typography variant="body2" gutterBottom>{userData.createdAt}</Typography>
                
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Last Login</Typography>
                <Typography variant="body2">{userData.lastLogin}</Typography>
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
              <Tab label="Security" />
              <Tab label="Notifications" />
              <Tab label="Email Settings" />
              <Tab label="Connected Apps" />
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
                    startIcon={<SaveIcon />} 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </Button>
                )}
              </Box>
              
              <Grid container spacing={3} sx={{ px: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
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
                    value={formData.username}
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
                    value={formData.email}
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
                    value={formData.role}
                    disabled
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
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
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Choose what notifications you want to receive
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={userData.preferences?.notifications || false} 
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              preferences: {
                                ...formData.preferences,
                                notifications: e.target.checked
                              }
                            });
                          }}
                          color="primary"
                        />
                      }
                      label="Enable Notifications"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                      Enable notifications to stay informed about important events and updates.
                    </Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      Notifications for
                    </Typography>
                    
                    <FormControlLabel
                      control={
                        <Switch defaultChecked color="primary" 
                          disabled={!formData.preferences?.notifications}
                        />
                      }
                      label="Database connection issues"
                      sx={{ display: 'block', mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch defaultChecked color="primary" 
                          disabled={!formData.preferences?.notifications}
                        />
                      }
                      label="Completed synchronizations"
                      sx={{ display: 'block', mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch defaultChecked color="primary" 
                          disabled={!formData.preferences?.notifications}
                        />
                      }
                      label="New database connections"
                      sx={{ display: 'block', mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch defaultChecked color="primary" 
                          disabled={!formData.preferences?.notifications}
                        />
                      }
                      label="System updates"
                      sx={{ display: 'block', mb: 1 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        startIcon={<NotificationsIcon />}
                        variant="contained" 
                        color="primary"
                        onClick={handleSaveProfile}
                      >
                        Save Notification Preferences
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={3}>
              <Box sx={{ p: 2 }}>
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
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={4}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Connected Applications
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Manage external applications connected to your account
                </Typography>
                
                {/* Connected apps would go here */}
                <Typography variant="body1">
                  No connected applications found.
                </Typography>
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