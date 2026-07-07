import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { PlatformContext, type Platform } from '../../platform'
import { AiSourcePanel } from './AiSourcePanel'
import { PROVIDER_DEFAULTS } from '../../lib/providerDefaults'
import type { Settings, SettingsPatch } from '../../types/settings'

const base: Settings = { vault_paths: ['/v'], excluded_paths: [], profile_text: '', cadence_days: 1,
  delivery_time: '07:00', reading_min: 7, notes_per_issue: 3, provider: 'openrouter',
  ollama_endpoint: 'http://localhost:11434', embed_model: 'e', summary_model: 's', writer_model: 'w' }

function fakePlatform(over: Partial<Platform> = {}): Platform {
  return { folderPicker: { pick: async () => null },
    keyStore: { get: async () => null, set: async () => {}, remove: async () => {} },
    connectionTest: { run: async () => ({ ok: true, reachable: true, models: { w: true }, detail: '' }) },
    ...over } as Platform
}

function renderPanel(platform: Platform = fakePlatform(), settings: Settings = base) {
  const saved: SettingsPatch[] = []
  let reindexed = 0
  render(<PlatformContext.Provider value={platform}>
    <AiSourcePanel settings={settings} onSave={(p) => { saved.push(p) }} onReindex={() => { reindexed += 1 }} />
  </PlatformContext.Provider>)
  return { saved, reindexed: () => reindexed }
}

test('switching to ollama reveals the endpoint field', () => {
  renderPanel()
  fireEvent.click(screen.getByText('Ollama'))
  expect(screen.getByPlaceholderText(/11434/)).toBeInTheDocument()
})

test('test-connection goes idle -> ok', async () => {
  renderPanel()
  fireEvent.click(screen.getByText(/Test connection/i))
  await waitFor(() => expect(screen.getByText(/Connected/i)).toBeInTheDocument())
})

test('selecting a provider fills that provider default model names', () => {
  renderPanel()
  fireEvent.click(screen.getByText('Custom'))
  expect(screen.getByDisplayValue(PROVIDER_DEFAULTS.custom.embed_model)).toBeInTheDocument()
  expect(screen.getByDisplayValue(PROVIDER_DEFAULTS.custom.writer_model)).toBeInTheDocument()
})

test('does NOT auto-save; Save confirms then persists (writer-only → no re-index)', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { saved, reindexed } = renderPanel()
  fireEvent.change(screen.getByDisplayValue('w'), { target: { value: 'anthropic/claude-sonnet-5' } })
  expect(saved.length).toBe(0)                               // editing alone saves nothing
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => expect(saved.length).toBe(1))
  expect(confirm).toHaveBeenCalled()                          // a confirmation prompt appears on every Save
  expect(saved[0].writer_model).toBe('anthropic/claude-sonnet-5')
  expect(reindexed()).toBe(0)                                // writer-only change → no re-index
  confirm.mockRestore()
})

test('changing the embedding model confirms and triggers a re-index on Save', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { saved, reindexed } = renderPanel()
  fireEvent.change(screen.getByDisplayValue('e'), { target: { value: 'ollama/other-embed' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => expect(saved.length).toBe(1))
  expect(confirm).toHaveBeenCalled()
  expect(saved[0].embed_model).toBe('ollama/other-embed')
  expect(reindexed()).toBe(1)
  confirm.mockRestore()
})

test('cancelling the confirmation saves nothing', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  const { saved, reindexed } = renderPanel()
  fireEvent.change(screen.getByDisplayValue('e'), { target: { value: 'ollama/other-embed' } })
  fireEvent.click(screen.getByText('Save'))
  await new Promise((r) => setTimeout(r, 0))
  expect(saved.length).toBe(0)
  expect(reindexed()).toBe(0)
  confirm.mockRestore()
})

test('shows a saved indicator when a key already exists (keys are write-only)', () => {
  renderPanel(fakePlatform(), { ...base, has_openrouter_key: true })
  expect(screen.getByPlaceholderText(/saved — type to replace/i)).toBeInTheDocument()
})

test('Save sends a newly typed key in the patch', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  const { saved } = renderPanel()
  fireEvent.change(screen.getByPlaceholderText(/sk-or-v1/i), { target: { value: 'sk-or-new' } })
  fireEvent.click(screen.getByText('Save'))
  await waitFor(() => expect(saved.length).toBe(1))
  expect(saved[0].openrouter_key).toBe('sk-or-new')
  confirm.mockRestore()
})
