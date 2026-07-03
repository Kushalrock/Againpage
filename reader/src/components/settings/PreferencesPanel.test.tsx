import { render, screen, fireEvent } from '@testing-library/react'
import { PreferencesPanel } from './PreferencesPanel'
import type { Settings } from '../../types/settings'

const base: Settings = { vault_path: '/v', excluded_paths: [], profile_text: '', cadence: 'daily',
  delivery_time: '07:00', reading_min: 7, notes_per_issue: 3, provider: 'openrouter',
  ollama_endpoint: 'http://localhost:11434', embed_model: 'e', summary_model: 's', writer_model: 'w' }

test('time picker emits delivery_time on change', () => {
  let patch: Partial<Settings> | null = null
  render(<PreferencesPanel settings={base} onChange={(p: Partial<Settings>) => { patch = p }} />)
  const input = screen.getByLabelText(/delivery time/i)
  fireEvent.change(input, { target: { value: '09:30' } })
  expect(patch).toEqual({ delivery_time: '09:30' })
})
