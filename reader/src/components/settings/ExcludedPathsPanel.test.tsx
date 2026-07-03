import { render, screen, fireEvent } from '@testing-library/react'
import { ExcludedPathsPanel } from './ExcludedPathsPanel'
test('add and remove paths', () => {
  let paths = ['./Templates']
  const onChange = (p: string[]) => { paths = p }
  const { rerender } = render(<ExcludedPathsPanel paths={paths} onChange={onChange} />)
  fireEvent.change(screen.getByPlaceholderText(/Drafts/i), { target: { value: './Archive' } })
  fireEvent.click(screen.getByText(/Add path/i))
  expect(paths).toEqual(['./Templates', './Archive'])
  rerender(<ExcludedPathsPanel paths={paths} onChange={onChange} />)
  fireEvent.click(screen.getAllByText(/Remove/i)[0])
  expect(paths).toEqual(['./Archive'])
})
