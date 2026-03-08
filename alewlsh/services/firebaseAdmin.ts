// services/firebaseAdmin.ts
import admin from "firebase-admin";

// ✅ Secure: Load credentials from environment variable
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // 🔐 Private key must be formatted with newlines preserved
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
    // ✅ Graceful fallback for development
    console.warn('⚠️ Firebase credentials not found. Using mock admin (development only).');
    
    // Mock for development (never use in production)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    // ✅ Production: Initialize with service account
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: firebaseConfig.clientEmail,
        privateKey: firebaseConfig.privateKey,
      }),
    });
  }
}

export const messaging = admin.messaging();