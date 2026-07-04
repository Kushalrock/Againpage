export function apiBase(): string {
  // Tauri injects window.__AGAINPAGE_API__ (window === globalThis in the webview);
  // otherwise (browser/dev/Docker) fall back to the local API port.
  const injected = (globalThis as { __AGAINPAGE_API__?: unknown }).__AGAINPAGE_API__
  return typeof injected === 'string' ? injected : 'http://localhost:8000'
}
