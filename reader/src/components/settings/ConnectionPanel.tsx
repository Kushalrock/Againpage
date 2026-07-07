import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { storedApiBase, setApiBase } from '../../api/base'
import { color, font } from '../../theme/tokens'

const inputStyle = {
  flex: 1, background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
  padding: '10px 12px', fontFamily: font.mono, fontSize: 14, color: color.ink,
} as const

/**
 * Where the reader finds the engine (API + worker). Blank = the same machine
 * (http://localhost:8000). For a split / home-lab setup point it at the server,
 * e.g. http://192.168.1.20:8000 — otherwise the reader can't reach the engine
 * and every screen fails to load. Saved in the browser (localStorage); a reload
 * guarantees every request uses the new base.
 */
export function ConnectionPanel() {
  const [url, setUrl] = useState(storedApiBase())
  const [saved, setSaved] = useState(false)
  const queryClient = useQueryClient()

  function save() {
    setApiBase(url)
    setSaved(true)
    void queryClient.invalidateQueries()
  }

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
        Engine connection
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: color.muted, marginTop: 6 }}>
        Where the reader talks to the engine (API + worker). Leave blank if the
        engine runs on this machine. For a server / home-lab, enter its address —
        e.g. <span style={{ fontFamily: font.mono }}>http://192.168.1.20:8000</span> —
        or the reader can’t reach the engine and screens won’t load.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          aria-label="engine URL"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          placeholder="http://localhost:8000"
          style={inputStyle}
        />
        <button type="button" onClick={save}
          style={{ background: color.dark, border: `1px solid ${color.dark}`, borderRadius: 5,
            padding: '10px 22px', fontSize: 14, color: color.paper, cursor: 'pointer', fontFamily: font.body }}>
          Save
        </button>
      </div>
      {saved && (
        <span style={{ fontSize: 13, color: color.muted, fontStyle: 'italic', display: 'inline-block', marginTop: 8 }}>
          Saved. Reload the app if data doesn’t refresh.
        </span>
      )}
    </div>
  )
}
