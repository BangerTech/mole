import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  Divider,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Styled components
const RootStyle = styled('div')({
  height: '100%',
  padding: '24px'
});

const ContentCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  boxShadow: theme.shadows[2],
  borderRadius: theme.shape.borderRadius,
}));

export default function CreateDatabase() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [testConnection, setTestConnection] = useState({ status: '', message: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    engine: 'PostgreSQL',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl: false,
    options: ''
  });

  const defaultPorts = {
    PostgreSQL: '5432',
    MySQL: '3306',
    SQLite: ''
  };

  const handleBack = () => {
    navigate('/databases');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Set default port when engine changes
    if (name === 'engine') {
      setFormData(prev => ({
        ...prev,
        port: defaultPorts[value]
      }));
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack2 = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleTestConnection = () => {
    setLoading(true);
    setTestConnection({ status: '', message: '' });

    // Simulate API call to test connection
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% chance of success for demo
      setTestConnection({
        status: success ? 'success' : 'error',
        message: success 
          ? 'Connection successful!' 
          : 'Failed to connect. Please check your credentials and try again.'
      });
      setLoading(false);
    }, 2000);
  };

  const handleSave = () => {
    setLoading(true);
    
    // Simulate API call to save connection
    setTimeout(() => {
      setLoading(false);
      navigate('/databases');
    }, 1500);
  };

  const steps = ['Connection Details', 'Authentication', 'Test & Save'];

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return formData.name && formData.engine && formData.host && 
               (formData.engine === 'SQLite' || formData.port) &&
               (formData.engine === 'SQLite' || formData.database);
      case 1:
        return formData.username && formData.password;
      case 2:
        return testConnection.status === 'success';
      default:
        return true;
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Connection Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="My Database"
              required
              helperText="A friendly name to identify this connection"
            />
            
            <FormControl fullWidth required>
              <InputLabel>Database Engine</InputLabel>
              <Select
                name="engine"
                value={formData.engine}
                onChange={handleInputChange}
                label="Database Engine"
              >
                <MenuItem value="PostgreSQL">PostgreSQL</MenuItem>
                <MenuItem value="MySQL">MySQL</MenuItem>
                <MenuItem value="SQLite">SQLite</MenuItem>
              </Select>
            </FormControl>
            
            {formData.engine !== 'SQLite' && (
              <>
                <TextField
                  fullWidth
                  label="Host"
                  name="host"
                  value={formData.host}
                  onChange={handleInputChange}
                  placeholder="localhost or 192.168.1.100"
                  required
                />
                
                <TextField
                  fullWidth
                  label="Port"
                  name="port"
                  value={formData.port}
                  onChange={handleInputChange}
                  placeholder={defaultPorts[formData.engine]}
                  required
                  type="number"
                />
                
                <TextField
                  fullWidth
                  label="Database Name"
                  name="database"
                  value={formData.database}
                  onChange={handleInputChange}
                  placeholder="my_database"
                  required
                />
              </>
            )}
            
            {formData.engine === 'SQLite' && (
              <TextField
                fullWidth
                label="File Path"
                name="database"
                value={formData.database}
                onChange={handleInputChange}
                placeholder="/path/to/database.sqlite"
                required
              />
            )}
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
            
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
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
              label="Additional Connection Options"
              name="options"
              value={formData.options}
              onChange={handleInputChange}
              placeholder="sslmode=require"
              multiline
              rows={2}
              helperText="Optional: Enter additional connection parameters"
            />
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.neutral' }}>
              <Typography variant="subtitle1" gutterBottom>
                Connection Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Connection Name:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Engine:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.engine}</Typography>
                </Box>
                {formData.engine !== 'SQLite' && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Host:</Typography>
                      <Typography variant="body2" fontWeight={500}>{formData.host}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Port:</Typography>
                      <Typography variant="body2" fontWeight={500}>{formData.port}</Typography>
                    </Box>
                  </>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {formData.engine === 'SQLite' ? 'File Path:' : 'Database:'}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.database}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Username:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.username}</Typography>
                </Box>
              </Stack>
            </Paper>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : null}
                fullWidth
              >
                Test Connection
              </Button>
            </Box>
            
            {testConnection.status && (
              <Alert 
                severity={testConnection.status}
                icon={testConnection.status === 'success' ? <CheckCircleOutlineIcon /> : undefined}
              >
                {testConnection.message}
              </Alert>
            )}
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <RootStyle>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={handleBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">
          Add Database Connection
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <ContentCard>
        <Box sx={{ p: 1 }}>
          {renderStepContent(activeStep)}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack2}
            variant="outlined"
          >
            Back
          </Button>
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!isStepValid(activeStep) || loading}
                startIcon={loading ? <CircularProgress size={16} /> : null}
              >
                Save Connection
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep)}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </ContentCard>
    </RootStyle>
  );
} 