import { cfg, lengthLabel, wordTarget } from './readingLength'

test('3-min hides wildcard/forgotten/apply/summaries', () => {
  const c = cfg(3)
  expect(c.summaries).toBe(false)
  expect(c.apply).toBe(false)
  expect(c.wildcard).toBe(false)
  expect(c.forgotten).toBe(false)
  expect(c.connections).toBe(2)
  expect(c.questions).toBe(1)
})

test('15-min shows everything', () => {
  const c = cfg(15)
  expect(c.summaries && c.apply && c.wildcard && c.forgotten).toBe(true)
  expect(c.applyN).toBe(3)
  expect(c.connections).toBe(6)
})

test('labels + word target', () => {
  expect(lengthLabel(3)).toBe('a brief')
  expect(lengthLabel(15)).toBe('the full edition')
  expect(wordTarget(7)).toBe(1540)
})
