const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// Pfad zur Benutzerdatei
const usersPath = path.join(__dirname, '../data/users.json');
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
 * Alle Benutzer aus der Datei abrufen
 * @returns {Array} - Array von Benutzern
 */
const getUsers = () => {
  try {
    const usersData = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(usersData);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

/**
 * Benutzer in Datei speichern
 * @param {Array} users - Array von zu speichernden Benutzern
 */
const saveUsers = (users) => {
  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
    throw error;
  }
};

/**
 * Benutzer nach ID suchen
 * @param {number} id - Benutzer-ID
 * @returns {Object|null} - Benutzerobjekt oder null
 */
const findUserById = (id) => {
  const users = getUsers();
  return users.find(user => user.id === parseInt(id)) || null; // Ensure ID is integer for comparison
};

module.exports = {
  // Middleware for multer, can be used in routes
  uploadAvatarMiddleware: upload.single('avatar'),

  /**
   * Uploads or updates a user's avatar.
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  uploadAvatar: async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No avatar file uploaded.' });
      }

      const users = getUsers();
      const userIndex = users.findIndex(user => user.id === userId);

      if (userIndex === -1) {
        // Optionally remove uploaded file if user not found
        fs.unlinkSync(req.file.path); 
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Construct the web-accessible path for the avatar
      // Assuming 'data' is served as static root for this path, so path starts with '/data/avatars/'
      const avatarUrl = `/data/avatars/${req.file.filename}`;

      // Remove old avatar if it exists and is different
      const oldAvatarPath = users[userIndex].profileImage;
      if (oldAvatarPath && oldAvatarPath !== avatarUrl) {
        const oldAvatarFsPath = path.join(__dirname, '..', oldAvatarPath.startsWith('/data/') ? '' : 'public', oldAvatarPath.replace('/data/', ''));
        if (fs.existsSync(oldAvatarFsPath)) {
          try {
            fs.unlinkSync(oldAvatarFsPath);
            console.log(`Old avatar ${oldAvatarFsPath} deleted.`);
          } catch (err) {
            console.error(`Failed to delete old avatar ${oldAvatarFsPath}:`, err);
          }
        }
      }
      
      users[userIndex].profileImage = avatarUrl;
      saveUsers(users);

      // Exclude password from the returned user object
      const { password, ...userWithoutPassword } = users[userIndex];
      
      res.json({ 
        success: true, 
        message: 'Avatar uploaded successfully.',
        user: userWithoutPassword, // Send back updated user
        avatarUrl: avatarUrl // Explicitly send new URL
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
    try {
      const users = getUsers();
      
      // Passwörter aus der Antwort entfernen
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json({ 
        success: true, 
        users: usersWithoutPasswords 
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving users' 
      });
    }
  },
  
  /**
   * Benutzer nach ID abrufen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  getUserById: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID' 
        });
      }
      
      const user = findUserById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Passwort aus der Antwort entfernen
      const { password, ...userWithoutPassword } = user;
      
      res.json({ 
        success: true, 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error retrieving user' 
      });
    }
  },
  
  /**
   * Neuen Benutzer erstellen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  createUser: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      
      // Pflichtfelder prüfen
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, and password are required' 
        });
      }
      
      // Gültige Rolle prüfen
      if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Role must be either "admin" or "user"' 
        });
      }
      
      // Alle Benutzer abrufen
      const users = getUsers();
      
      // Prüfen, ob Benutzer bereits existiert
      const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }
      
      // Neue ID bestimmen
      const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
      
      // Passwort hashen
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Neuen Benutzer erstellen
      const newUser = {
        id: maxId + 1,
        email,
        password: hashedPassword,
        name,
        role: role || 'user',
        createdAt: new Date().toISOString()
      };
      
      // Zur Benutzerliste hinzufügen und speichern
      users.push(newUser);
      saveUsers(users);
      
      // Passwort aus der Antwort entfernen
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({ 
        success: true, 
        message: 'User created successfully',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating user' 
      });
    }
  },
  
  /**
   * Benutzer aktualisieren (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  updateUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, password, role } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID' 
        });
      }
      
      // Gültige Rolle prüfen
      if (role && !['admin', 'user'].includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Role must be either "admin" or "user"' 
        });
      }
      
      // Alle Benutzer abrufen
      const users = getUsers();
      
      // Zu aktualisierenden Benutzer finden
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Aktuellen Benutzer abrufen
      const currentUser = users[userIndex];
      
      // Prüfen, ob E-Mail bereits verwendet wird (von einem anderen Benutzer)
      if (email && email !== currentUser.email) {
        const emailExists = users.some(user => 
          user.id !== userId && user.email.toLowerCase() === email.toLowerCase()
        );
        
        if (emailExists) {
          return res.status(400).json({ 
            success: false, 
            message: 'Email is already in use by another user' 
          });
        }
      }
      
      // Aktualisierungen vorbereiten
      const updatedUser = {
        ...currentUser,
        name: name || currentUser.name,
        email: email || currentUser.email,
        role: role || currentUser.role
      };
      
      // Passwort aktualisieren, wenn angegeben
      if (password) {
        updatedUser.password = await bcrypt.hash(password, 10);
      }
      
      // Benutzer im Array aktualisieren
      users[userIndex] = updatedUser;
      
      // Aktualisierte Benutzerliste speichern
      saveUsers(users);
      
      // Passwort aus der Antwort entfernen
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      res.json({ 
        success: true, 
        message: 'User updated successfully',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating user' 
      });
    }
  },
  
  /**
   * Benutzer löschen (für Admin)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  deleteUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid user ID' 
        });
      }
      
      // Alle Benutzer abrufen
      const users = getUsers();
      
      // Prüfen, ob der Benutzer existiert
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Prüfen, ob es sich um den letzten Admin handelt
      const isAdmin = users[userIndex].role === 'admin';
      
      if (isAdmin) {
        const adminCount = users.filter(user => user.role === 'admin').length;
        
        if (adminCount <= 1) {
          return res.status(400).json({ 
            success: false, 
            message: 'Cannot delete the last admin user' 
          });
        }
      }
      
      // Benutzer aus dem Array entfernen
      users.splice(userIndex, 1);
      
      // Aktualisierte Benutzerliste speichern
      saveUsers(users);
      
      res.json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting user' 
      });
    }
  }
}; 