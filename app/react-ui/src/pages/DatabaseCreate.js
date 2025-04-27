import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControlLabel,
  useTheme
} from '@mui/material';
import {
  DatabaseAdd as DatabaseIcon,
  ChevronLeft as BackIcon,
  ChevronRight as NextIcon,
  Check as CheckIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

const DatabaseCreate = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    type: 'mysql',
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    advanced: {
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci'
    }
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const steps = ['Datenbanktyp wählen', 'Verbindungsdaten eingeben', 'Fertigstellen'];

  const handleTypeChange = (event) => {
    const type = event.target.value;
    let port = '';

    switch (type) {
      case 'mysql':
        port = '3306';
        break;
      case 'postgresql':
        port = '5432';
        break;
      case 'influxdb':
        port = '8086';
        break;
      default:
        port = '';
    }

    setFormData({
      ...formData,
      type,
      port,
      advanced: type === 'mysql' 
        ? { charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' }
        : type === 'postgresql'
          ? { template: 'template0', encoding: 'UTF8' }
          : {}
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    
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

  const validateStep = () => {
    const newErrors = {};

    if (activeStep === 0) {
      if (!formData.type) {
        newErrors.type = 'Bitte wähle einen Datenbanktyp';
      }
    } else if (activeStep === 1) {
      if (!formData.name) {
        newErrors.name = 'Bitte gib einen Datenbanknamen ein';
      }
      if (!formData.host) {
        newErrors.host = 'Bitte gib einen Hostnamen ein';
      }
      if (!formData.port) {
        newErrors.port = 'Bitte gib einen Port ein';
      }
      if (!formData.username) {
        newErrors.username = 'Bitte gib einen Benutzernamen ein';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (validateStep()) {
      console.log('Form data submitted:', formData);
      // Hier würde der API-Aufruf kommen, um die Datenbank zu erstellen
      setSuccess(true);
    }
  };

  const getPortPlaceholder = () => {
    switch (formData.type) {
      case 'mysql':
        return '3306';
      case 'postgresql':
        return '5432';
      case 'influxdb':
        return '8086';
      default:
        return '';
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Wähle den Datenbanktyp aus
            </Typography>
            
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                mt: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2
              }}
            >
              <RadioGroup
                aria-label="database-type"
                name="type"
                value={formData.type}
                onChange={handleTypeChange}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        border: `2px solid ${formData.type === 'mysql' ? theme.palette.primary.main : theme.palette.divider}`,
                        bgcolor: formData.type === 'mysql' ? `${theme.palette.primary.main}08` : 'transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      <FormControlLabel 
                        value="mysql" 
                        control={<Radio color="primary" />} 
                        label={
                          <Box>
                            <Typography variant="subtitle1" fontWeight={500}>MySQL</Typography>
                            <Typography variant="body2" color="textSecondary">
                              Relationale Datenbank mit hoher Performance
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        border: `2px solid ${formData.type === 'postgresql' ? theme.palette.primary.main : theme.palette.divider}`,
                        bgcolor: formData.type === 'postgresql' ? `${theme.palette.primary.main}08` : 'transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      <FormControlLabel 
                        value="postgresql" 
                        control={<Radio color="primary" />} 
                        label={
                          <Box>
                            <Typography variant="subtitle1" fontWeight={500}>PostgreSQL</Typography>
                            <Typography variant="body2" color="textSecondary">
                              Erweiterbare, objektrelationale Datenbank
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        border: `2px solid ${formData.type === 'influxdb' ? theme.palette.primary.main : theme.palette.divider}`,
                        bgcolor: formData.type === 'influxdb' ? `${theme.palette.primary.main}08` : 'transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      <FormControlLabel 
                        value="influxdb" 
                        control={<Radio color="primary" />} 
                        label={
                          <Box>
                            <Typography variant="subtitle1" fontWeight={500}>InfluxDB</Typography>
                            <Typography variant="body2" color="textSecondary">
                              Zeitreihen-Datenbank für Metriken
                            </Typography>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </RadioGroup>
              
              {errors.type && (
                <FormHelperText error>{errors.type}</FormHelperText>
              )}
            </Paper>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Verbindungsdaten eingeben
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Bitte gib die Verbindungsdaten für deine {formData.type === 'mysql' ? 'MySQL' : formData.type === 'postgresql' ? 'PostgreSQL' : 'InfluxDB'} Datenbank ein.
            </Typography>
            
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                mt: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2
              }}
            >
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Datenbankname"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    error={!!errors.name}
                    helperText={errors.name}
                    placeholder="z.B. my_database"
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Host"
                    name="host"
                    value={formData.host}
                    onChange={handleInputChange}
                    error={!!errors.host}
                    helperText={errors.host}
                    placeholder="z.B. localhost oder 192.168.1.1"
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Port"
                    name="port"
                    type="number"
                    value={formData.port}
                    onChange={handleInputChange}
                    error={!!errors.port}
                    helperText={errors.port}
                    placeholder={getPortPlaceholder()}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Benutzername"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    error={!!errors.username}
                    helperText={errors.username}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Passwort"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="h6" fontWeight={500} gutterBottom>
              Bestätigung
            </Typography>
            
            {success ? (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 2, 
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                Datenbank wurde erfolgreich erstellt!
              </Alert>
            ) : (
              <>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Überprüfe bitte die eingegebenen Daten und bestätige die Erstellung der Datenbank.
                </Typography>
                
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    mt: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                    Zusammenfassung
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={4} sm={3}>
                      <Typography variant="body2" color="textSecondary">Datenbanktyp:</Typography>
                    </Grid>
                    <Grid item xs={8} sm={9}>
                      <Typography variant="body2" fontWeight={500}>{formData.type === 'mysql' ? 'MySQL' : formData.type === 'postgresql' ? 'PostgreSQL' : 'InfluxDB'}</Typography>
                    </Grid>
                    
                    <Grid item xs={4} sm={3}>
                      <Typography variant="body2" color="textSecondary">Name:</Typography>
                    </Grid>
                    <Grid item xs={8} sm={9}>
                      <Typography variant="body2" fontWeight={500}>{formData.name}</Typography>
                    </Grid>
                    
                    <Grid item xs={4} sm={3}>
                      <Typography variant="body2" color="textSecondary">Host:</Typography>
                    </Grid>
                    <Grid item xs={8} sm={9}>
                      <Typography variant="body2" fontWeight={500}>{formData.host}</Typography>
                    </Grid>
                    
                    <Grid item xs={4} sm={3}>
                      <Typography variant="body2" color="textSecondary">Port:</Typography>
                    </Grid>
                    <Grid item xs={8} sm={9}>
                      <Typography variant="body2" fontWeight={500}>{formData.port}</Typography>
                    </Grid>
                    
                    <Grid item xs={4} sm={3}>
                      <Typography variant="body2" color="textSecondary">Benutzername:</Typography>
                    </Grid>
                    <Grid item xs={8} sm={9}>
                      <Typography variant="body2" fontWeight={500}>{formData.username}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </>
            )}
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box className="page-header">
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Datenbank erstellen
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Erstelle eine neue Datenbank und verbinde dich mit einem Datenbankserver
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <form onSubmit={handleSubmit}>
        {renderStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{ 
              borderRadius: 20,
              pl: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Zurück
          </Button>
          
          <Box>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                type="submit"
                endIcon={<CheckIcon />}
                disabled={success}
                sx={{ 
                  borderRadius: 20,
                  pr: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Datenbank erstellen
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<NextIcon />}
                sx={{ 
                  borderRadius: 20,
                  pr: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Weiter
              </Button>
            )}
          </Box>
        </Box>
      </form>
    </Box>
  );
};

export default DatabaseCreate; 