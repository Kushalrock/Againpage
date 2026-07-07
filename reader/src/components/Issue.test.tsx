import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Issue } from './Issue'
import { AMOR_FATI } from '../api/fixtures'

// Issue embeds the NoteDrawer (a query), so it needs a QueryClient ancestor —
// as it always has in the app (rendered under App's provider).
const renderIssue = (minutes: number) =>
  render(<QueryClientProvider client={new QueryClient()}><Issue issue={AMOR_FATI} minutes={minutes} /></QueryClientProvider>)

test('3-min brief hides wildcard, forgotten, apply and trims connections to 2', () => {
  renderIssue(3)
  expect(screen.queryByText(/The wildcard/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/You may have forgotten/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/Things to apply/i)).not.toBeInTheDocument()
  const conns = screen.getByText(/Connections you might/i).closest('section')!
  expect(within(conns).getAllByText('×')).toHaveLength(2)
})

test('15-min full edition shows every section', () => {
  renderIssue(15)
  expect(screen.getByText(/The wildcard/i)).toBeInTheDocument()
  expect(screen.getByText(/You may have forgotten/i)).toBeInTheDocument()
  expect(screen.getByText(/Things to apply/i)).toBeInTheDocument()
})
