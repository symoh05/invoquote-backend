// middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided, authorization denied' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token, authorization denied' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user still exists
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    if (!userResult.rows[0].is_active) {
      return res.status(401).json({ 
        success: false,
        error: 'User account is deactivated' 
      });
    }

    // Add user and company info to request
    req.user = {
      id: userResult.rows[0].id,
      email: userResult.rows[0].email,
      firstName: userResult.rows[0].first_name,
      lastName: userResult.rows[0].last_name,
      role: userResult.rows[0].role,
      companyId: decoded.companyId
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Server authentication error' 
    });
  }
};

module.exports = authMiddleware;