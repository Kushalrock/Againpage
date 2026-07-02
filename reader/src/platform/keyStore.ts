import type { KeyStore } from './index'
export const tauriKeyStore: KeyStore = {
  async get(k) {
    const { invoke } = await import('@tauri-apps/api/core')
    return (await invoke<string | null>('keychain_get', { service: 'againpage', key: k })) ?? null
  },
  async set(k, v) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('keychain_set', { service: 'againpage', key: k, value: v })
  },
  async remove(k) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('keychain_delete', { service: 'againpage', key: k })
  },
}
