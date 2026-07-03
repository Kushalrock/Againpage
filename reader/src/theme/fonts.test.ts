// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { test, expect } from 'vitest'

test('index.css does not reference an external font host', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
  expect(css).not.toContain('fonts.googleapis.com')
  expect(css).not.toContain('fonts.gstatic.com')
})
