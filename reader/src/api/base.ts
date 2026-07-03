export function apiBase(): string {
  const injected = (globalThis as any).window?.__AGAINPAGE_API__
  return typeof injected === 'string' ? injected : 'http://localhost:8000'
}
