import type { ApiClient } from './client'
import { apiBase } from './base'

export function httpClient(baseUrl = apiBase()): ApiClient {
  const get = async (p: string) => {
    const res = await fetch(baseUrl + p)
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    return res.json()
  }
  const put = async (p: string, body: unknown) => {
    const res = await fetch(baseUrl + p, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    return res.json()
  }
  const post = async (p: string) => {
    const res = await fetch(baseUrl + p, { method: 'POST' })
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
