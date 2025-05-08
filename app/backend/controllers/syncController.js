/**
 * Sync Controller
 * Handles synchronization settings and triggering.
 */
const { getDbConnection } = require('../models/database'); // Import the function
const axios = require('axios'); // Import axios for internal API calls
const databaseService = require('../services/databaseService'); // Needed to get source connection details
const { decrypt } = require('../utils/encryptionUtil'); // Correct path
// Hypothetical service for database instance creation logic
// const InstanceService = require('../services/InstanceService'); 

// --- Helper Functions (Consider moving to a service/utils file later) ---

// Find a sync task entry based on source connection ID
async function findSyncTaskBySourceId(sourceId) {
  let db;
  try {
    db = await getDbConnection(); // Get connection
    // Use Promise-based db.get from 'sqlite' package
    console.log("[findSyncTaskBySourceId] Executing SELECT query...");
    const row = await db.get(
      'SELECT * FROM sync_tasks WHERE source_connection_id = ?',
      [sourceId]
    );
    console.log("[findSyncTaskBySourceId] Query finished. Row:", row);
    return row; // Returns the task row or undefined
  } catch (error) {
      console.error("[findSyncTaskBySourceId] Database error:", error);
      // Re-throw or handle as appropriate for the controller
      throw new Error(`Database error finding sync task: ${error.message}`);
  } finally {
    if (db) {
      try {
          console.log("[findSyncTaskBySourceId] Closing DB connection...");
          await db.close(); // Ensure connection is closed
          console.log("[findSyncTaskBySourceId] DB connection closed.");
      } catch (closeError) {
          console.error("[findSyncTaskBySourceId] Error closing DB:", closeError);
      }
    }
  }
}

// --- Controller Methods ---

exports.getSyncSettings = async (req, res) => {
  const sourceId = req.params.databaseId;
  let db;
  try {
    console.log(`[SyncController] Getting settings for source DB ID: ${sourceId}`);
    // Use a single DB connection for both queries
    db = await getDbConnection(); 
    
    // Find the task first
    const task = await db.get(
      'SELECT * FROM sync_tasks WHERE source_connection_id = ?',
      [sourceId]
    );

    let responseData = {};

    if (task) {
      console.log(`[SyncController] Found sync task:`, task);
      responseData = {
        enabled: !!task.enabled, 
        schedule: task.schedule || 'never',
        last_sync: task.last_sync, 
        target_connection_id: task.target_connection_id,
        last_log_status: null, // Default values
        last_log_message: null,
        last_log_timestamp: null
      };

      // Now find the latest log entry for this task
      const lastLog = await db.get(
        'SELECT status, message, end_time FROM sync_logs WHERE task_id = ? ORDER BY end_time DESC LIMIT 1',
        [task.id]
      );

      if (lastLog) {
        console.log(`[SyncController] Found last log entry for task ${task.id}:`, lastLog);
        responseData.last_log_status = lastLog.status;
        responseData.last_log_message = lastLog.message;
        responseData.last_log_timestamp = lastLog.end_time;
      }
      
      res.json(responseData);

    } else {
      console.log(`[SyncController] No sync task found for source DB ID: ${sourceId}. Returning defaults.`);
      res.json({
        enabled: false,
        schedule: 'never',
        last_sync: null,
        target_connection_id: null,
        last_log_status: null, // Ensure defaults are consistent
        last_log_message: null,
        last_log_timestamp: null
      });
    }
  } catch (error) {
    console.error(`[SyncController] Error getting sync settings for ${sourceId}:`, error);
    res.status(500).json({ message: error.message || 'Failed to retrieve sync settings.' });
  } finally {
    // Close the single connection
    if (db) {
      try {
          console.log("[getSyncSettings] Closing DB connection...");
          await db.close();
          console.log("[getSyncSettings] DB connection closed.");
      } catch (closeError) {
          console.error("[getSyncSettings] Error closing DB:", closeError);
      }
    }
  }
};

exports.updateSyncSettings = async (req, res) => {
  const sourceId = req.params.databaseId;
  const { enabled, schedule, target_connection_id } = req.body; 

  // Validate required fields for basic operation
  if (typeof enabled === 'undefined' || typeof schedule === 'undefined') {
    return res.status(400).json({ message: 'Missing required fields: enabled and schedule.' });
  }

  let db;
  try {
    console.log(`[SyncController] Updating settings for source DB ID: ${sourceId}`, { enabled, schedule, target_connection_id });
    
    let targetIdValue = null;
    let newTargetCreated = false; 
    let proceedWithSave = true; 
    let effectiveSchedule = schedule; // Use the passed schedule by default
    let effectiveEnabled = enabled; // Use the passed enabled status by default

    // --- Step 1: Determine Target ID Value (Handle potential creation) ---
    if (target_connection_id === '__CREATE_NEW__') {
        console.log("[SyncController] Create New Target requested.");
        // Proceed with creation regardless of the initial 'enabled' state from the request
        // The user explicitly chose to create a target.
        let sourceConnection = null;
        try {
            sourceConnection = await databaseService.getConnectionById(sourceId);
            if (!sourceConnection) {
                 res.status(404).json({ message: 'Source database connection not found.' });
                 proceedWithSave = false;
            }
        } catch (e) {
             console.error("[SyncController] Could not fetch source connection details:", e.message);
             res.status(500).json({ message: 'Could not retrieve source connection details to create target.' });
             proceedWithSave = false;
        }

        if (proceedWithSave) { // Only proceed if source was found
            // Generate a valid DB name: replace spaces/invalid chars with _, ensure length limit
            const baseName = sourceConnection.name.replace(/[^a-zA-Z0-9_]/g, '_');
            const timestamp = Date.now();
            const newDbName = `${baseName}_backup_${timestamp}`.substring(0, 63); 
            
            const newEngine = sourceConnection.engine;
            const creationPayload = {
                name: newDbName,
                engine: newEngine,
                // Let create-instance use its defaults for admin/target creds/host
                username: sourceConnection.username || 'sync_user', 
                password: `autogen_${Date.now()}`,
                ssl_enabled: sourceConnection.ssl_enabled,
                notes: `Auto-created sync target for ${sourceConnection.name}`
            };
            
            console.log("[SyncController] Calling internal create-instance API with payload:", creationPayload);
            try {
                const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
                const creationResponse = await axios.post(`${baseUrl}/api/databases/create-instance`, creationPayload);
                
                if (creationResponse.data && creationResponse.data.success && creationResponse.data.connection) {
                    targetIdValue = creationResponse.data.connection.id;
                    newTargetCreated = true;
                    console.log(`[SyncController] Successfully created new target DB connection with ID: ${targetIdValue}`);
                } else {
                    throw new Error(creationResponse.data.message || 'Failed to create database instance via internal API call.');
                }
            } catch (creationError) {
                 console.error("[SyncController] Error calling create-instance API:", creationError.response?.data || creationError.message);
                 const detail = creationError.response?.data?.message || creationError.message;
                 res.status(500).json({ message: `Failed to automatically create target database: ${detail}` });
                 proceedWithSave = false; // Stop the update process
            }
        }
        // If creating a new target, force the schedule to 'never' initially?
        // Or keep the requested schedule? Let's keep requested for now.
        // effectiveSchedule = 'never'; 
        // effectiveEnabled = false; // Maybe disable initially after creation?

    } else if (target_connection_id) {
        // Use the provided target ID
        targetIdValue = target_connection_id;
    }
    // If target_connection_id was empty or null, targetIdValue remains null

    // --- Step 2: Validation (removed - Step 3 handles creation/update logic) ---
    // if (enabled && !targetIdValue) { ... }

    // --- Step 3: Proceed with DB Update (if no creation error occurred) ---
    if (proceedWithSave) {
        const existingTask = await findSyncTaskBySourceId(sourceId);
        const now = new Date().toISOString();
        // Use the potentially modified effectiveEnabled/Schedule status
        const enabledValue = effectiveEnabled ? 1 : 0; 
        
        db = await getDbConnection();
        if (existingTask) {
            console.log(`[SyncController] Updating existing task ID: ${existingTask.id}`);
            await db.run(
                'UPDATE sync_tasks SET enabled = ?, schedule = ?, target_connection_id = ?, updated_at = ? WHERE id = ?',
                [enabledValue, effectiveSchedule, targetIdValue, now, existingTask.id] 
            );
            console.log(`[SyncController] Sync task ${existingTask.id} updated.`);
            const responsePayload = { message: 'Sync settings updated successfully.' };
            if (newTargetCreated) {
                responsePayload.newTargetId = targetIdValue;
            }
            res.json(responsePayload);
        } else {
            // Only create if a target was actually determined
            if (targetIdValue) {
                const defaultName = `Sync for Connection ${sourceId}`;
                console.log(`[SyncController] Creating new sync task entry for source DB ID: ${sourceId} targeting ${targetIdValue} (Enabled: ${effectiveEnabled})`);
                const result = await db.run(
                    'INSERT INTO sync_tasks (name, source_connection_id, target_connection_id, enabled, schedule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [defaultName, sourceId, targetIdValue, enabledValue, effectiveSchedule, now, now] 
                );
                const newTaskId = result.lastID;
                console.log(`[SyncController] New sync task created with ID: ${newTaskId}`);
                const responsePayload = { message: 'Sync settings saved successfully (new task created).', taskId: newTaskId };
                if (newTargetCreated) {
                    responsePayload.newTargetId = targetIdValue;
                }
                res.status(201).json(responsePayload);
            } else {
                // This case now means target_connection_id was null/empty AND not '__CREATE_NEW__'
                console.log(`[SyncController] No existing task and no valid target determined. No task created/updated.`);
                res.json({ message: 'Sync settings received (no active task configured).' });
            }
        }
    } // End if(proceedWithSave)

  } catch (error) {
    console.error(`[SyncController] Error updating sync settings for ${sourceId}:`, error);
    res.status(500).json({ message: error.message || 'Failed to update sync settings.' });
  } finally {
    if (db) {
      try {
          console.log("[updateSyncSettings] Closing DB connection...");
          await db.close(); // Ensure connection is closed
          console.log("[updateSyncSettings] DB connection closed.");
      } catch (closeError) {
          console.error("[updateSyncSettings] Error closing DB:", closeError);
      }
    }
  }
};

exports.triggerSync = async (req, res) => {
  const sourceDbId = req.params.databaseId;
  let task = null; // Define task variable in outer scope
  try {
    console.log(`[SyncController] Received trigger request for source DB ID: ${sourceDbId}`);
    // findSyncTaskBySourceId handles its own connection
    task = await findSyncTaskBySourceId(sourceDbId); // Assign to outer scope variable

    if (!task) {
      return res.status(404).json({ message: 'No sync task configured for this database.' });
    }
    if (!task.target_connection_id) {
      return res.status(400).json({ message: 'Sync task exists but has no target database configured.' });
    }

    console.log(`[SyncController] Found task ID ${task.id} (Source: ${task.source_connection_id}, Target: ${task.target_connection_id}, Enabled: ${task.enabled}). Fetching connection details...`);

    // Fetch connection details for source and target
    const [sourceConnection, targetConnection] = await Promise.all([
      databaseService.getConnectionById(task.source_connection_id),
      databaseService.getConnectionById(task.target_connection_id)
    ]);

    if (!sourceConnection || !targetConnection) {
        console.error(`[SyncController] Could not find connection details for source (${task.source_connection_id}) or target (${task.target_connection_id}).`);
        return res.status(404).json({ message: 'Could not find connection details for source or target database.' });
    }

    // Decrypt passwords (assuming decrypt function is available)
    const sourcePassword = sourceConnection.encrypted_password ? decrypt(sourceConnection.encrypted_password) : sourceConnection.password;
    const targetPassword = targetConnection.encrypted_password ? decrypt(targetConnection.encrypted_password) : targetConnection.password;

    // Prepare payload for Python service
    const syncPayload = {
      taskId: task.id,
      source: {
          id: sourceConnection.id,
          engine: sourceConnection.engine,
          host: sourceConnection.host,
          port: sourceConnection.port,
          database: sourceConnection.database,
          username: sourceConnection.username,
          password: sourcePassword, // Use decrypted password
          ssl_enabled: sourceConnection.ssl_enabled
      },
      target: {
          id: targetConnection.id,
          engine: targetConnection.engine,
          host: targetConnection.host,
          port: targetConnection.port,
          database: targetConnection.database,
          username: targetConnection.username,
          password: targetPassword, // Use decrypted password
          ssl_enabled: targetConnection.ssl_enabled
      },
      // Include tables to sync (assuming stored as JSON string or comma-separated)
      tables: task.tables ? JSON.parse(task.tables) : null // Parse JSON or handle other formats
    };

    // --- Communicate with the Python db-sync service ---
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://db-sync:5000';
      // Change endpoint to accept POST with data, not task ID in URL
      const triggerUrl = `${pythonServiceUrl}/trigger_sync`; 
      console.log(`[SyncController] Calling Python sync service trigger endpoint: POST ${triggerUrl}`);

      const triggerResponse = await axios.post(triggerUrl,
        syncPayload, // Send connection details and task info
        { timeout: 15000 } 
      );

      if (triggerResponse.status === 200 || triggerResponse.status === 202) {
        console.log(`[SyncController] Python service responded successfully:`, triggerResponse.data);
        res.json({ message: triggerResponse.data?.message || `Synchronization successfully triggered for task ${task.id}.` });
      } else {
        console.warn(`[SyncController] Python service responded with unexpected status ${triggerResponse.status}:`, triggerResponse.data);
        throw new Error(`Python service responded with status ${triggerResponse.status}`);
      }

    } catch (pythonError) {
      // ... existing error handling ...
       console.error(`[SyncController] Error communicating with Python sync service for task ${task?.id || 'unknown'}:`, pythonError.response?.data || pythonError.message);
       let statusCode = 502;
       let errorMessage = 'Failed to trigger synchronization task due to an upstream service error.';
       if (pythonError.code === 'ECONNREFUSED') {
           statusCode = 503;
           errorMessage = 'Failed to trigger synchronization: Sync service is unavailable.';
       } else if (pythonError.code === 'ETIMEDOUT' || pythonError.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Failed to trigger synchronization: Request to sync service timed out.';
       } else if (pythonError.response) {
            statusCode = pythonError.response.status >= 500 ? 502 : pythonError.response.status;
            errorMessage = `Failed to trigger synchronization task. Upstream service error (${pythonError.response.status}): ${pythonError.response.data?.message || 'Unknown upstream error'}`;
       } else {
            errorMessage = `Failed to trigger synchronization task: ${pythonError.message}`;
       }
        res.status(statusCode).json({
          message: errorMessage,
          error: pythonError.message
        });
    }
    // ----------------------------------------------------------------------------

  } catch (error) {
     // Catch errors from findSyncTaskBySourceId or fetching connections
    console.error(`[SyncController] Error during sync trigger setup for source ${sourceDbId}:`, error);
    res.status(500).json({ message: error.message || 'Internal server error while preparing to trigger sync.' });
  }
};

// --- NEW METHOD --- 
/**
 * Get all configured synchronization tasks for overview
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllSyncTasks = async (req, res) => {
  let db;
  try {
    console.log("[SyncController] Getting all sync tasks for overview...");
    db = await getDbConnection();

    const tasks = await db.all(`
      SELECT
        st.id AS task_id,
        st.schedule,
        st.enabled,
        st.last_sync,
        st.source_connection_id,
        src_conn.name AS source_db_name,
        src_conn.engine AS source_db_engine,
        st.target_connection_id,
        tgt_conn.name AS target_db_name,
        tgt_conn.engine AS target_db_engine
      FROM
        sync_tasks st
      LEFT JOIN
        database_connections src_conn ON st.source_connection_id = src_conn.id
      LEFT JOIN
        database_connections tgt_conn ON st.target_connection_id = tgt_conn.id
      ORDER BY
        src_conn.name ASC, st.created_at DESC
    `);

    console.log(`[SyncController] Found ${tasks.length} sync tasks.`);
    res.json({ success: true, tasks: tasks });

  } catch (error) {
    console.error("[SyncController] Error getting all sync tasks:", error);
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve sync tasks.' });
  } finally {
    if (db) {
      try {
        console.log("[getAllSyncTasks] Closing DB connection...");
        await db.close();
        console.log("[getAllSyncTasks] DB connection closed.");
      } catch (closeError) {
        console.error("[getAllSyncTasks] Error closing DB:", closeError);
      }
    }
  }
};

// --- NEW METHOD: Delete Sync Task ---
exports.deleteSyncTask = async (req, res) => {
  const taskId = req.params.taskId;
  let db;
  try {
    console.log(`[SyncController] Deleting sync task with ID: ${taskId}`);
    db = await getDbConnection();
    const result = await db.run('DELETE FROM sync_tasks WHERE id = ?', [taskId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Sync task not found.' });
    }
    
    console.log(`[SyncController] Sync task ${taskId} deleted successfully.`);
    res.json({ success: true, message: 'Sync task deleted successfully.' });

  } catch (error) {
    console.error(`[SyncController] Error deleting sync task ${taskId}:`, error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete sync task.' });
  } finally {
    if (db) {
      try {
        await db.close();
      } catch (closeError) {
        console.error("[deleteSyncTask] Error closing DB:", closeError);
      }
    }
  }
};

// --- NEW METHOD: Update Sync Task ---
exports.updateSyncTask = async (req, res) => {
  const taskId = req.params.taskId;
  // Allow updating enabled status and schedule for now
  const { enabled, schedule } = req.body; 
  let db;

  // Basic validation: At least one field must be provided
  if (typeof enabled === 'undefined' && typeof schedule === 'undefined') {
    return res.status(400).json({ message: 'No update data provided (expected enabled or schedule).' });
  }

  try {
    console.log(`[SyncController] Updating task ID: ${taskId}`, req.body);
    db = await getDbConnection();

    // Construct the SET part of the query dynamically
    const fieldsToUpdate = {};
    if (typeof enabled !== 'undefined') {
      fieldsToUpdate.enabled = enabled ? 1 : 0;
    }
    if (typeof schedule !== 'undefined') {
      // Optional: Add validation for schedule value here if needed
      fieldsToUpdate.schedule = schedule;
    }
    fieldsToUpdate.updated_at = new Date().toISOString();

    const setClauses = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), taskId];

    if (!setClauses) { // Should not happen due to validation above
        return res.status(400).json({ message: 'No valid fields to update.'});
    }

    const query = `UPDATE sync_tasks SET ${setClauses} WHERE id = ?`;
    console.log("[updateSyncTask] Executing query:", query, values);
    const result = await db.run(query, values);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Sync task not found or no changes made.' });
    }

    console.log(`[SyncController] Sync task ${taskId} updated successfully.`);
    res.json({ success: true, message: 'Sync task updated successfully.' });

  } catch (error) {
    console.error(`[SyncController] Error updating sync task ${taskId}:`, error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update sync task.' });
  } finally {
    if (db) {
      try {
        await db.close();
      } catch (closeError) {
        console.error("[updateSyncTask] Error closing DB:", closeError);
      }
    }
  }
}; 