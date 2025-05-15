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
  Stack,
  Divider,
  Paper
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

export default function DatabaseCreate() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState({ status: '', message: '' });
  
  const [formData, setFormData] = useState({
    name: '',
    engine: 'PostgreSQL',
    username: '',
    password: '',
    notes: ''
  });

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    return `http://${hostname}:3001/api/databases`;
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

    if (name === 'engine') {
      // No need to update port when engine changes anymore
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack2 = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleCreateDatabase = () => {
    setLoading(true);
    setCreateStatus({ status: '', message: '' });

    const createData = {
      engine: formData.engine,
      name: formData.name,
      username: formData.username,
      password: formData.password,
      notes: formData.notes,
    };

    const apiBaseUrl = getApiBaseUrl();
    const createUrl = `${apiBaseUrl}/create-instance`;
    console.log(`[DatabaseCreate] Sending request to ${createUrl}`, createData);

    const token = localStorage.getItem('mole_auth_token');

    fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(createData)
    })
    .then(async response => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      return data;
    })
    .then(data => {
      console.log('[DatabaseCreate] Received response:', data);
      setCreateStatus({
        status: data.warning ? 'warning' : 'success',
        message: data.message || 'Database operation completed.'
      });

      setTimeout(() => {
        navigate('/databases');
      }, 3000);
    })
    .catch(error => {
      console.error('Error creating database via backend:', error);
      setCreateStatus({
        status: 'error',
        message: error.message || 'Operation failed: Could not connect or process the request.'
      });
    })
    .finally(() => {
      setLoading(false);
    });
  };

  const steps = ['Database Type', 'Server Details', 'Database Creation'];

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return formData.engine !== '';
      case 1:
        if (!formData.name || !formData.username) {
          return false;
        }
        return true;
      case 2:
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" gutterBottom>
              Select the type of database instance to create
            </Typography>
            
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
                <MenuItem value="InfluxDB">InfluxDB (Bucket)</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {formData.engine === 'PostgreSQL' && 
                  "PostgreSQL is a powerful, open-source object-relational database system with over 30 years of active development. It's known for reliability, feature robustness, and performance."}
                {formData.engine === 'MySQL' && 
                  "MySQL is a popular open-source relational database management system. It's known for its proven reliability, ease of use, and high performance."}
                {formData.engine === 'InfluxDB' && 
                  "InfluxDB is an open-source time series database optimized for high-write-volume time series data. It's ideal for operations monitoring, application metrics, and IoT sensor data."}
              </Typography>
            </Box>
          </Stack>
        );
      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" gutterBottom>
              Configure Connection Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the name for this connection and the credentials you will use to connect to the newly created database/bucket.
              The Host/Port should point to where Mole can reach the database server (often 'localhost' or the Docker service name like 'mole-postgres').
            </Typography>
            <TextField
              fullWidth
              label="Connection & Database Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="my_new_db"
              required
              helperText="Name for the connection AND the new database/bucket (letters, numbers, underscore)"
            />
            <TextField
              fullWidth
              label="Username (for connecting to new DB)"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              helperText="Username you will use to connect to the new DB."
            />
            <TextField
              fullWidth
              label="Password (for connecting to new DB)"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              helperText="Password you will use to connect to the new DB."
            />

            <TextField
              fullWidth
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              multiline
              rows={2}
            />
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" gutterBottom>
              Confirm Creation
            </Typography>
            <Alert severity="info">
              You are about to create a new {formData.engine} instance named "{formData.name}".
              A connection entry will also be saved using the Host, Port, Username, and Password you provided.
              Ensure the backend has the necessary admin privileges and configuration to perform this action.
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.neutral' }}>
              <Typography variant="subtitle1" gutterBottom>
                Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Engine:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.engine}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">New DB/Bucket Name:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Connection Name:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Connection Username:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.username}</Typography>
                </Box>
              </Stack>
            </Paper>
            
            {createStatus.status && (
              <Alert 
                severity={createStatus.status}
                icon={createStatus.status === 'success' ? <CheckCircleOutlineIcon /> : undefined}
              >
                {createStatus.message}
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
          Create New Database Instance
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
                color="primary"
                onClick={handleCreateDatabase}
                disabled={!isStepValid(activeStep) || loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {loading ? 'Creating...' : 'Create Database Instance'}
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