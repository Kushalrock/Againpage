import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlatformContext, type Platform } from '../../platform'
import { AiSourcePanel } from './AiSourcePanel'
import { PROVIDER_DEFAULTS } from '../../lib/providerDefaults'
import type { Settings, SettingsPatch } from '../../types/settings'

const base: Settings = { vault_path: '/v', excluded_paths: [], profile_text: '', cadence: 'daily',
  delivery_time: '07:00', reading_min: 7, notes_per_issue: 3, provider: 'openrouter',
  ollama_endpoint: 'http://localhost:11434', embed_model: 'e', summary_model: 's', writer_model: 'w' }

function fakePlatform(over: Partial<Platform> = {}): Platform {
  return { folderPicker: { pick: async () => null },
    keyStore: { get: async () => null, set: async () => {}, remove: async () => {} },
    connectionTest: { run: async () => ({ ok: true, reachable: true, models: { w: true }, detail: '' }) },
    ...over } as Platform
}

test('switching to ollama reveals the endpoint field', () => {
  render(<PlatformContext.Provider value={fakePlatform()}>
    <AiSourcePanel settings={base} onChange={() => {}} /></PlatformContext.Provider>)
  fireEvent.click(screen.getByText('Ollama'))
  expect(screen.getByPlaceholderText(/11434/)).toBeInTheDocument()
})

test('test-connection goes idle -> ok', async () => {
  render(<PlatformContext.Provider value={fakePlatform()}>
    <AiSourcePanel settings={base} onChange={() => {}} /></PlatformContext.Provider>)
  fireEvent.click(screen.getByText(/Test connection/i))
  await waitFor(() => expect(screen.getByText(/Connected/i)).toBeInTheDocument())
})

test('selecting a provider populates that provider default model names', () => {
  const patches: SettingsPatch[] = []
  render(<PlatformContext.Provider value={fakePlatform()}>
    <AiSourcePanel settings={base} onChange={(p) => patches.push(p)} /></PlatformContext.Provider>)
  fireEvent.click(screen.getByText('Custom'))
  const last = patches.at(-1)!
  expect(last.provider).toBe('custom')
  expect(last.embed_model).toBe(PROVIDER_DEFAULTS.custom.embed_model)
  expect(last.summary_model).toBe(PROVIDER_DEFAULTS.custom.summary_model)
  expect(last.writer_model).toBe(PROVIDER_DEFAULTS.custom.writer_model)
})

test('model fields are editable (local state, typing is not swallowed)', () => {
  const patches: SettingsPatch[] = []
  render(<PlatformContext.Provider value={fakePlatform()}>
    <AiSourcePanel settings={base} onChange={(p) => patches.push(p)} /></PlatformContext.Provider>)
  const input = screen.getByDisplayValue('w') as HTMLInputElement       // writer model, from settings
  fireEvent.change(input, { target: { value: 'anthropic/claude-3.5-sonnet' } })
  expect(input.value).toBe('anthropic/claude-3.5-sonnet')                // reflects typed value immediately
  expect(patches.at(-1)!.writer_model).toBe('anthropic/claude-3.5-sonnet')
})

test('a stored api key is loaded back into the field on mount', async () => {
  const platform = fakePlatform({ keyStore: { get: async (k) => (k === 'openrouter' ? 'sk-or-saved' : null),
    set: async () => {}, remove: async () => {} } })
  render(<PlatformContext.Provider value={platform}>
    <AiSourcePanel settings={base} onChange={() => {}} /></PlatformContext.Provider>)
  expect(await screen.findByDisplayValue('sk-or-saved')).toBeInTheDocument()
})
