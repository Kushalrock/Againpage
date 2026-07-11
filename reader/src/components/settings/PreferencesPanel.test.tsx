import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../../api/queries'
import { fixtureClient } from '../../api/fixtures'
import { PreferencesPanel } from './PreferencesPanel'
import type { Settings, SettingsPatch } from '../../types/settings'

const base: Settings = { vault_paths: ['/v'], excluded_paths: [], profile_text: '', cadence_days: 1,
  delivery_time: '07:00', timezone: 'UTC', reading_min: 7, notes_per_issue: 3, provider: 'openrouter',
  ollama_endpoint: 'http://localhost:11434', embed_model: 'e', summary_model: 's', writer_model: 'w' }

function wrap(onChange: (p: SettingsPatch) => void, settings: Settings = base) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}>
      <PreferencesPanel settings={settings} onChange={onChange} />
    </ClientContext.Provider></QueryClientProvider>)
}

test('time picker emits delivery_time on change', () => {
  let patch: SettingsPatch | null = null
  wrap((p) => { patch = p })
  fireEvent.change(screen.getByLabelText(/delivery time/i), { target: { value: '09:30' } })
  expect(patch).toEqual({ delivery_time: '09:30' })
})

test('day setter emits cadence_days and steppers adjust it', () => {
  const patches: SettingsPatch[] = []
  wrap((p) => patches.push(p))
  const input = screen.getByLabelText(/days between editions/i) as HTMLInputElement
  expect(input.value).toBe('1')
  fireEvent.change(input, { target: { value: '3' } })
  expect(patches.at(-1)).toEqual({ cadence_days: 3 })
  fireEvent.click(screen.getByLabelText(/more days/i))
  expect(patches.at(-1)).toEqual({ cadence_days: 4 })
  fireEvent.click(screen.getByLabelText(/fewer days/i))
  expect(patches.at(-1)).toEqual({ cadence_days: 3 })
})

test('shows a next-edition helper', () => {
  wrap(() => {})
  expect(screen.getByText(/your next edition/i)).toBeInTheDocument()
})

test('timezone control emits timezone on change', () => {
  let patch: SettingsPatch | null = null
  wrap((p) => { patch = p })
  const tz = screen.getByLabelText(/timezone/i) as HTMLSelectElement
  // Pick a value that actually exists in the rendered control (the select's
  // option list varies with the runtime's ICU data); fall back to a literal
  // for the text-input variant, which accepts any string.
  const opt = Array.from(tz.querySelectorAll('option')).map((o) => o.value).find((v) => v && v !== tz.value)
  const value = opt ?? 'Asia/Kolkata'
  fireEvent.change(tz, { target: { value } })
  expect(patch).toEqual({ timezone: value })
})
