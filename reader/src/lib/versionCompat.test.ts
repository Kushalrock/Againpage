import { checkCompat } from './versionCompat'
import { READER_VERSION, MIN_ENGINE_VERSION } from '../version'

const ok = { engineVersion: '0.1.4', minReader: '0.1.0', readerVersion: '0.1.3', minEngine: '0.1.4' }

test('compatible pair → ok', () => {
  expect(checkCompat(ok)).toBe('ok')
})
test('missing engine version → engine-too-old', () => {
  expect(checkCompat({ ...ok, engineVersion: undefined })).toBe('engine-too-old')
  expect(checkCompat({ ...ok, engineVersion: '' })).toBe('engine-too-old')
  expect(checkCompat({ ...ok, engineVersion: 'garbage' })).toBe('engine-too-old')
})
test('engine below min → engine-too-old', () => {
  expect(checkCompat({ ...ok, engineVersion: '0.1.3' })).toBe('engine-too-old')
})
test('reader below min → reader-too-old', () => {
  expect(checkCompat({ ...ok, readerVersion: '0.0.9' })).toBe('reader-too-old')
})
test('both fail → engine-too-old wins (precedence)', () => {
  expect(checkCompat({ ...ok, engineVersion: '0.1.3', readerVersion: '0.0.9' })).toBe('engine-too-old')
})
test('pre-release suffix is stripped before comparing', () => {
  expect(checkCompat({ ...ok, engineVersion: '0.1.4-alpha' })).toBe('ok')
})
test('numeric (not lexical) component ordering', () => {
  expect(checkCompat({ ...ok, engineVersion: '0.1.10', minEngine: '0.1.9' })).toBe('ok')
})

// Guard: a freshly-built engine shipped in lockstep with this reader must boot.
// Fails if MIN_ENGINE_VERSION is ever bumped above the shipped version.
test('the shipped reader is not self-incompatible with a matched-version engine', () => {
  expect(checkCompat({
    engineVersion: READER_VERSION, minEngine: MIN_ENGINE_VERSION,
    readerVersion: READER_VERSION, minReader: '0.1.0',
  })).toBe('ok')
})
