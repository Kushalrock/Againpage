import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiClient } from './client'
import { httpClient } from './http'
import type { SettingsPatch } from '../types/settings'

export const ClientContext = createContext<ApiClient>(httpClient())
export const useClient = () => useContext(ClientContext)

export function useTodayIssue(opts?: { refetchInterval?: number | false }) {
  const client = useClient()
  return useQuery({ queryKey: ['issue', 'today'], queryFn: () => client.getTodayIssue(),
    refetchInterval: opts?.refetchInterval ?? false, retry: false })
}
export function useExpandNote(title: string | null) {
  const client = useClient()
  return useQuery({ queryKey: ['note-expand', title], queryFn: () => client.expandNote(title!),
    enabled: !!title, staleTime: Infinity, retry: false })   // cache per note for the session
}
export function useIssue(id: string | undefined, opts?: { enabled?: boolean }) {
  const client = useClient()
  return useQuery({ queryKey: ['issue', id], queryFn: () => client.getIssue(id!),
    enabled: (opts?.enabled ?? true) && !!id, retry: false })
}
export function useArchive() {
  const client = useClient()
  return useQuery({ queryKey: ['archive'], queryFn: () => client.getArchive() })
}
export function useSettings() {
  const client = useClient()
  // retry:false — on a fresh install the engine is often unreachable (no URL
  // set yet); retrying 3× with backoff just stalls the "Loading…" gate for
  // seconds before onboarding can appear. Fail fast and show onboarding.
  return useQuery({ queryKey: ['settings'], queryFn: () => client.getSettings(), retry: false })
}
export function useSaveSettings() {
  const client = useClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: SettingsPatch) => client.saveSettings(patch),
    onSuccess: (data) => { queryClient.setQueryData(['settings'], data) },
  })
}
export function useStatus(opts?: { refetchInterval?: number | false }) {
  const client = useClient()
  return useQuery({ queryKey: ['status'], queryFn: () => client.getStatus(),
    refetchInterval: opts?.refetchInterval ?? false })
}
export function useReindex() {
  const client = useClient()
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (force?: boolean) => client.reindex(force),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status'] }) })
}
export function useTriggerIssue() {
  const client = useClient()
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: () => client.triggerIssue(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status'] }) })
}
export function useCancelJobs() {
  const client = useClient()
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (type: string) => client.cancelJobs(type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status'] }) })
}
