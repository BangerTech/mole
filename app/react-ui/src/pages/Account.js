import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  Button, 
  Switch,
  Divider,
  Paper,
  Stack,
  Tabs,
  Tab,
  FormControlLabel,
  Snackbar,
  Alert,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Security as SecurityIcon,
  Key as KeyIcon,
  Logout as LogoutIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
  SaveAlt as SaveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Styled components
const RootStyle = styled('div')({
  height: '100%',
  padding: '24px'
});

const AccountCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
  emailNotifications: true,
  twoFactorEnabled: false,
  loginAlerts: true
};

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
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

export default function Account() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [userData, setUserData] = useState(mockUser);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [emailNotifications, setEmailNotifications] = useState(userData.emailNotifications);
  const [loginAlerts, setLoginAlerts] = useState(userData.loginAlerts);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSaveSettings = () => {
    setUserData({
      ...userData,
      emailNotifications,
      loginAlerts
    });
    
    setSnackbar({
      open: true,
      message: 'Account settings updated successfully',
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    // In a real app, this would make an API call to delete the account
    navigate('/login');
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  return (
    <RootStyle>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Account
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account settings, security, and preferences
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Login & Security" />
          <Tab label="Email Preferences" />
          <Tab label="Data & Privacy" />
        </Tabs>
        
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Login & Security Settings
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
                  {userData.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </Box>

              <Divider />
              
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Login Alerts
                </Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={loginAlerts} 
                      onChange={() => setLoginAlerts(!loginAlerts)}
                      color="primary"
                    />
                  }
                  label="Receive alerts for new login attempts"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Get notified when someone logs into your account from a new device or location
                </Typography>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  startIcon={<SaveIcon />}
                  variant="contained" 
                  color="primary"
                  onClick={handleSaveSettings}
                >
                  Save Security Settings
                </Button>
              </Box>
            </Stack>
          </Box>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Email Notification Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Customize how and when you receive email notifications
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={emailNotifications} 
                      onChange={() => setEmailNotifications(!emailNotifications)}
                      color="primary"
                    />
                  }
                  label="Enable Email Notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Receive important notifications via email in addition to in-app alerts
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Email me about
                </Typography>
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Database connection issues"
                  sx={{ display: 'block', mb: 1 }}
                  disabled={!emailNotifications}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Completed synchronizations"
                  sx={{ display: 'block', mb: 1 }}
                  disabled={!emailNotifications}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Security alerts"
                  sx={{ display: 'block', mb: 1 }}
                  disabled={!emailNotifications}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="System updates"
                  sx={{ display: 'block', mb: 1 }}
                  disabled={!emailNotifications}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    startIcon={<EmailIcon />}
                    variant="contained" 
                    color="primary"
                    onClick={handleSaveSettings}
                  >
                    Save Email Preferences
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data & Privacy
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Manage your personal data and privacy settings
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Account Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={userData.username}
                    disabled
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={userData.email}
                    disabled
                    margin="normal"
                  />
                </Grid>
              </Grid>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Box>
              <Typography variant="subtitle1" gutterBottom color="error">
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Permanent actions that cannot be undone
              </Typography>
              
              {!showDeleteConfirmation ? (
                <Button 
                  startIcon={<DeleteIcon />}
                  variant="outlined" 
                  color="error"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
              ) : (
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 1 }}>
                  <Typography variant="body1" gutterBottom>
                    Are you sure you want to delete your account? This action cannot be undone.
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button 
                      variant="contained" 
                      color="error"
                      onClick={handleConfirmDelete}
                    >
                      Yes, Delete My Account
                    </Button>
                    <Button 
                      variant="outlined"
                      onClick={handleCancelDelete}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </TabPanel>
      </Paper>
      
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