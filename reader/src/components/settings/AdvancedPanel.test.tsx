import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../../api/queries'
import type { ApiClient } from '../../api/client'
import type { AppStatus } from '../../types/status'
import { AdvancedPanel } from './AdvancedPanel'

type Spy = { reindex: number; trigger: number; cancel: string[] }

const S = (active: string[], indexed = true): AppStatus => ({ indexed, theme_count: indexed ? 1 : 0,
  note_count: 5, issue_count: 0, latest_issue_date: null, next_edition_at: null, delivery_time: '07:00',
  cadence_days: 1, active_jobs: active })

function client(spy: Spy, active: string[], indexed = true): ApiClient {
  return {
    getTodayIssue: async () => ({}) as never, getIssue: async () => ({}) as never,
    getArchive: async () => ({}) as never, getSettings: async () => ({}) as never,
    saveSettings: async () => ({}) as never, getStatus: async () => S(active, indexed),
    reindex: async () => { spy.reindex++; return { job_id: 'i' } },
    triggerIssue: async () => { spy.trigger++; return { job_id: 'g' } },
    cancelJobs: async (t: string) => { spy.cancel.push(t); return { cancelled: 1 } },
    expandNote: async () => ({ title: '', text: '' }),
    setIssueFlags: async () => ({}) as never,
    getPromptDefaults: async () => ({ writer: 'DEFAULT WRITER VOICE', note_expand: 'DEFAULT NOTE-EXPAND VOICE' }),
  }
}
function wrap(active: string[] = [], indexed = true) {
  const spy: Spy = { reindex: 0, trigger: 0, cancel: [] }
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client(spy, active, indexed)}><AdvancedPanel noteCount={42} /></ClientContext.Provider>
  </QueryClientProvider>)
  return spy
}

test('re-index button calls reindex when idle', async () => {
  const spy = wrap([])
  fireEvent.click(screen.getByRole('button', { name: /re-index/i }))
  await waitFor(() => expect(spy.reindex).toBe(1))
})

test('generate button calls triggerIssue when idle (indexed)', async () => {
  const spy = wrap([])                                // indexed → enabled once status loads
  const gen = screen.getByRole('button', { name: /generate an issue/i })
  await waitFor(() => expect(gen).toBeEnabled())
  fireEvent.click(gen)
  await waitFor(() => expect(spy.trigger).toBe(1))
})

test('while an ingest is active, Re-index is disabled and Cancel cancels ingest + cluster', async () => {
  const spy = wrap(['ingest'])
  const reindexBtn = await screen.findByRole('button', { name: /re-index/i })
  await waitFor(() => expect(reindexBtn).toBeDisabled())
  fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
  await waitFor(() => expect(spy.cancel).toContain('ingest'))
  expect(spy.cancel).toContain('cluster')
  expect(spy.reindex).toBe(0)                              // never re-queued while active
})

test('while a generate is active, Generate is disabled and Cancel cancels generate', async () => {
  const spy = wrap(['generate'])
  const genBtn = await screen.findByRole('button', { name: /generate an issue/i })
  await waitFor(() => expect(genBtn).toBeDisabled())
  fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
  await waitFor(() => expect(spy.cancel).toContain('generate'))
  expect(spy.trigger).toBe(0)
})

test('Generate is disabled with a nudge until embeddings exist', async () => {
  const spy = wrap([], false)                       // not indexed → no embeddings/themes
  const gen = await screen.findByRole('button', { name: /generate an issue/i })
  await waitFor(() => expect(gen).toBeDisabled())
  expect(await screen.findByText(/generate embeddings first/i)).toBeInTheDocument()
  fireEvent.click(gen)
  expect(spy.trigger).toBe(0)                        // clicking a disabled button does nothing
})

test('shows how many themes were generated beside re-index', async () => {
  wrap([])                                           // S() sets theme_count: 1 when indexed
  expect(await screen.findByText(/42 notes · 1 theme\./i)).toBeInTheDocument()
})
