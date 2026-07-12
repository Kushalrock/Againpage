import { useArchive, useSetIssueFlags } from '../api/queries'
import { color, font } from '../theme/tokens'
import type { ArchiveItem } from '../types/archive'

export function Favourites({ onOpen }: { onOpen: (id: string) => void }) {
  const archive = useArchive()
  const setFlags = useSetIssueFlags()
  if (archive.isLoading) return <div style={{ padding: 48 }}>Loading…</div>
  const items: ArchiveItem[] = (archive.data?.groups ?? []).flatMap((g) => g.items).filter((it) => it.favorite)

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(24px,5vw,40px) 80px' }}>
      <header style={{ textAlign: 'center', borderBottom: `2px solid ${color.dark}`, paddingBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', color: color.accent, fontWeight: 600 }}>
          Kept by you
        </div>
        <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(40px,6vw,64px)', lineHeight: 1,
          letterSpacing: '-.015em', color: color.inkStrong, margin: '14px 0 0' }}>Favourites</h1>
      </header>
      {items.length === 0 ? (
        <p style={{ textAlign: 'center', fontStyle: 'italic', color: color.muted, fontSize: 17, marginTop: 40 }}>
          Nothing here yet. Tap the star on an edition in The Archive to keep it.
        </p>
      ) : (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((it) => (
            <div key={it.id} onClick={() => onOpen(it.id)}
              style={{ border: `1px solid ${color.dark}`, background: color.card, borderRadius: 8,
                padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, cursor: 'pointer' }}>
              <div>
                <div style={{ fontFamily: font.display, fontSize: 20, color: color.inkStrong }}>{it.title}</div>
                <div style={{ fontSize: 14, color: color.muted, marginTop: 4 }}>{it.dek}</div>
              </div>
              <button type="button" aria-label="unfavourite"
                onClick={(e) => { e.stopPropagation(); setFlags.mutate({ id: it.id, patch: { favorite: false } }) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: color.accent }}>★</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
