import { render, screen, fireEvent } from '@testing-library/react'
import { StandaloneSummaries } from './StandaloneSummaries'

const items = [{ note: 'Amor Fati', source: 'amor.md', text: 'a one-liner' }]

test('clicking a featured note calls onOpenNote with its title', () => {
  const opened: string[] = []
  render(<StandaloneSummaries items={items} onOpenNote={(t) => opened.push(t)} />)
  fireEvent.click(screen.getByText(/read in full/i))
  expect(opened).toEqual(['Amor Fati'])
})

test('the note title itself is clickable too', () => {
  const opened: string[] = []
  render(<StandaloneSummaries items={items} onOpenNote={(t) => opened.push(t)} />)
  fireEvent.click(screen.getByRole('heading', { name: 'Amor Fati' }))
  expect(opened).toEqual(['Amor Fati'])
})
