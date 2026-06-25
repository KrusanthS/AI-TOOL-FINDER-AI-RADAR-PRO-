// backend/src/middleware/authMiddleware.js
import admin from 'firebase-admin';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach decoded token to request
    req.firebaseUser = decodedToken;

    // Lazy create or fetch user from MongoDB
    let user = await User.findOne({ uid: decodedToken.uid });
    if (!user) {
      user = await User.create({
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        avatar: decodedToken.picture || '',
        role: decodedToken.email === process.env.ADMIN_EMAIL ? 'admin' : 'user'
      });
    } else if (user.email === process.env.ADMIN_EMAIL && user.role !== 'admin') {
      // Ensure the designated admin email always has admin rights
      user.role = 'admin';
      await user.save();
    }


    // Update last active time (throttle: only write if > 5 minutes since last update)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!user.lastActive || user.lastActive < fiveMinutesAgo) {
      await User.findByIdAndUpdate(user._id, { lastActive: new Date() });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`Auth Error: ${error.message}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
};
