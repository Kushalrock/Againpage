import { apiBase, setApiBase, storedApiBase, API_BASE_KEY } from './base'

type Injected = { __AGAINPAGE_API__?: string }

afterEach(() => {
  delete (globalThis as Injected).__AGAINPAGE_API__
  localStorage.clear()
  vi.unstubAllEnvs()
})

test('defaults to localhost:8000 without injection', () => {
  expect(apiBase()).toBe('http://localhost:8000')
})
test('uses injected global when present', () => {
  ;(globalThis as Injected).__AGAINPAGE_API__ = 'http://127.0.0.1:9123'
  expect(apiBase()).toBe('http://127.0.0.1:9123')
})
test('falls back to VITE_API_BASE (home-lab: browser reader → remote engine)', () => {
  vi.stubEnv('VITE_API_BASE', 'http://server.local:8000')
  expect(apiBase()).toBe('http://server.local:8000')
})
test('a user-saved base URL (localStorage) wins over VITE_API_BASE', () => {
  vi.stubEnv('VITE_API_BASE', 'http://server.local:8000')
  setApiBase('http://homelab:8000')
  expect(apiBase()).toBe('http://homelab:8000')
})
test('the Tauri-injected global still takes precedence over a saved URL', () => {
  setApiBase('http://homelab:8000')
  ;(globalThis as Injected).__AGAINPAGE_API__ = 'http://127.0.0.1:9123'
  expect(apiBase()).toBe('http://127.0.0.1:9123')
})
test('setApiBase strips trailing slashes and round-trips via storedApiBase', () => {
  setApiBase('http://homelab:8000//')
  expect(storedApiBase()).toBe('http://homelab:8000')
  expect(localStorage.getItem(API_BASE_KEY)).toBe('http://homelab:8000')
})
test('setApiBase with blank clears the saved URL', () => {
  setApiBase('http://homelab:8000')
  setApiBase('  ')
  expect(storedApiBase()).toBe('')
  expect(apiBase()).toBe('http://localhost:8000')
})
