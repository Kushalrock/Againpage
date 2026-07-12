import { useState } from 'react'
import { AppShell } from './components/shell/AppShell'
import { Reader } from './pages/Reader'
import { Archive } from './pages/Archive'
import { Favourites } from './pages/Favourites'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { useSettings, useStatus } from './api/queries'
import { Connecting, Unreachable } from './components/ConnectionStates'
import { apiBase, storedApiBase } from './api/base'
import { useEditionNotifications } from './hooks/useEditionNotifications'
import { VersionMismatch } from './components/VersionMismatch'
import { checkCompat } from './lib/versionCompat'
import { READER_VERSION, MIN_ENGINE_VERSION } from './version'

type Screen = 'reader' | 'archive' | 'favourites' | 'settings'

export default function App() {
  const { data: settings, isLoading, isError, refetch } = useSettings()
  const status = useStatus()
  useEditionNotifications(status.data?.next_edition_at ?? null)
  const [screen, setScreen] = useState<Screen>('reader')
  const [issueId, setIssueId] = useState<string | null>(null)
  const [onboarded, setOnboarded] = useState(false)
  const [reOnboard, setReOnboard] = useState(false)

  // Navigating via the sidebar clears any selected archived edition, so the
  // Reader falls back to today's.
  function navigate(s: Screen) {
    if (s === 'reader') setIssueId(null)
    setScreen(s)
  }

  if (isLoading) return <Connecting />
  if (isError && !settings && !reOnboard && storedApiBase()) {
    return (
      <Unreachable
        url={apiBase()}
        onRetry={() => { void refetch() }}
        secondary={{ label: 'Point to another press', onClick: () => setReOnboard(true) }}
      />
    )
  }
  if (settings) {
    const compat = checkCompat({
      engineVersion: settings.engine_version,
      minReader: settings.min_reader_version ?? '0.0.0',
      readerVersion: READER_VERSION,
      minEngine: MIN_ENGINE_VERSION,
    })
    if (compat !== 'ok') {
      return (
        <VersionMismatch
          kind={compat}
          engineVersion={settings.engine_version}
          readerVersion={READER_VERSION}
          minEngine={MIN_ENGINE_VERSION}
          minReader={settings.min_reader_version ?? '0.0.0'}
          onRetry={() => { void refetch() }}
        />
      )
    }
  }
  const needsOnboarding = reOnboard || (!onboarded && !settings?.vault_paths?.length)
  if (needsOnboarding) {
    return <Onboarding onDone={() => { setOnboarded(true); setReOnboard(false); setScreen('reader') }} />
  }
  return (
    <AppShell active={screen} onNavigate={(s) => navigate(s as Screen)}>
      {screen === 'reader' && <Reader issueId={issueId} onNavigate={(s) => navigate(s as Screen)} />}
      {screen === 'archive' && (
        <Archive onOpen={(id) => { setIssueId(id); setScreen('reader') }} onNavigate={(s) => navigate(s as Screen)} />
      )}
      {screen === 'favourites' && <Favourites onOpen={(id) => { setIssueId(id); setScreen('reader') }} />}
      {screen === 'settings' && <Settings />}
    </AppShell>
  )
}
