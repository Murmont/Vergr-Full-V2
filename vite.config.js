import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Detect Tauri dev mode
const isTauriDev = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  // Set base to './' for Tauri builds so assets load correctly from file system
  base: isTauriDev ? './' : '/',
  server: {
    port: 5173,
    host: true,
    // Tauri expects a fixed port; fail if 5173 is occupied
    strictPort: isTauriDev,
  },
  // Prevent Vite from clearing the terminal so you can see Tauri logs
  clearScreen: false,
  build: { outDir: 'dist', sourcemap: false },
  resolve: { alias: { '@': '/src' } },
  // Allow Tauri env vars through
  envPrefix: ['VITE_', 'TAURI_'],
});