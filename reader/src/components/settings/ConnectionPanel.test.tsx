import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
vi.mock('../../api/http', () => ({ pingEngine: vi.fn(async () => true) }))
import * as http from '../../api/http'
import { ConnectionPanel } from './ConnectionPanel'
import { storedApiBase } from '../../api/base'

afterEach(() => localStorage.clear())

function wrap() {
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}><ConnectionPanel /></QueryClientProvider>)
}

test('saving an engine URL persists it (for split / home-lab)', () => {
  Object.defineProperty(window, 'location', { value: { reload: vi.fn() }, configurable: true })
  wrap()
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: 'http://192.168.1.20:8000' } })
  fireEvent.click(screen.getByText('Save'))
  expect(storedApiBase()).toBe('http://192.168.1.20:8000')
})

test('saving blank clears the URL (back to same-machine default)', () => {
  localStorage.setItem('againpage.apiBase', 'http://old:8000')
  wrap()
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: '' } })
  fireEvent.click(screen.getByText('Save'))
  expect(storedApiBase()).toBe('')
})

test('Test pings the entered URL without committing it', async () => {
  localStorage.clear()
  render(<ConnectionPanel />)
  fireEvent.change(screen.getByLabelText(/engine url/i), { target: { value: 'http://new:8000' } })
  fireEvent.click(screen.getByText(/^test$/i))
  await screen.findByText(/reached the press/i)
  expect(http.pingEngine).toHaveBeenCalledWith('http://new:8000')
  expect(localStorage.getItem('againpage.apiBase')).toBeNull()   // Test does not commit
})

test('Save reloads only when the URL changed', () => {
  localStorage.setItem('againpage.apiBase', 'http://old:8000')
  const reload = vi.fn()
  Object.defineProperty(window, 'location', { value: { reload }, configurable: true })
  render(<ConnectionPanel />)
  const input = screen.getByLabelText(/engine url/i)
  fireEvent.change(input, { target: { value: 'http://old:8000' } })   // unchanged
  fireEvent.click(screen.getByText(/^save$/i))
  expect(reload).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: 'http://new:8000' } })   // changed
  fireEvent.click(screen.getByText(/^save$/i))
  expect(localStorage.getItem('againpage.apiBase')).toBe('http://new:8000')
  expect(reload).toHaveBeenCalled()
  localStorage.clear()
})

test('re-saving the same URL with a trailing slash does not reload', () => {
  localStorage.setItem('againpage.apiBase', 'http://old:8000')
  const reload = vi.fn()
  Object.defineProperty(window, 'location', { value: { reload }, configurable: true })
  render(<ConnectionPanel />)
  fireEvent.change(screen.getByLabelText(/engine url/i), { target: { value: 'http://old:8000/' } })
  fireEvent.click(screen.getByText(/^save$/i))
  expect(reload).not.toHaveBeenCalled()
  expect(storedApiBase()).toBe('http://old:8000')
})

test('an unchanged Save shows a "Saved." confirmation', async () => {
  localStorage.setItem('againpage.apiBase', 'http://old:8000')
  Object.defineProperty(window, 'location', { value: { reload: vi.fn() }, configurable: true })
  render(<ConnectionPanel />)
  fireEvent.change(screen.getByLabelText(/engine url/i), { target: { value: 'http://old:8000' } })
  fireEvent.click(screen.getByText(/^save$/i))
  expect(await screen.findByText(/^saved\.$/i)).toBeInTheDocument()
})
