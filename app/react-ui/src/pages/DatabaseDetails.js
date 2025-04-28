import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Storage as DatabaseIcon,
  Home as HomeIcon,
  ViewModule as TableIcon,
  TableChart as StructureIcon,
  Code as QueryIcon,
  PlayArrow as RunIcon
} from '@mui/icons-material';
import DatabaseService from '../services/DatabaseService';

// Styled components
const RootStyle = (theme) => ({
  padding: theme.spacing(3)
});

const ContentCard = (theme) => ({
  borderRadius: 3,
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  overflow: 'hidden',
  height: '100%'
});

// Mock database details for demonstration
const generateMockDatabaseDetails = (dbType, dbName) => {
  const typeDetails = {
    mysql: {
      engine: 'MySQL',
      version: '8.0.23',
      connectionLimit: 10,
      host: 'mysql-server',
      port: 3306,
      user: 'admin',
      size: '54.2 MB',
      tables: 18,
      views: 3,
      created: '2023-01-15',
      lastBackup: '2023-05-10'
    },
    postgresql: {
      engine: 'PostgreSQL',
      version: '13.4',
      connectionLimit: 20,
      host: 'postgres-server',
      port: 5432,
      user: 'admin',
      size: '128.9 MB',
      tables: 25,
      views: 5,
      created: '2023-02-22',
      lastBackup: '2023-05-12'
    }
  };

  return typeDetails[dbType] || typeDetails.mysql;
};

// Mock database tables for demonstration
const generateMockTables = () => [
  { name: 'users', type: 'TABLE', rows: 234, size: '5.2 MB', columns: 12, lastUpdated: '2023-05-15' },
  { name: 'products', type: 'TABLE', rows: 1245, size: '12.6 MB', columns: 18, lastUpdated: '2023-05-12' },
  { name: 'orders', type: 'TABLE', rows: 4892, size: '28.9 MB', columns: 15, lastUpdated: '2023-05-16' },
  { name: 'categories', type: 'TABLE', rows: 28, size: '0.4 MB', columns: 7, lastUpdated: '2023-05-01' },
  { name: 'order_details', type: 'VIEW', columns: 8, lastUpdated: '2023-05-05' },
  { name: 'active_users', type: 'VIEW', columns: 5, lastUpdated: '2023-05-10' }
];

// Database structure for demonstration
const generateMockStructure = () => [
  { name: 'id', type: 'INT', nullable: false, default: 'AUTO_INCREMENT', key: 'PRI', extra: 'auto_increment' },
  { name: 'name', type: 'VARCHAR(255)', nullable: false, default: null, key: '', extra: '' },
  { name: 'email', type: 'VARCHAR(255)', nullable: true, default: null, key: 'UNI', extra: '' },
  { name: 'created_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP', key: '', extra: '' },
  { name: 'updated_at', type: 'TIMESTAMP', nullable: false, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', key: '', extra: '' },
  { name: 'status', type: 'TINYINT(1)', nullable: false, default: '1', key: '', extra: '' }
];

const DatabaseDetails = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { dbType, dbName } = useParams();
  
  console.log('DatabaseDetails params:', { dbType, dbName });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [database, setDatabase] = useState(null);
  const [tables, setTables] = useState([]);
  const [structure, setStructure] = useState([]);
  const [tableColumns, setTableColumns] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Fetch database details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Loading database details with params:', { dbType, dbName });
        
        let databaseInfo = null;
        
        // First, try to synchronize database connections from both storages
        // This ensures we have the latest data
        DatabaseService.syncStoredDatabases();
        
        // Check if we have database info in localStorage
        // Try both storage locations
        const storedDatabases = localStorage.getItem('mole_real_databases');
        const storedConnections = localStorage.getItem('mole_database_connections');
        
        const realDatabases = storedDatabases ? JSON.parse(storedDatabases) : [];
        const connections = storedConnections ? JSON.parse(storedConnections) : [];
        
        // Combine both sources to ensure we find the database
        const allDatabases = [...realDatabases];
        
        // Add any missing connections that might exist only in mole_database_connections
        connections.forEach(conn => {
          if (!allDatabases.some(db => db.id.toString() === conn.id.toString())) {
            allDatabases.push(conn);
          }
        });
        
        // We're using the /database/id/:id route format, so dbName actually contains the ID
        if (dbName) {
          // First try to find by exact ID match
          databaseInfo = allDatabases.find(db => db.id.toString() === dbName.toString());
          
          console.log('Database lookup by ID:', { 
            lookingFor: dbName, 
            found: !!databaseInfo,
            availableDatabases: allDatabases
          });
          
          // If it's the sample database with ID 1 and no real database was found
          if ((dbName === '1' || !databaseInfo) && allDatabases.length === 0) {
            console.log('Loading sample database');
            databaseInfo = {
              id: '1',
              name: 'Sample Database',
              engine: 'PostgreSQL',
              host: 'localhost',
              port: 5432,
              database: 'sample_db',
              version: '13.4',
              connectionLimit: 20,
              user: 'admin',
              size: '128.9 MB',
              tables: 25,
              views: 5,
              created: '2023-02-22',
              lastBackup: '2023-05-12',
              lastConnected: '2023-05-20',
              isSample: true
            };
          }
        }
        
        // If still no database found and using the old /database/:type/:id format
        if (!databaseInfo && dbType) {
          // Try to find by type and name
          databaseInfo = allDatabases.find(db => 
            db.type?.toLowerCase() === dbType.toLowerCase() || 
            db.engine?.toLowerCase() === dbType.toLowerCase()
          );
        }
        
        if (!databaseInfo) {
          console.log('No database found by ID, using mock data');
          // Fallback to mock data for demonstration
          const typeKey = dbType ? dbType.toLowerCase() : 'postgresql';
          databaseInfo = generateMockDatabaseDetails(typeKey, dbName);
        }
        
        // Use the actual database connection information
        setDatabase(databaseInfo);
        console.log('Database details loaded:', databaseInfo);
        
        // For real (non-sample) databases, try to fetch actual schema information
        if (databaseInfo && !databaseInfo.isSample) {
          try {
            console.log('Fetching real database schema for:', databaseInfo.name);
            const schemaInfo = await DatabaseService.getDatabaseSchema(databaseInfo.id);
            
            if (schemaInfo.success) {
              console.log('Real database schema loaded:', schemaInfo);
              // Use real tables data
              setTables(schemaInfo.tables);
              
              // Extract structure for the first table (if available) to show in the Structure tab
              const firstTableName = schemaInfo.tables[0]?.name;
              if (firstTableName && schemaInfo.tableColumns[firstTableName]) {
                setStructure(schemaInfo.tableColumns[firstTableName]);
                setTableColumns(schemaInfo.tableColumns);
                setSelectedTable(firstTableName);
              } else {
                // Fallback to mock structure data if no tables or columns available
                setStructure(generateMockStructure());
              }
            } else {
              console.warn('Failed to load real schema, using mock data:', schemaInfo.message);
              // Fallback to mock data if schema fetch fails
              setTables(generateMockTables());
              setStructure(generateMockStructure());
            }
          } catch (err) {
            console.error('Error fetching schema:', err);
            // Fallback to mock data
            setTables(generateMockTables());
            setStructure(generateMockStructure());
          }
        } else {
          // For sample database just use mock data
          console.log('Using mock data for sample database');
          const tablesList = generateMockTables();
          const structureData = generateMockStructure();
          
          setTables(tablesList);
          setStructure(structureData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching database details:', err);
        setError('Failed to load database details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dbType, dbName]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // If switching to SQL Query tab and we have a selected table, suggest a query
    if (newValue === 2 && selectedTable) {
      setSqlQuery(`SELECT * FROM ${selectedTable} LIMIT 10;`);
    }
  };

  const handleSqlQueryChange = (event) => {
    setSqlQuery(event.target.value);
  };

  const handleRunQuery = async () => {
    try {
      setQueryLoading(true);
      setQueryError(null);
      
      // Check if we have a real (non-sample) database
      if (database && !database.isSample) {
        // Execute query against real database
        const result = await DatabaseService.executeQuery(database.id, sqlQuery);
        
        if (result.success) {
          // Format the result for display
          setQueryResult({
            columns: result.columns,
            rows: result.rows
          });
        } else {
          // Show error
          setQueryError(result.message || 'Failed to execute query');
        }
      } else {
        // For sample database, use mock data
        // In a real app, this would be an API call to execute the SQL query
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock query result
        const mockResult = {
          columns: ['id', 'name', 'email', 'created_at', 'status'],
          rows: [
            { id: 1, name: 'Max Mustermann', email: 'max@example.com', created_at: '2023-04-12 10:30:45', status: 1 },
            { id: 2, name: 'Lisa Schmidt', email: 'lisa@example.com', created_at: '2023-04-15 14:22:31', status: 1 },
            { id: 3, name: 'Tom Müller', email: 'tom@example.com', created_at: '2023-04-18 09:15:22', status: 0 }
          ]
        };
        
        setQueryResult(mockResult);
      }
    } catch (err) {
      setQueryError('Failed to execute query. Please check your syntax and try again.');
      console.error('Error executing query:', err);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleDeleteDatabase = async () => {
    // Close dialog first
    setOpenDeleteDialog(false);
    
    try {
      // Use the service to delete the connection
      await DatabaseService.deleteConnection(dbName);
      
      // Show confirmation message
      setError({
        type: 'success',
        message: 'Database connection deleted successfully.'
      });
      
      // Navigate after a delay
      setTimeout(() => {
        navigate('/databases');
      }, 1500);
    } catch (err) {
      console.error('Error deleting database:', err);
      setError({
        type: 'error',
        message: 'Failed to delete database connection. Please try again.'
      });
    }
  };

  const handleTableClick = (table) => {
    // Set the selected table for the structure view
    setSelectedTable(table.name);
    
    // Update structure if we have columns for this table
    if (tableColumns && tableColumns[table.name]) {
      setStructure(tableColumns[table.name]);
    }
    
    // Switch to structure tab
    setActiveTab(1);
    
    // Alternatively, navigate to table view
    // navigate(`/database/${dbType}/${dbName}/table/${table.name}`);
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity={error.type || "error"}>
          {typeof error === 'string' ? error : error.message}
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/databases')}
          sx={{ mt: 2 }}
        >
          Back to Database List
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={RootStyle}>
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
          Databases
        </MuiLink>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {database && database.name ? database.name : dbName}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {database && database.name ? database.name : dbName}
            <Chip
              label={database && database.engine ? database.engine : "Unknown"}
              size="small"
              sx={{ 
                ml: 2, 
                borderRadius: 1,
                bgcolor: theme.palette.primary.main + '20',
                color: theme.palette.primary.main,
                fontWeight: 'bold'
              }}
            />
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {database && database.host ? `${database.host}:${database.port || 'N/A'}` : 'N/A'} • 
            {database && database.size ? ` ${database.size}` : ' Unknown size'} • 
            {tables ? ` ${tables.length} objects` : ' 0 objects'}
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
            Back to Database List
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDeleteDialog}
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Delete Connection
          </Button>
        </Box>
      </Box>

      <Paper sx={ContentCard}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<TableIcon />} label="Tables" />
          <Tab icon={<StructureIcon />} label="Structure" />
          <Tab icon={<QueryIcon />} label="SQL Query" />
        </Tabs>
        
        {/* Tables Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {tables.map((table) => (
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
                          label={table.type}
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
                      
                      <Box sx={{ mt: 2 }}>
                        {table.type !== 'VIEW' && (
                          <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <span>Rows:</span>
                            <span style={{ fontWeight: 500 }}>{table.rows}</span>
                          </Typography>
                        )}
                        
                        <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <span>Columns:</span>
                          <span style={{ fontWeight: 500 }}>{table.columns}</span>
                        </Typography>
                        
                        {table.size && (
                          <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <span>Size:</span>
                            <span style={{ fontWeight: 500 }}>{table.size}</span>
                          </Typography>
                        )}
                        
                        <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Last Updated:</span>
                          <span style={{ fontWeight: 500 }}>{table.lastUpdated}</span>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
        
        {/* Structure Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Database Information</Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Engine</Typography>
                  <Typography variant="body1">{database.engine} {database.version}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Host</Typography>
                  <Typography variant="body1">{database.host}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Port</Typography>
                  <Typography variant="body1">{database.port}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">User</Typography>
                  <Typography variant="body1">{database.username || database.user}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Database</Typography>
                  <Typography variant="body1">{database.database}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Size</Typography>
                  <Typography variant="body1">{database.size}</Typography>
                </Box>
              </Grid>
            </Grid>
            
            {/* Table Selection for Structure View */}
            {tables.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Table Structure</Typography>
                
                <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                  <InputLabel>Select Table</InputLabel>
                  <Select
                    value={selectedTable || ''}
                    onChange={(e) => {
                      const tableName = e.target.value;
                      setSelectedTable(tableName);
                      
                      // Find the columns for this table if available
                      if (tableColumns && tableColumns[tableName]) {
                        setStructure(tableColumns[tableName]);
                      } else {
                        // Fallback to default structure
                        setStructure(generateMockStructure());
                      }
                    }}
                    label="Select Table"
                  >
                    {tables.map((table) => (
                      <MenuItem key={table.name} value={table.name}>
                        {table.name} ({table.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Nullable</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Default</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Key</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Extra</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {structure.map((column, index) => (
                    <TableRow key={index}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.type}</TableCell>
                      <TableCell>{column.nullable ? 'YES' : 'NO'}</TableCell>
                      <TableCell>{column.default || 'NULL'}</TableCell>
                      <TableCell>
                        {column.key && (
                          <Chip
                            label={column.key}
                            size="small"
                            sx={{ 
                              height: 20,
                              fontSize: '0.7rem',
                              borderRadius: 1,
                              bgcolor: column.key === 'PRI' ? 
                                theme.palette.primary.main + '20' : 
                                theme.palette.secondary.main + '20',
                              color: column.key === 'PRI' ? 
                                theme.palette.primary.main : 
                                theme.palette.secondary.main,
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{column.extra}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        
        {/* SQL Query Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Execute SQL Query</Typography>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={sqlQuery}
              onChange={handleSqlQueryChange}
              placeholder="Enter your SQL query here"
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RunIcon />}
                onClick={handleRunQuery}
                disabled={queryLoading}
                sx={{ 
                  borderRadius: 20,
                  py: 1,
                  px: 3,
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                {queryLoading ? 'Executing...' : 'Run Query'}
              </Button>
            </Box>
            
            {queryLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}
            
            {queryError && (
              <Alert severity="error" sx={{ mb: 3 }}>{queryError}</Alert>
            )}
            
            {queryResult && !queryLoading && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Query Result: {queryResult.rows.length} rows returned
                </Typography>
                
                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        {queryResult.columns.map((column, index) => (
                          <TableCell key={index} sx={{ fontWeight: 600 }}>
                            {column}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queryResult.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {queryResult.columns.map((column, colIndex) => (
                            <TableCell key={colIndex}>
                              {row[column]}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Paper>
      
      {/* Delete Database Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          sx: { 
            borderRadius: 3,
            boxShadow: '0 4px 30px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle>Delete Database Connection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the connection to "{dbName}"? This action will only remove the connection from your list, it will not delete the actual database.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            sx={{ 
              borderRadius: 20,
              textTransform: 'none' 
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteDatabase} 
            variant="contained" 
            color="error" 
            sx={{ 
              borderRadius: 20,
              textTransform: 'none' 
            }}
          >
            Delete Connection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseDetails; 