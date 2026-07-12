import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { ClientContext } from './api/queries'
import { fixtureClient, ARCHIVE, AMOR_FATI } from './api/fixtures'
import type { ApiClient } from './api/client'
import type { AppStatus } from './types/status'
import type { SettingsResponse } from './types/settings'
import App from './App'
test('navigates from Reader to Archive via the sidebar', async () => {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}><App /></ClientContext.Provider>
  </QueryClientProvider>)
  expect(await screen.findByRole('heading', { name: /Amor Fati/, level: 2 })).toBeInTheDocument()
  fireEvent.click(screen.getByText(/The Archive/i))
  expect(await screen.findByText(/The bound volumes/i)).toBeInTheDocument()
})

test('opening an archived edition shows it in the Reader', async () => {
  const client: ApiClient = {
    ...fixtureClient,
    getArchive: async () => ARCHIVE,
    getIssue: async () => ({ ...AMOR_FATI, content: { ...AMOR_FATI.content, title: 'Archived Piece' } }),
  }
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client}><App /></ClientContext.Provider>
  </QueryClientProvider>)
  fireEvent.click(await screen.findByText(/The Archive/i))     // Reader -> Archive
  fireEvent.click(await screen.findByText(/Amor Fati/i))       // open an archived entry
  expect(await screen.findByRole('heading', { name: /Archived Piece/, level: 2 })).toBeInTheDocument()
})

test('Reader compose-themes CTA navigates to Settings when not indexed', async () => {
  // Inject a client that reports indexed:false so Today shows the "Compose your themes" nudge.
  // (fixtureClient's STATUS.indexed is true by default, so it can't be used for this case.)
  const notIndexedStatus: AppStatus = {
    indexed: false, theme_count: 0, note_count: 0, issue_count: 0,
    latest_issue_date: null, next_edition_at: null, delivery_time: '07:00', cadence_days: 1, active_jobs: [],
  }
  const notIndexedSettings: SettingsResponse = {
    vault_paths: ['~/Documents/Athenaeum'], excluded_paths: [], profile_text: '',
    cadence_days: 1, delivery_time: '07:00', timezone: 'UTC', reading_min: 7, notes_per_issue: 3,
    provider: 'openrouter', ollama_endpoint: '',
    embed_model: 'openai/text-embedding-3-small', summary_model: 'openai/gpt-4o-mini',
    writer_model: 'anthropic/claude-3.5-sonnet', vault_note_count: 1284,
    writer_prompt: '', note_expand_prompt: '', note_expand_words: 500, sync_interval_minutes: 60,
    engine_version: '0.1.4', min_reader_version: '0.1.0',
  }
  const notIndexedClient: ApiClient = {
    getTodayIssue: async () => { throw new Error('not found') },
    getIssue: async () => { throw new Error('not found') },
    getArchive: async () => ({ groups: [], total: 0 }),
    getSettings: async () => notIndexedSettings,
    saveSettings: async (patch) => ({ ...notIndexedSettings, ...patch }),
    getStatus: async () => notIndexedStatus,
    reindex: async () => ({ job_id: 'test-ingest' }),
    triggerIssue: async () => ({ job_id: 'test-generate' }),
    cancelJobs: async () => ({ cancelled: 0 }),
    expandNote: async () => ({ title: '', text: '' }),
    setIssueFlags: async () => ({}) as never,
    getPromptDefaults: async () => ({ writer: 'DEFAULT WRITER VOICE', note_expand: 'DEFAULT NOTE-EXPAND VOICE' }),
  }
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={notIndexedClient}><App /></ClientContext.Provider>
  </QueryClientProvider>)
  const cta = await screen.findByRole('button', { name: /compose your themes/i })
  fireEvent.click(cta)
  // Assert on the Settings *page* heading (h1), not the always-present sidebar nav button,
  // so this only passes once navigation has actually occurred.
  expect(await screen.findByRole('heading', { name: /^Settings$/, level: 1 })).toBeInTheDocument()
})

// These tests steer `useSettings()`'s return value directly via vi.doMock, so
// they can exercise the Connecting/Unreachable/Onboarding gate in App without
// a real ApiClient. vi.doMock is NOT hoisted, so each test must resetModules
// + doMock BEFORE its dynamic `await import('./App')`, and doUnmock after so
// the mock doesn't leak into the statically-imported `App` used by the tests
// above (which capture their own binding at file-load time, before any of
// this runs, so they're unaffected regardless — but we clean up to be safe
// for any future tests added below this block).
describe('App connection state machine', () => {
  afterEach(() => {
    vi.doUnmock('./api/queries')
    vi.resetModules()
    localStorage.clear()
  })

  test('shows Connecting while settings load', async () => {
    vi.resetModules()
    vi.doMock('./api/queries', async (orig) => {
      const a = await (orig() as Promise<Record<string, unknown>>)
      return { ...a, useSettings: () => ({ isLoading: true }), useStatus: () => ({ data: undefined }) }
    })
    const { default: AppMocked } = await import('./App')
    render(<QueryClientProvider client={new QueryClient()}><AppMocked /></QueryClientProvider>)
    expect(screen.getByText(/reaching the newsroom/i)).toBeInTheDocument()
  })

  test('shows Unreachable when settings error and a URL was saved', async () => {
    localStorage.setItem('againpage.apiBase', 'http://saved:8000')
    vi.resetModules()
    vi.doMock('./api/queries', async (orig) => {
      const a = await (orig() as Promise<Record<string, unknown>>)
      return { ...a, useSettings: () => ({ isError: true, data: undefined, refetch: vi.fn() }), useStatus: () => ({ data: undefined }) }
    })
    const { default: AppMocked } = await import('./App')
    render(<QueryClientProvider client={new QueryClient()}><AppMocked /></QueryClientProvider>)
    expect(screen.getByText(/the newsroom isn't answering/i)).toBeInTheDocument()
    expect(screen.getByText('http://saved:8000')).toBeInTheDocument()
  })

  test('a settings error with NO saved URL falls through to onboarding', async () => {
    localStorage.clear()
    vi.resetModules()
    vi.doMock('./api/queries', async (orig) => {
      const a = await (orig() as Promise<Record<string, unknown>>)
      return { ...a, useSettings: () => ({ isError: true, data: undefined, refetch: vi.fn() }), useStatus: () => ({ data: undefined }) }
    })
    const { default: AppMocked } = await import('./App')
    render(<QueryClientProvider client={new QueryClient()}><AppMocked /></QueryClientProvider>)
    expect(screen.queryByText(/the newsroom isn't answering/i)).not.toBeInTheDocument()
    // onboarding welcome renders (its first-screen copy)
    expect(await screen.findByText(/Begin/i)).toBeInTheDocument()
  })
})

describe('App version compatibility gate', () => {
  const baseSettings: SettingsResponse = {
    vault_paths: ['/v'], excluded_paths: [], profile_text: '',
    cadence_days: 1, delivery_time: '07:00', timezone: 'UTC', reading_min: 7, notes_per_issue: 3,
    provider: 'openrouter', ollama_endpoint: '',
    embed_model: 'openai/text-embedding-3-small', summary_model: 'openai/gpt-4o-mini',
    writer_model: 'anthropic/claude-3.5-sonnet', vault_note_count: 1284,
    writer_prompt: '', note_expand_prompt: '', note_expand_words: 500, sync_interval_minutes: 60,
    engine_version: '0.1.4', min_reader_version: '0.1.0',
  }
  const baseClient: ApiClient = {
    getTodayIssue: async () => { throw new Error('not found') },
    getIssue: async () => { throw new Error('not found') },
    getArchive: async () => ({ groups: [], total: 0 }),
    getSettings: async () => baseSettings,
    saveSettings: async (patch) => ({ ...baseSettings, ...patch }),
    getStatus: async () => ({
      indexed: false, theme_count: 0, note_count: 0, issue_count: 0,
      latest_issue_date: null, next_edition_at: null, delivery_time: '07:00', cadence_days: 1, active_jobs: [],
    }),
    reindex: async () => ({ job_id: 'test-ingest' }),
    triggerIssue: async () => ({ job_id: 'test-generate' }),
    cancelJobs: async () => ({ cancelled: 0 }),
    expandNote: async () => ({ title: '', text: '' }),
    setIssueFlags: async () => ({}) as never,
    getPromptDefaults: async () => ({ writer: 'DEFAULT WRITER VOICE', note_expand: 'DEFAULT NOTE-EXPAND VOICE' }),
  }

  test('engine too old (below MIN_ENGINE) shows the VersionMismatch page', async () => {
    const oldEngine: SettingsResponse = { ...baseSettings, engine_version: '0.1.3' }
    const client: ApiClient = { ...baseClient, getSettings: async () => oldEngine }
    const qc = new QueryClient()
    render(<QueryClientProvider client={qc}>
      <ClientContext.Provider value={client}><App /></ClientContext.Provider>
    </QueryClientProvider>)
    expect(await screen.findByText(/fallen behind/i)).toBeInTheDocument()
  })

  test('reader too old (below engine min_reader_version) shows the VersionMismatch page', async () => {
    const newEngine: SettingsResponse = { ...baseSettings, engine_version: '9.9.9', min_reader_version: '9.9.9' }
    const client: ApiClient = { ...baseClient, getSettings: async () => newEngine }
    const qc = new QueryClient()
    render(<QueryClientProvider client={qc}>
      <ClientContext.Provider value={client}><App /></ClientContext.Provider>
    </QueryClientProvider>)
    expect(await screen.findByText(/update your reader/i)).toBeInTheDocument()
  })
})
