import { afterEach, expect, test } from 'vitest'
import { notifySupported } from './notify'

const realUA = navigator.userAgent
function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}
afterEach(() => setUA(realUA))

test('notifySupported is false on a desktop/browser user agent', () => {
  setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X)')
  expect(notifySupported()).toBe(false)
})

test('notifySupported is true under an Android user agent', () => {
  setUA('Mozilla/5.0 (Linux; Android 14) AppleWebKit')
  expect(notifySupported()).toBe(true)
})
