import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  clearScreen: false,                 // don't wipe Rust/Tauri errors on reload
  server: {
    port: 5173,
    strictPort: true,                 // fail loudly instead of drifting to 5174
  },
})