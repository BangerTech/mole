import React, { useState, useEffect } from 'react';
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
  ListItemButton
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

// Mock function to execute query (would be replaced by actual API call)
const executeQuery = async (query, database) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock results - in a real app, this would come from the API
  if (query.toLowerCase().includes('select') || query.toLowerCase().includes('show')) {
    return {
      success: true,
      columns: ['id', 'name', 'email', 'created_at'],
      rows: [
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2023-01-01' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2023-01-02' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2023-01-03' },
        { id: 4, name: 'Alice Brown', email: 'alice@example.com', created_at: '2023-01-04' },
        { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', created_at: '2023-01-05' },
      ],
      message: 'Query executed successfully.',
      affectedRows: 5
    };
  } else {
    return {
      success: true,
      message: 'Query executed successfully.',
      affectedRows: Math.floor(Math.random() * 10) + 1
    };
  }
};

// Mock function to get database tables
const getDatabaseTables = async (database) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock tables
  return [
    { name: 'users', rows: 156, size: '1.2 MB', created: '2023-01-01' },
    { name: 'products', rows: 89, size: '0.8 MB', created: '2023-01-02' },
    { name: 'orders', rows: 243, size: '2.3 MB', created: '2023-01-03' },
    { name: 'categories', rows: 12, size: '0.1 MB', created: '2023-01-04' },
    { name: 'customers', rows: 78, size: '0.6 MB', created: '2023-01-05' },
  ];
};

// Mock function to get table structure
const getTableStructure = async (database, table) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock table structure
  return [
    { column: 'id', type: 'INT', nullable: false, key: 'PRI', default: null, extra: 'auto_increment' },
    { column: 'name', type: 'VARCHAR(255)', nullable: false, key: '', default: null, extra: '' },
    { column: 'email', type: 'VARCHAR(255)', nullable: false, key: 'UNI', default: null, extra: '' },
    { column: 'password', type: 'VARCHAR(255)', nullable: false, key: '', default: null, extra: '' },
    { column: 'created_at', type: 'TIMESTAMP', nullable: true, key: '', default: 'CURRENT_TIMESTAMP', extra: '' },
    { column: 'updated_at', type: 'TIMESTAMP', nullable: true, key: '', default: null, extra: '' },
  ];
};

export default function QueryEditor() {
  const navigate = useNavigate();
  const { id } = useParams(); // Database ID from URL
  const [editorMode, setEditorMode] = useState('simple'); // 'simple' or 'expert'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [database, setDatabase] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableStructure, setTableStructure] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openCreateTableDialog, setOpenCreateTableDialog] = useState(false);
  const [openDeleteTableDialog, setOpenDeleteTableDialog] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newColumns, setNewColumns] = useState([
    { name: 'id', type: 'INT', nullable: false, isPrimary: true, autoIncrement: true },
    { name: 'name', type: 'VARCHAR(255)', nullable: false, isPrimary: false, autoIncrement: false }
  ]);
  
  // Fetch database details and tables
  useEffect(() => {
    const fetchDatabase = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock database data
        setDatabase({
          id: id || '1',
          name: 'Production Database',
          engine: 'PostgreSQL',
          host: 'db.example.com',
          database: 'production_db'
        });
        
        const tablesData = await getDatabaseTables();
        setTables(tablesData);
        
        setError(null);
      } catch (err) {
        setError('Failed to load database details. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDatabase();
  }, [id]);

  // Fetch table structure when a table is selected
  useEffect(() => {
    const fetchTableStructure = async () => {
      if (!selectedTable) return;
      
      setLoading(true);
      try {
        const structure = await getTableStructure(database, selectedTable);
        setTableStructure(structure);
      } catch (err) {
        setError(`Failed to load structure for table "${selectedTable}".`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTableStructure();
  }, [selectedTable, database]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleModeChange = (event, newMode) => {
    setEditorMode(newMode);
  };

  const handleRun = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResults(null);
    setError(null);
    
    try {
      const result = await executeQuery(query, database);
      setResults(result);
    } catch (err) {
      setError('Failed to execute query. Please check your syntax and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setError(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const downloadResults = () => {
    // Simple CSV generation
    if (!results || !results.rows) return;
    
    const headers = results.columns.join(',');
    const rows = results.rows.map(row => 
      results.columns.map(col => `"${row[col] || ''}"`).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTableClick = (tableName) => {
    setSelectedTable(tableName);
    
    // In simple mode, generate a basic SELECT query when a table is clicked
    if (editorMode === 'expert') {
      setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
    }
  };

  const handleCreateTable = () => {
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
    setNewColumns(updatedColumns);
  };

  const handleRemoveColumn = (index) => {
    const updatedColumns = [...newColumns];
    updatedColumns.splice(index, 1);
    setNewColumns(updatedColumns);
  };

  const handleConfirmCreateTable = () => {
    // In a real app, this would send an API request to create the table
    setOpenCreateTableDialog(false);
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedTables = [
        ...tables, 
        { 
          name: newTableName, 
          rows: 0, 
          size: '0 MB', 
          created: new Date().toISOString().split('T')[0] 
        }
      ];
      setTables(updatedTables);
      setSelectedTable(newTableName);
      setLoading(false);
      
      // Show success message
      setError(null);
      setResults({
        success: true,
        message: `Table "${newTableName}" created successfully.`,
        affectedRows: 0
      });
      
      // Reset form
      setNewTableName('');
      setNewColumns([
        { name: 'id', type: 'INT', nullable: false, isPrimary: true, autoIncrement: true },
        { name: 'name', type: 'VARCHAR(255)', nullable: false, isPrimary: false, autoIncrement: false }
      ]);
    }, 1500);
  };

  const handleDeleteTable = () => {
    if (!selectedTable) return;
    setOpenDeleteTableDialog(true);
  };

  const handleConfirmDeleteTable = () => {
    // In a real app, this would send an API request to delete the table
    setOpenDeleteTableDialog(false);
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const updatedTables = tables.filter(table => table.name !== selectedTable);
      setTables(updatedTables);
      setSelectedTable(null);
      setTableStructure([]);
      setLoading(false);
      
      // Show success message
      setError(null);
      setResults({
        success: true,
        message: `Table "${selectedTable}" deleted successfully.`,
        affectedRows: 0
      });
    }, 1500);
  };

  const generateCreateTableSQL = () => {
    if (!newTableName) return '';
    
    const columnDefinitions = newColumns.map(col => {
      let def = `\`${col.name}\` ${col.type}`;
      def += col.nullable ? ' NULL' : ' NOT NULL';
      if (col.isPrimary) def += ' PRIMARY KEY';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      return def;
    }).join(',\n  ');
    
    return `CREATE TABLE \`${newTableName}\` (\n  ${columnDefinitions}\n);`;
  };

  const handleRunCreateTableSQL = () => {
    const sql = generateCreateTableSQL();
    setQuery(sql);
    setEditorMode('expert');
    setOpenCreateTableDialog(false);
  };

  if (loading && !database) {
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

      {database && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">
            Connected to: <Chip label={database.name} color="primary" size="small" sx={{ ml: 1 }} />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {database.engine} • {database.host} • {database.database}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {results && results.success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {results.message} {results.affectedRows > 0 && `(${results.affectedRows} rows affected)`}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 280px)' }}>
        {/* Simple Mode */}
        {editorMode === 'simple' && (
          <>
            <Grid item xs={12} md={3}>
              <Paper sx={{ height: '100%', overflow: 'auto', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    Tables
                  </Typography>
                  <Tooltip title="Create new table">
                    <IconButton size="small" color="primary" onClick={handleCreateTable}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <List dense>
                  {tables.map((table) => (
                    <ListItem 
                      disablePadding
                      key={table.name}
                      secondaryAction={
                        <Typography variant="caption" color="text.secondary">
                          {table.rows} rows
                        </Typography>
                      }
                    >
                      <ListItemButton 
                        selected={selectedTable === table.name}
                        onClick={() => handleTableClick(table.name)}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <StorageIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={table.name}
                          primaryTypographyProps={{ fontSize: 14 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
                {tables.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No tables found.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleCreateTable}
                      sx={{ mt: 2, textTransform: 'none' }}
                    >
                      Create table
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={9}>
              <Paper sx={{ height: '100%', p: 0, display: 'flex', flexDirection: 'column' }}>
                {selectedTable ? (
                  <>
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">
                        {selectedTable}
                      </Typography>
                      <Box>
                        <Tooltip title="Delete table">
                          <IconButton color="error" size="small" onClick={handleDeleteTable}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit as SQL">
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => setEditorMode('expert')}
                            sx={{ ml: 1 }}
                          >
                            <CodeIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Tabs value={0} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Tab label="Structure" />
                      <Tab label="Data" />
                      <Tab label="Indexes" />
                    </Tabs>
                    
                    <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
                      {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                          <CircularProgress />
                        </Box>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Column</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Null</TableCell>
                                <TableCell>Key</TableCell>
                                <TableCell>Default</TableCell>
                                <TableCell>Extra</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {tableStructure.map((row) => (
                                <TableRow key={row.column}>
                                  <TableCell>{row.column}</TableCell>
                                  <TableCell>{row.type}</TableCell>
                                  <TableCell>{row.nullable ? 'Yes' : 'No'}</TableCell>
                                  <TableCell>
                                    {row.key === 'PRI' && (
                                      <Chip size="small" label="Primary" color="primary" />
                                    )}
                                    {row.key === 'UNI' && (
                                      <Chip size="small" label="Unique" color="secondary" />
                                    )}
                                    {row.key === 'MUL' && (
                                      <Chip size="small" label="Index" color="info" />
                                    )}
                                  </TableCell>
                                  <TableCell>{row.default || '-'}</TableCell>
                                  <TableCell>{row.extra || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                    
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <Stack direction="row" spacing={2}>
                        <ActionButton
                          variant="contained"
                          color="primary"
                          startIcon={<AddIcon />}
                        >
                          Add column
                        </ActionButton>
                        <ActionButton
                          variant="outlined"
                          startIcon={<SearchIcon />}
                        >
                          Search data
                        </ActionButton>
                        <ActionButton
                          variant="outlined"
                          startIcon={<EditIcon />}
                        >
                          Edit record
                        </ActionButton>
                      </Stack>
                    </Box>
                  </>
                ) : (
                  <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No table selected
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}>
                      Select a table from the left sidebar, or create a new table.
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleCreateTable}
                    >
                      Create new table
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </>
        )}
        
        {/* Expert Mode */}
        {editorMode === 'expert' && (
          <>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <QueryTextarea
                  fullWidth
                  multiline
                  rows={8}
                  placeholder="Enter your SQL query here..."
                  value={query}
                  onChange={handleQueryChange}
                  variant="outlined"
                  className="query-editor"
                  InputProps={{
                    sx: { fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace' }
                  }}
                />
                
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                    onClick={handleRun}
                    disabled={loading || !query.trim()}
                  >
                    Run query
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClear}
                  >
                    Clear
                  </Button>
                  {results && results.rows && (
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

              {results && results.rows && (
                <ResultsCard>
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="subtitle1">
                        Results: {results.rows.length} rows
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                      <TableContainer>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              {results.columns.map((column) => (
                                <TableCell key={column}>{column}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {results.rows
                              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                              .map((row, index) => (
                                <TableRow key={index}>
                                  {results.columns.map((column) => (
                                    <TableCell key={column}>
                                      {String(row[column] !== null ? row[column] : '')}
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
                      count={results.rows.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={[5, 10, 25, 50, 100]}
                    />
                  </CardContent>
                </ResultsCard>
              )}
            </Grid>
          </>
        )}
      </Grid>

      {/* Create Table Dialog */}
      <Dialog
        open={openCreateTableDialog}
        onClose={handleCloseCreateTableDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
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
          
          <Typography variant="subtitle1" gutterBottom>
            Columns
          </Typography>
          
          {newColumns.map((column, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Column name"
                    value={column.name}
                    onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                    variant="outlined"
                    size="small"
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
                          checked={!column.nullable}
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
                          disabled={!column.isPrimary || column.type !== 'INT'}
                        />
                      }
                      label="AUTO_INCREMENT"
                    />
                    {index > 0 && (
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveColumn(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          ))}
          
          <Button
            startIcon={<AddIcon />}
            onClick={handleAddColumn}
            sx={{ mb: 3, textTransform: 'none' }}
          >
            Add column
          </Button>
          
          <Typography variant="subtitle1" gutterBottom>
            Generated SQL
          </Typography>
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'background.default', 
              borderRadius: 1,
              fontFamily: '"SF Mono", Monaco, Consolas, "Courier New", monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              maxHeight: 200
            }}
          >
            {generateCreateTableSQL()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseCreateTableDialog} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleRunCreateTableSQL} 
            variant="outlined" 
            color="primary"
            startIcon={<CodeIcon />}
            sx={{ textTransform: 'none', mr: 1 }}
          >
            As SQL query
          </Button>
          <Button 
            onClick={handleConfirmCreateTable} 
            variant="contained" 
            color="primary"
            startIcon={<SaveIcon />}
            disabled={!newTableName.trim() || newColumns.some(col => !col.name.trim())}
            sx={{ textTransform: 'none' }}
          >
            Create table
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Table Confirmation Dialog */}
      <Dialog
        open={openDeleteTableDialog}
        onClose={() => setOpenDeleteTableDialog(false)}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="error" sx={{ mr: 1 }} />
          Delete table
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the table <strong>{selectedTable}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDeleteTableDialog(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteTable} 
            variant="contained" 
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </RootStyle>
  );
} 