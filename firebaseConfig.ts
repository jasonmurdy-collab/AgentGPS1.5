import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
// This check prevents re-initializing the app in hot-reloading environments (like Vite's HMR)
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]; // Get the default app if already initialized
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Getter for Auth instance
export const getAuthInstance = (): Auth => {
  return auth;
};

// Getter for Firestore instance
export const getFirestoreInstance = (): Firestore => {
  return db;
};
