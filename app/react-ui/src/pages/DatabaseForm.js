import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatabaseService from '../services/DatabaseService';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TestConnectionIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(3)
}));

const FormCard = styled(Card)(({ theme }) => ({
  maxWidth: 800,
  margin: '0 auto',
}));

export default function DatabaseForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const isEditMode = Boolean(id);
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [formValues, setFormValues] = useState({
    name: '',
    engine: '',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    sslEnabled: false,
    notes: '',
  });
  
  // Form validation
  const [formErrors, setFormErrors] = useState({});

  // Load database if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchDatabase = async () => {
        setLoading(true);
        try {
          // Hol die Daten aus dem localStorage
          const storedDatabases = localStorage.getItem('mole_real_databases');
          const databases = storedDatabases ? JSON.parse(storedDatabases) : [];
          
          // Finde die Datenbank mit der passenden ID
          const foundDatabase = databases.find(db => db.id === id);
          
          if (foundDatabase) {
            setFormValues(foundDatabase);
            setError(null);
          } else {
            setError('Database connection not found.');
          }
        } catch (err) {
          setError('Failed to load database details. Please try again.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchDatabase();
    }
  }, [id, isEditMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
    
    // Clear validation error when field is updated
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  const handleToggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const errors = {};
    
    // Required fields
    if (!formValues.name.trim()) errors.name = 'Name is required';
    if (!formValues.engine) errors.engine = 'Database engine is required';
    
    // Validate based on engine
    if (formValues.engine !== 'SQLite') {
      if (!formValues.host.trim()) errors.host = 'Host is required';
      if (!formValues.port) errors.port = 'Port is required';
      else if (isNaN(Number(formValues.port))) errors.port = 'Port must be a number';
    }
    
    if (!formValues.database.trim()) errors.database = 'Database name is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;
    
    setTestingConnection(true);
    setTestResult(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In einer Demo-Umgebung immer eine erfolgreiche Verbindung melden
      setTestResult({ 
        success: true, 
        message: 'Connection successful! Database is accessible.' 
      });
    } catch (err) {
      setTestResult({ 
        success: false, 
        message: 'An error occurred while testing the connection.' 
      });
      console.error(err);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create database object
      const newDatabase = {
        ...formValues,
        id: isEditMode ? id : String(Date.now()),
        lastConnected: new Date().toISOString().split('T')[0]
      };
      
      // Save to localStorage
      const storedDatabases = localStorage.getItem('mole_real_databases');
      const existingDatabases = storedDatabases ? JSON.parse(storedDatabases) : [];
      
      if (isEditMode) {
        // Update existing database
        const updatedDatabases = existingDatabases.map(db => 
          db.id === id ? newDatabase : db
        );
        localStorage.setItem('mole_real_databases', JSON.stringify(updatedDatabases));
      } else {
        // Add new database
        existingDatabases.push(newDatabase);
        localStorage.setItem('mole_real_databases', JSON.stringify(existingDatabases));
      }
      
      // Synchronize both localStorage database stores
      DatabaseService.syncStoredDatabases();
      
      setSnackbar({
        open: true,
        message: isEditMode 
          ? 'Database connection updated successfully!'
          : 'Database connection created successfully!',
        severity: 'success',
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/databases');
      }, 1500);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'An error occurred. Please try again.',
        severity: 'error',
      });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/databases');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <RootStyle>
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress />
        </Box>
      </RootStyle>
    );
  }

  return (
    <RootStyle>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/databases')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          {isEditMode ? 'Edit Database Connection' : 'New Database Connection'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FormCard>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Connection Details
                </Typography>
              </Grid>
              
              {/* Connection Name */}
              <Grid item xs={12}>
                <TextField
                  label="Connection Name"
                  name="name"
                  fullWidth
                  value={formValues.name}
                  onChange={handleInputChange}
                  error={Boolean(formErrors.name)}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
              
              {/* Database Engine */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={Boolean(formErrors.engine)} required>
                  <InputLabel>Database Engine</InputLabel>
                  <Select
                    name="engine"
                    value={formValues.engine}
                    onChange={handleInputChange}
                    label="Database Engine"
                  >
                    <MenuItem value="PostgreSQL">PostgreSQL</MenuItem>
                    <MenuItem value="MySQL">MySQL</MenuItem>
                    <MenuItem value="SQLite">SQLite</MenuItem>
                  </Select>
                  {formErrors.engine && (
                    <FormHelperText>{formErrors.engine}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              {/* Host and Port */}
              {formValues.engine !== 'SQLite' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Host"
                      name="host"
                      fullWidth
                      value={formValues.host}
                      onChange={handleInputChange}
                      error={Boolean(formErrors.host)}
                      helperText={formErrors.host}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Port"
                      name="port"
                      fullWidth
                      type="number"
                      value={formValues.port}
                      onChange={handleInputChange}
                      error={Boolean(formErrors.port)}
                      helperText={formErrors.port}
                      required
                    />
                  </Grid>
                </>
              )}
              
              {/* Database Name */}
              <Grid item xs={12} sm={formValues.engine === 'SQLite' ? 12 : 6}>
                <TextField
                  label={formValues.engine === 'SQLite' ? 'Database File Path' : 'Database Name'}
                  name="database"
                  fullWidth
                  value={formValues.database}
                  onChange={handleInputChange}
                  error={Boolean(formErrors.database)}
                  helperText={formErrors.database}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider />
              </Grid>
              
              {/* Authentication */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Authentication
                </Typography>
              </Grid>
              
              {/* Username */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  name="username"
                  fullWidth
                  value={formValues.username}
                  onChange={handleInputChange}
                />
              </Grid>
              
              {/* Password */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={formValues.password}
                  onChange={handleInputChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleToggleShowPassword} edge="end">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              
              {/* Additional Info */}
              <Grid item xs={12}>
                <Divider />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Additional Information
                </Typography>
              </Grid>
              
              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  name="notes"
                  multiline
                  rows={3}
                  fullWidth
                  value={formValues.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes about this connection..."
                />
              </Grid>
              
              {/* Test Connection Result */}
              {testResult && (
                <Grid item xs={12}>
                  <Alert 
                    severity={testResult.success ? 'success' : 'error'}
                    sx={{ mb: 2 }}
                  >
                    {testResult.message}
                  </Alert>
                </Grid>
              )}
              
              {/* Form Actions */}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    startIcon={testingConnection ? <CircularProgress size={20} /> : <TestConnectionIcon />}
                  >
                    Test Connection
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {isEditMode ? 'Update Connection' : 'Create Connection'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </FormCard>
      
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