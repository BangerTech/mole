import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Divider,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import AuthService from '../services/AuthService';
import { UserContext } from '../components/UserContext';

// Styled components
const RootStyle = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(2),
  background: theme.palette.background.default
}));

const LogoSection = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  marginBottom: theme.spacing(5)
}));

const Logo = styled('img')({
  height: 120,
  marginBottom: 16
});

const FormCard = styled(Card)(({ theme }) => ({
  maxWidth: 480,
  margin: '0 auto',
  boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  borderRadius: 12
}));

export default function Login() {
  const navigate = useNavigate();
  const { login: contextLogin } = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Überprüfen, ob der Benutzer bereits eingeloggt ist
  useEffect(() => {
    if (AuthService.isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!email || !password) {
        throw new Error('Please enter email and password');
      }
      
      const response = await AuthService.login(email, password);
      console.log('[Login.js] AuthService response successful. User data:', response.user);
      console.log('[Login.js] Type of contextLogin:', typeof contextLogin);
      if (response.success && response.user) {
        contextLogin(response.user);
        navigate('/dashboard');
      } else {
        setError(response.message || 'Failed to login. Please check your credentials.');
      }
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  // Login als Admin mit Demo-Daten
  const handleDemoLogin = async () => {
    setEmail('demo@example.com');
    setPassword('demo');
    
    setLoading(true);
    setError('');
    try {
      const response = await AuthService.login('demo@example.com', 'demo');
      console.log('[Login.js] AuthService demo response successful. User data:', response.user);
      console.log('[Login.js] Type of contextLogin (demo):', typeof contextLogin);
      if (response.success && response.user) {
        contextLogin(response.user);
        navigate('/dashboard');
      } else {
        setError(response.message || 'Failed to login with demo account.');
      }
    } catch (err) {
      setError(err.message || 'Failed to login with demo account.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <RootStyle>
      <Container maxWidth="sm">
        <LogoSection>
          <Logo src="/images/logo.png" alt="Mole Database Manager" />
          <Typography variant="body2" color="text.secondary">
            Log in to your account to manage your database connections
          </Typography>
        </LogoSection>
        
        <FormCard>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom align="center">
              Login
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email Address"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                margin="normal"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Login'}
              </Button>
            </form>
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Button
              fullWidth
              size="large"
              variant="outlined"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              Login with Demo Account
            </Button>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <Typography component="span" variant="body2" color="primary">
                    Register
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </FormCard>
        
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          <Typography variant="caption" color="text.secondary">
            © 2025 Mole Database Agent. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </RootStyle>
  );
} 