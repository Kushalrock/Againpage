import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import type { ApiClient } from '../api/client'
import { AMOR_FATI } from '../api/fixtures'
import type { AppStatus } from '../types/status'
import { Reader } from './Reader'

function mk(status: AppStatus, hasIssue: boolean): ApiClient {
  return {
    getTodayIssue: async () => { if (!hasIssue) throw new Error('404'); return AMOR_FATI },
    getIssue: async () => AMOR_FATI, getArchive: async () => ({ groups: [], total: 0 }),
    getSettings: async () => ({}) as never, saveSettings: async () => ({}) as never,
    getStatus: async () => status, reindex: async () => ({ job_id: 'i' }), triggerIssue: async () => ({ job_id: 'g' }),
    cancelJobs: async () => ({ cancelled: 0 }),
    expandNote: async () => ({ title: '', text: '' }),
  }
}
const S = (o: Partial<AppStatus>): AppStatus => ({ indexed: true, theme_count: 1, note_count: 5,
  issue_count: 0, latest_issue_date: null, next_edition_at: null, delivery_time: '07:00', cadence_days: 1,
  active_jobs: [], ...o })
function wrap(client: ApiClient, onNavigate: (s: string) => void = () => {}, issueId: string | null = null) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client}><Reader issueId={issueId} onNavigate={onNavigate} /></ClientContext.Provider>
  </QueryClientProvider>)
}
test('not indexed → compose-themes nudge + CTA navigates to settings', async () => {
  const nav: string[] = []
  wrap(mk(S({ indexed: false, theme_count: 0 }), false), (s) => nav.push(s))
  expect(await screen.findByText(/haven't been composed/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /compose your themes/i }))
  expect(nav).toEqual(['settings'])
})
test('indexed, no edition → first-edition countdown', async () => {
  wrap(mk(S({ next_edition_at: '2999-01-01T07:00:00' }), false))
  expect(await screen.findByText(/your first edition arrives/i)).toBeInTheDocument()
})
test("edition exists → renders issue + next-edition header badge under 'Reader'", async () => {
  wrap(mk(S({ issue_count: 1, next_edition_at: '2999-01-01T07:00:00' }), true))
  expect(await screen.findByRole('heading', { name: /Amor Fati/, level: 2 })).toBeInTheDocument()
  expect(screen.getByText(/next edition/i)).toBeInTheDocument()
  expect(screen.getByText(/^Reader ·/i)).toBeInTheDocument()
})
test('with an issueId → renders that archived edition directly (even when not indexed)', async () => {
  wrap(mk(S({ indexed: false }), false), () => {}, 'archived-id')
  expect(await screen.findByRole('heading', { name: /Amor Fati/, level: 2 })).toBeInTheDocument()
})
