import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tabs,
  Tab,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Switch,
  FormControlLabel,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Snackbar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import TableViewIcon from '@mui/icons-material/TableView';
import CodeIcon from '@mui/icons-material/Code';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FilterListIcon from '@mui/icons-material/FilterList';
import StorageIcon from '@mui/icons-material/Storage';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyIcon from '@mui/icons-material/Key';
import WarningIcon from '@mui/icons-material/Warning';
import DatabaseService from '../services/DatabaseService'; // Import DatabaseService

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(3)
}));

const QueryTextarea = styled(TextField)(({ theme }) => ({
  fontFamily: 'monospace',
  '& .MuiInputBase-input': {
    fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace',
  }
}));

const ResultsCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(3),
  height: 'calc(100% - 300px)',
  display: 'flex',
  flexDirection: 'column'
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 500,
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  }
}));

const StyledTabPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%'
}));

export default function QueryEditor() {
  const navigate = useNavigate();
  const { id: urlDatabaseId } = useParams(); // Database ID from URL, renamed to avoid conflict
  const [editorMode, setEditorMode] = useState('simple'); // Default back to simple mode
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [database, setDatabase] = useState(null); // Currently selected database connection object
  const [databases, setDatabases] = useState([]); // List of available connections
  const [tables, setTables] = useState([]); // Tables for the selected database
  const [selectedTable, setSelectedTable] = useState(null); // For simple mode (can be removed if simple mode gone)
  // Add back state for Simple Mode structure view
  const [tableStructure, setTableStructure] = useState([]);
  // Add back state for Dialogs (logic disabled for now)
  const [openCreateTableDialog, setOpenCreateTableDialog] = useState(false);
  const [openDeleteTableDialog, setOpenDeleteTableDialog] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newColumns, setNewColumns] = useState([
    { name: 'id', type: 'INT', nullable: false, isPrimary: true, autoIncrement: true },
    { name: 'name', type: 'VARCHAR(255)', nullable: false, isPrimary: false, autoIncrement: false }
  ]);
  
  // State for expert mode results pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Add state for simple mode data preview
  const [simpleModeTableData, setSimpleModeTableData] = useState([]);
  const [simpleModeTableColumns, setSimpleModeTableColumns] = useState([]);
  const [simpleModeLoading, setSimpleModeLoading] = useState(false);
  const [simpleModeError, setSimpleModeError] = useState(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Fetch available database connections and set default
  useEffect(() => {
    const fetchConnections = async () => {
      setLoading(true);
      setError(null);
      try {
        const connections = await DatabaseService.getDatabaseConnections();
        const availableConnections = connections || [];
        setDatabases(availableConnections); 
        
        let defaultDb = null;
        if (urlDatabaseId) { // If an ID is provided in the URL, try to find that connection
           defaultDb = availableConnections.find(db => String(db.id) === String(urlDatabaseId));
        }
        
        // If no ID from URL or not found, use the first connection from the list
        if (!defaultDb && availableConnections.length > 0) {
          defaultDb = availableConnections[0];
        }
        
        // If still no DB (API failed or returned empty), use Sample DB as fallback
        if (!defaultDb) {
          console.log('No real connections found or specified, using Sample DB for Query Editor.');
          defaultDb = {
            id: '1', // Use sample ID
            name: 'Sample Database',
            engine: 'PostgreSQL',
            database: 'sample_db',
            isSample: true
          };
          // Add sample to the list if it's the only option
          if (availableConnections.length === 0) {
              setDatabases([defaultDb]);
          }
        }
        
        console.log("Setting default DB:", defaultDb);
        setDatabase(defaultDb); // Set the selected database state
        
      } catch (err) {
        console.error('Failed to load connections for Query Editor:', err);
        setError('Failed to load database connections.');
        // Fallback to Sample DB on error
        const sampleDb = {
           id: '1', name: 'Sample Database', engine: 'PostgreSQL', database: 'sample_db', isSample: true
        };
        setDatabases([sampleDb]);
        setDatabase(sampleDb);
      } finally {
        // Loading state is primarily managed by subsequent table fetch
      }
    };
    
    fetchConnections();
  }, [urlDatabaseId]); // Re-run if the ID from the URL changes

  // Fetch tables AND structure when the selected database changes
  useEffect(() => {
    const fetchSchemaData = async () => {
      setTables([]);
      setSelectedTable(null);
      setTableStructure([]); // Reset structure
      setQuery(''); 
      setResults(null);
      setError(null);

      if (!database || !database.id || database.isSample) { 
        setLoading(false); 
        if (database?.isSample) {
           setQuery('SELECT * FROM users LIMIT 10;'); 
        }
        return; 
      }
      
      setLoading(true);
      try {
        const schemaInfo = await DatabaseService.getDatabaseSchema(database.id);
        if (schemaInfo.success) {
          setTables(schemaInfo.tables || []);
          // Select the first table and fetch its structure for Simple Mode
          if (schemaInfo.tables && schemaInfo.tables.length > 0) {
             const firstTable = schemaInfo.tables[0].name;
             setSelectedTable(firstTable);
             if (schemaInfo.tableColumns && schemaInfo.tableColumns[firstTable]) {
                setTableStructure(schemaInfo.tableColumns[firstTable]);
             } else {
                // Attempt to fetch structure separately if not included initially (shouldn't happen with current backend)
                console.warn(`Structure for table ${firstTable} not found in initial schema load.`);
             }
             // Set default query for expert mode
             const safeTableName = firstTable.includes('-') || firstTable.includes(' ') ? `"${firstTable}"` : firstTable;
             setQuery(`SELECT * FROM ${safeTableName} LIMIT 10;`);
          } else {
             setQuery('-- No tables found in this database');
          }
        } else {
          console.warn(`Failed to get schema for ${database.name}:`, schemaInfo.message);
          setError(`Failed to load schema for ${database.name}.`);
          setTables([]);
           setQuery('-- Could not load tables');
        }
      } catch (err) {
        setError(`Error loading schema for ${database.name}.`);
        console.error(err);
        setTables([]);
        setQuery('-- Error loading tables');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchemaData();
  }, [database]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleModeChange = (event, newMode) => {
    // Allow switching modes again
    if (newMode !== null) { // Ensure a mode is selected
       setEditorMode(newMode);
    }
  };

  const handleDatabaseChange = (event) => {
    const selectedDbId = event.target.value;
    const newSelectedDb = databases.find(db => String(db.id) === String(selectedDbId));
    setDatabase(newSelectedDb || null);
  };

  const handleRun = async () => {
    if (!query.trim() || !database || !database.id) return;
    
    setLoading(true);
    setResults(null);
    setError(null);
    setPage(0); // Reset pagination on new query
    
    try {
      const result = await DatabaseService.executeQuery(database.id, query);
      setResults(result);
      if (!result.success) {
          setError(result.message || 'Query execution failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to execute query. Please check syntax and connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setError(null);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const downloadResults = () => {
    if (!results || !results.rows || !results.columns) return;
    
    try {
      const headers = results.columns.join(',');
      const rows = results.rows.map(row => 
        results.columns.map(col => {
          let cellValue = row[col];
          if (cellValue === null || cellValue === undefined) {
            return ''
          }
          let stringValue = String(cellValue);
          // Escape double quotes by doubling them, enclose in double quotes
          stringValue = stringValue.replace(/"/g, '""'); 
          return `"${stringValue}"`;
        }).join(',')
      ).join('\n');
      
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'query_results.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e) {
       console.error("CSV Export failed:", e);
       setError("Failed to generate CSV file.");
    }
  };

  const handleTableClick = async (tableName) => { // Make async for data fetching
    setSelectedTable(tableName);
    setTableStructure([]); // Clear old structure
    setSimpleModeTableData([]); // Clear old data preview
    setSimpleModeTableColumns([]);
    setSimpleModeError(null);

    // Fetch structure
    if (database?.tableColumns && database.tableColumns[tableName]) {
      setTableStructure(database.tableColumns[tableName]);
    } else if (database && database.id && !database.isSample) {
      // Structure wasn't pre-loaded, fetch schema again (might be redundant but safe)
      console.log(`Structure for ${tableName} not pre-loaded, fetching schema again.`);
      try {
         setSimpleModeLoading(true); // Show loading for structure too if fetched separately
         const schemaInfo = await DatabaseService.getDatabaseSchema(database.id);
         if (schemaInfo.success && schemaInfo.tableColumns && schemaInfo.tableColumns[tableName]) {
            setTableStructure(schemaInfo.tableColumns[tableName]);
         } else {
             console.warn(`Could not fetch structure for ${tableName} in second attempt.`);
         }
      } catch (err) {
         console.error(`Error fetching schema for structure of ${tableName}:`, err);
         setSimpleModeError(`Could not load structure for ${tableName}.`);
      }
      // Keep loading true until data is also fetched/failed
    }

    // Fetch data preview (only in simple mode for real databases)
    if (editorMode === 'simple' && database && database.id && !database.isSample) {
      setSimpleModeLoading(true); // Ensure loading is true
      try {
        const safeTableName = tableName.includes('-') || tableName.includes(' ') ? `"${tableName}"` : tableName;
        const previewQuery = `SELECT * FROM ${safeTableName} LIMIT 10;`; // Fetch first 10 rows
        const result = await DatabaseService.executeQuery(database.id, previewQuery);
        if (result.success) {
          setSimpleModeTableColumns(result.columns || []);
          setSimpleModeTableData(result.rows || []);
        } else {
          console.error('Error fetching table data preview:', result.message);
          setSimpleModeError(result.message || 'Failed to fetch table data preview.');
        }
      } catch (err) {
        console.error('Exception fetching table data preview:', err);
        setSimpleModeError(err.message || 'An unexpected error occurred while fetching table data preview.');
      } finally {
        setSimpleModeLoading(false);
      }
    } else {
       // If not simple mode or sample DB, ensure loading is off
       setSimpleModeLoading(false);
    }

    // For Expert mode, also update query
    if (editorMode === 'expert') {
      const safeTableName = tableName.includes('-') || tableName.includes(' ') ? `"${tableName}"` : tableName;
      setQuery(`SELECT * FROM ${safeTableName} LIMIT 100;`);
    }
  };

  // --- Reintroduce Simple Mode Handlers (logic disabled/mocked) --- 
  const handleCreateTable = () => {
    console.log("Trigger Create Table Dialog");
    setOpenCreateTableDialog(true);
  };

  const handleCloseCreateTableDialog = () => {
    setOpenCreateTableDialog(false);
  };

  const handleAddColumn = () => {
    setNewColumns([...newColumns, { name: '', type: 'VARCHAR(255)', nullable: true, isPrimary: false, autoIncrement: false }]);
  };

  const handleColumnChange = (index, field, value) => {
    const updatedColumns = [...newColumns];
    updatedColumns[index] = { ...updatedColumns[index], [field]: value };
    // Handle boolean toggle for nullable
    if (field === 'nullable') {
      updatedColumns[index][field] = !updatedColumns[index][field]; 
    } else {
      updatedColumns[index][field] = value; 
    }
    // Auto-disable autoIncrement if type is not INT or not primary
    if (updatedColumns[index].type !== 'INT' || !updatedColumns[index].isPrimary) {
        updatedColumns[index].autoIncrement = false;
    }
    setNewColumns(updatedColumns);
  };

  const handleRemoveColumn = (index) => {
    const updatedColumns = [...newColumns];
    updatedColumns.splice(index, 1);
    setNewColumns(updatedColumns);
  };

  const handleConfirmCreateTable = async () => { // Make async
    if (!database || !database.id || !newTableName.trim() || newColumns.some(col => !col.name.trim())) {
      setSnackbar({ open: true, message: 'Table name and all column names are required.', severity: 'warning' });
      return;
    }

    const tableDefinition = { tableName: newTableName, columns: newColumns };
    handleCloseCreateTableDialog();
    setLoading(true); // Indicate loading
    setError(null);
    
    try {
        const result = await DatabaseService.createTable(database.id, tableDefinition);
        if (result.success) {
            setSnackbar({ open: true, message: result.message || 'Table created successfully!', severity: 'success' });
            setNewTableName(''); // Reset form
            setNewColumns([{ name: 'id', type: 'INT', nullable: false, isPrimary: true, autoIncrement: true }, { name: 'name', type: 'VARCHAR(255)', nullable: false, isPrimary: false, autoIncrement: false }]);
            await refreshTableList(); // Refresh the sidebar
        } else {
            setError(result.message || 'Failed to create table.');
            setSnackbar({ open: true, message: result.message || 'Failed to create table.', severity: 'error' });
        }
    } catch (err) {
         setError(err.message || 'An unexpected error occurred.');
         setSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteTable = () => {
    if (!selectedTable) return;
    console.log("Trigger Delete Table Dialog for:", selectedTable);
    setOpenDeleteTableDialog(true);
  };

  const handleConfirmDeleteTable = async () => { // Make async
    if (!selectedTable || !database || !database.id) {
        setSnackbar({ open: true, message: 'No table selected or database connection issue.', severity: 'warning' });
        return;
    }
    
    const tableToDelete = selectedTable;
    setOpenDeleteTableDialog(false);
    setLoading(true); 
    setError(null);

    try {
        const result = await DatabaseService.deleteTable(database.id, tableToDelete);
        if (result.success) {
             setSnackbar({ open: true, message: result.message || `Table "${tableToDelete}" deleted.`, severity: 'success' });
             setSelectedTable(null); // Clear selection
             setTableStructure([]);
             await refreshTableList(); // Refresh sidebar
        } else {
            setError(result.message || 'Failed to delete table.');
            setSnackbar({ open: true, message: result.message || 'Failed to delete table.', severity: 'error' });
        }
    } catch (err) {
         setError(err.message || 'An unexpected error occurred.');
         setSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
        setLoading(false);
    }
  };

  const generateCreateTableSQL = () => {
    if (!newTableName) return '-- Enter table name';
    
    const columnDefinitions = newColumns.map(col => {
      if (!col.name || !col.type) return '-- Incomplete column definition';
      // Basic quoting for safety, adapt per DB engine if needed
      const safeColName = col.name.includes('-') || col.name.includes(' ') ? `"${col.name}"` : col.name;
      let def = `  ${safeColName} ${col.type}`;
      def += col.nullable ? ' NULL' : ' NOT NULL';
      if (col.default) def += ` DEFAULT ${col.default}`; // Add default value if present
      if (col.isPrimary) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTOINCREMENT'; // SQLite syntax, adjust for others
      return def;
    }).join(',\n');
    
    const safeTableName = newTableName.includes('-') || newTableName.includes(' ') ? `"${newTableName}"` : newTableName;
    return `CREATE TABLE ${safeTableName} (\n${columnDefinitions}\n);`;
  };

  const handleRunCreateTableSQL = () => {
    const sql = generateCreateTableSQL();
    setQuery(sql);
    setEditorMode('expert'); // Switch to expert mode to show/run the query
    handleCloseCreateTableDialog();
  };
  // --- End Simple Mode Handlers --- 

  // Function to refresh the table list for the current database
  const refreshTableList = useCallback(async () => {
      if (!database || !database.id || database.isSample) { 
        setTables([]);
        return; 
      }
      // Don't set loading here, as it might be part of a larger operation
      try {
        const schemaInfo = await DatabaseService.getDatabaseSchema(database.id);
        if (schemaInfo.success) {
          setTables(schemaInfo.tables || []);
        } else {
          console.warn(`Failed to refresh tables for ${database.name}:`, schemaInfo.message);
          setSnackbar({ open: true, message: `Error refreshing table list: ${schemaInfo.message}`, severity: 'warning' });
          setTables([]);
        }
      } catch (err) {
        setSnackbar({ open: true, message: `Error refreshing table list: ${err.message}`, severity: 'error' });
        console.error(err);
        setTables([]);
      }
  }, [database]); // Dependency on the current database connection

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // Render logic needs to be adapted for Expert Mode only
  if (loading && !database) { // Show loading only during initial connection fetch
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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            SQL Editor
          </Typography>
        </Box>
        {/* Reintroduce mode tabs */}
        <Tabs 
          value={editorMode} 
          onChange={handleModeChange}
          aria-label="editor mode tabs"
          sx={{ 
            '& .MuiTab-root': { 
              textTransform: 'none',
              minWidth: 100,
              fontWeight: 500
            }
          }}
        >
          <Tab 
            value="simple" 
            label="Simple Mode" 
            icon={<TableViewIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="expert" 
            label="Expert Mode"
            icon={<CodeIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {databases.length > 0 && (
        <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
          <InputLabel>Database Connection</InputLabel>
          <Select
            value={database?.id || ''}
            onChange={handleDatabaseChange}
            label="Database Connection"
          >
            {databases.map((db) => (
              <MenuItem key={db.id} value={db.id}>
                {db.name} ({db.engine} - {db.database})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 250px)' }}> {/* Adjust height */}
          {/* Table List Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ height: '100%', overflow: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={500}>Tables</Typography>
                    <Tooltip title="Create new table">
                        <span> {/* Tooltip needs a span wrapper if button is disabled */} 
                        <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={handleCreateTable}
                            disabled={!database || database.isSample} // Disable for sample DB
                        >
                        <AddIcon />
                        </IconButton>
                        </span>
                    </Tooltip>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loading && tables.length === 0 && <CircularProgress size={20} />} 
                {!loading && tables.length === 0 && !database?.isSample && (
                    <Typography variant="body2" color="text.secondary">No tables found.</Typography>
                )}
                {database?.isSample && (
                    <Typography variant="body2" color="text.secondary">Sample tables not listed.</Typography>
                )}
                <List dense>
                  {tables.map((table) => (
                    <ListItem disablePadding key={table.name}>
                      <ListItemButton 
                        selected={selectedTable === table.name}
                        onClick={() => handleTableClick(table.name)}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}><StorageIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary={table.name} primaryTypographyProps={{ fontSize: 14, noWrap: true }} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
            </Paper>
          </Grid>

          {/* Editor and Results Area */} 
          <Grid item xs={12} md={9} sx={{ display: 'flex', flexDirection: 'column' }}>
            {/* Editor Area */} 
            <Paper sx={{ p: 2, mb: 3 }}>
              <QueryTextarea
                fullWidth
                multiline
                rows={8}
                placeholder={database ? `Enter your SQL query for ${database.name}...` : 'Select a database connection'}
                value={query}
                onChange={handleQueryChange}
                variant="outlined"
                className="query-editor"
                InputProps={{
                  sx: { fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace' }
                }}
                disabled={!database || loading}
              />
              
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  onClick={handleRun}
                  disabled={loading || !query.trim() || !database || database.isSample} // Disable run for sample DB
                >
                  Run query
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  disabled={loading}
                >
                  Clear
                </Button>
                {results && results.success && results.rows && results.rows.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadResults}
                  >
                    Download results
                  </Button>
                )}
              </Box>
            </Paper>

            {/* Results Area */} 
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>}
            
            {results && !loading && (
               <ResultsCard variant="outlined"> {/* Use outlined variant */} 
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {results.success ? (
                      <>
                        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle1">
                            {results.rows ? 
                              `Results: ${results.rows.length} rows (Page ${page + 1})` : 
                              results.message || 'Query Executed'}
                            {results.affectedRows > 0 && ` - ${results.affectedRows} rows affected`}
                          </Typography>
                        </Box>
                        {results.rows && results.columns && results.rows.length > 0 ? (
                          <>
                            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                              <TableContainer>
                                <Table stickyHeader size="small">
                                  <TableHead>
                                    <TableRow>
                                      {results.columns.map((column) => (
                                        <TableCell key={column} sx={{ fontWeight: 'bold' }}>{column}</TableCell>
                                      ))}
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {results.rows
                                      // Client-side pagination of the current result set
                                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                      .map((row, index) => (
                                        <TableRow key={`row-${page}-${index}`}>
                                          {results.columns.map((column) => (
                                            <TableCell key={`${column}-${page}-${index}`}>
                                              {String(row[column] !== null && row[column] !== undefined ? row[column] : 'NULL')}
                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                            <TablePagination
                              component="div"
                              count={results.rows.length} // Paginate based on fetched rows
                              rowsPerPage={rowsPerPage}
                              page={page}
                              onPageChange={handleChangePage}
                              onRowsPerPageChange={handleChangeRowsPerPage}
                              rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            />
                          </>
                        ) : (
                          <Box sx={{ p: 2 }}>
                             <Typography color="textSecondary">{results.message || 'Query executed, no rows returned.'}</Typography>
                          </Box>
                        )}
                      </>
                    ) : ( // Handle case where results.success is false
                      <Box sx={{ p: 2 }}>
                        <Alert severity="error">{results.message || 'Query execution failed.'}</Alert>
                      </Box>
                    )}
                  </CardContent>
                </ResultsCard>
            )}
          </Grid>
      </Grid>

      {/* Create Table Dialog (Restored UI, logic pending API) */} 
      <Dialog
        open={openCreateTableDialog}
        onClose={handleCloseCreateTableDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Create new table</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Define the structure of your new table.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Table name"
            fullWidth
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
          />
          <Typography variant="subtitle1" gutterBottom>Columns</Typography>
          {newColumns.map((column, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                 <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth label="Column name" value={column.name}
                    onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                    variant="outlined" size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Data type</InputLabel>
                    <Select
                      value={column.type}
                      onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                      label="Data type"
                    >
                      <MenuItem value="INT">INT</MenuItem>
                      <MenuItem value="VARCHAR(255)">VARCHAR(255)</MenuItem>
                      <MenuItem value="TEXT">TEXT</MenuItem>
                      <MenuItem value="DATE">DATE</MenuItem>
                      <MenuItem value="TIMESTAMP">TIMESTAMP</MenuItem>
                      <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
                      <MenuItem value="DECIMAL(10,2)">DECIMAL(10,2)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!column.nullable} // Invert logic for display
                          onChange={(e) => handleColumnChange(index, 'nullable', !e.target.checked)}
                          size="small"
                        />
                      }
                      label="NOT NULL"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={column.isPrimary}
                          onChange={(e) => handleColumnChange(index, 'isPrimary', e.target.checked)}
                          size="small"
                        />
                      }
                      label="PRIMARY"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={column.autoIncrement}
                          onChange={(e) => handleColumnChange(index, 'autoIncrement', e.target.checked)}
                          size="small"
                          disabled={column.type !== 'INT' || !column.isPrimary} // Corrected disable logic
                        />
                      }
                      label="AUTO INC."
                    />
                    {/* Allow deleting the first column too if needed, but usually ID is required */}
                    <IconButton size="small" color="error" onClick={() => handleRemoveColumn(index)} disabled={newColumns.length <= 1}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={handleAddColumn} sx={{ mb: 3, textTransform: 'none' }}>Add column</Button>
          <Typography variant="subtitle1" gutterBottom>Generated SQL (Example)</Typography>
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 200 }}>
            {generateCreateTableSQL()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseCreateTableDialog} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleRunCreateTableSQL} variant="outlined" color="primary" startIcon={<CodeIcon />} sx={{ textTransform: 'none', mr: 1 }}>As SQL query</Button>
          <Button onClick={handleConfirmCreateTable} variant="contained" color="primary" startIcon={<SaveIcon />} disabled={!newTableName.trim() || newColumns.some(col => !col.name.trim()) || !database || database.isSample} sx={{ textTransform: 'none' }}>Create table</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Table Confirmation Dialog (Restored UI) */} 
      <Dialog
        open={openDeleteTableDialog}
        onClose={() => setOpenDeleteTableDialog(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}><WarningIcon color="error" sx={{ mr: 1 }} /> Delete table</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete the table <strong>{selectedTable}</strong>? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDeleteTableDialog(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleConfirmDeleteTable} variant="contained" color="error" sx={{ textTransform: 'none' }} disabled={!database || database.isSample}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Structure TableContainer */}
      {selectedTable && (
        <Box sx={{ mt: 4 }}> {/* Add margin top */} 
          <Typography variant="subtitle1" gutterBottom>Structure</Typography>
          {simpleModeLoading && <CircularProgress size={24} sx={{ mt: 2 }} />} 
          {simpleModeError && <Alert severity="warning" sx={{ mt: 2 }}>{simpleModeError}</Alert>} 
          {!simpleModeLoading && !simpleModeError && tableStructure.length > 0 && (
            <TableContainer sx={{ maxHeight: '300px', overflowY: 'auto', mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {tableStructure.map((colName, index) => (
                      <TableCell key={`structure-head-${index}`} sx={{ fontWeight: 600 }}>
                        {colName}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableStructure.map((row, rowIndex) => (
                    <TableRow key={`structure-row-${rowIndex}`}>
                      {tableStructure.map((colName, colIndex) => (
                        <TableCell key={`structure-cell-${rowIndex}-${colIndex}`}>
                          {/* Handle potential non-string values */} 
                          {typeof row[colName] === 'object' 
                              ? JSON.stringify(row[colName]) 
                              : String(row[colName] !== null && row[colName] !== undefined ? row[colName] : 'NULL')} 
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Data Preview Section */} 
          {selectedTable && (
              <Box sx={{ mt: 4 }}> {/* Add margin top */} 
                  <Typography variant="subtitle1" gutterBottom>Data Preview (First 10 Rows)</Typography>
                  {simpleModeLoading && <CircularProgress size={24} sx={{ mt: 2 }} />} 
                  {simpleModeError && <Alert severity="warning" sx={{ mt: 2 }}>{simpleModeError}</Alert>} 
                  {!simpleModeLoading && !simpleModeError && simpleModeTableData.length > 0 && (
                      <TableContainer sx={{ maxHeight: '300px', overflowY: 'auto', mt: 1 }}>
                          <Table size="small" stickyHeader>
                              <TableHead>
                              <TableRow>
                                  {simpleModeTableColumns.map((colName, index) => (
                                  <TableCell key={`preview-head-${index}`} sx={{ fontWeight: 600 }}>
                                      {colName}
                                  </TableCell>
                                  ))}
                              </TableRow>
                              </TableHead>
                              <TableBody>
                              {simpleModeTableData.map((row, rowIndex) => (
                                  <TableRow key={`preview-row-${rowIndex}`}>
                                  {simpleModeTableColumns.map((colName, colIndex) => (
                                      <TableCell key={`preview-cell-${rowIndex}-${colIndex}`}>
                                      {/* Handle potential non-string values */} 
                                      {typeof row[colName] === 'object' 
                                          ? JSON.stringify(row[colName]) 
                                          : String(row[colName] !== null && row[colName] !== undefined ? row[colName] : 'NULL')} 
                                      </TableCell>
                                  ))}
                                  </TableRow>
                              ))}
                              </TableBody>
                          </Table>
                      </TableContainer>
                  )}
                   {!simpleModeLoading && !simpleModeError && simpleModeTableData.length === 0 && (
                      <Typography color="textSecondary" sx={{ mt: 2 }}>No data found in table.</Typography>
                  )}
              </Box>
          )}

          {!selectedTable && (
             <Typography sx={{ mt: 2, fontStyle: 'italic' }} color="textSecondary">
               Select a table from the left sidebar to view its structure.
             </Typography>
          )}
        </Box>
      )}

      {/* Add Snackbar for feedback */}
      <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
          </Alert>
      </Snackbar>
    </RootStyle>
  );
} 