import { useState } from 'react'
import { usePlatform } from '../../platform'
import { isAndroid } from '../../platform/mobile'
import { color, font } from '../../theme/tokens'
import { useStatus, useReindex } from '../../api/queries'
import { timeAgo } from '../../lib/timeAgo'
import type { SettingsPatch } from '../../types/settings'

const rowStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5, padding: '10px 14px',
} as const
const xStyle = { background: 'transparent', border: 'none', color: color.faint, fontSize: 18,
  cursor: 'pointer', lineHeight: 1, padding: '0 4px' } as const

export function NotesFolderPanel({
  paths,
  excludedPaths,
  count,
  onChange,
}: {
  paths: string[]
  excludedPaths: string[]
  count: number
  onChange: (patch: SettingsPatch) => void
}) {
  const platform = usePlatform()
  const mobile = isAndroid()
  const [newExcluded, setNewExcluded] = useState('')
  const [newPath, setNewPath] = useState('')
  const status = useStatus()
  const reindex = useReindex()
  const [nowMs] = useState(() => Date.now())

  async function addFolder() {
    const result = await platform.folderPicker.pick()
    if (result && !paths.includes(result.path)) onChange({ vault_paths: [...paths, result.path] })
  }
  function addPath() {
    const v = newPath.trim()
    if (v && !paths.includes(v)) { onChange({ vault_paths: [...paths, v] }); setNewPath('') }
  }
  function removeFolder(p: string) { onChange({ vault_paths: paths.filter((x) => x !== p) }) }
  function addExcluded() {
    const v = newExcluded.trim()
    if (v && !excludedPaths.includes(v)) { onChange({ excluded_paths: [...excludedPaths, v] }); setNewExcluded('') }
  }
  function removeExcluded(p: string) { onChange({ excluded_paths: excludedPaths.filter((x) => x !== p) }) }

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
        Notes folders
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: color.muted, marginTop: 6 }}>
        The folders Againpage reads from. Add as many as you like.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {paths.length === 0 && (
          <div style={{ fontSize: 14, color: color.faint, fontStyle: 'italic' }}>No folders yet.</div>
        )}
        {paths.map((p) => (
          <div key={p} style={rowStyle}>
            <span style={{ fontFamily: font.mono, fontSize: 14, color: color.inkStrong, wordBreak: 'break-all' }}>{p}</span>
            <button type="button" aria-label={`remove ${p}`} style={xStyle} onClick={() => removeFolder(p)}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input aria-label="add folder path" value={newPath} placeholder="/vault/your-folder"
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addPath() }}
          style={{ flex: 1, background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '10px 12px', fontFamily: font.mono, fontSize: 14, color: color.ink }} />
        <button type="button" onClick={addPath}
          style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '10px 16px', fontSize: 14, color: color.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add path</button>
      </div>
      {!mobile && (
        <button type="button" onClick={addFolder}
          style={{ marginTop: 8, background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '8px 14px', fontSize: 13, color: color.faint, cursor: 'pointer' }}>
          Use folder picker…
        </button>
      )}
      <p style={{ fontSize: 12.5, color: color.faint, marginTop: 8, lineHeight: 1.5 }}>
        Type the path <em>as the engine sees it</em> — e.g.{' '}
        <span style={{ fontFamily: font.mono }}>/vault/your-folder</span>. Only use the picker if you run the engine
        <strong> natively with the dev tools</strong> (not Docker): it points at <em>this</em> computer, which the
        containerized engine can’t read.
      </p>

      <div style={{ fontSize: 14, color: color.muted, marginTop: 14 }}>
        <span style={{ fontFamily: font.display, fontSize: 17, color: color.inkStrong }}>{count}</span> notes
        {excludedPaths.length > 0 ? ' after exclusions' : ''} · scanned just now
      </div>

      {status.data?.last_synced_at && (() => {
        const synced = status.data.synced ?? 0
        const failed = status.data.sync_failed ?? 0
        const scanned = synced + failed              // synced = scanned − failed, so scanned = synced + failed
        return (
          <div style={{ fontSize: 13, color: color.faint, marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>
              {scanned} scanned · {synced} synced
              {failed > 0 && ` · ${failed} failed`}
              {' · '}{timeAgo(status.data.last_synced_at, nowMs)}
            </span>
            {failed > 0 && (
              <button type="button" onClick={() => reindex.mutate(false)} disabled={reindex.isPending}
                style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                  padding: '4px 10px', fontSize: 12, color: color.muted, cursor: 'pointer' }}>
                {reindex.isPending ? 'Retrying…' : 'Retry'}
              </button>
            )}
          </div>
        )
      })()}

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 13, color: color.muted, marginBottom: 8 }}>
          Excluded paths <span style={{ color: color.faint }}>— skipped when reading (drafts, templates, private notes)</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {excludedPaths.map((p) => (
            <div key={p} style={rowStyle}>
              <span style={{ fontFamily: font.mono, fontSize: 13.5, color: color.ink, wordBreak: 'break-all' }}>{p}</span>
              <button type="button" aria-label={`unexclude ${p}`} style={xStyle} onClick={() => removeExcluded(p)}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input aria-label="add excluded path" value={newExcluded} placeholder="drafts/  or  ./templates"
            onChange={(e) => setNewExcluded(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addExcluded() }}
            style={{ flex: 1, background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
              padding: '10px 12px', fontFamily: font.mono, fontSize: 13.5, color: color.ink }} />
          <button type="button" onClick={addExcluded}
            style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
              padding: '10px 16px', fontSize: 14, color: color.muted, cursor: 'pointer' }}>Add</button>
        </div>
      </div>
    </div>
  )
}
