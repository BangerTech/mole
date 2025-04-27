const jwt = require('jsonwebtoken');

// JWT secret key (should match the one in authController)
const JWT_SECRET = process.env.JWT_SECRET || 'mole-secret-key-change-in-production';

/**
 * Authentication middleware
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
module.exports = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided' 
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user ID on request object
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    
    // Continue to next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
}; 