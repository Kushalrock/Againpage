import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../api/queries'
import { fixtureClient } from '../api/fixtures'
import { PlatformContext, type Platform } from '../platform'
import { Onboarding } from './Onboarding'

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
