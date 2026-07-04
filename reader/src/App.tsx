import { useState } from 'react'
import { AppShell } from './components/shell/AppShell'
import { Reader } from './pages/Reader'
import { Archive } from './pages/Archive'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { useSettings } from './api/queries'

type Screen = 'reader' | 'archive' | 'settings'

export default function App() {
  const { data: settings, isLoading } = useSettings()
  const [screen, setScreen] = useState<Screen>('reader')
  const [issueId, setIssueId] = useState<string | null>(null)
  const [onboarded, setOnboarded] = useState(false)

  // Navigating via the sidebar clears any selected archived edition, so the
  // Reader falls back to today's.
  function navigate(s: Screen) {
    if (s === 'reader') setIssueId(null)
    setScreen(s)
  }

  if (isLoading) return <div style={{ padding: 48 }}>Loading…</div>
  const needsOnboarding = !onboarded && !settings?.vault_path
  if (needsOnboarding) return <Onboarding onDone={() => { setOnboarded(true); setScreen('reader') }} />
  return (
    <AppShell active={screen} onNavigate={(s) => navigate(s as Screen)}>
      {screen === 'reader' && <Reader issueId={issueId} onNavigate={(s) => navigate(s as Screen)} />}
      {screen === 'archive' && (
        <Archive onOpen={(id) => { setIssueId(id); setScreen('reader') }} onNavigate={(s) => navigate(s as Screen)} />
      )}
      {screen === 'settings' && <Settings />}
    </AppShell>
  )
}
