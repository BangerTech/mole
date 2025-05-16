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

// Import Ace Editor components
import AceEditor from "react-ace";

// Import Ace Editor modes and themes (adjust path based on your setup)
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-github"; // Or any other theme
import "ace-builds/src-noconflict/ext-language_tools"; // For basic autocompletion

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: theme.spacing(0, 3), // Keep horizontal padding, remove vertical
}));

const ResultsCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(3),
  // height: 'calc(100% - 300px)', // Remove fixed height calculation
  flexGrow: 1, // Allow card to grow and fill available space
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0, // Prevent flexbox overflow issues
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

  // Add state for simple mode row editing
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState('add'); // 'add' or 'edit'
  const [rowFormData, setRowFormData] = useState({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // State for Add Column Dialog
  const [openAddColumnDialog, setOpenAddColumnDialog] = useState(false);
  const [newColumnDetails, setNewColumnDetails] = useState({
    name: '',
    type: 'VARCHAR(255)', // Default type
    nullable: true,
    defaultValue: ''
  });

  // State for Delete Column Dialog
  const [openDeleteColumnDialog, setOpenDeleteColumnDialog] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);

  // State for Edit Column Dialog
  const [openEditColumnDialog, setOpenEditColumnDialog] = useState(false);
  const [columnToEdit, setColumnToEdit] = useState(null); // Stores the original column object
  const [editColumnDetails, setEditColumnDetails] = useState({ // Stores the potentially modified values
    newName: '',
    newType: '',
    newNullable: true,
    newDefault: '',
    dropDefault: false // Option to explicitly drop default
  });

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

             // ---> ADDED: Fetch initial data preview if in simple mode <---
             if (editorMode === 'simple') {
                fetchSimpleModeDataPreview(firstTable);
             }
             // ---> END ADDED <---
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
      console.log(`[handleTableClick] Structure for ${tableName} not pre-loaded, fetching schema again for DB ${database.id}.`);
      try {
         setSimpleModeLoading(true); // Show loading for structure too if fetched separately
         const schemaInfo = await DatabaseService.getDatabaseSchema(database.id);
         console.log(`[handleTableClick] Fetched schemaInfo for ${tableName}:`, JSON.stringify(schemaInfo));
         if (schemaInfo.success && schemaInfo.tableColumns && schemaInfo.tableColumns[tableName]) {
            console.log(`[handleTableClick] Found columns for ${tableName} in schemaInfo:`, JSON.stringify(schemaInfo.tableColumns[tableName]));
            setTableStructure(schemaInfo.tableColumns[tableName]);
         } else {
             console.warn(`[handleTableClick] Could not find columns for ${tableName} in fetched schemaInfo. Success: ${schemaInfo.success}`);
             setTableStructure([]); // Clear if not found after fetch
         }
      } catch (err) {
         console.error(`Error fetching schema for structure of ${tableName}:`, err);
         setSimpleModeError(`Could not load structure for ${tableName}.`);
      }
      // Keep loading true until data is also fetched/failed
    }

    // Fetch data preview (only in simple mode for real databases)
    if (editorMode === 'simple' && database && database.id && !database.isSample) {
      // Use the reusable function now
      await fetchSimpleModeDataPreview(tableName);
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

  // --- Simple Mode Row Editing Handlers --- 

  const handleSelectRow = (rowData, rowIndex) => {
    if (selectedRowIndex === rowIndex) {
      // Deselect if clicking the same row again
      setSelectedRowIndex(null);
      setSelectedRowData(null);
    } else {
      setSelectedRowIndex(rowIndex);
      setSelectedRowData(rowData); 
      console.log("Selected Row:", rowData);
      // TODO: Need primary key info here ideally for update/delete
    }
  };

  const handleRowFormChange = (columnName, value) => {
    setRowFormData(prev => ({ ...prev, [columnName]: value }));
  };

  const handleOpenAddDialog = () => {
    setEditMode('add');
    setRowFormData({}); // Clear form data
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = () => {
    if (!selectedRowData) return;
    setEditMode('edit');
    setRowFormData(selectedRowData); // Pre-fill form with selected row data
    setIsAddEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = () => {
    if (!selectedRowData) return;
    setIsDeleteDialogOpen(true);
  };

  const handleCloseAddEditDialog = () => {
    setIsAddEditDialogOpen(false);
    setRowFormData({}); // Clear form data on close
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  // Function to refresh the data preview section
  const refreshSimpleModeDataPreview = useCallback(async () => {
    if (!selectedTable || !database || !database.id || database.isSample) {
      setSimpleModeTableData([]);
      setSimpleModeTableColumns([]);
      return;
    }
    setSimpleModeLoading(true);
    setSimpleModeError(null);
    try {
      const safeTableName = selectedTable.includes('-') || selectedTable.includes(' ') ? `"${selectedTable}"` : selectedTable;
      const previewQuery = `SELECT * FROM ${safeTableName} LIMIT 10;`; // Re-fetch first 10 rows
      const result = await DatabaseService.executeQuery(database.id, previewQuery);
      if (result.success) {
        setSimpleModeTableColumns(result.columns ? result.columns.map(col => col.name) : []);
        setSimpleModeTableData(result.rows || []);
      } else {
        console.error('Error refreshing table data preview:', result.message);
        setSimpleModeError(result.message || 'Failed to refresh table data preview.');
        setSimpleModeTableData([]);
        setSimpleModeTableColumns([]);
      }
    } catch (err) {
      console.error('Exception refreshing table data preview:', err);
      setSimpleModeError(err.message || 'An unexpected error occurred while refreshing table data preview.');
      setSimpleModeTableData([]);
      setSimpleModeTableColumns([]);
    } finally {
      setSimpleModeLoading(false);
    }
  }, [database, selectedTable]);

  const handleSaveRow = async () => {
    if (!database || !database.id || !selectedTable) return;
    setLoading(true); // Use main loading indicator for now
    setError(null);

    try {
      let result;
      if (editMode === 'add') {
        console.log('[QueryEditor] Attempting to insert:', rowFormData, 'into table:', selectedTable, 'for DB ID:', database.id);
        result = await DatabaseService.insertRow(database.id, selectedTable, rowFormData);
      } else { // editMode === 'edit'
        if (!selectedRowData || !tableStructure) {
          setSnackbar({ open: true, message: 'Original row data or table structure is missing for edit.', severity: 'error' });
          setLoading(false);
          return;
        }

        // Identify primary key(s) and their values from the original selectedRowData
        const primaryKeyCriteria = {};
        let pkFound = false;
        for (const column of tableStructure) {
          if (column.key === 'PRI' || (typeof column.key === 'string' && column.key.toUpperCase().includes('PRIMARY'))) {
            if (selectedRowData.hasOwnProperty(column.name)) {
              primaryKeyCriteria[column.name] = selectedRowData[column.name];
              pkFound = true;
            } else {
              console.error(`Primary key column "${column.name}" not found in original selected row data.`, selectedRowData);
              throw new Error(`Primary key column "${column.name}" missing in original row data.`);
            }
          }
        }

        if (!pkFound || Object.keys(primaryKeyCriteria).length === 0) {
          console.error("No primary key identified or PK values missing for edit.", tableStructure, selectedRowData);
          throw new Error('No primary key values identified for the row to be updated.');
        }
        
        console.log('[QueryEditor] Attempting to update row in table:', selectedTable, 'for DB ID:', database.id);
        console.log('[QueryEditor] PK Criteria:', primaryKeyCriteria);
        console.log('[QueryEditor] New Data:', rowFormData);

        result = await DatabaseService.updateRow(database.id, selectedTable, primaryKeyCriteria, rowFormData);
      }

      if (result && result.success) {
        setSnackbar({ open: true, message: result.message || `Row ${editMode === 'add' ? 'added' : 'updated'} successfully!`, severity: 'success' });
        handleCloseAddEditDialog();
        await refreshSimpleModeDataPreview(); // Refresh data preview
        setSelectedRowIndex(null); // Deselect row
        setSelectedRowData(null);
      } else {
        // Error already set by DatabaseService in case of API failure, but set a generic one if not
        const errorMessage = result?.message || `Failed to ${editMode} row.`;
        setError(errorMessage);
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    } catch (err) {
      // Catch errors from DatabaseService call if they weren't already handled (e.g., network errors)
      const finalErrorMessage = err.message || 'An unexpected error occurred during save.';
      setError(finalErrorMessage);
      setSnackbar({ open: true, message: finalErrorMessage, severity: 'error' });
    } finally {
      setLoading(false);
      // Only close dialog on success to allow users to see errors/correct data
      // handleCloseAddEditDialog(); // Moved this to be called only on success or if explicitly desired on error
    }
  };

  const handleConfirmDeleteRow = async () => {
    if (!database || !database.id || !selectedTable || !selectedRowData || !tableStructure) {
      setSnackbar({ open: true, message: 'Cannot delete row: missing context or table structure.', severity: 'warning' });
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Identify primary key(s) and their values
      const primaryKeyCriteria = {};
      let pkFound = false;
      for (const column of tableStructure) {
        // Assuming 'key' property indicates primary key (e.g., 'PRI' for MySQL, or a similar indicator)
        // This might need adjustment based on how your schema info actually flags PKs for different DBs
        if (column.key === 'PRI' || (typeof column.key === 'string' && column.key.toUpperCase().includes('PRIMARY'))) {
          if (selectedRowData.hasOwnProperty(column.name)) {
            primaryKeyCriteria[column.name] = selectedRowData[column.name];
            pkFound = true;
          } else {
            console.error(`Primary key column "${column.name}" not found in selected row data.`, selectedRowData);
            throw new Error(`Primary key column "${column.name}" missing in selected row.`);
          }
        }
      }

      if (!pkFound) {
        // Fallback or error if no PK is identified from tableStructure.
        // For tables without explicit PKs, deletion by all column values might be an option,
        // but that's more complex and risky. For now, require a PK from schema.
        console.error("No primary key identified for the table from its structure.", tableStructure);
        throw new Error('No primary key identified for this table. Row deletion requires a primary key.');
      }
      
      if (Object.keys(primaryKeyCriteria).length === 0) {
        throw new Error('Could not determine primary key values for the selected row.');
      }

      console.log('Attempting to delete row from table:', selectedTable, 'in DB:', database.id, 'with PK criteria:', primaryKeyCriteria);
      
      const result = await DatabaseService.deleteRow(database.id, selectedTable, primaryKeyCriteria);

      if (result.success) {
        setSnackbar({ open: true, message: result.message || 'Row deleted successfully!', severity: 'success' });
        handleCloseDeleteDialog();
        await refreshSimpleModeDataPreview(); // Refresh data preview
        setSelectedRowIndex(null); // Deselect row
        setSelectedRowData(null);
      } else {
        setError(result.message || 'Failed to delete row.');
        setSnackbar({ open: true, message: result.message || 'Failed to delete row.', severity: 'error' });
      }
    } catch (err) {
      console.error('Error in handleConfirmDeleteRow:', err);
      setError(err.message || 'An unexpected error occurred while deleting the row.');
      setSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
      setLoading(false);
      // Ensure dialog is closed if it wasn't closed on success
      if (isDeleteDialogOpen) { // Check if dialog is still open
          handleCloseDeleteDialog();
      }
    }
  };

  // --- End Simple Mode Row Editing Handlers ---

  // --- ADDED: Reusable function to fetch data preview --- 
  const fetchSimpleModeDataPreview = async (tableNameToFetch) => {
    if (!tableNameToFetch || !database || !database.id || database.isSample) {
        console.log('[fetchSimpleModeDataPreview] Skipping fetch (invalid params or sample DB).');
        setSimpleModeTableData([]);
        setSimpleModeTableColumns([]);
        setSimpleModeError(null);
        setSimpleModeLoading(false); // Ensure loading is off if skipped
        return;
    }

    console.log(`[fetchSimpleModeDataPreview] Fetching preview for ${tableNameToFetch}`);
    setSimpleModeLoading(true);
    setSimpleModeError(null);
    let result = null; // Define result outside try
    try {
        let safeTableName = tableNameToFetch;
        if (database && database.engine && (database.engine.toLowerCase() === 'postgresql' || database.engine.toLowerCase() === 'postgres')) {
            // For PostgreSQL, always quote to preserve case and handle special characters/spaces if any were allowed.
            // Since current validation for table creation (/^[a-zA-Z0-9_]+$/) is strict,
            // this primarily addresses case sensitivity for names like "Test".
            safeTableName = `"${tableNameToFetch}"`;
        } else if (database && database.engine && database.engine.toLowerCase() === 'mysql') {
            // For MySQL, backticks are used for identifiers that might need quoting.
            // Given current validation, it might not be strictly necessary but is safer.
            safeTableName = `\`${tableNameToFetch}\``;
        }
        // For other engines, or if engine is unknown, use tableNameToFetch directly (or add specific quoting)

        const previewQuery = `SELECT * FROM ${safeTableName} LIMIT 10;`;
        console.log(`[fetchSimpleModeDataPreview] Executing query: ${previewQuery}`);
        result = await DatabaseService.executeQuery(database.id, previewQuery);
        console.log(`[fetchSimpleModeDataPreview] Query result received:`, result);

        if (result && result.success) {
            console.log(`[fetchSimpleModeDataPreview] Query successful. Setting columns and data.`);
            // Extract just the name property for the columns
            setSimpleModeTableColumns(result.columns ? result.columns.map(col => col.name) : []);
            setSimpleModeTableData(result.rows || []);
        } else {
            console.error('[fetchSimpleModeDataPreview] Query failed or returned unsuccessful:', result?.message);
            setSimpleModeError(result?.message || 'Failed to fetch table data preview.');
            setSimpleModeTableData([]);
            setSimpleModeTableColumns([]);
        }
    } catch (err) {
        console.error('[fetchSimpleModeDataPreview] Exception during fetch or processing:', err);
        setSimpleModeError(err.message || 'An unexpected error occurred while fetching table data preview.');
        setSimpleModeTableData([]);
        setSimpleModeTableColumns([]);
    } finally {
        console.log(`[fetchSimpleModeDataPreview] Entering finally block. Setting loading to false.`);
        setSimpleModeLoading(false);
    }
  };
  // --- END ADDED --- 

  // --- Add Column Dialog Handlers ---
  const handleOpenAddColumnDialog = () => {
    setNewColumnDetails({ name: '', type: 'VARCHAR(255)', nullable: true, defaultValue: '' }); // Reset form
    setOpenAddColumnDialog(true);
  };

  const handleCloseAddColumnDialog = () => {
    setOpenAddColumnDialog(false);
  };

  const handleNewColumnDetailChange = (field, value) => {
    setNewColumnDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmAddColumn = async () => {
    if (!database || !database.id || !selectedTable || !newColumnDetails.name.trim() || !newColumnDetails.type) {
      setSnackbar({ open: true, message: 'Column name and type are required.', severity: 'warning' });
      return;
    }
    // Basic validation for column name (similar to backend)
    if (!/^[a-zA-Z0-9_]+$/.test(newColumnDetails.name)) {
        setSnackbar({ open: true, message: 'Invalid column name. Use only letters, numbers, and underscores.', severity: 'warning' });
        return;
    }

    const columnDefinition = {
      name: newColumnDetails.name,
      type: newColumnDetails.type,
      nullable: newColumnDetails.nullable,
      // Only include defaultValue if it's not an empty string
      ...(newColumnDetails.defaultValue.trim() !== '' && { defaultValue: newColumnDetails.defaultValue.trim() })
    };

    setLoading(true); // Use main loading or a specific one for this operation
    try {
      const result = await DatabaseService.addColumn(database.id, selectedTable, columnDefinition);
      if (result.success) {
        setSnackbar({ open: true, message: result.message || 'Column added successfully!', severity: 'success' });
        handleCloseAddColumnDialog();
        // Refresh table structure and potentially table list if schema details are re-fetched broadly
        await handleTableClick(selectedTable); // Re-fetches structure and data preview
      } else {
        setSnackbar({ open: true, message: result.message || 'Failed to add column.', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'An unexpected error occurred while adding column.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  // --- End Add Column Dialog Handlers ---

  // --- Delete Column Dialog Handlers ---
  const handleOpenDeleteColumnDialog = (colName) => {
    setColumnToDelete(colName);
    setOpenDeleteColumnDialog(true);
  };

  const handleCloseDeleteColumnDialog = () => {
    setOpenDeleteColumnDialog(false);
    setColumnToDelete(null);
  };

  const handleConfirmDeleteColumn = async () => {
    if (!database || !database.id || !selectedTable || !columnToDelete) {
      setSnackbar({ open: true, message: 'Cannot delete column: missing context.', severity: 'error' });
      handleCloseDeleteColumnDialog();
      return;
    }

    setLoading(true); // Or a specific loading state
    try {
      const result = await DatabaseService.deleteColumn(database.id, selectedTable, columnToDelete);
      if (result.success) {
        setSnackbar({ open: true, message: result.message || `Column '${columnToDelete}' deleted successfully.`, severity: 'success' });
        await handleTableClick(selectedTable); // Refresh structure
      } else {
        setSnackbar({ open: true, message: result.message || `Failed to delete column '${columnToDelete}'.`, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'An unexpected error occurred.', severity: 'error' });
    } finally {
      setLoading(false);
      handleCloseDeleteColumnDialog();
    }
  };
  // --- End Delete Column Dialog Handlers ---

  // --- Edit Column Dialog Handlers ---
  const handleOpenEditColumnDialog = (column) => {
    if (!column) return;
    setColumnToEdit(column); // Store the original column data
    setEditColumnDetails({ // Pre-fill the form with current values
      newName: column.name,
      newType: column.type?.toUpperCase(), // Use current type
      newNullable: column.nullable, // Use current nullability
      newDefault: column.default !== null && column.default !== undefined ? String(column.default) : '', // Use current default
      dropDefault: false // Default is not to drop
    });
    setOpenEditColumnDialog(true);
  };

  const handleCloseEditColumnDialog = () => {
    setOpenEditColumnDialog(false);
    setColumnToEdit(null);
    setEditColumnDetails({ newName: '', newType: '', newNullable: true, newDefault: '', dropDefault: false }); // Reset form
  };

  const handleEditColumnDetailChange = (field, value) => {
    setEditColumnDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmEditColumn = async () => {
    if (!database || !database.id || !selectedTable || !columnToEdit || !editColumnDetails.newName?.trim() || !editColumnDetails.newType) {
      setSnackbar({ open: true, message: 'Cannot modify column: missing context or required fields (name, type). ', severity: 'error' });
      return;
    }
    // Basic validation for new column name
    if (!/^[a-zA-Z0-9_]+$/.test(editColumnDetails.newName)) {
        setSnackbar({ open: true, message: 'Invalid new column name. Use only letters, numbers, and underscores.', severity: 'warning' });
        return;
    }

    // Construct the changes object based on what actually changed
    const changes = {};
    if (editColumnDetails.newName !== columnToEdit.name) {
      changes.newName = editColumnDetails.newName;
    }
    if (editColumnDetails.newType?.toUpperCase() !== columnToEdit.type?.toUpperCase()) {
      changes.newType = editColumnDetails.newType;
    }
    if (editColumnDetails.newNullable !== columnToEdit.nullable) {
      changes.newNullable = editColumnDetails.newNullable;
    }
    // Handle default value changes carefully
    const currentDefault = columnToEdit.default !== null && columnToEdit.default !== undefined ? String(columnToEdit.default) : '';
    if (editColumnDetails.dropDefault) {
      changes.dropDefault = true;
    } else if (editColumnDetails.newDefault !== currentDefault) {
      changes.newDefault = editColumnDetails.newDefault; // Send the new default value (empty string means set to NULL effectively if allowed)
    }

    if (Object.keys(changes).length === 0) {
      setSnackbar({ open: true, message: 'No changes detected for the column.', severity: 'info' });
      handleCloseEditColumnDialog();
      return;
    }

    setLoading(true);
    try {
      const result = await DatabaseService.editColumn(database.id, selectedTable, columnToEdit.name, changes);
      if (result.success) {
        setSnackbar({ open: true, message: result.message || `Column '${columnToEdit.name}' updated successfully.`, severity: 'success' });
        handleCloseEditColumnDialog();
        await handleTableClick(selectedTable); // Refresh structure
      } else {
        setSnackbar({ open: true, message: result.message || `Failed to update column '${columnToEdit.name}'.`, severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'An unexpected error occurred while updating column.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  // --- End Edit Column Dialog Handlers ---

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
      <Box sx={{ pt: 0, mb: 1, display: 'flex', alignItems: 'center' }}> {/* Reduced mb and removed justifyContent */} 
        {/* <IconButton onClick={handleBack} sx={{ mr: 2 }}> // Removed ArrowBackIcon
          <ArrowBackIcon />
        </IconButton> */}
        <Typography variant="h4">
          SQL Editor
        </Typography>
      </Box>

      {/* Tabs moved to a new Box below the title, aligned to the left */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}> {/* Changed to flex-start */}
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

      <Grid container spacing={3} sx={{ flexGrow: 1, minHeight: 0, pb: 3 /* Add bottom padding here */ }}>
          {/* Table List Sidebar */}
            <Grid item xs={12} md={3} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <Paper sx={{ height: '100%', overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}> {/* Ensure Paper takes full height and allows scrolling */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={500}>Tables</Typography>
                  <Box>
                    <Tooltip title="Delete selected table">
                      <span> {/* Tooltip needs a span wrapper if button is disabled */} 
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={handleDeleteTable}
                          disabled={!selectedTable || !database || database.isSample}
                          sx={{ mr: 0.5 }} // Add some margin
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
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
          <Grid item xs={12} md={9} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            
            {/* --- Conditional Rendering for Editor Area --- */}
            {editorMode === 'expert' && (
              <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}> {/* Keep editor area with fixed size or min-height */}
                <AceEditor
                  mode="sql"
                  theme="github" // Choose your preferred theme
                  onChange={handleQueryChange} // Use the existing handler
                  value={query} // Bind to the query state
                  name="sql-query-editor"
                  editorProps={{ $blockScrolling: true }}
                  fontSize={14}
                  showPrintMargin={false}
                  showGutter={true}
                  highlightActiveLine={true}
                  width="100%"
                  height="200px" // Adjust height as needed
                  setOptions={{
                    enableBasicAutocompletion: true, // Enable basic autocompletion
                    enableLiveAutocompletion: true, // Enable live autocompletion
                    enableSnippets: false,
                    showLineNumbers: true,
                    tabSize: 2,
                  }}
                  placeholder={database ? `Enter your SQL query for ${database.name}...` : 'Select a database connection'}
                  readOnly={!database || loading} // Use readOnly instead of disabled
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
            )}
            {/* --- End Conditional Rendering --- */}

            {/* Results Area (remains visible in both modes for now, might adjust later) */}
            {loading && !results && <Box sx={{ display: 'flex', justifyContent: 'center', flexGrow: 1, alignItems: 'center' }}><CircularProgress /></Box>} {/* Center loading indicator, show only if results aren't already displayed */}
            
            {/* Display results if available (Expert Mode execution) */}
            {results && !loading && (
               <ResultsCard variant="outlined"> {/* ResultsCard now uses flexGrow */} 
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                            <Box sx={{ flexGrow: 1, overflow: 'auto' }}> {/* Ensure table container scrolls */}
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

            {/* Structure and Data Preview (Simple Mode) */} 
            {editorMode === 'simple' && selectedTable && (
                <Paper sx={{ p: 2, mt: editorMode === 'expert' ? 0 : 2, flexGrow: 1, overflow: 'auto' }}> {/* Add margin top only in simple mode */} 
                  <Box sx={{ mb: 4 }}> {/* Add margin bottom */} 
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" gutterBottom>Structure</Typography>
                        {!database?.isSample && selectedTable && (
                          <Button 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddColumnDialog}
                            sx={{ mb: 1, textTransform: 'none' }}
                            disabled={loading} // Disable if any loading is happening
                          >
                            Add Column
                          </Button>
                        )}
                      </Box>
                      {simpleModeLoading && <CircularProgress size={24} sx={{ mt: 2 }} />} 
                      {simpleModeError && <Alert severity="warning" sx={{ mt: 2 }}>{simpleModeError}</Alert>} 
                      {!simpleModeLoading && !simpleModeError && tableStructure.length > 0 && (
                        <TableContainer sx={{ maxHeight: '300px', overflowY: 'auto', mt: 1 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {/* Fixed headers for the structure table */}
                                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Nullable</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Default</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Key</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Extra</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {/* Iterate over the array of column definition objects */}
                              {tableStructure.map((column, index) => (
                                <TableRow key={`structure-col-${index}`}>
                                  <TableCell>
                                    {column.name}
                                    {!database?.isSample && selectedTable && (
                                      <Tooltip title={`Edit column ${column.name}`}>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleOpenEditColumnDialog(column)} // Pass the whole column object
                                          sx={{ ml: 1, p: 0.25 }}
                                          disabled={loading}
                                        >
                                          <EditIcon fontSize="inherit" color="action" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    {!database?.isSample && selectedTable && (
                                      <Tooltip title={`Delete column ${column.name}`}>
                                        <IconButton 
                                          size="small" 
                                          onClick={() => handleOpenDeleteColumnDialog(column.name)} 
                                          sx={{ ml: 1, p: 0.25 }} // Smaller padding
                                          disabled={loading} // Disable if any loading is happening
                                        >
                                          <DeleteIcon fontSize="inherit" color="action" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </TableCell>
                                  <TableCell>{column.type}</TableCell>
                                  <TableCell>{column.nullable ? 'YES' : 'NO'}</TableCell>
                                  <TableCell>{column.default !== null && column.default !== undefined ? String(column.default) : 'NULL'}</TableCell>
                                  <TableCell>{column.key || ''}</TableCell> {/* Display key info if present */}
                                  <TableCell>{column.extra || ''}</TableCell> {/* Display extra info if present */}
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
                                              <TableRow 
                                                key={`preview-row-${rowIndex}`}
                                                hover
                                                onClick={() => handleSelectRow(row, rowIndex)}
                                                selected={selectedRowIndex === rowIndex}
                                                sx={{ cursor: 'pointer' }}
                                              >
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

                              {/* Add/Edit/Delete Buttons for Simple Mode */} 
                              {/* Show button container if a table is selected, not loading, no error, and not a sample DB */}
                              {!simpleModeLoading && !simpleModeError && selectedTable && !database?.isSample && (
                                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                      <Button 
                                          variant="outlined"
                                          size="small"
                                          startIcon={<AddIcon />}
                                          onClick={handleOpenAddDialog}
                                          // Add button should be enabled if a table is selected and not main loading
                                          disabled={!selectedTable || loading} 
                                      >
                                          Add Row
                                      </Button>
                                      {/* Edit and Delete buttons should only be enabled if there's data and a row is selected */}
                                      <Button 
                                          variant="outlined"
                                          size="small"
                                          startIcon={<EditIcon />}
                                          onClick={handleOpenEditDialog}
                                          disabled={!selectedRowData || loading || simpleModeTableData.length === 0}
                                      >
                                          Edit Row
                                      </Button>
                                      <Button 
                                          variant="outlined"
                                          size="small"
                                          color="error"
                                          startIcon={<DeleteIcon />}
                                          onClick={handleOpenDeleteDialog}
                                          disabled={!selectedRowData || loading || simpleModeTableData.length === 0}
                                      >
                                          Delete Row
                                      </Button>
                                  </Box>
                              )}
                          </Box>
                      )}

                      {!selectedTable && (
                         <Typography sx={{ mt: 2, fontStyle: 'italic' }} color="textSecondary">
                           Select a table from the left sidebar to view its structure.
                         </Typography>
                      )}
                </Box>
              </Paper>
            )}
          </Grid> {/* Close Grid item md={9} */}
      </Grid> {/* Close Grid container */}

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

      {/* Add/Edit Row Dialog */} 
      <Dialog open={isAddEditDialogOpen} onClose={handleCloseAddEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode === 'add' ? 'Add New Row' : 'Edit Row'} in {selectedTable}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {editMode === 'add' ? 'Enter data for the new row.' : 'Modify the data for the selected row.'}
          </DialogContentText>
          {simpleModeTableColumns.map(colName => (
             <TextField
                key={colName}
                margin="dense"
                label={colName}
                type="text" // TODO: Could be smarter based on column type from schema
                fullWidth
                variant="outlined"
                value={rowFormData[colName] || ''}
                onChange={(e) => handleRowFormChange(colName, e.target.value)}
                // TODO: Add disabled property for primary keys in 'edit' mode?
              />
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddEditDialog}>Cancel</Button>
          <Button onClick={handleSaveRow} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20}/> : (editMode === 'add' ? 'Add Row' : 'Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Row Confirmation Dialog */} 
      <Dialog open={isDeleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
         <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}><WarningIcon color="error" sx={{ mr: 1 }} /> Delete Row</DialogTitle>
         <DialogContent>
           <DialogContentText>
             Are you sure you want to delete the selected row? This action cannot be undone.
             {/* Optionally display some row data here for confirmation */} 
           </DialogContentText>
         </DialogContent>
         <DialogActions sx={{ px: 3, pb: 2 }}>
           <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
           <Button onClick={handleConfirmDeleteRow} variant="contained" color="error" disabled={loading}>
             {loading ? <CircularProgress size={20}/> : 'Delete'}
           </Button>
         </DialogActions>
       </Dialog>

      {/* Add Column Dialog */} 
      <Dialog open={openAddColumnDialog} onClose={handleCloseAddColumnDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Column to {selectedTable}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Define the properties for the new column.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            fullWidth
            variant="outlined"
            value={newColumnDetails.name}
            onChange={(e) => handleNewColumnDetailChange('name', e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={newColumnDetails.type}
              label="Data Type"
              onChange={(e) => handleNewColumnDetailChange('type', e.target.value)}
            >
              <MenuItem value="INT">INT</MenuItem>
              <MenuItem value="VARCHAR(255)">VARCHAR(255)</MenuItem>
              <MenuItem value="TEXT">TEXT</MenuItem>
              <MenuItem value="DATE">DATE</MenuItem>
              <MenuItem value="TIMESTAMP">TIMESTAMP</MenuItem>
              <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
              <MenuItem value="DECIMAL(10,2)">DECIMAL(10,2)</MenuItem>
              {/* Add other types as supported by your backend validation */}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Default Value (optional)"
            fullWidth
            variant="outlined"
            value={newColumnDetails.defaultValue}
            onChange={(e) => handleNewColumnDetailChange('defaultValue', e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newColumnDetails.nullable}
                onChange={(e) => handleNewColumnDetailChange('nullable', e.target.checked)}
              />
            }
            label="Allow NULL values"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddColumnDialog}>Cancel</Button>
          <Button onClick={handleConfirmAddColumn} variant="contained" disabled={loading || !newColumnDetails.name.trim() || !newColumnDetails.type}>
            {loading ? <CircularProgress size={20}/> : 'Add Column'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Column Confirmation Dialog */} 
      <Dialog open={openDeleteColumnDialog} onClose={handleCloseDeleteColumnDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="error" sx={{ mr: 1 }} /> Delete Column
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the column <strong>{columnToDelete}</strong> from table <strong>{selectedTable}</strong>? 
            This action cannot be undone and might result in data loss if the column contains data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDeleteColumnDialog}>Cancel</Button>
          <Button onClick={handleConfirmDeleteColumn} variant="contained" color="error" disabled={loading}>
            {loading ? <CircularProgress size={20}/> : 'Delete Column'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Column Dialog */} 
      <Dialog open={openEditColumnDialog} onClose={handleCloseEditColumnDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Column '{columnToEdit?.name}' in {selectedTable}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Modify the properties for the column. Note: Data type changes might fail if incompatible with existing data.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            fullWidth
            variant="outlined"
            value={editColumnDetails.newName}
            onChange={(e) => handleEditColumnDetailChange('newName', e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Data Type</InputLabel>
            <Select
              value={editColumnDetails.newType}
              label="Data Type"
              onChange={(e) => handleEditColumnDetailChange('newType', e.target.value)}
            >
              {/* Same types as Add Column dialog */}
              <MenuItem value="INT">INT</MenuItem>
              <MenuItem value="VARCHAR(255)">VARCHAR(255)</MenuItem>
              <MenuItem value="TEXT">TEXT</MenuItem>
              <MenuItem value="DATE">DATE</MenuItem>
              <MenuItem value="TIMESTAMP">TIMESTAMP</MenuItem>
              <MenuItem value="BOOLEAN">BOOLEAN</MenuItem>
              <MenuItem value="DECIMAL(10,2)">DECIMAL(10,2)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label={`Default Value (Current: ${columnToEdit?.default ?? 'NULL'})`}
            helperText={editColumnDetails.dropDefault ? "Default value will be dropped." : "Leave blank to set no default (or NULL if allowed)."}
            fullWidth
            variant="outlined"
            value={editColumnDetails.newDefault}
            onChange={(e) => handleEditColumnDetailChange('newDefault', e.target.value)}
            sx={{ mb: 1 }} // Reduced margin bottom
            disabled={editColumnDetails.dropDefault}
          />
          <FormControlLabel
              control={
                  <Switch
                      checked={editColumnDetails.dropDefault}
                      onChange={(e) => handleEditColumnDetailChange('dropDefault', e.target.checked)}
                      size="small"
                  />
              }
              label="Drop existing default value"
              sx={{ mb: 2, display: 'block' }} // Ensure it takes block display
          />
          <FormControlLabel
            control={
              <Switch
                checked={editColumnDetails.newNullable}
                onChange={(e) => handleEditColumnDetailChange('newNullable', e.target.checked)}
              />
            }
            label="Allow NULL values"
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEditColumnDialog}>Cancel</Button>
          <Button onClick={handleConfirmEditColumn} variant="contained" disabled={loading || !editColumnDetails.newName?.trim() || !editColumnDetails.newType}>
            {loading ? <CircularProgress size={20}/> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

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