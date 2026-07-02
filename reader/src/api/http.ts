import type { ApiClient } from './client'

export function httpClient(baseUrl = 'http://localhost:8000'): ApiClient {
  const get = async (p: string) => {
    const res = await fetch(baseUrl + p)
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    return res.json()
  }
  return {
    getTodayIssue: () => get('/issues/today'),
    getIssue: (id) => get(`/issues/${id}`),
    getArchive: () => get('/issues'),
  }
}
