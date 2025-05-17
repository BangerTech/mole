import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  FormHelperText,
  Divider
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import DatabaseService from '../services/DatabaseService';
import { formatDistanceToNow } from 'date-fns'; // Import date-fns for relative time

// MUI Dialog imports
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';

const CREATE_NEW_TARGET_VALUE = "__CREATE_NEW__"; // Constant for special value

const DatabaseSyncTab = ({ databaseId, databaseInfo }) => {
  // State for loading settings
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState('never'); // Default to 'never'
  const [lastSyncTime, setLastSyncTime] = useState('Never');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false); // State for PUT request

  // State for manual sync operation
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(null);

  // State for target selection
  const [availableTargets, setAvailableTargets] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState(''); // Store the ID or special value
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  // New state for last log status
  const [lastLogStatus, setLastLogStatus] = useState(null);
  const [lastLogMessage, setLastLogMessage] = useState(null);
  const [lastLogTimestamp, setLastLogTimestamp] = useState(null);

  // State for dialog
  const [showCreateDbDialog, setShowCreateDbDialog] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [newDbUser, setNewDbUser] = useState('');
  const [newDbPassword, setNewDbPassword] = useState('');
  const [newDbPasswordConfirm, setNewDbPasswordConfirm] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Load initial state from API
  useEffect(() => {
    const loadData = async () => {
      if (!databaseId) return;
      setIsLoadingSettings(true);
      setIsLoadingTargets(true);
      setSettingsError(null);
      setAvailableTargets([]);
      setSelectedTargetId('');
      setLastLogStatus(null); // Reset log status
      setLastLogMessage(null);
      setLastLogTimestamp(null);

      try {
        // Fetch current settings
        console.log("Loading sync settings via API for", databaseId);
        const fetchedSettings = await DatabaseService.getSyncSettings(databaseId);
        setIsSyncEnabled(fetchedSettings.enabled || false);
        setSyncFrequency(fetchedSettings.schedule || 'never');
        setLastSyncTime(fetchedSettings.last_sync ? new Date(fetchedSettings.last_sync).toLocaleString() : 'Never');
        setSelectedTargetId(fetchedSettings.target_connection_id || '');
        // Store last log info
        setLastLogStatus(fetchedSettings.last_log_status);
        setLastLogMessage(fetchedSettings.last_log_message);
        setLastLogTimestamp(fetchedSettings.last_log_timestamp);

        // Fetch all connections to populate the target dropdown
        console.log("Fetching available target connections...");
        const allConnections = await DatabaseService.getDatabaseConnections();
        // Filter out the current source database
        const potentialTargets = allConnections.filter(conn => conn.id.toString() !== databaseId.toString());
        setAvailableTargets(potentialTargets);

      } catch (error) {
        console.error("Failed to load sync settings or targets:", error);
        setSettingsError(error.message || 'Could not load synchronization settings or target list.');
      } finally {
        setIsLoadingSettings(false);
        setIsLoadingTargets(false);
      }
    };
    loadData();
  }, [databaseId]);

  // Refactored: Accepts explicit target ID and optional new DB credentials
  const updateSettings = async (settingsUpdate) => {
    // Destructure all possible parameters, including new ones for DB creation
    const { enabled, schedule, targetId, newDbName, newDbUser, newDbPassword } = settingsUpdate;
    
    if (!databaseId) return;
    
    // --- MODIFIED VALIDATION ---
    // If enabling, a target must be provided OR we must be in the process of creating one.
    // If targetId is empty AND not CREATE_NEW_TARGET_VALUE (which implies we are creating), then error.
    if (enabled && !targetId && targetId !== CREATE_NEW_TARGET_VALUE) {
      setSettingsError("Please select a target database or choose to create a new one when enabling sync.");
      // Reset isUpdatingSettings if it was set by the caller
      if (isUpdatingSettings) setIsUpdatingSettings(false);
      return; 
    }
    // Clear error if validation passes
    setSettingsError(null);

    // setIsUpdatingSettings(true); // Caller might set this (e.g., handleCreateDbDialogSubmit)
                                 // or it's set at the start of this function if not already set.
    if (!isUpdatingSettings) setIsUpdatingSettings(true); // Ensure it's true for this operation
    setSyncSuccess(null); 

    try {
      const payload = { 
        enabled: enabled,
        schedule: schedule,
        target_connection_id: targetId || null 
      };

      // If creating a new target, add the new DB credentials to the payload
      if (targetId === CREATE_NEW_TARGET_VALUE && newDbName && newDbUser && newDbPassword) {
        payload.newDbName = newDbName;
        payload.newDbUser = newDbUser;
        payload.newDbPassword = newDbPassword;
      }
      
      console.log("Updating settings with payload:", payload);
      const result = await DatabaseService.updateSyncSettings(databaseId, payload);
      // Assuming result.message contains success message
      // setSyncSuccess(result.message || 'Synchronization settings saved successfully.'); 

      const dbName = databaseInfo?.name || 'this database';
      let scheduleText = '';
      if (payload.enabled && payload.schedule && payload.schedule !== 'never') {
        scheduleText = ` and scheduled ${payload.schedule}`;
      }
      const enabledText = payload.enabled ? 'ENABLED' : 'DISABLED';
      const backendMessage = result.message ? ` ${result.message}` : ''; // Add space

      setSyncSuccess(`Settings for '${dbName}' saved. Sync is ${enabledText}${scheduleText}.${backendMessage}`);
      
      // Handle new target creation response
      if (targetId === CREATE_NEW_TARGET_VALUE && result.newTargetId) {
          console.log("Backend created new target with ID:", result.newTargetId);
          // Refresh target list and select the new one
          setSelectedTargetId(result.newTargetId.toString()); // Ensure it's a string
          
          // Fetch all connections again to update the dropdown
          setIsLoadingTargets(true);
          try {
            const allConnections = await DatabaseService.getDatabaseConnections();
            const potentialTargets = allConnections.filter(conn => conn.id.toString() !== databaseId.toString());
            setAvailableTargets(potentialTargets);
          } catch (fetchError) {
            console.error("Failed to refresh target list after creation:", fetchError);
            // Non-critical, but log it. The selectedTargetId is updated anyway.
          } finally {
            setIsLoadingTargets(false);
          }
          setIsSyncEnabled(payload.enabled); // Reflect the 'enabled' state passed during the creation
      } else if (targetId !== CREATE_NEW_TARGET_VALUE) {
          // If we were just updating settings for an existing target, ensure UI reflects this
          // These are already being set by the direct handlers (handleEnableChange, etc.)
          // but explicitly setting from payload ensures consistency if backend modified something.
          setIsSyncEnabled(payload.enabled);
          setSyncFrequency(payload.schedule);
          setSelectedTargetId(payload.target_connection_id || '');
      }

      // Refresh sync status details immediately after any successful update
      try {
        console.log("Refreshing sync status after settings update for", databaseId);
        const fetchedSettings = await DatabaseService.getSyncSettings(databaseId);
        setIsSyncEnabled(fetchedSettings.enabled || false);
        setSyncFrequency(fetchedSettings.schedule || 'never');
        setLastSyncTime(fetchedSettings.last_sync ? new Date(fetchedSettings.last_sync).toLocaleString() : 'Never');
        setSelectedTargetId(fetchedSettings.target_connection_id || '');
        setLastLogStatus(fetchedSettings.last_log_status);
        setLastLogMessage(fetchedSettings.last_log_message);
        setLastLogTimestamp(fetchedSettings.last_log_timestamp);
      } catch (refreshError) {
        console.warn("Could not refresh sync status immediately after update:", refreshError);
        // Non-critical, the periodic poll or next manual refresh will catch up
      }

    } catch (error) {
       console.error("Failed to update sync settings:", error);
       setSettingsError(error.message || 'Could not save synchronization settings.');
    } finally {
        setIsUpdatingSettings(false);
    }
  };

  const handleEnableChange = (event) => {
    const newEnabledState = event.target.checked;
    setIsSyncEnabled(newEnabledState);
    // Pass the *current* selectedTargetId state
    updateSettings({ 
      enabled: newEnabledState, 
      schedule: syncFrequency, 
      targetId: selectedTargetId // Explicitly pass current state value
    });
  };

  const handleFrequencyChange = (event) => {
    const newFrequency = event.target.value;
    setSyncFrequency(newFrequency);
    // Only update if enabled AND a target is selected (state check is okay here)
    if (isSyncEnabled && selectedTargetId) { 
        // Pass the *current* selectedTargetId state
        updateSettings({ 
            enabled: isSyncEnabled, 
            schedule: newFrequency, 
            targetId: selectedTargetId // Explicitly pass current state value
        });
    }
  };

  const handleTargetChange = (event) => {
      const newTargetValue = event.target.value;
      setSelectedTargetId(newTargetValue);
      setSettingsError(null); // Clear general settings error

      if (newTargetValue === CREATE_NEW_TARGET_VALUE) {
          // Open the dialog instead of calling updateSettings directly
          setNewDbName(''); // Clear previous entries
          setNewDbUser('');
          setNewDbPassword('');
          setNewDbPasswordConfirm('');
          setDialogError(''); // Clear previous dialog errors
          setShowCreateDbDialog(true);
      } else {
          // If an existing target is selected, or if "Select Target..." (empty value) is chosen,
          // proceed to update settings as before.
          // The updateSettings function already handles the case where newTargetValue might be empty.
          updateSettings({ 
            enabled: isSyncEnabled,
            schedule: syncFrequency, 
            targetId: newTargetValue // This will be the ID of an existing DB or ''
          }); 
      }
  };

  const handleManualSync = async () => {
    if (!databaseId) return;

    setSyncError(null);
    setSyncSuccess(null);

    // Case 1: User selected "+ Create New Target Database"
    if (selectedTargetId === CREATE_NEW_TARGET_VALUE) {
      // If the dialog process hasn't resulted in a real target ID yet.
      setSyncError('Please complete the "Create New Target Database" configuration using the dialog first, then try syncing.');
      if (!showCreateDbDialog) { // If dialog is not already open, open it as a hint.
          setShowCreateDbDialog(true);
      }
      return;
    }

    // Case 2: An existing target database is selected (selectedTargetId is a real ID)
    if (!selectedTargetId) { // Should not happen if button is enabled, but as a safeguard
        setSyncError('Please select a target database before starting a manual sync.');
        return;
    }
    
    setIsSyncing(true);
    try {
      console.log(`Triggering sync for databaseId: ${databaseId} to targetId: ${selectedTargetId}`);
      const result = await DatabaseService.triggerSync(databaseId);
      setSyncSuccess(result.message || `Synchronization started successfully.`);
      
      // Optionally, refresh last sync time and log status after a short delay
      setTimeout(async () => {
        try {
          const fetchedSettings = await DatabaseService.getSyncSettings(databaseId);
          setLastSyncTime(fetchedSettings.last_sync ? new Date(fetchedSettings.last_sync).toLocaleString() : 'Never');
          setLastLogStatus(fetchedSettings.last_log_status);
          setLastLogMessage(fetchedSettings.last_log_message);
          setLastLogTimestamp(fetchedSettings.last_log_timestamp);
        } catch (e) {
          console.warn("Could not refresh sync status after manual trigger.", e);
        }
      }, 5000); // Refresh after 5 seconds

    } catch (error) {
      console.error("Manual sync error:", error);
      setSyncError(error.message || 'Failed to start manual sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Render Loading State for Settings
  if (isLoadingSettings || isLoadingTargets) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
        </Box>
    );
  }
  
  // Render Error State for Settings
  if (settingsError && !isUpdatingSettings) { // Don't hide controls if update fails
      return (
          <Box sx={{ p: 3 }}>
              <Alert severity="error">{settingsError}</Alert>
          </Box>
      );
  }

  const handleCreateDbDialogSubmit = async () => {
    setDialogError(''); // Clear previous dialog errors

    // Basic Validation
    if (!newDbName.trim() || !newDbUser.trim() || !newDbPassword.trim()) {
      setDialogError('All fields (Database Name, Username, Password) are required.');
      return;
    }
    if (newDbPassword !== newDbPasswordConfirm) {
      setDialogError('Passwords do not match.');
      return;
    }

    // We are now ready to call updateSettings with the new DB details
    // We'll also set 'enabled' to true by default when creating a new target this way,
    // and keep the current syncFrequency. The user can change these after creation.
    // The selectedTargetId is already CREATE_NEW_TARGET_VALUE.

    // Show loading indicator for the main settings update
    setIsUpdatingSettings(true); 
    setShowCreateDbDialog(false); // Close dialog immediately

    await updateSettings({
      enabled: true, // Let's enable by default when user explicitly creates
      schedule: syncFrequency,
      targetId: CREATE_NEW_TARGET_VALUE, // Signal to backend to use new credentials
      // Pass the new credentials
      newDbName: newDbName.trim(),
      newDbUser: newDbUser.trim(),
      newDbPassword: newDbPassword 
    });

    // Clear dialog fields after submission attempt (success or fail)
    // updateSettings will set settingsError or syncSuccess
    setNewDbName('');
    setNewDbUser('');
    setNewDbPassword('');
    setNewDbPasswordConfirm('');
    // setIsUpdatingSettings(false) is handled by updateSettings itself.
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Synchronization Settings</Typography>
      
      {/* Display Last Sync Status */}
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        Last Successful Sync: {lastSyncTime}
      </Typography>

      {/* Display Status of Last Attempt */} 
      {lastLogStatus && lastLogTimestamp && (
        <Alert 
          severity={lastLogStatus === 'success' ? 'info' : 'warning'} 
          sx={{ mb: 3 }} 
          icon={false} // Remove default icon for cleaner look
        >
          <Typography variant="body2">
            <strong>Last Attempt ({formatDistanceToNow(new Date(lastLogTimestamp), { addSuffix: true })}):</strong> 
            {lastLogStatus === 'success' ? 'Completed successfully.' : `Failed - ${lastLogMessage || 'Unknown error'}`}
          </Typography>
        </Alert>
      )}

      {/* Show indicator while updating settings */}
      {isUpdatingSettings && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} alignItems="center">
        {/* Enable/Disable Switch */}
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={isSyncEnabled} onChange={handleEnableChange} disabled={isUpdatingSettings}/>}
            label="Enable Automatic Synchronization"
          />
           {isSyncEnabled && !selectedTargetId && selectedTargetId !== CREATE_NEW_TARGET_VALUE && (
                <Typography variant="caption" color="error" sx={{ display: 'block', ml: 4 }}>
                    Select a target database to activate synchronization.
                </Typography>
            )}
        </Grid>

        {/* Target Database Dropdown */}
         <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={isSyncEnabled && !selectedTargetId && selectedTargetId !== CREATE_NEW_TARGET_VALUE} disabled={isUpdatingSettings || isLoadingTargets}>
            <InputLabel id="target-database-label">Target Database</InputLabel>
            <Select
              labelId="target-database-label"
              value={selectedTargetId}
              label="Target Database *"
              onChange={handleTargetChange}
            >
              <MenuItem value="">
                  <em>Select Target...</em>
              </MenuItem>
              {/* Add the special option */} 
              <MenuItem value={CREATE_NEW_TARGET_VALUE}>
                  <strong>+ Create New Target Database</strong>
              </MenuItem>
              {/* Divider if needed */}
              {availableTargets.length > 0 && <Divider />} 
              {availableTargets.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name} ({conn.engine} @ {conn.host || conn.database})
                </MenuItem>
              ))}
            </Select>
             {/* Update helper text */} 
             <FormHelperText>{isSyncEnabled && !selectedTargetId && selectedTargetId !== CREATE_NEW_TARGET_VALUE ? "Required: Select or create target" : "Select existing or create a new target DB"}</FormHelperText>
          </FormControl>
        </Grid>

        {/* Sync Frequency Dropdown */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={!isSyncEnabled || isUpdatingSettings}>
            <InputLabel id="sync-frequency-label">Frequency</InputLabel>
            <Select
              labelId="sync-frequency-label"
              value={syncFrequency}
              label="Frequency"
              onChange={handleFrequencyChange}
            >
              <MenuItem value={'never'}>Never (Manual Only)</MenuItem>
              <MenuItem value={'hourly'}>Hourly</MenuItem>
              <MenuItem value={'daily'}>Daily</MenuItem>
              <MenuItem value={'weekly'}>Weekly</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Manual Sync Button */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Button 
            variant="contained"
            color="primary"
            startIcon={isSyncing ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={handleManualSync}
            // Disable if syncing, updating, or no target selected (ID or create option)
            disabled={isSyncing || isUpdatingSettings || !selectedTargetId} 
          >
            {isSyncing ? 'Syncing Now...' : 'Sync/Backup Now'}
          </Button>
        </Grid>

        {/* Feedback Messages for manual sync*/}
        {syncError && (
          <Grid item xs={12}>
            <Alert severity="error">{syncError}</Alert>
          </Grid>
        )}
        {syncSuccess && (
          <Grid item xs={12}>
            <Alert severity="success">{syncSuccess}</Alert>
          </Grid>
        )}

      </Grid>

      {/* Dialog for Creating New Target Database */}
      <Dialog open={showCreateDbDialog} onClose={() => { setShowCreateDbDialog(false); setDialogError(''); setNewDbName(''); setNewDbUser(''); setNewDbPassword(''); setNewDbPasswordConfirm(''); }}>
        <DialogTitle>Create New Target Database</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Please provide the details for the new target database.
            This database and user will be created on the server.
          </DialogContentText>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            id="newDbName"
            label="Database Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newDbName}
            onChange={(e) => setNewDbName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="newDbUser"
            label="Database Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newDbUser}
            onChange={(e) => setNewDbUser(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="newDbPassword"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newDbPassword}
            onChange={(e) => setNewDbPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            id="newDbPasswordConfirm"
            label="Confirm Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newDbPasswordConfirm}
            onChange={(e) => setNewDbPasswordConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowCreateDbDialog(false); setDialogError(''); setNewDbName(''); setNewDbUser(''); setNewDbPassword(''); setNewDbPasswordConfirm(''); }}>Cancel</Button>
          <Button onClick={handleCreateDbDialogSubmit}>Create & Configure</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default DatabaseSyncTab; 