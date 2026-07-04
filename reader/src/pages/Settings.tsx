import { useEffect, useRef } from 'react'
import { useSettings, useSaveSettings, useReindex } from '../api/queries'
import { NotesFolderPanel } from '../components/settings/NotesFolderPanel'
import { AiSourcePanel } from '../components/settings/AiSourcePanel'
import { ExcludedPathsPanel } from '../components/settings/ExcludedPathsPanel'
import { PreferencesPanel } from '../components/settings/PreferencesPanel'
import { AdvancedPanel } from '../components/settings/AdvancedPanel'
import { color, font } from '../theme/tokens'
import type { SettingsPatch } from '../types/settings'

const DEBOUNCE_MS = 400

export function Settings() {
  const { data, isLoading } = useSettings()
  const save = useSaveSettings()
  const reindex = useReindex()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  if (isLoading || !data) return <div style={{ padding: 48 }}>Loading settings…</div>

  function scheduleSave(patch: SettingsPatch) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save.mutate(patch), DEBOUNCE_MS)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(24px,5vw,40px) 80px' }}>
      <header style={{ borderBottom: `1px solid ${color.dark}`, paddingBottom: 20 }}>
        <h1
          style={{
            fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(32px,4.5vw,44px)',
            letterSpacing: '-.015em', color: color.inkStrong,
          }}
        >
          Settings
        </h1>
        <p style={{ fontStyle: 'italic', color: color.muted, fontSize: 16, marginTop: 8 }}>
          Everything stays on your machine. Change it whenever.
        </p>
      </header>

      <NotesFolderPanel
        path={data.vault_path}
        count={data.vault_note_count}
        onChange={(patch) => scheduleSave(patch)}
      />

      <AiSourcePanel
        settings={data}
        onSave={(patch) => save.mutateAsync(patch)}
        onReindex={() => reindex.mutateAsync(true)}
      />

      <ExcludedPathsPanel
        paths={data.excluded_paths}
        onChange={(paths) => scheduleSave({ excluded_paths: paths })}
      />

      <PreferencesPanel settings={data} onChange={(patch) => scheduleSave(patch)} />

      <AdvancedPanel noteCount={data.vault_note_count} />
    </div>
  )
}
