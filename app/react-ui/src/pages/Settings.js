import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Stack,
  Alert,
  IconButton
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled Components
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  marginRight: theme.spacing(1),
}));

const SettingCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
}));

// Custom TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('de');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(24);
  const [notifications, setNotifications] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSave = () => {
    setSuccessMessage('Einstellungen wurden erfolgreich gespeichert');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Einstellungen
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Konfigurieren Sie Ihre Anwendungseinstellungen und Präferenzen
      </Typography>

      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <StyledTab icon={<PaletteIcon sx={{ mr: 1 }} />} iconPosition="start" label="Erscheinungsbild" />
          <StyledTab icon={<NotificationsIcon sx={{ mr: 1 }} />} iconPosition="start" label="Benachrichtigungen" />
          <StyledTab icon={<StorageIcon sx={{ mr: 1 }} />} iconPosition="start" label="Datenbanken" />
          <StyledTab icon={<SyncIcon sx={{ mr: 1 }} />} iconPosition="start" label="Synchronisierung" />
          <StyledTab icon={<SecurityIcon sx={{ mr: 1 }} />} iconPosition="start" label="Sicherheit" />
          <StyledTab icon={<InfoIcon sx={{ mr: 1 }} />} iconPosition="start" label="Über" />
        </Tabs>
      </Box>

      {/* Erscheinungsbild Tab */}
      <TabPanel value={activeTab} index={0}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Thema und Darstellung
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={darkMode} 
                      onChange={() => setDarkMode(!darkMode)}
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Aktivieren Sie den dunklen Modus für eine augenfreundlichere Darstellung bei schlechten Lichtverhältnissen.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Sprache</InputLabel>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    label="Sprache"
                  >
                    <MenuItem value="de">Deutsch</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Schriftgröße
                </Typography>
                <Slider
                  defaultValue={14}
                  step={1}
                  min={12}
                  max={20}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 12, label: 'Klein' },
                    { value: 14, label: 'Standard' },
                    { value: 16, label: 'Mittel' },
                    { value: 20, label: 'Groß' },
                  ]}
                />
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Benachrichtigungen Tab */}
      <TabPanel value={activeTab} index={1}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Benachrichtigungseinstellungen
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={notifications} 
                      onChange={() => setNotifications(!notifications)}
                      color="primary"
                    />
                  }
                  label="Benachrichtigungen aktivieren"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                  Aktivieren Sie Benachrichtigungen, um über wichtige Ereignisse und Aktualisierungen informiert zu werden.
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Benachrichtigungen für
                </Typography>
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Datenbankverbindungsprobleme"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Abgeschlossene Synchronisierungen"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Neue Datenbankverbindungen"
                  sx={{ display: 'block', mb: 1 }}
                />
                
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="System-Updates"
                  sx={{ display: 'block', mb: 1 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Datenbanken Tab */}
      <TabPanel value={activeTab} index={2}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Datenbankeinstellungen
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Standard-Datenbanktyp</InputLabel>
                  <Select
                    defaultValue="mysql"
                    label="Standard-Datenbanktyp"
                  >
                    <MenuItem value="mysql">MySQL</MenuItem>
                    <MenuItem value="postgresql">PostgreSQL</MenuItem>
                    <MenuItem value="sqlite">SQLite</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Zeichensatz</InputLabel>
                  <Select
                    defaultValue="utf8mb4"
                    label="Zeichensatz"
                  >
                    <MenuItem value="utf8mb4">UTF-8 Unicode (utf8mb4)</MenuItem>
                    <MenuItem value="utf8">UTF-8 Unicode (utf8)</MenuItem>
                    <MenuItem value="latin1">Latin1</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Automatisch neue Tabellen indexieren"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Erstellt automatisch Indizes für neue Tabellen, um die Leistung zu verbessern.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="SSL-Verbindungen erzwingen (wenn verfügbar)"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Erhöht die Sicherheit, indem SSL für Datenbankverbindungen verwendet wird.
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>

        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Datensicherung
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Automatische Backups"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Erstellt regelmäßig Sicherungen Ihrer Datenbanken.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Backup-Intervall</InputLabel>
                  <Select
                    defaultValue="weekly"
                    label="Backup-Intervall"
                  >
                    <MenuItem value="daily">Täglich</MenuItem>
                    <MenuItem value="weekly">Wöchentlich</MenuItem>
                    <MenuItem value="monthly">Monatlich</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Backup-Speicherort"
                  variant="outlined"
                  defaultValue="/backups"
                />
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Synchronisierung Tab */}
      <TabPanel value={activeTab} index={3}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Synchronisierungseinstellungen
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={autoSync} 
                      onChange={() => setAutoSync(!autoSync)}
                      color="primary"
                    />
                  }
                  label="Automatische Synchronisierung"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Synchronisiert Ihre Datenbanken automatisch in regelmäßigen Abständen.
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Synchronisierungsintervall (Stunden)
                </Typography>
                <Slider
                  value={syncInterval}
                  onChange={(e, newValue) => setSyncInterval(newValue)}
                  step={1}
                  min={1}
                  max={48}
                  valueLabelDisplay="auto"
                  marks={[
                    { value: 1, label: '1h' },
                    { value: 12, label: '12h' },
                    { value: 24, label: '24h' },
                    { value: 48, label: '48h' },
                  ]}
                  disabled={!autoSync}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Konfliktlösung
                </Typography>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Strategie bei Konflikten</InputLabel>
                  <Select
                    defaultValue="ask"
                    label="Strategie bei Konflikten"
                  >
                    <MenuItem value="ask">Nachfragen</MenuItem>
                    <MenuItem value="source">Quelle bevorzugen</MenuItem>
                    <MenuItem value="target">Ziel bevorzugen</MenuItem>
                    <MenuItem value="newer">Neuere bevorzugen</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Sicherheit Tab */}
      <TabPanel value={activeTab} index={4}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sicherheitseinstellungen
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Passwort ändern
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  label="Aktuelles Passwort"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Neues Passwort"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Neues Passwort bestätigen"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="primary">
                  Passwort aktualisieren
                </Button>
              </Grid>
              <Grid item xs={12} sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Sitzungsverwaltung
                </Typography>
                <FormControlLabel
                  control={<Switch defaultChecked color="primary" />}
                  label="Auto-Logout bei Inaktivität"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Automatische Abmeldung nach einer bestimmten Inaktivitätszeit.
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
                  <InputLabel>Inaktivitätszeit</InputLabel>
                  <Select
                    defaultValue={30}
                    label="Inaktivitätszeit"
                  >
                    <MenuItem value={15}>15 Minuten</MenuItem>
                    <MenuItem value={30}>30 Minuten</MenuItem>
                    <MenuItem value={60}>1 Stunde</MenuItem>
                    <MenuItem value={120}>2 Stunden</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </SettingCard>
      </TabPanel>

      {/* Über Tab */}
      <TabPanel value={activeTab} index={5}>
        <SettingCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Über Mole Database Manager
            </Typography>
            <Typography variant="body1" paragraph>
              Version: 1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Mole Database Manager ist ein modernes Tool zur Verwaltung und Synchronisierung von Datenbankverbindungen. Mit einer benutzerfreundlichen Oberfläche können Sie mühelos verschiedene Datenbanktypen verwalten und mit ihnen interagieren.
            </Typography>
            
            <Box sx={{ my: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Umgebungsinformationen
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Betriebssystem:</strong> Linux
                </Typography>
                <Typography variant="body2">
                  <strong>Browser:</strong> Chrome 96.0.4664.110
                </Typography>
                <Typography variant="body2">
                  <strong>Node.js:</strong> 18.15.0
                </Typography>
                <Typography variant="body2">
                  <strong>React:</strong> 18.2.0
                </Typography>
              </Stack>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" startIcon={<InfoIcon />}>
                Release Notes
              </Button>
              <Button variant="outlined" sx={{ ml: 2 }} startIcon={<InfoIcon />}>
                Lizenz
              </Button>
            </Box>
          </CardContent>
        </SettingCard>
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="outlined" sx={{ mr: 2 }}>
          Zurücksetzen
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Einstellungen speichern
        </Button>
      </Box>
    </Box>
  );
} 