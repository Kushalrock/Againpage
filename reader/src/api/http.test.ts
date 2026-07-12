import { httpClient, ConnectionError, isConnectionError, pingEngine } from './http'
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

test('throws ConnectionError when fetch rejects (transport failure)', async () => {
  vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch') })
  const client = httpClient('http://x')
  await expect(client.getStatus()).rejects.toBeInstanceOf(ConnectionError)
  vi.unstubAllGlobals()
})

test('throws a plain status Error (not ConnectionError) on a not-ok response', async () => {
  vi.stubGlobal('fetch', async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response)
  const client = httpClient('http://x')
  const err = await client.getStatus().catch((e) => e)
  expect(err).toBeInstanceOf(Error)
  expect(isConnectionError(err)).toBe(false)
  expect(String(err.message)).toContain('500')
  vi.unstubAllGlobals()
})

test('pingEngine returns true on 200, false on reject', async () => {
  vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response)
  expect(await pingEngine('http://x')).toBe(true)
  vi.stubGlobal('fetch', async () => { throw new TypeError('nope') })
  expect(await pingEngine('http://x')).toBe(false)
  vi.unstubAllGlobals()
})

test('setIssueFlags PATCHes /issues/{id}', async () => {
  const bodies: string[] = []
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    bodies.push(String(init?.body)); return { ok: true, json: async () => ({}) } as Response
  })
  await httpClient('http://x').setIssueFlags('abc', { favorite: true })
  expect(bodies.at(-1)).toBe(JSON.stringify({ favorite: true }))
  vi.unstubAllGlobals()
})

test('getPromptDefaults GETs /prompts/defaults', async () => {
  const urls: string[] = []
  vi.stubGlobal('fetch', async (u: string) => { urls.push(u); return { ok: true, json: async () => ({}) } as Response })
  await httpClient('http://x').getPromptDefaults()
  expect(urls.at(-1)).toBe('http://x/prompts/defaults')
  vi.unstubAllGlobals()
})
