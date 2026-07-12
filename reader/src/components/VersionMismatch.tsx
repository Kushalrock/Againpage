import { color, font } from '../theme/tokens'

const centered = {
  minHeight: 'var(--app-h)', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: '48px 24px',
  background: color.paper, textAlign: 'center',
} as const

const primaryBtn = {
  background: color.dark, border: `1px solid ${color.dark}`, borderRadius: 5,
  padding: '10px 22px', fontSize: 14, color: color.paper, cursor: 'pointer', fontFamily: font.body,
} as const

const UPGRADE_CMD = 'git pull && docker compose up --build -d'

export function VersionMismatch({ kind, engineVersion, readerVersion, minEngine, minReader, onRetry }: {
  kind: 'engine-too-old' | 'reader-too-old'
  engineVersion?: string | null
  readerVersion: string
  minEngine: string
  minReader: string
  onRetry: () => void
}) {
  const engineOld = kind === 'engine-too-old'
  return (
    <div style={centered}>
      <h1 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, color: color.inkStrong, letterSpacing: '-.01em', margin: 0 }}>
        {engineOld ? 'This press has fallen behind.' : 'Time to update your reader.'}
      </h1>
      <p style={{ fontSize: 15, color: color.muted, marginTop: 14, maxWidth: 460 }}>
        {engineOld
          ? 'The engine powering this press is older than this reader needs. Update it, then try again.'
          : 'This reader is older than the press expects. Update the app to the latest build, then try again.'}
      </p>
      {engineOld && (
        <pre style={{ fontFamily: font.mono, fontSize: 13.5, color: color.inkStrong, background: color.card,
          border: `1px solid ${color.borderStrong}`, borderRadius: 5, padding: '12px 16px', marginTop: 18,
          maxWidth: '100%', overflowX: 'auto' }}>{UPGRADE_CMD}</pre>
      )}
      <p style={{ fontFamily: font.mono, fontSize: 13, color: color.faint, marginTop: 16 }}>
        {engineOld
          ? `your press: ${engineVersion || 'unknown'} · this reader needs: ${minEngine}+`
          : `your reader: ${readerVersion} · this press needs: ${minReader}+`}
      </p>
      <button type="button" onClick={onRetry} style={{ ...primaryBtn, marginTop: 24 }}>Try again</button>
    </div>
  )
}
