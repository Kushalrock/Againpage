import { afterEach, expect, test } from 'vitest'
import { isAndroid } from './mobile'

const realUA = navigator.userAgent
function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}
afterEach(() => setUA(realUA))

test('isAndroid is true for an Android WebView user agent', () => {
  setUA('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36')
  expect(isAndroid()).toBe(true)
})

test('isAndroid is false for a desktop user agent', () => {
  setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')
  expect(isAndroid()).toBe(false)
})
