import React, { useState, useEffect } from 'react';
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
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import AuthService from '../services/AuthService';

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
  height: 60,
  marginBottom: 16
});

const FormCard = styled(Card)(({ theme }) => ({
  maxWidth: 480,
  margin: '0 auto',
  boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  borderRadius: 12
}));

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Überprüfen, ob der Benutzer bereits eingeloggt ist
  useEffect(() => {
    if (AuthService.isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validierung
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      await AuthService.register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <RootStyle>
      <Container maxWidth="sm">
        <LogoSection>
          <Logo src="/images/logo.png" alt="Mole Database Manager" />
          <Typography variant="h4" gutterBottom>
            Mole Database Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new account to start managing your database connections
          </Typography>
        </LogoSection>
        
        <FormCard>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom align="center">
              Register
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Full Name"
                margin="normal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Email Address"
                margin="normal"
                type="email"
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
              
              <TextField
                fullWidth
                label="Confirm Password"
                margin="normal"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
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
                {loading ? <CircularProgress size={24} /> : 'Register'}
              </Button>
            </form>
            
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Typography component="span" variant="body2" color="primary">
                    Login
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </FormCard>
        
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          <Typography variant="caption" color="text.secondary">
            © 2023 Mole Database Manager. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </RootStyle>
  );
} 