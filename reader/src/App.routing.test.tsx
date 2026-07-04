import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
    latest_issue_date: null, next_edition_at: null, delivery_time: '07:00', cadence: 'daily', active_jobs: [],
  }
  const notIndexedSettings: SettingsResponse = {
    vault_path: '~/Documents/Athenaeum', excluded_paths: [], profile_text: '',
    cadence: 'daily', delivery_time: '07:00', reading_min: 7, notes_per_issue: 3,
    provider: 'openrouter', ollama_endpoint: '',
    embed_model: 'openai/text-embedding-3-small', summary_model: 'openai/gpt-4o-mini',
    writer_model: 'anthropic/claude-3.5-sonnet', vault_note_count: 1284,
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
