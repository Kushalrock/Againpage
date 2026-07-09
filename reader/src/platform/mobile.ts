// True when running inside the Android WebView (the sideloaded APK). Used to
// hide the native folder picker, which is meaningless on a phone: the phone
// never indexes locally — the remote engine does. A plain user-agent check
// avoids pulling in tauri-plugin-os for one boolean. Returns false in a
// browser / desktop WebView and in the jsdom test environment.
export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}
