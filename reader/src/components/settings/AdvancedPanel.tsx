import { useReindex, useTriggerIssue } from '../../api/queries'
import { color } from '../../theme/tokens'

function btnStyle(disabled: boolean): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${color.dark}`, borderRadius: 5,
    padding: '10px 18px', fontSize: 14, color: color.inkStrong, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1, fontFamily: "'Newsreader', Georgia, serif" }
}

export function AdvancedPanel({ noteCount }: { noteCount: number }) {
  const reindex = useReindex()
  const generate = useTriggerIssue()
  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>Advanced</div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <button type="button" disabled={reindex.isPending} style={btnStyle(reindex.isPending)}
            onClick={() => reindex.mutate(false)}>Re-index notes &amp; embeddings</button>
          {reindex.isSuccess && <span style={{ marginLeft: 12, fontSize: 14, color: color.ok }}>Queued ✓</span>}
          {reindex.isError && <span style={{ marginLeft: 12, fontSize: 14, color: color.accent }}>Couldn't queue — is a notes folder set?</span>}
          <p style={{ fontSize: 14, lineHeight: 1.55, color: color.muted, marginTop: 8 }}>
            Reads your notes folder, refreshes summaries + embeddings, and re-composes your themes. {noteCount} notes.
          </p>
        </div>
        <div>
          <button type="button" disabled={generate.isPending} style={btnStyle(generate.isPending)}
            onClick={() => generate.mutate()}>Generate an issue now</button>
          {generate.isSuccess && <span style={{ marginLeft: 12, fontSize: 14, color: color.ok }}>Queued ✓</span>}
        </div>
      </div>
    </div>
  )
}
