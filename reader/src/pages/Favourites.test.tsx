import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import type { ApiClient } from '../api/client'
import { Favourites } from './Favourites'

function wrap(client: ApiClient = fixtureClient) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client}>
      <Favourites onOpen={() => {}} />
    </ClientContext.Provider></QueryClientProvider>)
}

test('shows only favourited editions, ignoring active/inactive', async () => {
  wrap()
  // "The Geometry of Habits" is favourite + active; "The Patience of Trees" is favourite + inactive.
  // Both must appear, proving the view ignores active/inactive. "Amor Fati" is not a favourite.
  expect(await screen.findByText('The Geometry of Habits')).toBeInTheDocument()
  expect(await screen.findByText('The Patience of Trees')).toBeInTheDocument()
  expect(screen.queryByText('Amor Fati')).not.toBeInTheDocument()
})

test('un-favouriting fires the setIssueFlags mutation', async () => {
  const setIssueFlags = vi.fn(async (id: string, patch: Parameters<ApiClient['setIssueFlags']>[1]) =>
    ({ id, active: patch.active ?? true, favorite: patch.favorite ?? false }))
  const client: ApiClient = { ...fixtureClient, setIssueFlags }
  wrap(client)
  await screen.findByText('The Geometry of Habits')
  // "The Geometry of Habits" (fixture-46) appears before "The Patience of Trees" (fixture-44)
  // in the fixture's item order, so it's the first unfavourite button in the list.
  const buttons = screen.getAllByRole('button', { name: 'unfavourite' })
  fireEvent.click(buttons[0])
  await vi.waitFor(() => expect(setIssueFlags).toHaveBeenCalledWith('fixture-46', { favorite: false }))
})
