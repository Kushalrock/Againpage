export function apiBase(): string {
  // API base URL, in precedence order:
  // 1. window.__AGAINPAGE_API__ — injected at runtime by the Tauri desktop
  //    shell (window === globalThis in the webview).
  // 2. VITE_API_BASE — baked in at build/dev time; use this to point a browser
  //    reader at a remote engine (e.g. a home-lab server running the API +
  //    worker), e.g. `VITE_API_BASE=http://server.local:8000 pnpm dev`.
  // 3. the local API port (default single-machine dev / Docker).
  const injected = (globalThis as { __AGAINPAGE_API__?: unknown }).__AGAINPAGE_API__
  if (typeof injected === 'string') return injected
  const env: unknown = import.meta.env.VITE_API_BASE
  if (typeof env === 'string' && env) return env
  return 'http://localhost:8000'
}
