import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ClientContext } from './api/queries'
import { httpClient } from './api/http'
import { PlatformContext, tauriFolderPicker, tauriKeyStore, httpConnectionTest } from './platform'

const queryClient = new QueryClient()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClientContext.Provider value={httpClient()}>
        <PlatformContext.Provider
          value={{ folderPicker: tauriFolderPicker, keyStore: tauriKeyStore, connectionTest: httpConnectionTest() }}
        >
          <App />
        </PlatformContext.Provider>
      </ClientContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
)
