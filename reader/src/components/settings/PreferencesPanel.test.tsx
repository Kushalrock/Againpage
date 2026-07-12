import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClientContext } from '../../api/queries'
import { fixtureClient } from '../../api/fixtures'
import { PreferencesPanel } from './PreferencesPanel'
import type { Settings, SettingsPatch } from '../../types/settings'

const base: Settings = { vault_paths: ['/v'], excluded_paths: [], profile_text: '', cadence_days: 1,
  delivery_time: '07:00', timezone: 'UTC', reading_min: 7, notes_per_issue: 3, provider: 'openrouter',
  ollama_endpoint: 'http://localhost:11434', embed_model: 'e', summary_model: 's', writer_model: 'w',
  writer_prompt: '', note_expand_prompt: '', note_expand_words: 500, sync_interval_minutes: 60 }

function wrap(onChange: (p: SettingsPatch) => void, settings: Settings = base) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>
    <ClientContext.Provider value={fixtureClient}>
      <PreferencesPanel settings={settings} onChange={onChange} />
    </ClientContext.Provider></QueryClientProvider>)
}

test('delivery time + timezone do not auto-save; Save persists both together', () => {
  const patches: SettingsPatch[] = []
  wrap((p) => patches.push(p))

  const save = screen.getByRole('button', { name: /save delivery time/i })
  expect(save).toBeDisabled()                                   // nothing changed yet

  fireEvent.change(screen.getByLabelText(/delivery time/i), { target: { value: '09:30' } })
  expect(patches).toHaveLength(0)                               // editing the time alone saves nothing
  expect(save).not.toBeDisabled()                              // ...but the button wakes up

  const tz = screen.getByLabelText(/timezone/i) as HTMLSelectElement
  const opt = Array.from(tz.querySelectorAll('option')).map((o) => o.value).find((v) => v && v !== tz.value)
  const zone = opt ?? 'Asia/Kolkata'
  fireEvent.change(tz, { target: { value: zone } })
  expect(patches).toHaveLength(0)                               // editing timezone alone saves nothing

  fireEvent.click(save)
  expect(patches).toEqual([{ delivery_time: '09:30', timezone: zone }])   // one patch, both fields
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

test('changing only the timezone still saves both fields on Save', () => {
  const patches: SettingsPatch[] = []
  wrap((p) => patches.push(p))
  const tz = screen.getByLabelText(/timezone/i) as HTMLSelectElement
  // Pick a value that actually exists in the rendered control (the select's
  // option list varies with the runtime's ICU data); fall back to a literal
  // for the text-input variant, which accepts any string.
  const opt = Array.from(tz.querySelectorAll('option')).map((o) => o.value).find((v) => v && v !== tz.value)
  const value = opt ?? 'Asia/Kolkata'
  fireEvent.change(tz, { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: /save delivery time/i }))
  expect(patches).toEqual([{ delivery_time: '07:00', timezone: value }])   // unchanged time carried through
})

test('the device-timezone quick-fill button is gone', () => {
  wrap(() => {})
  expect(screen.queryByRole('button', { name: /use this device/i })).not.toBeInTheDocument()
})

test('a saved timezone (even a legacy alias) shows in the input', () => {
  // "Asia/Calcutta" is an obsolete alias some OSes still report; the free-text
  // input must surface it instead of silently defaulting.
  wrap(() => {}, { ...base, timezone: 'Asia/Calcutta' })
  const tz = screen.getByLabelText(/timezone/i) as HTMLInputElement
  expect(tz.value).toBe('Asia/Calcutta')
})

test('Asia/Kolkata is always offered as a suggestion, regardless of the webview', () => {
  // The webview's Intl.supportedValuesOf may be empty/partial; common zones are
  // guaranteed from the curated list so the field is always usable.
  const { container } = wrap(() => {})
  const values = Array.from(container.querySelectorAll('datalist#ap-timezones option')).map((o) => o.getAttribute('value'))
  expect(values).toContain('Asia/Kolkata')
  expect(values).toContain('UTC')
})

import { vi } from 'vitest'
// notifySupported is left as the real implementation (a plain UA check, no
// native plugin import) so it correctly reflects androidUA() below; only the
// plugin-backed calls are mocked so the Tauri notification plugin is never
// loaded in jsdom.
vi.mock('../../platform/notify', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../platform/notify')>()),
  ensureNotifyPermission: vi.fn(async () => true),
  scheduleEditionReady: vi.fn(async () => {}),
  cancelEditionReady: vi.fn(async () => {}),
}))
import * as notify from '../../platform/notify'

function androidUA() {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit', configurable: true })
}

test('notify toggle is hidden off Android', () => {
  wrap(() => {})   // jsdom default UA (not Android)
  expect(screen.queryByLabelText(/notify me when an edition is ready/i)).not.toBeInTheDocument()
})

test('turning the notify toggle on requests permission and persists', async () => {
  const realUA = navigator.userAgent
  androidUA()
  try {
    wrap(() => {})
    const toggle = screen.getByLabelText(/notify me when an edition is ready/i)
    fireEvent.click(toggle)
    await new Promise((r) => setTimeout(r, 0))
    expect(notify.ensureNotifyPermission).toHaveBeenCalled()
    expect(localStorage.getItem('againpage.notifyOnReady')).toBe('1')
  } finally {
    Object.defineProperty(navigator, 'userAgent', { value: realUA, configurable: true })
    localStorage.clear()
  }
})
