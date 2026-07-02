import { browserFolderPicker, browserKeyStore } from './index'
test('browser key store round-trips', async () => {
  await browserKeyStore.set('openrouter', 'sk-x')
  expect(await browserKeyStore.get('openrouter')).toBe('sk-x')
  await browserKeyStore.remove('openrouter')
  expect(await browserKeyStore.get('openrouter')).toBeNull()
})
test('browser folder picker returns a mock folder', async () => {
  const r = await browserFolderPicker.pick()
  expect(r && typeof r.path === 'string' && typeof r.count === 'number').toBe(true)
})
