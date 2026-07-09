import { httpClient } from './http'
import { setApiBase } from './base'

const calls: string[] = []

beforeEach(() => {
  calls.length = 0
  localStorage.clear()
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url)
    return { ok: true, json: async () => ({}) } as Response
  })
})
afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

test('resolves the base URL per request, so a saved URL takes effect without a restart', async () => {
  // Client is created once (as at app startup), before any URL is saved.
  const client = httpClient()

  setApiBase('http://first:8000')
  await client.getSettings()
  expect(calls.at(-1)).toBe('http://first:8000/settings')

  // User changes the engine URL at runtime; the same client must now hit it.
  setApiBase('http://second:8000')
  await client.getSettings()
  expect(calls.at(-1)).toBe('http://second:8000/settings')
})

test('an explicit baseUrl argument pins the target (used by tests/fixtures)', async () => {
  const client = httpClient('http://pinned:8000')
  setApiBase('http://ignored:8000')
  await client.getStatus()
  expect(calls.at(-1)).toBe('http://pinned:8000/status')
})
