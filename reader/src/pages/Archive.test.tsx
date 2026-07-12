import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import type { ApiClient } from '../api/client'
import { ARCHIVE } from '../api/fixtures'
import type { AppStatus } from '../types/status'
import { Archive } from './Archive'

const S = (o: Partial<AppStatus>): AppStatus => ({ indexed: true, theme_count: 1, note_count: 5,
  issue_count: 0, latest_issue_date: null, next_edition_at: '2999-01-01T07:00:00', delivery_time: '07:00', cadence_days: 1,
  active_jobs: [], ...o })
function mk(status: AppStatus, populated: boolean): ApiClient {
  return { getTodayIssue: async () => ({}) as never, getIssue: async () => ({}) as never,
    getArchive: async () => (populated ? ARCHIVE : { groups: [], total: 0 }),
    getSettings: async () => ({}) as never, saveSettings: async () => ({}) as never,
    getStatus: async () => status, reindex: async () => ({ job_id: 'i' }), triggerIssue: async () => ({ job_id: 'g' }),
    cancelJobs: async () => ({ cancelled: 0 }),
    expandNote: async () => ({ title: '', text: '' }),
    setIssueFlags: async () => ({}) as never,
    getPromptDefaults: async () => ({ writer: 'DEFAULT WRITER VOICE', note_expand: 'DEFAULT NOTE-EXPAND VOICE' }) }
}
function wrap(client: ApiClient, onOpen: (id: string) => void = () => {}, onNavigate: (s: string) => void = () => {}) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client}><Archive onOpen={onOpen} onNavigate={onNavigate} /></ClientContext.Provider>
  </QueryClientProvider>)
}
test('empty + not indexed → compose nudge', async () => {
  wrap(mk(S({ indexed: false, theme_count: 0 }), false))
  expect(await screen.findByText(/compose your themes/i)).toBeInTheDocument()
})
test('empty + indexed → bound-volumes placeholder', async () => {
  wrap(mk(S({}), false))
  expect(await screen.findByText(/bound volumes fill as editions are composed/i)).toBeInTheDocument()
})
test('populated → grouped archive + onOpen', async () => {
  const opened: string[] = []
  wrap(mk(S({ issue_count: 7 }), true), (id) => opened.push(id))
  expect(await screen.findByText(/This week/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/Amor Fati/i))
  expect(opened.length).toBe(1)
})
test('row is a role=button div and opens edition on Enter keydown', async () => {
  const opened: string[] = []
  wrap(mk(S({ issue_count: 7 }), true), (id) => opened.push(id))
  await screen.findByText(/Amor Fati/i)
  const row = screen.getByText(/Amor Fati/i).closest('[role="button"]') as HTMLElement
  expect(row).toBeInTheDocument()
  expect(row.tagName).not.toBe('BUTTON')
  fireEvent.keyDown(row, { key: 'Enter' })
  expect(opened.length).toBe(1)
})
test('header spells out the real edition count, not a hardcoded number', async () => {
  wrap(mk(S({}), true))                                    // ARCHIVE.total === 7
  expect(await screen.findByText(/Seven mornings, and counting\./i)).toBeInTheDocument()
})
test('defaults to the Active filter and hides inactive editions', async () => {
  wrap(mk(S({}), true))
  expect(await screen.findByText(/Amor Fati/i)).toBeInTheDocument()
  expect(screen.queryByText(/Borrowed Light/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/The Patience of Trees/i)).not.toBeInTheDocument()
})
test('Inactive filter shows only inactive; All shows both', async () => {
  wrap(mk(S({}), true))
  await screen.findByText(/Amor Fati/i)
  fireEvent.click(screen.getByRole('button', { name: /^inactive$/i }))
  expect(screen.getByText(/Borrowed Light/i)).toBeInTheDocument()
  expect(screen.queryByText(/Amor Fati/i)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /^all$/i }))
  expect(screen.getByText(/Borrowed Light/i)).toBeInTheDocument()
  expect(screen.getByText(/Amor Fati/i)).toBeInTheDocument()
})
test('favourite and inactive toggles fire setIssueFlags', async () => {
  const calls: unknown[] = []
  const spyClient: ApiClient = { ...mk(S({}), true),
    setIssueFlags: async (id, patch) => { calls.push({ id, patch }); return { id, active: patch.active ?? true, favorite: patch.favorite ?? false } } }
  wrap(spyClient)
  await screen.findByText(/Amor Fati/i)
  fireEvent.click(screen.getAllByRole('button', { name: /^favourite$/i })[0])
  await waitFor(() => expect(calls.at(-1)).toMatchObject({ patch: { favorite: expect.any(Boolean) } }))
  fireEvent.click(screen.getAllByRole('button', { name: /move to inactive/i })[0])
  await waitFor(() => expect(calls.at(-1)).toMatchObject({ patch: { active: expect.any(Boolean) } }))
})
