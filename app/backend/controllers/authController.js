const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDbConnection } = require('../models/database'); // Import DB connection

// Path to store user data - NO LONGER USED FOR PRIMARY USER DATA
// const usersPath = path.join(__dirname, '../data/users.json');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'mole-secret-key-change-in-production';

// Ensure data directory exists - This might still be relevant for avatars or other data files
// const dataDir = path.join(__dirname, '../data');
// if (!fs.existsSync(dataDir)) {
//   fs.mkdirSync(dataDir, { recursive: true });
// }

// Initialize users file if it doesn't exist - REMOVED, handled by DB migration
// if (!fs.existsSync(usersPath)) {
//   // Create demo user by default
//   const demoPassword = bcrypt.hashSync('demo', 10);
//   const users = [
//     {
//       id: 1,
//       email: 'demo@example.com',
//       password: demoPassword,
//       name: 'Demo User',
//       role: 'user',
//       createdAt: new Date().toISOString()
//     }
//   ];
//   fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
// }

// /**
//  * Get users from file - REMOVED
//  */
// const getUsers = () => { ... }; // Fully removed

// /**
//  * Save users to file - REMOVED
//  */
// const saveUsers = (users) => { ... }; // Fully removed

// /**
//  * Find user by email - REMOVED (will be inline DB query)
//  */
// const findUserByEmail = (email) => { ... }; // Fully removed

// /**
//  * Find user by ID - REMOVED (will be inline DB query)
//  */
// const findUserById = (id) => { ... }; // Fully removed

module.exports = {
  /**
   * Register a new user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  register: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, and password are required' 
        });
      }
      
      // Check if user already exists (DB will enforce via UNIQUE constraint on email)
      // const existingUser = findUserByEmail(email); // Old

      const hashedPassword = await bcrypt.hash(password, 10);
      const role = 'user'; // Default role for registration
      const createdAt = new Date().toISOString();
      
      const result = await db.run(
        'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
        name, email.toLowerCase(), hashedPassword, role, createdAt
      );
      
      const newUserId = result.lastID;
      // Fetch the newly created user to get all fields (like id, profile_image if default set by db)
      const newUserFromDb = await db.get(
        'SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users WHERE id = ?',
        newUserId
      );

      if (!newUserFromDb) { // Should not happen if insert was successful
        return res.status(500).json({ success: false, message: 'Failed to retrieve new user after creation' });
      }

      // Parse preferences (should be null for a new user unless defaults are set in DB schema or here)
      let finalNewUser = { ...newUserFromDb };
      try {
        finalNewUser.preferences = finalNewUser.preferences ? JSON.parse(finalNewUser.preferences) : null;
      } catch (e) {
        console.warn(`Failed to parse preferences for new user ${finalNewUser.id}:`, finalNewUser.preferences, e);
        finalNewUser.preferences = null; 
      }

      const token = jwt.sign(
        { userId: finalNewUser.id, email: finalNewUser.email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      res.status(201).json({ 
        success: true, 
        message: 'User registered successfully',
        token,
        user: finalNewUser // Already excludes password_hash due to SELECT statement
      });
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }
      console.error('Error in register:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error registering user' 
      });
    } finally {
      if (db) await db.close();
    }
  },

  /**
   * Login user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  login: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }
      
      // Find user in DB
      // const user = findUserByEmail(email); // Old
      const userFromDb = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase());
      
      if (!userFromDb) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      const isPasswordValid = await bcrypt.compare(password, userFromDb.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      // Update last_login timestamp
      await db.run('UPDATE users SET last_login = ? WHERE id = ?', new Date().toISOString(), userFromDb.id);

      const token = jwt.sign(
        { userId: userFromDb.id, email: userFromDb.email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Prepare user object for response (without password_hash, parse preferences)
      const { password_hash, ...userForResponse } = userFromDb;
      try {
        userForResponse.preferences = userForResponse.preferences ? JSON.parse(userForResponse.preferences) : null;
      } catch (e) {
        console.warn(`Failed to parse preferences for user ${userForResponse.id} during login:`, userForResponse.preferences, e);
        userForResponse.preferences = null;
      }
      // Update last_login in the response object as well
      userForResponse.last_login = new Date().toISOString(); 

      res.json({ 
        success: true, 
        message: 'Login successful',
        token,
        user: userForResponse
      });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error logging in' 
      });
    } finally {
      if (db) await db.close();
    }
  },

  /**
   * Get current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getUser: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      const userId = req.userId; // Set by authMiddleware
      
      if (!userId) {
        // This case should ideally be caught by authMiddleware itself
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      
      // const user = findUserById(userId); // Old
      const userFromDb = await db.get(
        'SELECT id, name, email, role, profile_image, created_at, last_login, preferences FROM users WHERE id = ?',
        userId
      );
      console.log(`[authController - getUser] Fetched user for userId ${userId}. Profile Image from DB: ${userFromDb ? userFromDb.profile_image : 'User not found or profile_image missing'}`);
      
      if (!userFromDb) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Prepare user object for response (parse preferences)
      const { password_hash, ...userForResponse } = userFromDb; // Ensure password_hash is not included if it was selected
      try {
        userForResponse.preferences = userForResponse.preferences ? JSON.parse(userForResponse.preferences) : null;
      } catch (e) {
        console.warn(`Failed to parse preferences for user ${userForResponse.id} in getUser:`, userForResponse.preferences, e);
        userForResponse.preferences = null;
      }

      res.json({ 
        success: true, 
        user: userForResponse 
      });
    } catch (error) {
      console.error('Error in getUser from DB:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting user' 
      });
    } finally {
      if (db) await db.close();
    }
  },

  /**
   * Prüfen, ob ein Admin-Benutzer existiert (ungeschützt)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  checkAdminExists: async (req, res) => {
    let db;
    try {
      db = await getDbConnection();
      // const users = getUsers(); // Old
      // const adminUserExists = users.some(user => user.role === 'admin'); // Old
      const adminUser = await db.get("SELECT id FROM users WHERE role = ? LIMIT 1", 'admin');
      res.json({ success: true, adminExists: !!adminUser });
    } catch (error) {
      console.error('Error checking if admin exists in DB:', error);
      res.status(500).json({ success: false, adminExists: false, message: 'Error checking admin status' });
    } finally {
      if (db) await db.close();
    }
  }
}; 