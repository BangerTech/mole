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

  // Load database details if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const fetchDatabaseDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch the connection details from the API
          const connectionDetails = await DatabaseService.getConnectionById(id);
          
          if (connectionDetails) {
            // Set form values, ensuring password isn't overwritten if not provided by API
            setFormValues({
              ...connectionDetails,
              password: connectionDetails.password || '' // Use existing or empty string
            }); 
          } else {
            // This case might occur if the ID is invalid or API fails expectedly
            setError(`Database connection with ID ${id} not found.`);
          }
        } catch (err) {
          // Handle API errors (e.g., 404 Not Found, 500 Server Error)
          console.error('Failed to load database details for editing:', err);
          setError(err.response?.data?.message || err.message || 'Failed to load database details. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchDatabaseDetails();
    }
    // No dependency on isEditMode needed if id is the primary trigger
  }, [id]);

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
    setTestResult(null); // Clear previous results
    setError(null); // Clear previous form errors
    
    try {
      // Call the actual service method
      const result = await DatabaseService.testConnection(formValues);
      setTestResult(result); // Store the { success, message } object
      
      // Optionally clear form error if connection is successful
      if (result.success) {
         // Maybe clear specific errors related to connection params if needed
      }

    } catch (err) {
      // Service method should catch axios errors and return a formatted object,
      // but catch any unexpected errors here.
      console.error('Unexpected error during testConnection call:', err);
      setTestResult({ 
        success: false, 
        message: 'An unexpected client-side error occurred while testing the connection.' 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);
    setTestResult(null); // Clear previous test results
    setError(null); // Clear previous errors
    
    try {
      // Use the correct service methods (API only now)
      let savedConnection;
      if (isEditMode) {
        savedConnection = await DatabaseService.updateConnection(id, formValues);
      } else {
        savedConnection = await DatabaseService.saveConnection(formValues);
      }
      
      // Basic check if save/update returned something expected
      if (!savedConnection || !savedConnection.id) {
         throw new Error('Failed to save connection. Backend might be unavailable or did not return expected data.');
      }
      
      // No need for syncStoredDatabases anymore
      
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
      console.error('Error saving database connection:', err);
      // Display specific error from backend if available
      const displayError = err.response?.data?.message || err.message || 'An error occurred while saving the connection.';
      setError(displayError);
      setSnackbar({
        open: true,
        message: displayError,
        severity: 'error',
      });
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