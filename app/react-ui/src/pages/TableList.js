import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
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
  Divider,
  Tooltip,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Skeleton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  Home as HomeIcon,
  Storage as DatabaseIcon,
  ViewModule as TableIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

// Dummy Daten für Demo-Zwecke
const generateDummyData = () => {
  // Tabellennamen für verschiedene Datenbanken
  const commonTables = [
    { name: 'users', rows: 234, size: '5.2 MB', columns: 12, lastUpdated: '2023-05-15' },
    { name: 'products', rows: 1245, size: '12.6 MB', columns: 18, lastUpdated: '2023-05-12' },
    { name: 'orders', rows: 4892, size: '28.9 MB', columns: 15, lastUpdated: '2023-05-16' },
    { name: 'categories', rows: 28, size: '0.4 MB', columns: 7, lastUpdated: '2023-05-01' },
    { name: 'payments', rows: 3456, size: '15.8 MB', columns: 14, lastUpdated: '2023-05-14' },
    { name: 'customers', rows: 867, size: '7.3 MB', columns: 21, lastUpdated: '2023-05-10' },
    { name: 'suppliers', rows: 143, size: '2.1 MB', columns: 16, lastUpdated: '2023-04-28' },
    { name: 'inventory', rows: 2756, size: '18.4 MB', columns: 11, lastUpdated: '2023-05-15' },
    { name: 'comments', rows: 7865, size: '45.2 MB', columns: 8, lastUpdated: '2023-05-16' },
    { name: 'tags', rows: 154, size: '0.8 MB', columns: 5, lastUpdated: '2023-04-20' },
    { name: 'logs', rows: 25689, size: '87.3 MB', columns: 9, lastUpdated: '2023-05-16' },
  ];
  
  const views = [
    { name: 'active_users', type: 'VIEW', columns: 5, lastUpdated: '2023-05-10' },
    { name: 'order_details', type: 'VIEW', columns: 8, lastUpdated: '2023-05-05' },
    { name: 'product_inventory', type: 'VIEW', columns: 6, lastUpdated: '2023-04-29' },
  ];
  
  // Tabellennamen auswählen
  const tables = [];
  const usedIndexes = new Set();
  const numTables = Math.floor(Math.random() * 6) + 6; // 6-12 Tabellen
  
  for (let i = 0; i < numTables; i++) {
    let index;
    do {
      index = Math.floor(Math.random() * commonTables.length);
    } while (usedIndexes.has(index));
    
    usedIndexes.add(index);
    tables.push({
      ...commonTables[index],
      type: 'TABLE'
    });
  }
  
  // Views hinzufügen
  const numViews = Math.floor(Math.random() * 3); // 0-2 Views
  for (let i = 0; i < numViews; i++) {
    if (i < views.length) {
      tables.push(views[i]);
    }
  }
  
  return tables;
};

const TableList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { dbType, dbName } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [openNewTableDialog, setOpenNewTableDialog] = useState(false);
  const [newTableType, setNewTableType] = useState('TABLE');
  
  // Dummy Daten laden
  useEffect(() => {
    const fetchData = async () => {
      // Simuliere API-Anfrage mit einer kurzen Verzögerung
      await new Promise(resolve => setTimeout(resolve, 800));
      const dummyData = generateDummyData();
      setTables(dummyData);
      setLoading(false);
    };
    
    fetchData();
  }, [dbType, dbName]);
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleMenuOpen = (event, table) => {
    setAnchorEl(event.currentTarget);
    setSelectedTable(table);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleNewTableDialogOpen = () => {
    setOpenNewTableDialog(true);
  };
  
  const handleNewTableDialogClose = () => {
    setOpenNewTableDialog(false);
  };
  
  const handleNewTableTypeChange = (event) => {
    setNewTableType(event.target.value);
  };
  
  const handleTableClick = (table) => {
    navigate(`/database/${dbType}/${dbName}/table/${table.name}`);
  };
  
  // Filtern der Tabellen anhand des Suchbegriffs
  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Gruppieren der Tabellen nach Typ
  const groupedTables = filteredTables.reduce((acc, table) => {
    const type = table.type || 'TABLE';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(table);
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
        <MuiLink
          component="button"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          onClick={() => navigate('/databases')}
        >
          <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Datenbanken
        </MuiLink>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {dbName}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {dbName}
            {dbType && (
              <Chip
                label={dbType.toUpperCase()}
                size="small"
                sx={{ 
                  ml: 2,
                  borderRadius: 1,
                  bgcolor: theme.palette.primary.main + '20',
                  color: theme.palette.primary.main,
                  fontWeight: 'bold'
                }}
              />
            )}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {loading ? 'Lade Tabellen...' : `${tables.length} Tabellen gefunden`}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/databases')}
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Zurück zur Datenbankliste
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleNewTableDialogOpen}
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Neue Tabelle
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Tabellen durchsuchen..."
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
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Skeleton variant="text" width="70%" height={32} />
                  <Box sx={{ mt: 1 }}>
                    <Skeleton variant="text" width="40%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="35%" />
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
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
          {Object.entries(groupedTables).map(([type, typeItems]) => (
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
                {type === 'TABLE' ? 'Tabellen' : 'Views'}
              </Typography>
              
              <Grid container spacing={3}>
                {typeItems.map((table) => (
                  <Grid item xs={12} sm={6} md={4} key={table.name}>
                    <Card 
                      sx={{ 
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        }
                      }}
                      onClick={() => handleTableClick(table)}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography 
                            variant="h6" 
                            component="div" 
                            gutterBottom
                            sx={{ 
                              fontWeight: 600,
                              wordBreak: 'break-word',
                              mr: 2,
                            }}
                          >
                            {table.name}
                          </Typography>
                          
                          <Chip
                            label={table.type || 'TABLE'}
                            size="small"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 24,
                              borderRadius: 1,
                              bgcolor: table.type === 'VIEW' ? 
                                theme.palette.secondary.main + '20' : 
                                theme.palette.primary.main + '20',
                              color: table.type === 'VIEW' ? 
                                theme.palette.secondary.main : 
                                theme.palette.primary.main,
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        
                        <List dense sx={{ pt: 0 }}>
                          {table.type !== 'VIEW' && (
                            <ListItem disablePadding>
                              <ListItemText 
                                primary={`${table.rows.toLocaleString()} Einträge`}
                                primaryTypographyProps={{ 
                                  variant: 'body2',
                                  color: 'textSecondary'
                                }}
                              />
                            </ListItem>
                          )}
                          
                          <ListItem disablePadding>
                            <ListItemText 
                              primary={`${table.columns} Spalten`}
                              primaryTypographyProps={{ 
                                variant: 'body2',
                                color: 'textSecondary'
                              }}
                            />
                          </ListItem>
                          
                          {table.size && (
                            <ListItem disablePadding>
                              <ListItemText 
                                primary={`Größe: ${table.size}`}
                                primaryTypographyProps={{ 
                                  variant: 'body2',
                                  color: 'textSecondary'
                                }}
                              />
                            </ListItem>
                          )}
                          
                          <ListItem disablePadding>
                            <ListItemText 
                              primary={`Zuletzt aktualisiert: ${table.lastUpdated}`}
                              primaryTypographyProps={{ 
                                variant: 'body2',
                                color: 'textSecondary'
                              }}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                      
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTableClick(table);
                          }}
                          sx={{ 
                            borderRadius: 20,
                            textTransform: 'none',
                            fontWeight: 500
                          }}
                        >
                          Öffnen
                        </Button>
                        
                        <Box sx={{ flexGrow: 1 }} />
                        
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, table);
                          }}
                        >
                          <MoreIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
          
          {filteredTables.length === 0 && (
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                textAlign: 'center'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Keine Tabellen gefunden
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchTerm ? 
                  `Es wurden keine Tabellen gefunden, die "${searchTerm}" enthalten.` : 
                  'Diese Datenbank enthält noch keine Tabellen.'
                }
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewTableDialogOpen}
                  sx={{ 
                    mt: 2,
                    borderRadius: 20,
                    py: 1,
                    px: 3,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Erste Tabelle erstellen
                </Button>
              )}
            </Paper>
          )}
        </>
      )}
      
      {/* Tabellen-Menü */}
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
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Kopieren" />
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Aktualisieren" />
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Umbenennen" />
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleMenuClose} sx={{ color: theme.palette.error.main }}>
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Löschen" />
        </MenuItem>
      </Menu>
      
      {/* Dialog für neue Tabelle */}
      <Dialog 
        open={openNewTableDialog} 
        onClose={handleNewTableDialogClose}
        PaperProps={{
          sx: { 
            borderRadius: 3,
            boxShadow: '0 4px 30px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle>Neue Tabelle erstellen</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Erstellen Sie eine neue Tabelle oder View in der Datenbank {dbName}.
          </DialogContentText>
          
          <TextField
            autoFocus
            label="Tabellenname"
            fullWidth
            variant="outlined"
            sx={{ mb: 3 }}
          />
          
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Typ</InputLabel>
            <Select
              value={newTableType}
              onChange={handleNewTableTypeChange}
              label="Typ"
            >
              <MenuItem value="TABLE">Tabelle</MenuItem>
              <MenuItem value="VIEW">View</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleNewTableDialogClose} sx={{ borderRadius: 20, textTransform: 'none' }}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleNewTableDialogClose} 
            variant="contained" 
            sx={{ borderRadius: 20, textTransform: 'none' }}
          >
            Erstellen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableList; 