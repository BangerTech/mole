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
  PlayArrow as RunIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import DatabaseService from '../services/DatabaseService';
import { generateMockTables, generateMockStructure } from '../utils/mockData'; // Import mock data functions
import DatabaseSyncTab from '../components/DatabaseSyncTab'; 

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

const DatabaseDetails = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  // Extract the 'id' parameter directly from the route /database/id/:id
  const { id: databaseId } = useParams(); 
  
  console.log('DatabaseDetails ID from params:', databaseId);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [database, setDatabase] = useState(null); // Stores connection details
  const [tables, setTables] = useState([]);
  const [structure, setStructure] = useState([]);
  const [tableColumns, setTableColumns] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Fetch database details and schema
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
      setError(null);
      setDatabase(null);
      setTables([]);
      setStructure([]);
      setTableColumns({});
        
        let databaseInfo = null;
      const isSampleId = databaseId === '1'; // Assuming '1' is the designated sample ID

      try {
        console.log(`Fetching details for database ID: ${databaseId}`);
        
        // Attempt to fetch connection details from API
        databaseInfo = await DatabaseService.getConnectionById(databaseId);
        console.log('Fetched database details from API:', databaseInfo);

      } catch (fetchError) {
        console.warn(`API fetch error for ID ${databaseId}:`, fetchError);
        // If the ID was the sample ID and API fetch failed (e.g., 404), load sample data
        if (isSampleId) {
          console.log('ID is for sample database and API fetch failed. Loading sample data.');
            databaseInfo = {
              id: '1',
              name: 'Sample Database',
              engine: 'PostgreSQL',
              host: 'localhost',
              port: 5432,
              database: 'sample_db',
            version: '13.4', // Example field
            size: '128.9 MB', // Example field
            tables: 25, // Example field
            views: 5, // Example field
            created: '2023-02-22', // Example field
            lastBackup: '2023-05-12', // Example field
              lastConnected: '2023-05-20',
              isSample: true
            };
        } else {
          // If it wasn't the sample ID and API fetch failed, set an error
          setError(`Failed to load database connection: ${fetchError.response?.data?.message || fetchError.message}`);
          setLoading(false);
          return; // Stop further execution
        }
      }

      // If we have databaseInfo (either from API or sample fallback)
      if (databaseInfo) {
        setDatabase(databaseInfo);
        console.log('Using database details:', databaseInfo);
        
        // For real (non-sample) databases, fetch actual schema information
        if (!databaseInfo.isSample) {
          try {
            console.log('Fetching real database schema for:', databaseInfo.name);
            const schemaInfo = await DatabaseService.getDatabaseSchema(databaseInfo.id);
            
            if (schemaInfo.success) {
              console.log('Real database schema loaded:', schemaInfo);
              setTables(schemaInfo.tables || []);
              setTableColumns(schemaInfo.tableColumns || {});
              
              // Update the database state with the fetched size
              if (schemaInfo.totalSize) {
                  setDatabase(prevDb => ({ ...prevDb, size: schemaInfo.totalSize }));
              }

              // Select first table's structure if available
              const firstTableName = schemaInfo.tables?.[0]?.name;
              if (firstTableName && schemaInfo.tableColumns?.[firstTableName]) {
                setStructure(schemaInfo.tableColumns[firstTableName]);
                setSelectedTable(firstTableName);
              } else {
                setStructure([]); // No structure to show
                setSelectedTable(null);
              }
            } else {
              console.warn('Failed to load real schema, using empty data:', schemaInfo.message);
              setError(`Failed to load schema: ${schemaInfo.message}`); // Show schema error
              setTables([]);
              setStructure([]);
              setTableColumns({});
            }
          } catch (schemaError) {
            console.error('Error fetching schema:', schemaError);
            setError(`Error fetching schema: ${schemaError.message}`);
            setTables([]);
            setStructure([]);
            setTableColumns({});
            return; // Stop execution in this path if schema fetch fails
          }
        } else {
          // For sample database, use mock data for tables/structure
          console.log('Using mock data for sample database schema');
          const mockTables = generateMockTables(); // Assuming these helpers exist
          const mockStructure = generateMockStructure(); // Assuming these helpers exist
          setTables(mockTables);
          setStructure(mockStructure);
          setSelectedTable(mockTables[0]?.name || null);
          // For mock data, generate simple tableColumns map
          const mockTableColumns = {};
          if (mockTables.length > 0 && mockStructure.length > 0) {
            mockTableColumns[mockTables[0].name] = mockStructure;
          }
          setTableColumns(mockTableColumns); 
        }
      } else if (!error) { 
        // Should not happen if error handling above is correct, but as a fallback
        setError('Could not load database information.');
      }

        setLoading(false);
    };
    
    if (databaseId) { // Only fetch if an ID is present in the URL
    fetchData();
    } else {
      setError('No database ID provided in URL.');
      setLoading(false);
    }

    // Cleanup function (optional)
    return () => {
      // Cancel any pending requests if needed
    };
  }, [databaseId]); // Re-run effect if the database ID changes

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
    // Check if database object exists and has an ID, and is not sample
    if (!database || !database.id || database.isSample) {
      console.error('Cannot delete: No valid database selected or it is a sample.');
      setError('Cannot delete this connection.'); // Provide feedback
    setOpenDeleteDialog(false);
      return;
    }
    
    const idToDelete = database.id;
    setOpenDeleteDialog(false); // Close dialog
    setLoading(true); // Show loading indicator
    
    try {
      await DatabaseService.deleteConnection(idToDelete);
      
      setError({
        type: 'success',
        message: 'Database connection deleted successfully.'
      });
      
      // Navigate back to the list after deletion
      setTimeout(() => {
        navigate('/databases');
      }, 1500);
    } catch (err) {
      console.error('Error deleting database:', err);
      const deleteError = err.response?.data?.message || err.message || 'Failed to delete database connection.';
      setError({
        type: 'error',
        message: deleteError
      });
      setLoading(false); // Turn off loading on error
    }
    // No finally setLoading(false) here, as successful navigation leaves the page
  };

  const handleTableClick = (table) => {
    if (!database || !database.id) {
      console.error('Cannot navigate to table view: database ID is missing.');
      return;
    }
    console.log(`Navigating to table view for: ${table.name}`);
    // Navigate to the dedicated TableView component
    navigate(`/databases/${database.id}/tables/${encodeURIComponent(table.name)}`);
    
    // We no longer set structure or change tabs here
    // setSelectedTable(table.name);
    // if (tableColumns && tableColumns[table.name]) {
    //   setStructure(tableColumns[table.name]);
    // }
    // setActiveTab(1);
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
          {database && database.name ? database.name : databaseId}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {database && database.name ? database.name : databaseId}
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
          <Tab icon={<SyncIcon />} label="Sync" />
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
                  <Typography variant="body1">{database.size || 'N/A'}</Typography>
                </Box>
              </Grid>
            </Grid>
            
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
                      // Update structure only
                      if (tableColumns && tableColumns[tableName]) {
                        setStructure(tableColumns[tableName]);
                      } else {
                        setStructure([]);
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
            
            {/* Display Table Structure */} 
            {selectedTable && structure.length > 0 && (
              <>
                <Typography variant="subtitle1" gutterBottom>Structure for: {selectedTable}</Typography>
                <TableContainer sx={{ mb: 3, maxHeight: '300px', overflowY: 'auto' }}> {/* Limit height */}
                  <Table size="small" stickyHeader> {/* Add stickyHeader */}
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
                        <TableRow key={`${selectedTable}-col-${index}`}> {/* Add unique key */}
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
              </>
            )}

            {!selectedTable && (
              <Typography sx={{ mt: 2, fontStyle: 'italic' }} color="textSecondary">
                Select a table from the 'Tables' tab or the dropdown above to view its structure.
              </Typography>
            )}
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

        {/* Sync Tab Content */}
        {activeTab === 3 && (
          <DatabaseSyncTab databaseId={databaseId} databaseInfo={database} />
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
            Are you sure you want to delete the connection to "{databaseId}"? This action will only remove the connection from your list, it will not delete the actual database.
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