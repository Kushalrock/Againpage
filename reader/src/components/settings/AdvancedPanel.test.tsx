import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../../api/queries'
import type { ApiClient } from '../../api/client'
import { AdvancedPanel } from './AdvancedPanel'

function client(spy: { reindex: number; trigger: number }): ApiClient {
  return {
    getTodayIssue: async () => ({}) as never, getIssue: async () => ({}) as never,
    getArchive: async () => ({}) as never, getSettings: async () => ({}) as never,
    saveSettings: async () => ({}) as never, getStatus: async () => ({}) as never,
    reindex: async () => { spy.reindex++; return { job_id: 'i' } },
    triggerIssue: async () => { spy.trigger++; return { job_id: 'g' } },
  }
}
function wrap(spy: { reindex: number; trigger: number }) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client(spy)}><AdvancedPanel noteCount={42} /></ClientContext.Provider>
  </QueryClientProvider>)
}
test('re-index button calls reindex then shows queued', async () => {
  const spy = { reindex: 0, trigger: 0 }; wrap(spy)
  fireEvent.click(screen.getByRole('button', { name: /re-index/i }))
  await waitFor(() => expect(spy.reindex).toBe(1))
  expect(await screen.findByText(/queued/i)).toBeInTheDocument()
})
test('generate button calls triggerIssue', async () => {
  const spy = { reindex: 0, trigger: 0 }; wrap(spy)
  fireEvent.click(screen.getByRole('button', { name: /generate an issue/i }))
  await waitFor(() => expect(spy.trigger).toBe(1))
})
