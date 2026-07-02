import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ApiClient } from './client'
import { httpClient } from './http'

export const ClientContext = createContext<ApiClient>(httpClient())
export const useClient = () => useContext(ClientContext)

export function useTodayIssue() {
  const client = useClient()
  return useQuery({ queryKey: ['issue', 'today'], queryFn: () => client.getTodayIssue() })
}
export function useArchive() {
  const client = useClient()
  return useQuery({ queryKey: ['archive'], queryFn: () => client.getArchive() })
}
