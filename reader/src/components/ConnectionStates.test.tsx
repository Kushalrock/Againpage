import { render, screen, fireEvent } from '@testing-library/react'
import { Connecting, Unreachable } from './ConnectionStates'

test('Connecting shows the newsroom line', () => {
  render(<Connecting />)
  expect(screen.getByText(/reaching the newsroom/i)).toBeInTheDocument()
})

test('Unreachable shows the url and fires both actions', () => {
  const onRetry = vi.fn()
  const onClick = vi.fn()
  render(<Unreachable url="https://engine.example:8000" onRetry={onRetry}
    secondary={{ label: 'Point to another press', onClick }} />)
  expect(screen.getByText(/the newsroom isn't answering/i)).toBeInTheDocument()
  expect(screen.getByText('https://engine.example:8000')).toBeInTheDocument()
  fireEvent.click(screen.getByText(/try again/i)); expect(onRetry).toHaveBeenCalled()
  fireEvent.click(screen.getByText(/point to another press/i)); expect(onClick).toHaveBeenCalled()
})
