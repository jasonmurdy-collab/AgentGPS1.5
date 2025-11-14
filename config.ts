// Fix: Removed unnecessary reference to "vite/client" which was causing a type definition error.
// The project does not use import.meta.env, so this reference is not needed.

// --- Firebase Configuration ---
// IMPORTANT: The values below are placeholders. You must replace them with your
// actual Firebase project configuration for the app to function correctly.
// For production environments, it is strongly recommended to use environment variables
// to protect your sensitive credentials.

export const firebaseConfig = {
  apiKey: "AIzaSyDEDIwsIZNZHEiWDNhIDMMTi8vTZfjk9M0",
  authDomain: "agentgps-35e28.firebaseapp.com",
  projectId: "agentgps-35e28",
  storageBucket: "agentgps-35e28.firebasestorage.app",
  messagingSenderId: "141124810225",
  appId: "1:141124810225:web:bb31b4cd73219ec42dc050",
  measurementId: "G-Y0N99HJC86"
};