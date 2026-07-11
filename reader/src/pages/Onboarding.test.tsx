import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import { ConnectionError } from '../api/http'
import { PlatformContext, type Platform } from '../platform'
import type { ApiClient } from '../api/client'
import { storedApiBase } from '../api/base'
import { Onboarding } from './Onboarding'

afterEach(() => localStorage.clear())

// fixtureClient.getSettings() resolves as "already configured" (non-empty
// vault_paths), so the welcome-step gate would otherwise call onDone()
// straight away. Most of these tests need "reachable but unconfigured" so the
// gate advances to the folder step instead.
const unconfiguredClient: ApiClient = {
  ...fixtureClient,
  getSettings: async () => ({ ...(await fixtureClient.getSettings()), vault_paths: [] }),
}

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
    <ClientContext.Provider value={unconfiguredClient}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={onDone} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
}

test('cannot advance step 1 without a folder, can after picking', async () => {
  wrap()
  fireEvent.click(screen.getByText(/Begin/i))                 // step 0 -> 1 (connection check)
  expect(await screen.findByText(/Point AgainPage at your notes/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/Continue/i))              // gated: still step 1
  expect(screen.getByText(/Point AgainPage at your notes/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/Choose folder/i))
  expect(await screen.findByText(/42 notes found/i)).toBeInTheDocument()
})

test('can add a folder by typing an engine-side path (home-lab / remote engine)', async () => {
  wrap()
  fireEvent.click(screen.getByText(/Begin/i))                 // step 0 -> 1 (connection check)
  await screen.findByText(/Point AgainPage at your notes/i)
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
  const failing: ApiClient = { ...unconfiguredClient, saveSettings: async () => { throw new Error('unreachable') } }
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={failing}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={() => {}} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
  fireEvent.click(screen.getByText(/Begin/i))                              // → step 1 (connection check)
  await screen.findByLabelText(/folder path/i)
  fireEvent.change(screen.getByLabelText(/folder path/i), { target: { value: '/vault/n' } })
  fireEvent.click(screen.getByText('Add path'))
  fireEvent.click(screen.getByText(/Continue/i))                           // → step 2
  fireEvent.click(screen.getByText('OpenRouter'))
  fireEvent.click(screen.getByText(/Continue/i))                           // → step 3
  fireEvent.click(screen.getByText(/Continue/i))                           // → step 4
  fireEvent.click(screen.getByText(/Finish/i))
  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save/i)  // shown, not silent
})

test('hides the native picker on Android but keeps the typed path (step 1)', async () => {
  const realUA = navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit', configurable: true })
  try {
    wrap()
    fireEvent.click(screen.getByText(/Begin/i))                 // step 0 -> 1 (connection check)
    await screen.findByLabelText(/folder path/i)
    expect(screen.queryByText(/Choose folder/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/folder path/i)).toBeInTheDocument()
  } finally {
    Object.defineProperty(navigator, 'userAgent', { value: realUA, configurable: true })
  }
})

test('welcome step shows Unreachable on a connection error, and Go back returns', async () => {
  const qc = new QueryClient()
  const failing: ApiClient = { ...fixtureClient, getSettings: async () => { throw new ConnectionError() } }
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={failing}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={() => {}} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: 'http://bad:8000' } })
  fireEvent.click(screen.getByText(/Begin/i))
  expect(await screen.findByText(/the newsroom isn't answering/i)).toBeInTheDocument()
  fireEvent.click(screen.getByText(/go back/i))
  expect(screen.getByLabelText(/engine URL/i)).toBeInTheDocument()   // back on the welcome step
})

test('welcome step advances to the folder step when the engine is reachable + unconfigured', async () => {
  const qc = new QueryClient()
  // unconfiguredClient.getSettings resolves with empty vault_paths (reachable, unconfigured)
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={unconfiguredClient}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={() => {}} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText(/engine URL/i), { target: { value: 'http://ok:8000' } })
  fireEvent.click(screen.getByText(/Begin/i))
  expect(await screen.findByText(/Point AgainPage at your notes/i)).toBeInTheDocument()
})

test('welcome step calls onDone when the engine is reachable + already configured', async () => {
  const qc = new QueryClient()
  const onDone = () => { called = true }
  let called = false
  render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}>
      <PlatformContext.Provider value={fakePlatform()}>
        <Onboarding onDone={onDone} />
      </PlatformContext.Provider></ClientContext.Provider></QueryClientProvider>)
  fireEvent.click(screen.getByText(/Begin/i))
  await waitFor(() => expect(called).toBe(true))
})
