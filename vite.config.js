import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Detect Tauri dev mode
const isTauriDev = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  // For Tauri builds, use './' for file system access
  // For web builds, use '/' so assets are requested from the root path
  base: isTauriDev ? './' : '/',
  server: {
    port: 5173,
    host: true,
    strictPort: isTauriDev,
  },
  clearScreen: false,
  build: { outDir: 'dist', sourcemap: false },
  resolve: { alias: { '@': '/src' } },
  envPrefix: ['VITE_', 'TAURI_'],
});
