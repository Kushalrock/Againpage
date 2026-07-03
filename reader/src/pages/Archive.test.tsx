import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import { Archive } from './Archive'

function wrap(onOpen = () => {}) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}><Archive onOpen={onOpen} /></ClientContext.Provider>
  </QueryClientProvider>)
}
test('renders grouped archive and fires onOpen', async () => {
  const opened: string[] = []
  wrap((id) => opened.push(id))
  expect(await screen.findByText(/The Archive/i)).toBeInTheDocument()
  expect(screen.getByText(/This week/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/Amor Fati/i))
  expect(opened.length).toBe(1)
})
