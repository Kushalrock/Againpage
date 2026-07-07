import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import { NoteDrawer } from './NoteDrawer'

function wrap(title: string | null, onClose: () => void = () => {}) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}>
      <NoteDrawer title={title} onClose={onClose} />
    </ClientContext.Provider></QueryClientProvider>)
}

test('fetches and renders the expanded note', async () => {
  wrap('Amor Fati')
  expect(await screen.findByRole('heading', { name: 'Amor Fati' })).toBeInTheDocument()
  expect(await screen.findByText(/standalone reading/i)).toBeInTheDocument()
})

test('close button fires onClose', async () => {
  let closed = false
  wrap('Amor Fati', () => { closed = true })
  await screen.findByRole('heading', { name: 'Amor Fati' })
  fireEvent.click(screen.getByLabelText('close'))
  expect(closed).toBe(true)
})

test('no title → nothing fetched (no heading)', () => {
  wrap(null)
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})
