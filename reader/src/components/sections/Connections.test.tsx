import { render, screen } from '@testing-library/react'
import { Connections } from './Connections'
test('discovery and reminder render distinct labels', () => {
  render(<Connections items={[
    { flavor: 'discovery', a: 'A', b: 'B', overlap: 'x', text: 'ta' },
    { flavor: 'reminder', a: 'C', b: 'D', overlap: 'y', text: 'tb' },
  ]} />)
  expect(screen.getByText(/Discovery/i)).toBeInTheDocument()
  expect(screen.getByText(/Reminder/i)).toBeInTheDocument()
})
