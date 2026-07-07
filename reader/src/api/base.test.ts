import { apiBase } from './base'

type Injected = { __AGAINPAGE_API__?: string }

afterEach(() => {
  delete (globalThis as Injected).__AGAINPAGE_API__
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
test('injected global takes precedence over VITE_API_BASE', () => {
  vi.stubEnv('VITE_API_BASE', 'http://server.local:8000')
  ;(globalThis as Injected).__AGAINPAGE_API__ = 'http://127.0.0.1:9123'
  expect(apiBase()).toBe('http://127.0.0.1:9123')
})
