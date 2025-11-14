
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vite automatically loads environment variables prefixed with VITE_
  // from .env files and exposes them via import.meta.env.
  // The explicit `define` for FIREBASE_API_KEY is no longer necessary
  // as config.ts and lib/gemini.ts now correctly use import.meta.env.VITE_FIREBASE_API_KEY.
});
