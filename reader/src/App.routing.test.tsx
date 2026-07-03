import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from './api/queries'
import { fixtureClient } from './api/fixtures'
import App from './App'
test('navigates from Today to Archive via the sidebar', async () => {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}><App /></ClientContext.Provider>
  </QueryClientProvider>)
  expect(await screen.findByRole('heading', { name: /Amor Fati/, level: 2 })).toBeInTheDocument()
  fireEvent.click(screen.getByText(/The Archive/i))
  expect(await screen.findByText(/The bound volumes/i)).toBeInTheDocument()
})
