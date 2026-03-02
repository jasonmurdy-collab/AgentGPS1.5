// jasonmurdy-collab/agentgps1.5/AgentGPS1.5-3cc8bec42c6fef15bc67aa794c6ec3f25b92b15f/firebaseConfig.ts

import { initializeApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp | undefined;
let firebaseInitializationError: string | null = null;

const getApp = (): FirebaseApp | undefined => {
    // Return memoized app or if we know initialization failed
    if (app || firebaseInitializationError) {
        return app;
    }

    // If an app is already initialized (e.g., via HMR), use it.
    if (getApps().length > 0) {
        app = getApps()[0];
        return app;
    }

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

    return app;
};


// Getter for Auth instance
export const getAuthInstance = (): Auth | null => {
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  const auth = getAuth(firebaseApp);
  
  // Try to set persistence to ensure it's working
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn("Auth persistence failed to set:", err);
  });
  
  return auth;
};

// Getter for Firestore instance
export const getFirestoreInstance = (): Firestore | null => {
  const firebaseApp = getApp();
  if (!firebaseApp) return null;
  return getFirestore(firebaseApp);
};
