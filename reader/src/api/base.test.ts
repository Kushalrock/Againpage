import { apiBase } from './base'

type Injected = { __AGAINPAGE_API__?: string }

test('defaults to localhost:8000 without injection', () => {
  expect(apiBase()).toBe('http://localhost:8000')
})
test('uses injected global when present', () => {
  ;(globalThis as Injected).__AGAINPAGE_API__ = 'http://127.0.0.1:9123'
  expect(apiBase()).toBe('http://127.0.0.1:9123')
  delete (globalThis as Injected).__AGAINPAGE_API__
})
