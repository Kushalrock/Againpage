import Markdown from 'react-markdown'
import { useExpandNote } from '../api/queries'
import { color, font } from '../theme/tokens'

/**
 * Slide-in side drawer that shows a rich ~500-word standalone reading of a
 * single note, fetched on demand (and cached per note). Opened by clicking a
 * note in the edition; the edition stays visible beside it.
 */
export function NoteDrawer({ title, onClose }: { title: string | null; onClose: () => void }) {
  const q = useExpandNote(title)
  const open = !!title
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: open ? '#1C120088' : 'transparent',
          transition: 'background .25s', pointerEvents: open ? 'auto' : 'none', zIndex: 40,
        }}
      />
      <aside
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 'env(safe-area-inset-top)', right: 0, height: 'var(--app-h)', width: 'min(560px, 92vw)',
          background: color.paper, boxShadow: '-14px 0 40px #1C120026', zIndex: 41,
          transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .28s ease',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          padding: '26px clamp(24px,4vw,40px) 18px', borderBottom: `1px solid ${color.border}` }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase',
              color: color.faint, fontWeight: 600 }}>The note, in full</div>
            <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(26px,3.4vw,34px)',
              lineHeight: 1.1, color: color.inkStrong, margin: '8px 0 0', letterSpacing: '-.01em' }}>
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="close"
            style={{ background: 'transparent', border: 'none', fontSize: 26, lineHeight: 1,
              color: color.faint, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '24px clamp(24px,4vw,40px) 48px' }}>
          {q.isLoading && (
            <div style={{ fontSize: 16, color: color.muted, fontStyle: 'italic' }}>
              Reading {title} closely…
            </div>
          )}
          {q.isError && (
            <div style={{ fontSize: 15, color: color.accent }}>
              Couldn't expand this note — check the summary model in Settings.
            </div>
          )}
          {q.data && (
            <div style={{ fontSize: 17.5, lineHeight: 1.74, color: color.inkBody, fontFamily: font.body }}>
              <Markdown components={{
                p: ({ children }) => <p style={{ margin: '0 0 18px' }}>{children}</p>,
                h2: ({ children }) => <h3 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 21,
                  color: color.inkStrong, margin: '26px 0 10px' }}>{children}</h3>,
                h3: ({ children }) => <h3 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 19,
                  color: color.inkStrong, margin: '22px 0 8px' }}>{children}</h3>,
                blockquote: ({ children }) => <blockquote style={{ borderLeft: `3px solid ${color.gold}`,
                  paddingLeft: 16, margin: '18px 0', color: color.muted, fontStyle: 'italic' }}>{children}</blockquote>,
              }}>{q.data.text}</Markdown>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
