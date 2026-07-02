import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from './api/queries'
import { fixtureClient } from './api/fixtures'
import App from './App'
test('App renders the shell and today edition', async () => {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}><App /></ClientContext.Provider>
  </QueryClientProvider>)
  expect(await screen.findByRole('heading', { name: /Amor Fati/, level: 2 })).toBeInTheDocument()
  expect(screen.getByText(/The Archive/i)).toBeInTheDocument() // sidebar nav item
})
