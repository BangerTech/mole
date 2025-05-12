const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Path to store user data
const usersPath = path.join(__dirname, '../data/users.json');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'mole-secret-key-change-in-production';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(usersPath)) {
  // Create demo user by default
  const demoPassword = bcrypt.hashSync('demo', 10);
  const users = [
    {
      id: 1,
      email: 'demo@example.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'user',
      createdAt: new Date().toISOString()
    }
  ];
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

/**
 * Get users from file
 * @returns {Array} - Array of users
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
 * Save users to file
 * @param {Array} users - Array of users to save
 */
const saveUsers = (users) => {
  try {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
    console.error('Current users array:', users);
    console.error('Stacktrace:', error.stack);
    throw error;
  }
};

/**
 * Find user by email
 * @param {string} email - User email to search for
 * @returns {Object|null} - User object if found, null otherwise
 */
const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
};

/**
 * Find user by ID
 * @param {number} id - User ID to search for
 * @returns {Object|null} - User object if found, null otherwise
 */
const findUserById = (id) => {
  const users = getUsers();
  return users.find(user => user.id === id) || null;
};

module.exports = {
  /**
   * Register a new user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name, email, and password are required' 
        });
      }
      
      // Check if user already exists
      const existingUser = findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }
      
      // Get all users and determine new ID
      const users = getUsers();
      const maxId = users.reduce((max, user) => Math.max(max, user.id), 0);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const newUser = {
        id: maxId + 1,
        email,
        password: hashedPassword,
        name,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      
      // Add to users array and save
      users.push(newUser);
      console.log('[AUTH DEBUG] Users array before saving:', JSON.stringify(users, null, 2));
      saveUsers(users);
      
      // Create token
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Return success with token and user (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json({ 
        success: true, 
        message: 'User registered successfully',
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error registering user' 
      });
    }
  },

  /**
   * Login user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email and password are required' 
        });
      }
      
      // Find user
      const user = findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      // Create token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Return success with token and user (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        success: true, 
        message: 'Login successful',
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error logging in' 
      });
    }
  },

  /**
   * Get current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  getUser: async (req, res) => {
    try {
      // User ID should be set by auth middleware
      const userId = req.userId;
      
      // Find user
      const user = findUserById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.json({ 
        success: true, 
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error('Error in getUser:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting user' 
      });
    }
  },

  /**
   * Prüfen, ob ein Admin-Benutzer existiert (ungeschützt)
   * @param {Object} req - Request-Objekt
   * @param {Object} res - Response-Objekt
   */
  checkAdminExists: async (req, res) => {
    try {
      const users = getUsers(); // getUsers() ist bereits im Controller definiert
      const adminUserExists = users.some(user => user.role === 'admin');
      res.json({ success: true, adminExists: adminUserExists });
    } catch (error) {
      console.error('Error checking if admin exists:', error);
      // Im Fehlerfall (z.B. users.json nicht lesbar) ist es sicherer anzunehmen, dass kein Admin existiert,
      // um den Setup-Flow zu ermöglichen.
      res.status(500).json({ success: false, adminExists: false, message: 'Error checking admin status' });
    }
  }
}; 