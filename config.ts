
// --- FIX START: Hardcode Firebase credentials and remove import.meta.env reliance ---
// Removed: /// <reference types="vite/client" />
// Removed: declare global {} block for ImportMetaEnv and ImportMeta

// Directly use the provided Firebase configuration.
// In a production app, these values would ideally still be managed
// securely (e.g., server-side environment variables or a secrets manager)
// and fetched at runtime, but for this client-side app, embedding them
// as provided is the most direct fix for the TypeError.
export const firebaseConfig = {
  apiKey: "AIzaSyDEDIwsIZNZHEiWDNhIDMMTi8vTZfjk9M0",
  authDomain: "agentgps-35e28.firebaseapp.com",
  projectId: "agentgps-35e28",
  storageBucket: "agentgps-35e28.firebasestorage.app",
  messagingSenderId: "141124810225",
  appId: "1:141124810225:web:bb31b4cd73219ec42dc050",
  measurementId: "G-Y0N99HJC86"
};

// Removed all import.meta.env related code and type declarations
// as they are no longer needed for Firebase initialization.
// --- FIX END ---
