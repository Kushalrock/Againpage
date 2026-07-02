import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ClientContext } from './api/queries'
import { httpClient } from './api/http'

const queryClient = new QueryClient()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClientContext.Provider value={httpClient()}>
        <App />
      </ClientContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
)
