/**
 * Firebase Configuration
 * Initialize Firebase services for the AnnaData app
 * 
 * NOTE: Using inMemoryPersistence to allow different accounts in different tabs.
 * Each tab maintains its own independent auth session.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
for (const key of requiredKeys) {
    if (!firebaseConfig[key]) {
        console.error(`Missing Firebase config: ${key}. Check your .env.local file.`);
    }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with in-memory persistence
// This allows different accounts in different tabs of the same browser
export const auth = getAuth(app);

// Set in-memory persistence (each tab has its own session)
setPersistence(auth, inMemoryPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;
