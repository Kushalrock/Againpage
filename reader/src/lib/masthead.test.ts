import { volumeFor, romanize, volumeLabel, spellOutCount, ISSUES_PER_VOLUME } from './masthead'

test('volumeFor rolls over every ISSUES_PER_VOLUME editions', () => {
  expect(ISSUES_PER_VOLUME).toBe(24)
  expect(volumeFor(1)).toBe(1)
  expect(volumeFor(24)).toBe(1)
  expect(volumeFor(25)).toBe(2)
  expect(volumeFor(47)).toBe(2)     // the value shown today stays Vol. II
  expect(volumeFor(49)).toBe(3)
})

test('romanize', () => {
  expect(romanize(1)).toBe('I')
  expect(romanize(2)).toBe('II')
  expect(romanize(3)).toBe('III')
  expect(romanize(4)).toBe('IV')
  expect(romanize(9)).toBe('IX')
})

test('volumeLabel derives the volume from the edition number', () => {
  expect(volumeLabel(47)).toBe('Vol. II')
  expect(volumeLabel(1)).toBe('Vol. I')
})

test('spellOutCount spells small counts and falls back to numerals at 100', () => {
  expect(spellOutCount(1)).toBe('One')
  expect(spellOutCount(47)).toBe('Forty-seven')
  expect(spellOutCount(20)).toBe('Twenty')
  expect(spellOutCount(99)).toBe('Ninety-nine')
  expect(spellOutCount(100)).toBe('100')
  expect(spellOutCount(128)).toBe('128')
})
