import { useState } from 'react'
import { color, font } from '../../theme/tokens'

export function ExcludedPathsPanel({
  paths,
  onChange,
}: {
  paths: string[]
  onChange: (paths: string[]) => void
}) {
  const [newPath, setNewPath] = useState('')

  function addPath() {
    const v = newPath.trim()
    if (v && !paths.includes(v)) {
      onChange([...paths, v])
      setNewPath('')
    }
  }

  function removePath(i: number) {
    onChange(paths.filter((_, j) => j !== i))
  }

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
        Folders &amp; excluded paths
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: color.muted, marginTop: 6 }}>
        Paths AgainPage skips when reading — drafts, templates, attachments, anything private. Add as many as
        you like, relative (./) or absolute. {paths.length} excluded.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {paths.map((p, i) => (
          <div
            key={p}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
              padding: '10px 12px 10px 14px',
            }}
          >
            <span style={{ fontFamily: font.mono, fontSize: 14, color: color.inkStrong, wordBreak: 'break-all' }}>
              {p}
            </span>
            <button
              type="button"
              onClick={() => removePath(i)}
              style={{
                flex: '0 0 auto', background: 'transparent', border: 'none', color: color.faint,
                fontSize: 13, cursor: 'pointer', padding: '2px 6px',
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder="./Drafts   or   ~/Vault/Archive"
          style={{
            flex: 1, background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '11px 14px', fontFamily: font.mono, fontSize: 14, color: color.ink,
          }}
        />
        <button
          type="button"
          onClick={addPath}
          style={{
            flex: '0 0 auto', background: 'transparent', border: `1px solid ${color.dark}`, borderRadius: 5,
            padding: '0 18px', fontSize: 14, color: color.inkStrong, cursor: 'pointer',
          }}
        >
          Add path
        </button>
      </div>
    </div>
  )
}
