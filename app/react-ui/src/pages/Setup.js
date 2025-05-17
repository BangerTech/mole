import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Snackbar,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import UserService from '../services/UserService'; // Erfordert, dass UserService existiert
import AuthService from '../services/AuthService'; // AuthService importieren
import { UserContext } from '../components/UserContext'; // UserContext importieren

// Styled components
const RootStyle = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(2),
  background: theme.palette.background.default
}));

const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: 500,
  margin: 'auto',
  boxShadow: theme.shadows[10],
  borderRadius: theme.shape.borderRadius * 2,
}));

const Logo = styled('img')({
  height: 80,
  marginBottom: 24,
  display: 'block',
  marginLeft: 'auto',
  marginRight: 'auto',
});

export default function Setup() {
  const navigate = useNavigate();
  const { login: contextLogin } = useContext(UserContext); // Get login function from context
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const adminData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'admin'
      };
      
      const response = await UserService.createUser(adminData);

      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Admin account created successfully! Redirecting to login...',
          severity: 'success'
        });
        setTimeout(() => {
          navigate('/login');
        }, 2500); // Etwas längere Zeit für die Snackbar
      } else {
        setError(response.message || 'Failed to create admin account');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      if (!snackbar.open) setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await AuthService.login('demo@example.com', 'demo');
      // Add the logs here as well for consistency during debugging
      console.log('[Setup.js] AuthService demo response successful. User data:', response.user);
      console.log('[Setup.js] Type of contextLogin (demo):', typeof contextLogin);
      if (response.success && response.user) {
        if (typeof contextLogin === 'function') {
          contextLogin(response.user); // Call contextLogin to update UserContext state
        } else {
          console.error('[Setup.js] contextLogin is not a function!');
          // Handle this error appropriately, maybe show a generic error to user
          setError('Critical error in login process. Please contact support.');
          setLoading(false);
          return;
        }
        setSnackbar({
          open: true,
          message: 'Logged in as Demo User! Redirecting to dashboard...',
          severity: 'success'
        });
        setTimeout(() => {
          navigate('/dashboard');
          // setLoading(false); // Should be set before navigate or if navigate doesn't unmount
        }, 1500);
        // setLoading(false) // If not navigating immediately or if component might not unmount.
      } else {
        setError(response.message || 'Demo login failed. Please ensure the demo account exists and credentials are correct.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to login with demo account.');
      setLoading(false);
    }
    // setLoading(false); // This will be reached if an error occurs or if login is successful before timeout. 
    // Consider if setLoading(false) is needed after navigate, if component doesn't unmount. Usually, it's fine.
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
    if (loading && !error) setLoading(false);
  };

  return (
    <RootStyle>
      <Container maxWidth="sm">
        <FormContainer elevation={3}>
          <Logo src="/images/logo.png" alt="Mole Database Manager" />
          <Typography variant="h4" gutterBottom align="center" sx={{ mb: 1 }}>
            Setup
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create your administrator account or log in with the demo account.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>Create Admin Account</Typography>
            <TextField
              fullWidth
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              color="primary"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading && snackbar.message === '' ? <CircularProgress size={24} /> : 'Create Admin Account'}
            </Button>
            <Button
              fullWidth
              size="large"
              variant="outlined"
              onClick={handleDemoLogin}
              sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading && snackbar.message === '' ? <CircularProgress size={24} /> : 'Login with Demo Account'}
            </Button>
          </form>
        </FormContainer>
      </Container>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </RootStyle>
  );
} 