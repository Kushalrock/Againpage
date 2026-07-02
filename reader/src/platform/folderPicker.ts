import type { FolderPicker } from './index'
export const tauriFolderPicker: FolderPicker = {
  async pick() {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({ directory: true, multiple: false })
    if (typeof path !== 'string') return null
    const { invoke } = await import('@tauri-apps/api/core')
    const count = await invoke<number>('scan_vault', { path })
    return { path, count }
  },
}
