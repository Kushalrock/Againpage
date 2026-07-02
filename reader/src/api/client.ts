import type { IssueResponse } from '../types/issue'
import type { ArchiveResponse } from '../types/archive'

export interface ApiClient {
  getTodayIssue(): Promise<IssueResponse>
  getIssue(id: string): Promise<IssueResponse>
  getArchive(): Promise<ArchiveResponse>
}
