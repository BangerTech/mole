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
  console.log(`[AuthMiddleware] Incoming request to: ${req.method} ${req.originalUrl}`);
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    console.log('[AuthMiddleware] Authorization Header:', authHeader);
    
    // Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AuthMiddleware] Access Denied: No token or invalid format.');
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided' 
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    console.log('[AuthMiddleware] Extracted Token:', token);
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AuthMiddleware] Decoded Token:', decoded);
    
    // Set user ID on request object
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    console.log(`[AuthMiddleware] req.userId set to: ${req.userId}, req.userEmail set to: ${req.userEmail}`);
    
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