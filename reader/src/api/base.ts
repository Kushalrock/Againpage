// localStorage key holding a user-configured engine base URL (set in the UI,
// e.g. onboarding), so a browser / reader-only build can point at a remote
// engine without a rebuild.
export const API_BASE_KEY = 'againpage.apiBase'

function fromStore(): string {
  try {
    return globalThis.localStorage?.getItem(API_BASE_KEY)?.trim() ?? ''
  } catch {
    return '' // localStorage may be unavailable (e.g. some test envs)
  }
}

/** The engine base URL the reader talks to, in precedence order:
 * 1. window.__AGAINPAGE_API__ — injected at runtime by the Tauri desktop shell
 *    when it bundles its own engine (window === globalThis in the webview).
 * 2. A user-set URL saved in localStorage (from onboarding / settings).
 * 3. VITE_API_BASE — baked in at build/dev time.
 * 4. the local API port. */
export function apiBase(): string {
  const injected = (globalThis as { __AGAINPAGE_API__?: unknown }).__AGAINPAGE_API__
  if (typeof injected === 'string') return injected
  const stored = fromStore()
  if (stored) return stored
  const env: unknown = import.meta.env.VITE_API_BASE
  if (typeof env === 'string' && env) return env
  return 'http://localhost:8000'
}

/** The URL a user has explicitly saved (empty string if none). */
export function storedApiBase(): string {
  return fromStore()
}

/** Persist (or clear, when blank) the engine base URL. Trailing slashes are
 * stripped so it composes cleanly with request paths. */
export function setApiBase(url: string): void {
  try {
    const v = url.trim().replace(/\/+$/, '')
    if (v) globalThis.localStorage?.setItem(API_BASE_KEY, v)
    else globalThis.localStorage?.removeItem(API_BASE_KEY)
  } catch {
    /* ignore: nothing we can do if storage is unavailable */
  }
}
