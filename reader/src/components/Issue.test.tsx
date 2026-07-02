import { render, screen, within } from '@testing-library/react'
import { Issue } from './Issue'
import { AMOR_FATI } from '../api/fixtures'

test('3-min brief hides wildcard, forgotten, apply and trims connections to 2', () => {
  render(<Issue issue={AMOR_FATI} minutes={3} />)
  expect(screen.queryByText(/The wildcard/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/You may have forgotten/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/Things to apply/i)).not.toBeInTheDocument()
  const conns = screen.getByText(/Connections you might/i).closest('section')!
  expect(within(conns).getAllByText('×')).toHaveLength(2)
})

test('15-min full edition shows every section', () => {
  render(<Issue issue={AMOR_FATI} minutes={15} />)
  expect(screen.getByText(/The wildcard/i)).toBeInTheDocument()
  expect(screen.getByText(/You may have forgotten/i)).toBeInTheDocument()
  expect(screen.getByText(/Things to apply/i)).toBeInTheDocument()
})
