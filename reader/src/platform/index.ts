export interface FolderResult { path: string; count: number }
export interface FolderPicker { pick(): Promise<FolderResult | null> }
export interface KeyStore { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void>; remove(k: string): Promise<void> }
export interface ConnectionTest { run(req: import('../types/settings').ProviderTestRequest): Promise<import('../types/settings').ProviderTestResult> }

const mem = new Map<string, string>()
export const browserKeyStore: KeyStore = {
  get: async (k) => mem.get(k) ?? null,
  set: async (k, v) => { mem.set(k, v) },
  remove: async (k) => { mem.delete(k) },
}
export const browserFolderPicker: FolderPicker = {
  pick: async () => ({ path: '~/Documents/Athenaeum', count: 1284 }),
}
export { tauriFolderPicker } from './folderPicker'
export { tauriKeyStore } from './keyStore'
export { httpConnectionTest } from './connectionTest'

import { createContext, useContext } from 'react'
import { httpConnectionTest } from './connectionTest'
export interface Platform { folderPicker: FolderPicker; keyStore: KeyStore; connectionTest: ConnectionTest }
export const PlatformContext = createContext<Platform>({
  folderPicker: browserFolderPicker, keyStore: browserKeyStore,
  connectionTest: httpConnectionTest(),
})
export const usePlatform = () => useContext(PlatformContext)
