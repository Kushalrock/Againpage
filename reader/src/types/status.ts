export interface AppStatus {
  indexed: boolean
  theme_count: number
  note_count: number
  issue_count: number
  latest_issue_date: string | null
  next_edition_at: string | null
  delivery_time: string
  cadence_days: number
  active_jobs: string[]   // job types currently queued/running (ingest|cluster|generate)
}
