import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../../api/queries'
import { fixtureClient } from '../../api/fixtures'
import type { ApiClient } from '../../api/client'
import type { Settings } from '../../types/settings'
import { EditorialPrompts } from './EditorialPrompts'

const base: Settings = { ...({} as Settings), vault_paths: [], excluded_paths: [], profile_text: '',
  cadence_days: 1, delivery_time: '07:00', timezone: 'UTC', reading_min: 7, notes_per_issue: 3,
  provider: 'openrouter', ollama_endpoint: '', embed_model: '', summary_model: '', writer_model: '',
  writer_prompt: '', note_expand_prompt: '', note_expand_words: 500 }

function wrap(client: ApiClient = fixtureClient, settings: Settings = base) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={client}>
      <EditorialPrompts settings={settings} />
    </ClientContext.Provider></QueryClientProvider>)
}

test('prefills the writer textarea with the default voice when no override', async () => {
  wrap()
  const ta = await screen.findByLabelText(/writer voice/i) as HTMLTextAreaElement
  expect(ta.value).toBe('DEFAULT WRITER VOICE')   // from fixture getPromptDefaults
})

test('save is blocked when the writer voice is empty', async () => {
  const saved: unknown[] = []
  const client: ApiClient = { ...fixtureClient, saveSettings: async (p) => { saved.push(p); return base as never } }
  wrap(client)
  const ta = await screen.findByLabelText(/writer voice/i)
  fireEvent.change(ta, { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: /save writer voice/i }))
  expect(saved).toHaveLength(0)
})

test('saving a writer voice PUTs just that field', async () => {
  const saved: Array<Record<string, unknown>> = []
  const client: ApiClient = { ...fixtureClient, saveSettings: async (p) => { saved.push(p); return base as never } }
  wrap(client)
  const ta = await screen.findByLabelText(/writer voice/i)
  fireEvent.change(ta, { target: { value: 'Custom voice.' } })
  fireEvent.click(screen.getByRole('button', { name: /save writer voice/i }))
  await waitFor(() => expect(saved.at(-1)).toEqual({ writer_prompt: 'Custom voice.' }))
})

test('revert writer voice clears the override and restores the default', async () => {
  const saved: Array<Record<string, unknown>> = []
  const client: ApiClient = { ...fixtureClient, saveSettings: async (p) => { saved.push(p); return base as never } }
  wrap(client, { ...base, writer_prompt: 'Old override' })
  fireEvent.click(await screen.findByRole('button', { name: /revert writer voice/i }))
  await waitFor(() => expect(saved.at(-1)).toEqual({ writer_prompt: '' }))
  expect((screen.getByLabelText(/writer voice/i) as HTMLTextAreaElement).value).toBe('DEFAULT WRITER VOICE')
})
