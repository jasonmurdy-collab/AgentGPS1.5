// jasonmurdy-collab/agentgps1.5/AgentGPS1.5-3cc8bec42c6fef15bc67aa794c6ec3f25b92b15f/firebaseConfig.ts

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firebaseInitializationError: string | null = null;

const getApp = (): FirebaseApp | undefined => {
    // Return memoized app or if we know initialization failed
    if (app || firebaseInitializationError) {
        return app;
    }

    // If an app is already initialized (e.g., via HMR), use it.
    if (getApps().length > 0) {
        app = getApps()[0];
    } else {
        // Try to initialize the app
        try {
            console.log("Initializing Firebase with config:", {
                projectId: firebaseConfig.projectId,
                authDomain: firebaseConfig.authDomain,
                apiKey: firebaseConfig.apiKey ? "PRESENT" : "MISSING"
            });
            app = initializeApp(firebaseConfig);
        } catch (e) {
            firebaseInitializationError = `Firebase initialization failed: ${(e as Error).message}`;
            console.error(firebaseInitializationError);
            app = undefined;
        }
    }

    if (app) {
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        // Try to set persistence to ensure it's working
        setPersistence(auth, browserLocalPersistence).catch(err => {
            console.warn("Auth persistence failed to set:", err);
        });
    }

    return app;
};


// Getter for Auth instance
export const getAuthInstance = (): Auth | null => {
  getApp();
  return auth;
};

// Getter for Firestore instance
export const getFirestoreInstance = (): Firestore | null => {
  getApp();
  return db;
};

// Getter for Storage instance
export const getStorageInstance = (): FirebaseStorage | null => {
  getApp();
  return storage;
};
