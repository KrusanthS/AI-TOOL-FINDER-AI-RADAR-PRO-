// backend/src/config/firebase.js
import admin from 'firebase-admin';
import logger from '../utils/logger.js';

const initializeFirebase = () => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'your-project-id') {
      logger.warn('Firebase Admin skipped: Credentials not configured in .env');
      return;
    }
    
    // Check if app is already initialized to prevent errors during hot reload
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      logger.info('Firebase Admin Initialized');
    }
  } catch (error) {
    logger.error(`Firebase Admin Initialization Error: ${error.message}`);
  }
};

export default initializeFirebase;