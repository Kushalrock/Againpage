import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlatformContext, type Platform } from '../../platform'
import { NotesFolderPanel } from './NotesFolderPanel'
import type { SettingsPatch } from '../../types/settings'

function fakePlatform(pickPath: string | null): Platform {
  return { folderPicker: { pick: async () => (pickPath ? { path: pickPath, count: 5 } : null) },
    keyStore: { get: async () => null, set: async () => {}, remove: async () => {} },
    connectionTest: { run: async () => ({ ok: true, reachable: true, models: {}, detail: '' }) } } as Platform
}
function wrap(paths: string[], excluded: string[], pickPath: string | null = '/new') {
  const patches: SettingsPatch[] = []
  render(<PlatformContext.Provider value={fakePlatform(pickPath)}>
    <NotesFolderPanel paths={paths} excludedPaths={excluded} count={42} onChange={(p) => patches.push(p)} />
  </PlatformContext.Provider>)
  return patches
}

test('lists folders and the post-exclusion count', () => {
  wrap(['/a', '/b'], ['drafts/'])
  expect(screen.getByText('/a')).toBeInTheDocument()
  expect(screen.getByText('/b')).toBeInTheDocument()
  expect(screen.getByText('42')).toBeInTheDocument()
  expect(screen.getByText(/after exclusions/i)).toBeInTheDocument()
})

test('folder picker appends the picked path', async () => {
  const patches = wrap(['/a'], [], '/new')
  fireEvent.click(screen.getByText(/use folder picker/i))
  await waitFor(() => expect(patches.at(-1)).toEqual({ vault_paths: ['/a', '/new'] }))
})

test('typing a path adds it (the Docker-friendly way)', () => {
  const patches = wrap(['/a'], [])
  fireEvent.change(screen.getByLabelText(/add folder path/i), { target: { value: '/vault/journal' } })
  fireEvent.click(screen.getByText('Add path'))
  expect(patches.at(-1)).toEqual({ vault_paths: ['/a', '/vault/journal'] })
})

test('warns against the picker outside a dev/native setup', () => {
  wrap(['/a'], [])
  expect(screen.getByText(/only use the picker if you run the engine/i)).toBeInTheDocument()
})

test('remove folder drops it', () => {
  const patches = wrap(['/a', '/b'], [])
  fireEvent.click(screen.getByLabelText('remove /a'))
  expect(patches.at(-1)).toEqual({ vault_paths: ['/b'] })
})

test('add and remove excluded paths', () => {
  const patches = wrap(['/a'], ['drafts/'])
  fireEvent.change(screen.getByLabelText(/add excluded path/i), { target: { value: 'templates/' } })
  fireEvent.click(screen.getByText('Add'))
  expect(patches.at(-1)).toEqual({ excluded_paths: ['drafts/', 'templates/'] })
  fireEvent.click(screen.getByLabelText('unexclude drafts/'))
  expect(patches.at(-1)).toEqual({ excluded_paths: [] })
})
