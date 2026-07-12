import type { IssueResponse, NoteExpansion } from '../types/issue'
import type { ArchiveResponse } from '../types/archive'

export interface ApiClient {
  getTodayIssue(): Promise<IssueResponse>
  getIssue(id: string): Promise<IssueResponse>
  getArchive(): Promise<ArchiveResponse>
  getSettings(): Promise<import('../types/settings').SettingsResponse>
  saveSettings(patch: import('../types/settings').SettingsPatch): Promise<import('../types/settings').SettingsResponse>
  getStatus(): Promise<import('../types/status').AppStatus>
  reindex(force?: boolean): Promise<{ job_id: string }>
  triggerIssue(): Promise<{ job_id: string }>
  cancelJobs(type: string): Promise<{ cancelled: number }>
  expandNote(title: string): Promise<NoteExpansion>
  setIssueFlags(id: string, patch: { active?: boolean; favorite?: boolean }): Promise<{ id: string; active: boolean; favorite: boolean }>
}
