import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlatformContext } from '../../platform'
import { AiSourcePanel } from './AiSourcePanel'
import type { Settings } from '../../types/settings'

const base: Settings = { vault_path: '/v', excluded_paths: [], profile_text: '', cadence: 'daily',
  delivery_time: '07:00', reading_min: 7, notes_per_issue: 3, provider: 'openrouter',
  ollama_endpoint: 'http://localhost:11434', embed_model: 'e', summary_model: 's', writer_model: 'w' }

function fakePlatform(ok = true) {
  return { folderPicker: { pick: async () => null },
    keyStore: { get: async () => null, set: async () => {}, remove: async () => {} },
    connectionTest: { run: async () => ({ ok, reachable: ok, models: { w: ok }, detail: '' }) } }
}

test('switching to ollama reveals the endpoint field', () => {
  render(<PlatformContext.Provider value={fakePlatform()}>
    <AiSourcePanel settings={base} onChange={() => {}} /></PlatformContext.Provider>)
  fireEvent.click(screen.getByText('Ollama'))
  expect(screen.getByPlaceholderText(/11434/)).toBeInTheDocument()
})

test('test-connection goes idle -> ok', async () => {
  render(<PlatformContext.Provider value={fakePlatform(true)}>
    <AiSourcePanel settings={base} onChange={() => {}} /></PlatformContext.Provider>)
  fireEvent.click(screen.getByText(/Test connection/i))
  await waitFor(() => expect(screen.getByText(/Connected/i)).toBeInTheDocument())
})
