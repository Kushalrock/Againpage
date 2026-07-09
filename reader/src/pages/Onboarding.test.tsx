import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import { PlatformContext, type Platform } from '../platform'
import type { ApiClient } from '../api/client'
import { storedApiBase } from '../api/base'
import { Onboarding } from './Onboarding'

afterEach(() => localStorage.clear())

function fakePlatform(): Platform {
  return {
    folderPicker: { pick: async () => ({ path: '~/Notes', count: 42 }) },
    keyStore: { get: async () => null, set: async () => {}, remove: async () => {} },
    connectionTest: { run: async () => ({ ok: true, reachable: true, models: {}, detail: '' }) },
  }
}
function wrap(onDone: () => void = () => {}) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={onDone} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
}

test('cannot advance step 1 without a folder, can after picking', async () => {
  wrap()
  fireEvent.click(screen.getByText(/Begin/i))                 // step 0 -> 1
  expect(screen.getByText(/Point AgainPage at your notes/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/Continue/i))              // gated: still step 1
  expect(screen.getByText(/Point AgainPage at your notes/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/Choose folder/i))
  expect(await screen.findByText(/42 notes found/i)).toBeInTheDocument()
})

test('can add a folder by typing an engine-side path (home-lab / remote engine)', async () => {
  wrap()
  fireEvent.click(screen.getByText(/Begin/i))                 // step 0 -> 1
  fireEvent.change(screen.getByLabelText(/folder path/i), { target: { value: '/vault' } })
  fireEvent.click(screen.getByText(/Add path/i))
  expect(await screen.findByText(/scanned when you index/i)).toBeInTheDocument()  // added, no client count
  fireEvent.click(screen.getByText(/Continue/i))              // now un-gated
  expect(screen.queryByText(/Point AgainPage at your notes/i)).not.toBeInTheDocument()
})

test('the engine URL field persists a base URL for a remote engine', () => {
  wrap()
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: 'http://server:8000' } })
  expect(storedApiBase()).toBe('http://server:8000')
})

test('Finish surfaces an error and stays put when the save fails (unreachable engine)', async () => {
  const qc = new QueryClient()
  const failing: ApiClient = { ...fixtureClient, saveSettings: async () => { throw new Error('unreachable') } }
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={failing}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={() => {}} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
  fireEvent.click(screen.getByText(/Begin/i))                              // → step 1
  fireEvent.change(screen.getByLabelText(/folder path/i), { target: { value: '/vault/n' } })
  fireEvent.click(screen.getByText('Add path'))
  fireEvent.click(screen.getByText(/Continue/i))                           // → step 2
  fireEvent.click(screen.getByText('OpenRouter'))
  fireEvent.click(screen.getByText(/Continue/i))                           // → step 3
  fireEvent.click(screen.getByText(/Continue/i))                           // → step 4
  fireEvent.click(screen.getByText(/Finish/i))
  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save/i)  // shown, not silent
})
