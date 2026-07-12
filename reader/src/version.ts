// Own version is injected from package.json by Vite (see vite.config.ts).
export const READER_VERSION: string = __READER_VERSION__

// Oldest engine this reader build tolerates. Hand-bumped only when the reader
// needs a newer engine (a migration or new API) — like a package.json engines
// field. A UI-only reader release leaves this untouched.
export const MIN_ENGINE_VERSION = '0.1.4'
