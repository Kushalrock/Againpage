import { useState } from 'react'
import { storedApiBase, setApiBase } from '../../api/base'
import { pingEngine } from '../../api/http'
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
  const [testResult, setTestResult] = useState<null | 'ok' | 'fail'>(null)
  const [testing, setTesting] = useState(false)

  async function test() {
    setTesting(true); setTestResult(null)
    const ok = await pingEngine(url.trim() || 'http://localhost:8000')
    setTestResult(ok ? 'ok' : 'fail'); setTesting(false)
  }
  function save() {
    const next = url.trim()
    const changed = next !== storedApiBase()
    setApiBase(next)
    if (changed) window.location.reload()   // new engine = entirely new data; hard reload for a clean slate
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
        <input aria-label="engine URL" value={url} placeholder="http://localhost:8000"
          onChange={(e) => { setUrl(e.target.value); setTestResult(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }} style={inputStyle} />
        <button type="button" onClick={() => void test()} disabled={testing}
          style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '10px 18px', fontSize: 14, color: color.muted, cursor: 'pointer', fontFamily: font.body }}>
          {testing ? 'Testing…' : 'Test'}
        </button>
        <button type="button" onClick={save}
          style={{ background: color.dark, border: `1px solid ${color.dark}`, borderRadius: 5,
            padding: '10px 22px', fontSize: 14, color: color.paper, cursor: 'pointer', fontFamily: font.body }}>
          Save
        </button>
      </div>
      {testResult && (
        <span style={{ fontSize: 13, marginTop: 8, display: 'inline-block',
          color: testResult === 'ok' ? color.ok : color.faint, fontStyle: 'italic' }}>
          {testResult === 'ok' ? 'Reached the press.' : 'No answer at that address.'}
        </span>
      )}
    </div>
  )
}
