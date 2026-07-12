/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// Tauri mobile dev: `tauri android dev` sets TAURI_DEV_HOST to a LAN IP the
// phone can reach, and the dev server must bind to it (not just localhost).
// On desktop TAURI_DEV_HOST is unset, so host:false keeps the old localhost
// behaviour.
const host = process.env.TAURI_DEV_HOST

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  clearScreen: false,
  define: { __READER_VERSION__: JSON.stringify(pkg.version) },
  server: {
    host: host || false,
    port: 5173,
    strictPort: true,
    hmr: host ? { protocol: 'ws', host, port: 5174 } : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
})