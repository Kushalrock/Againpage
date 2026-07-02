import { color, font } from './tokens'
import { test, expect } from 'vitest'

test('tokens expose paper + display font', () => {
  expect(color.paper).toBe('#F4EEDF')
  expect(font.display).toContain('Bodoni Moda')
})
