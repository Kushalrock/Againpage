import type { ApiClient } from './client'
import { apiBase } from './base'

export function httpClient(baseUrl?: string): ApiClient {
  // Resolve the base URL per request, not once at construction. The client is
  // created a single time at app startup, but the user can change the engine
  // URL at runtime (onboarding / settings). Reading `apiBase()` on each call
  // lets a saved URL take effect on the next refetch instead of only after a
  // full app restart. An explicit `baseUrl` (e.g. in tests) still pins it.
  const base = () => baseUrl ?? apiBase()
  const get = async (p: string) => {
    const res = await fetch(base() + p)
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    return res.json()
  }
  const put = async (p: string, body: unknown) => {
    const res = await fetch(base() + p, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    return res.json()
  }
  const post = async (p: string) => {
    const res = await fetch(base() + p, { method: 'POST' })
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    return res.json()
  }
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
