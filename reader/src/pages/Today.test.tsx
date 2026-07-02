import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import { Today } from './Today'

function wrap() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <ClientContext.Provider value={fixtureClient}><Today /></ClientContext.Provider>
    </QueryClientProvider>)
}

test('renders the issue then reveals wildcard when slider dragged to 15', async () => {
  wrap()
  expect(await screen.findByRole('heading', { name: /Amor Fati/, level: 2 })).toBeInTheDocument()
  expect(screen.queryByText(/The wildcard/i)).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('slider'), { target: { value: '15' } })
  expect(screen.getByText(/The wildcard/i)).toBeInTheDocument()
})
