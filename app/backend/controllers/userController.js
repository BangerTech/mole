const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { getDbConnection } = require('../models/database'); // Import DB connection

// Pfad zur Benutzerdatei - wird nicht mehr primär genutzt, nur noch für Avatare
// const usersPath = path.join(__dirname, '../data/users.json'); 
const avatarsDir = path.join(__dirname, '../data/avatars');

// Ensure avatars directory exists
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const userId = req.params.userId || req.user.id; // Prefer userId from params, fallback to authenticated user
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `user-${userId}-${timestamp}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes));
  }
});

/**
 * Alle Benutzer aus der Datei abrufen - ERSETZT DURCH DB-ZUGRIFF
 * @returns {Array} - Array von Benutzern
 */
// const getUsers = () => {
//   try {
//     const usersData = fs.readFileSync(usersPath, 'utf8');
//     return JSON.parse(usersData);
//   } catch (error) {
//     console.error('Error reading users file:', error);
//     return [];
//   }
// };

/**
 * Benutzer in Datei speichern - ERSETZT DURCH DB-ZUGRIFF
 * @param {Array} users - Array von zu speichernden Benutzern
 */
// const saveUsers = (users) => {
//   try {
//     fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
//   } catch (error) {
//     console.error('Error writing users file:', error);
//     throw error;
//   }
// };

/**
 * Benutzer nach ID suchen - ERSETZT DURCH DB-ZUGRIFF
 * @param {number} id - Benutzer-ID
 * @returns {Object|null} - Benutzerobjekt oder null
 */
// const findUserById = (id) => {
//   const users = getUsers();
//   return users.find(user => user.id === parseInt(id)) || null; // Ensure ID is integer for comparison
// };

module.exports = {
  // Middleware for multer, can be used in routes
  uploadAvatarMiddleware: upload.single('avatar'),

  /**
   * Uploads or updates a user's avatar.
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  uploadAvatar: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar file uploaded.' });
      }

      // const users = getUsers(); // Old
      // const userIndex = users.findIndex(user => user.id === userId); // Old
      const userToUpdate = await db.get('SELECT id, profile_image FROM users WHERE id = ?', userId);

      if (!userToUpdate) {
        // Optionally remove uploaded file if user not found
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { console.error('Failed to delete orphaned avatar:', e);}
        }
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const avatarUrl = `/data/avatars/${req.file.filename}`; // Web-accessible path

      // Remove old avatar if it exists and is different
      const oldAvatarPath = userToUpdate.profile_image;
      if (oldAvatarPath && oldAvatarPath !== avatarUrl) {
        let oldAvatarFsPath = '';
        // Construct FS path based on how it's stored (e.g., /data/avatars/file.png or /avatars/file.png)
        if (oldAvatarPath.startsWith('/data/avatars/')) {
            oldAvatarFsPath = path.join(__dirname, '../data/avatars', path.basename(oldAvatarPath));
        } else if (oldAvatarPath.startsWith('/avatars/')) { // Fallback for potential older format
             oldAvatarFsPath = path.join(__dirname, '../data/avatars', path.basename(oldAvatarPath));
        }
        // Add more conditions if other path structures were used for profile_image

        if (oldAvatarFsPath && fs.existsSync(oldAvatarFsPath)) {
          try {
            fs.unlinkSync(oldAvatarFsPath);
            console.log(`Old avatar ${oldAvatarFsPath} deleted for user ${userId}.`);
          } catch (err) {
            console.error(`Failed to delete old avatar ${oldAvatarFsPath} for user ${userId}:`, err);
          }
        }
      }
      
      // users[userIndex].profileImage = avatarUrl; // Old
      // saveUsers(users); // Old
      await db.run('UPDATE users SET profile_image = ? WHERE id = ?', avatarUrl, userId);
      console.log(`[userController - uploadAvatar] Stored avatarUrl in DB for userId ${userId}: ${avatarUrl}`);

      // Fetch the updated user to return (without password_hash)
      const updatedUserFromDb = await db.get(
          'SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users WHERE id = ?',
          userId
      );
      
      let finalUpdatedUser = { ...updatedUserFromDb };
      try {
        finalUpdatedUser.preferences = finalUpdatedUser.preferences ? JSON.parse(finalUpdatedUser.preferences) : null;
      } catch (e) {
        finalUpdatedUser.preferences = null;
      }
      
      res.json({ 
        success: true, 
        message: 'Avatar uploaded successfully.',
        user: finalUpdatedUser, 
        avatarUrl: avatarUrl 
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      // If an error occurs after file upload, attempt to delete the uploaded file
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to delete file after upload error:', unlinkErr);
        }
      }
      if (error.message.startsWith('Error: File upload only supports')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Error uploading avatar.' });
    }
  },

  /**
   * Alle Benutzer abrufen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  getAllUsers: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const usersFromDb = await db.all('SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users');
      
      // Parse preferences if they exist
      const users = usersFromDb.map(user => {
        try {
          return {
            ...user,
            preferences: user.preferences ? JSON.parse(user.preferences) : null
          };
        } catch (e) {
          console.error(`Failed to parse preferences for user ${user.id}:`, user.preferences, e);
          return { ...user, preferences: null }; // Fallback if parsing fails
        }
      });

      res.json({ 
        success: true, 
        users // users already excludes password_hash
      });
    } catch (error) {
      console.error('Error getting all users from DB:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving users' 
      });
    } finally {
      if (db) await db.close();
    }
  },
  
  /**
   * Benutzer nach ID abrufen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  getUserById: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID' 
        });
      }
      
      // const user = findUserById(userId); // Old implementation
      const userFromDb = await db.get(
        'SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users WHERE id = ?',
        userId
      );
      
      if (!userFromDb) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Parse preferences
      let user = { ...userFromDb };
      try {
        user.preferences = user.preferences ? JSON.parse(user.preferences) : null;
      } catch (e) {
        console.error(`Failed to parse preferences for user ${user.id}:`, user.preferences, e);
        user.preferences = null; // Fallback
      }
      
      // const { password, ...userWithoutPassword } = user; // password_hash is not selected
      
      res.json({ 
        success: true, 
        user // user already excludes password_hash
      });
    } catch (error) {
      console.error('Error getting user by ID from DB:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving user' 
      });
    } finally {
      if (db) await db.close();
    }
  },
  
  /**
   * Neuen Benutzer erstellen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  createUser: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const { name, email, password, role } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, and password are required' 
        });
      }
      
      if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Role must be either "admin" or "user"' 
        });
      }
      
      // const users = getUsers(); // Old
      // const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase()); // Old
      // Handled by DB UNIQUE constraint on email

      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = role || 'user';
      const createdAt = new Date().toISOString();
      
      const result = await db.run(
        'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
        name, email, hashedPassword, userRole, createdAt
      );

      const newUserId = result.lastID;
      const newUser = await db.get(
          'SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users WHERE id = ?',
          newUserId
      );

      // Parse preferences (should be null for a new user unless defaults are set in DB schema or here)
      let finalNewUser = { ...newUser };
      try {
        finalNewUser.preferences = finalNewUser.preferences ? JSON.parse(finalNewUser.preferences) : null;
      } catch (e) {
        console.error(`Failed to parse preferences for new user ${finalNewUser.id}:`, finalNewUser.preferences, e);
        finalNewUser.preferences = null; 
      }

      res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        user: finalNewUser // newUser already excludes password_hash
      });
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }
      console.error('Error creating user in DB:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating user' 
      });
    } finally {
      if (db) await db.close();
    }
  },
  
  /**
   * Benutzer aktualisieren (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  updateUser: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const userId = parseInt(req.params.id);
      const { name, email, password, role } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID' 
        });
      }
      
      if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Role must be either "admin" or "user"' 
        });
      }
      
      const currentUser = await db.get('SELECT * FROM users WHERE id = ?', userId);
      
      if (!currentUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      if (email && email.toLowerCase() !== currentUser.email.toLowerCase()) {
        const existingUserWithNewEmail = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', email.toLowerCase(), userId);
        if (existingUserWithNewEmail) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email is already in use by another user' 
          });
        }
      }
      
      const params = [];
      let sql = 'UPDATE users SET ';
      if (name) {
        sql += 'name = ?, ';
        params.push(name);
      }
      if (email) {
        sql += 'email = ?, ';
        params.push(email.toLowerCase());
      }
      if (role) {
        sql += 'role = ?, ';
        params.push(role);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        sql += 'password_hash = ?, ';
        params.push(hashedPassword);
      }
      
      if (params.length > 0) {
        sql = sql.substring(0, sql.length - 2); // Remove last ", "
        sql += ' WHERE id = ?';
        params.push(userId);
        await db.run(sql, ...params);
      } else {
        if (!password) {
          const { password_hash, ...userWithoutPasswordHash } = currentUser;
          try {
            userWithoutPasswordHash.preferences = userWithoutPasswordHash.preferences ? JSON.parse(userWithoutPasswordHash.preferences) : null;
          } catch(e) { userWithoutPasswordHash.preferences = null; }

          return res.json({
            success: true,
            message: 'No user details to update.',
            user: userWithoutPasswordHash
          });
        }
      }
      
      const updatedUserFromDb = await db.get(
        'SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users WHERE id = ?',
        userId
      );

      let finalUpdatedUser = { ...updatedUserFromDb };
       try {
        finalUpdatedUser.preferences = finalUpdatedUser.preferences ? JSON.parse(finalUpdatedUser.preferences) : null;
      } catch (e) {
        finalUpdatedUser.preferences = null; 
      }

      res.json({ 
        success: true, 
        message: 'User updated successfully',
        user: finalUpdatedUser
      });
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is already in use by another user' 
        });
      }
      console.error('Error updating user in DB:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating user' 
      });
    } finally {
      if (db) await db.close();
    }
  },
  
  /**
   * Benutzer löschen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  deleteUser: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }

      const userToDelete = await db.get('SELECT id, role, profile_image FROM users WHERE id = ?', userId);

      if (!userToDelete) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (userToDelete.role === 'admin') {
        const adminCountResult = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', 'admin');
        if (adminCountResult.count <= 1) {
          return res.status(400).json({ success: false, message: 'Cannot delete the last admin user' });
        }
      }

      // Delete avatar file if exists
      if (userToDelete.profile_image) {
        const avatarPath = path.join(__dirname, '../data', userToDelete.profile_image.startsWith('/data/') ? userToDelete.profile_image.substring(5) : userToDelete.profile_image);
         // Correctly join with avatarsDir base, assuming profile_image is like /avatars/filename.png or /data/avatars/filename.png
        let oldAvatarFsPath = '';
        if (userToDelete.profile_image.startsWith('/data/avatars/')) {
            oldAvatarFsPath = path.join(__dirname, '../data/avatars', path.basename(userToDelete.profile_image));
        } else if (userToDelete.profile_image.startsWith('/avatars/')) { // Fallback for older format if any
             oldAvatarFsPath = path.join(__dirname, '../data/avatars', path.basename(userToDelete.profile_image));
        }

        if (oldAvatarFsPath && fs.existsSync(oldAvatarFsPath)) {
          try {
            fs.unlinkSync(oldAvatarFsPath);
            console.log(`Deleted avatar for user ${userId}: ${oldAvatarFsPath}`);
          } catch (err) {
            console.error(`Failed to delete avatar for user ${userId}:`, err);
          }
        }
      }

      // Delete user settings file
      const userSettingsPath = path.join(__dirname, '../data/user_settings', `${userId}.json`);
      if (fs.existsSync(userSettingsPath)) {
        try {
          fs.unlinkSync(userSettingsPath);
          console.log(`Deleted settings file for user ${userId}`);
        } catch (err) {
          console.error(`Failed to delete settings file for user ${userId}:`, err);
        }
      }

      // Delete user from DB (notifications should be deleted by ON DELETE CASCADE if foreign key is set up correctly with a users table)
      await db.run('DELETE FROM users WHERE id = ?', userId);
      // Explicitly delete notifications if cascade is not relied upon or not set up
      // await db.run('DELETE FROM user_notifications WHERE user_id = ?', userId);

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user from DB:', error);
      res.status(500).json({ success: false, message: 'Error deleting user' });
    } finally {
      if (db) await db.close();
    }
  }
}; 