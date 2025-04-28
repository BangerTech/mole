import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
  Skeleton,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Home as HomeIcon,
  Storage as DatabaseIcon,
  Refresh as RefreshIcon,
  PostAdd as PostAddIcon
} from '@mui/icons-material';

// Dummy Daten für Demo-Zwecke
const generateDummyData = () => {
  const databases = [
    { 
      id: 1, 
      name: 'ecommerce', 
      type: 'MySQL', 
      host: 'mysql-server', 
      port: 3306,
      user: 'admin',
      tables: 18,
      size: '54.2 MB',
      lastUpdated: '2023-05-15'
    },
    { 
      id: 2, 
      name: 'analytics', 
      type: 'PostgreSQL', 
      host: 'postgres-server', 
      port: 5432,
      user: 'admin',
      tables: 25,
      size: '128.9 MB',
      lastUpdated: '2023-05-14'
    },
    { 
      id: 3, 
      name: 'user_service', 
      type: 'MySQL', 
      host: 'mysql-server', 
      port: 3306,
      user: 'service_account',
      tables: 7,
      size: '12.8 MB',
      lastUpdated: '2023-05-10'
    },
    { 
      id: 4, 
      name: 'reporting', 
      type: 'PostgreSQL', 
      host: 'postgres-server', 
      port: 5432,
      user: 'reporting_user',
      tables: 32,
      size: '256.5 MB',
      lastUpdated: '2023-05-16'
    },
    { 
      id: 5, 
      name: 'content', 
      type: 'MySQL', 
      host: 'mysql-server', 
      port: 3306,
      user: 'content_manager',
      tables: 14,
      size: '37.1 MB',
      lastUpdated: '2023-05-12'
    },
    { 
      id: 6, 
      name: 'inventory', 
      type: 'PostgreSQL', 
      host: 'postgres-server', 
      port: 5432,
      user: 'inventory_admin',
      tables: 9,
      size: '21.4 MB',
      lastUpdated: '2023-05-11'
    },
    { 
      id: 7, 
      name: 'auth_service', 
      type: 'MySQL', 
      host: 'mysql-server', 
      port: 3306,
      user: 'auth_admin',
      tables: 5,
      size: '8.7 MB',
      lastUpdated: '2023-05-09'
    },
    { 
      id: 8, 
      name: 'logging', 
      type: 'PostgreSQL', 
      host: 'postgres-server', 
      port: 5432,
      user: 'log_user',
      tables: 3,
      size: '412.8 MB',
      lastUpdated: '2023-05-16'
    },
  ];
  
  // Mehr Variation in den Daten erzeugen
  return databases.map(db => {
    // Datum der letzten Aktualisierung zufällig variieren
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    const lastUpdated = date.toISOString().split('T')[0];
    
    return {
      ...db,
      lastUpdated
    };
  });
};

const DatabaseList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [openNewDatabaseDialog, setOpenNewDatabaseDialog] = useState(false);
  const [newDatabaseType, setNewDatabaseType] = useState('MySQL');
  
  // Dummy Daten laden
  useEffect(() => {
    const fetchData = async () => {
      // Simuliere API-Anfrage mit einer kurzen Verzögerung
      await new Promise(resolve => setTimeout(resolve, 800));
      const dummyData = generateDummyData();
      setDatabases(dummyData);
      setLoading(false);
    };
    
    fetchData();
  }, []);
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleMenuOpen = (event, database) => {
    setAnchorEl(event.currentTarget);
    setSelectedDatabase(database);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleNewDatabaseDialogOpen = () => {
    setOpenNewDatabaseDialog(true);
  };
  
  const handleNewDatabaseDialogClose = () => {
    setOpenNewDatabaseDialog(false);
  };
  
  const handleNewDatabaseTypeChange = (event) => {
    setNewDatabaseType(event.target.value);
  };
  
  const handleDatabaseClick = (database) => {
    navigate(`/database/id/${database.id}`);
    
    try {
      const storedDatabases = localStorage.getItem('mole_real_databases');
      let realDatabases = storedDatabases ? JSON.parse(storedDatabases) : [];
      
      const exists = realDatabases.some(db => db.id === database.id);
      
      if (!exists) {
        realDatabases.push(database);
        localStorage.setItem('mole_real_databases', JSON.stringify(realDatabases));
      }
      
      localStorage.setItem('mole_database_connections', JSON.stringify(realDatabases));
    } catch (error) {
      console.error('Error saving database to localStorage:', error);
    }
  };
  
  // Filtern der Datenbanken anhand des Suchbegriffs
  const filteredDatabases = databases.filter(database => 
    database.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    database.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Gruppieren der Datenbanken nach Typ
  const groupedDatabases = filteredDatabases.reduce((acc, database) => {
    if (!acc[database.type]) {
      acc[database.type] = [];
    }
    acc[database.type].push(database);
    return acc;
  }, {});

  return (
    <Box>
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ mb: 3 }}
        separator="›"
      >
        <MuiLink
          component="button"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          onClick={() => navigate('/')}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </MuiLink>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Datenbanken
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Datenbanken
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewDatabaseDialogOpen}
          sx={{ 
            borderRadius: 20,
            py: 1,
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Neue Datenbank
        </Button>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Suchen Sie nach Datenbanken..."
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                }
              }}
            />
          </Grid>
        </Grid>
      </Box>
      
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ ml: 2 }}>
                      <Skeleton variant="text" width={120} />
                      <Skeleton variant="text" width={80} />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="50%" />
                  </Box>
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 2 }} />
                  <Box sx={{ flexGrow: 1 }} />
                  <Skeleton variant="circular" width={36} height={36} />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {Object.entries(groupedDatabases).map(([type, typeItems]) => (
            <Box key={type} sx={{ mb: 4 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                }}
              >
                {type}
              </Typography>
              
              <Grid container spacing={3}>
                {typeItems.map((database) => (
                  <Grid item xs={12} sm={6} md={4} key={database.id}>
                    <Card 
                      sx={{ 
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        }
                      }}
                      onClick={() => handleDatabaseClick(database)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: type === 'MySQL' ? '#4479A1' : '#336791',
                                width: 40, 
                                height: 40,
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }}
                            >
                              {type === 'MySQL' ? 'M' : 'P'}
                            </Avatar>
                            <Box sx={{ ml: 2 }}>
                              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                                {database.name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {database.host}:{database.port}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuOpen(e, database);
                            }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Box>
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <span>Tabellen:</span>
                            <span style={{ fontWeight: 500 }}>{database.tables}</span>
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <span>Größe:</span>
                            <span style={{ fontWeight: 500 }}>{database.size}</span>
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Zuletzt aktualisiert:</span>
                            <span style={{ fontWeight: 500 }}>{database.lastUpdated}</span>
                          </Typography>
                        </Box>
                      </CardContent>
                      
                      <CardActions sx={{ p: 2 }}>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDatabaseClick(database);
                          }}
                          sx={{ 
                            borderRadius: 20,
                            textTransform: 'none',
                            fontWeight: 500
                          }}
                        >
                          Öffnen
                        </Button>
                        
                        <Button 
                          size="small" 
                          color="secondary"
                          variant="outlined"
                          startIcon={<PostAddIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle copy or export action
                          }}
                          sx={{ 
                            ml: 1,
                            borderRadius: 20,
                            textTransform: 'none',
                            fontWeight: 500
                          }}
                        >
                          Export
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
          
          {filteredDatabases.length === 0 && (
            <Box 
              sx={{ 
                p: 4, 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                textAlign: 'center',
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Keine Datenbanken gefunden
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {searchTerm ? 
                  `Es wurden keine Datenbanken gefunden, die "${searchTerm}" enthalten.` : 
                  'Es sind noch keine Datenbanken konfiguriert.'
                }
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewDatabaseDialogOpen}
                  sx={{ 
                    mt: 2,
                    borderRadius: 20,
                    py: 1,
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Erste Datenbank hinzufügen
                </Button>
              )}
            </Box>
          )}
        </>
      )}
      
      {/* Datenbank-Menü */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { 
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">Aktualisieren</Typography>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">Bearbeiten</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleMenuClose} sx={{ color: theme.palette.error.main }}>
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">Löschen</Typography>
        </MenuItem>
      </Menu>
      
      {/* Dialog für neue Datenbank */}
      <Dialog 
        open={openNewDatabaseDialog} 
        onClose={handleNewDatabaseDialogClose}
        PaperProps={{
          sx: { 
            borderRadius: 3,
            maxWidth: 500,
            boxShadow: '0 4px 30px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle>Neue Datenbank hinzufügen</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Fügen Sie eine neue Datenbank hinzu, indem Sie die Verbindungsdetails eingeben.
          </DialogContentText>
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel>Datenbanktyp</InputLabel>
            <Select
              value={newDatabaseType}
              onChange={handleNewDatabaseTypeChange}
              label="Datenbanktyp"
            >
              <MenuItem value="MySQL">MySQL</MenuItem>
              <MenuItem value="PostgreSQL">PostgreSQL</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Datenbankname"
            fullWidth
            variant="outlined"
            sx={{ mb: 3 }}
          />
          
          <TextField
            label="Host"
            fullWidth
            variant="outlined"
            sx={{ mb: 3 }}
          />
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <TextField
                label="Port"
                fullWidth
                variant="outlined"
                type="number"
                defaultValue={newDatabaseType === 'MySQL' ? 3306 : 5432}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Benutzername"
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          
          <TextField
            label="Passwort"
            fullWidth
            variant="outlined"
            type="password"
            sx={{ mb: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleNewDatabaseDialogClose} sx={{ borderRadius: 20, textTransform: 'none' }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleNewDatabaseDialogClose} 
            variant="contained" 
            sx={{ borderRadius: 20, textTransform: 'none' }}
          >
            Verbinden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseList; 