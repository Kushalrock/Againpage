import { useState } from 'react'
import { AppShell } from './components/shell/AppShell'
import { Today } from './pages/Today'
import { Archive } from './pages/Archive'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { useSettings } from './api/queries'

type Screen = 'today' | 'archive' | 'settings'

export default function App() {
  const { data: settings, isLoading } = useSettings()
  const [screen, setScreen] = useState<Screen>('today')
  const [onboarded, setOnboarded] = useState(false)
  if (isLoading) return <div style={{ padding: 48 }}>Loading…</div>
  const needsOnboarding = !onboarded && !settings?.vault_path
  if (needsOnboarding) return <Onboarding onDone={() => { setOnboarded(true); setScreen('today') }} />
  return (
    <AppShell active={screen} onNavigate={(s) => setScreen(s as Screen)}>
      {screen === 'today' && <Today onNavigate={(s) => setScreen(s as Screen)} />}
      {screen === 'archive' && <Archive onOpen={() => setScreen('today')} onNavigate={(s) => setScreen(s as Screen)} />}
      {screen === 'settings' && <Settings />}
    </AppShell>
  )
}
