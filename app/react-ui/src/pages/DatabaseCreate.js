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
    host: 'localhost',
    port: '5432',
    username: '',
    password: '',
  });

  const defaultPorts = {
    PostgreSQL: '5432',
    MySQL: '3306',
    InfluxDB: '8086'
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

  const handleCreateDatabase = () => {
    setLoading(true);
    setCreateStatus({ status: '', message: '' });

    // Map our engine names to the db_type expected by the API
    const dbTypeMap = {
      'PostgreSQL': 'postgresql',
      'MySQL': 'mysql',
      'InfluxDB': 'influxdb'
    };

    // Prepare data for the create-database.php endpoint
    const createData = {
      db_type: dbTypeMap[formData.engine],
      db_name: formData.name,
      db_host: formData.host,
      db_port: formData.port,
      db_user: formData.username,
      db_pass: formData.password
    };

    // Dynamically get the API base URL
    const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:5000' 
      : `http://${window.location.hostname}:5000`;

    // Make the API call to create database
    fetch(`${apiBaseUrl}/api/database/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setCreateStatus({
          status: 'success',
          message: data.message || 'Database created successfully!'
        });
        
        // Add the new database to localStorage for persistence
        const storedDatabases = localStorage.getItem('mole_real_databases');
        const realDatabases = storedDatabases ? JSON.parse(storedDatabases) : [];
        
        // Add the new database to the list
        const newDatabase = {
          name: formData.name,
          engine: formData.engine,
          host: formData.host,
          port: formData.port,
          database: formData.name,
          username: formData.username,
          password: formData.password,
          size: '0 MB',  // New database has no size initially
          tables: 0,     // New database has no tables initially
          isSample: false
        };
        
        realDatabases.push(newDatabase);
        localStorage.setItem('mole_real_databases', JSON.stringify(realDatabases));
        
        // After 2 seconds, navigate back to databases list
        setTimeout(() => {
          navigate('/databases');
        }, 2000);
      } else {
        setCreateStatus({
          status: 'error',
          message: data.message || 'Failed to create database. Please check your inputs and try again.'
        });
      }
    })
    .catch(error => {
      console.error('Error creating database:', error);
      setCreateStatus({
        status: 'error',
        message: 'Network error: Failed to connect to the server.'
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
        return formData.name && formData.host && formData.port && 
               formData.username && formData.password;
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
              Select the type of database you want to create
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
                <MenuItem value="InfluxDB">InfluxDB</MenuItem>
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
            <TextField
              fullWidth
              label="Database Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="my_database"
              required
              helperText="Name for your new database (no spaces or special characters)"
            />
            
            <TextField
              fullWidth
              label="Host"
              name="host"
              value={formData.host}
              onChange={handleInputChange}
              placeholder="localhost"
              required
              helperText="Database server hostname or IP address"
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
              helperText="Database server port number"
            />
            
            <TextField
              fullWidth
              label="Admin Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              helperText="Username with database creation privileges"
            />
            
            <TextField
              fullWidth
              label="Admin Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              helperText="Password for the admin user"
            />
          </Stack>
        );
      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="subtitle1" gutterBottom>
              Review your database configuration
            </Typography>
            
            <Alert severity="info">
              You are about to create a new {formData.engine} database named "{formData.name}". 
              This operation requires administrative privileges on the database server.
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.neutral' }}>
              <Typography variant="subtitle1" gutterBottom>
                Database Configuration
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Database Type:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.engine}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Database Name:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Host:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.host}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Port:</Typography>
                  <Typography variant="body2" fontWeight={500}>{formData.port}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Admin Username:</Typography>
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
          Create New Database
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
                onClick={handleCreateDatabase}
                disabled={!isStepValid(activeStep) || loading}
                startIcon={loading ? <CircularProgress size={16} /> : null}
              >
                Create Database
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