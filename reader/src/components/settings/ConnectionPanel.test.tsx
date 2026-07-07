import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectionPanel } from './ConnectionPanel'
import { storedApiBase } from '../../api/base'

afterEach(() => localStorage.clear())

function wrap() {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}><ConnectionPanel /></QueryClientProvider>)
}

test('saving an engine URL persists it (for split / home-lab)', () => {
  wrap()
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: 'http://192.168.1.20:8000' } })
  fireEvent.click(screen.getByText('Save'))
  expect(storedApiBase()).toBe('http://192.168.1.20:8000')
  expect(screen.getByText(/saved/i)).toBeInTheDocument()
})

test('saving blank clears the URL (back to same-machine default)', () => {
  localStorage.setItem('againpage.apiBase', 'http://old:8000')
  wrap()
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: '' } })
  fireEvent.click(screen.getByText('Save'))
  expect(storedApiBase()).toBe('')
})
