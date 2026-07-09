import type { ApiClient } from './client'
import { apiBase } from './base'

export function httpClient(baseUrl?: string): ApiClient {
  // Resolve the base URL per request, not once at construction. The client is
  // created a single time at app startup, but the user can change the engine
  // URL at runtime (onboarding / settings). Reading `apiBase()` on each call
  // lets a saved URL take effect on the next refetch instead of only after a
  // full app restart. An explicit `baseUrl` (e.g. in tests) still pins it.
  const base = () => baseUrl ?? apiBase()
  // Abort a request that hangs (e.g. an engine URL that routes but never
  // answers) so the UI surfaces an error instead of spinning forever.
  const TIMEOUT_MS = 20000
  const withTimeout = async (p: string, init?: RequestInit) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(base() + p, { ...init, signal: ctrl.signal })
      if (!res.ok) throw new Error(`${p} → ${res.status}`)
      return res.json()
    } finally {
      clearTimeout(timer)
    }
  }
  const get = (p: string) => withTimeout(p)
  const put = (p: string, body: unknown) =>
    withTimeout(p, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  const post = (p: string) => withTimeout(p, { method: 'POST' })
  return {
    getTodayIssue: () => get('/issues/today'),
    getIssue: (id) => get(`/issues/${id}`),
    getArchive: () => get('/issues'),
    getSettings: () => get('/settings'),
    saveSettings: (patch) => put('/settings', patch),
    getStatus: () => get('/status'),
    reindex: (force?: boolean) => post(force ? '/reindex?force=true' : '/reindex'),
    triggerIssue: () => post('/trigger'),
    cancelJobs: (type: string) => post('/jobs/cancel?type=' + encodeURIComponent(type)),
    expandNote: (title: string) => get('/notes/expand?title=' + encodeURIComponent(title)),
  }
}
