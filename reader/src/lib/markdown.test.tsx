import { render, screen } from '@testing-library/react'
import { LeadMarkdown } from './markdown'
test('renders a subhead and a blockquote', () => {
  render(<LeadMarkdown source={"Opening text here.\n\n## A Subhead\n\n> A quote"} />)
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('A Subhead')
  expect(screen.getByText('A quote')).toBeInTheDocument()
})
