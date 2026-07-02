import type { IssueResponse } from '../types/issue'
import type { ArchiveResponse } from '../types/archive'

export interface ApiClient {
  getTodayIssue(): Promise<IssueResponse>
  getIssue(id: string): Promise<IssueResponse>
  getArchive(): Promise<ArchiveResponse>
  getSettings(): Promise<import('../types/settings').SettingsResponse>
  saveSettings(patch: import('../types/settings').SettingsPatch): Promise<import('../types/settings').SettingsResponse>
}
