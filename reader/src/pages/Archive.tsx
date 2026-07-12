import { useState } from 'react'
import { useArchive, useStatus, useSetIssueFlags } from '../api/queries'
import { color, font } from '../theme/tokens'
import { spellOutCount } from '../lib/masthead'
import type { ArchiveItem } from '../types/archive'

export function Archive({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate?: (screen: string) => void }) {
  const status = useStatus()
  const archive = useArchive()
  const setFlags = useSetIssueFlags()
  const [filter, setFilter] = useState<'active' | 'inactive' | 'all'>('active')
  if (status.isLoading || archive.isLoading) return <div style={{ padding: 48 }}>Loading…</div>
  const s = status.data!
  const groups = archive.data?.groups ?? []
  const shown = groups
    .map((g) => ({ ...g, items: g.items.filter((it) =>
      filter === 'all' ? true : filter === 'active' ? it.active : !it.active) }))
    .filter((g) => g.items.length > 0)
  const empty = (archive.data?.total ?? 0) === 0
  const whenLabel = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-GB',
    { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true }) : ''

  if (empty && !s.indexed) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(56px,10vw,120px) 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(30px,4.6vw,46px)', color: color.inkStrong }}>The Archive is empty.</h1>
        <p style={{ fontSize: 18, color: color.muted, marginTop: 18 }}>Once your themes are composed and an edition is generated, your bound volumes will begin here.</p>
        <button type="button" onClick={() => onNavigate?.('settings')}
          style={{ marginTop: 26, background: color.dark, color: color.paper, border: 'none', borderRadius: 6, padding: '14px 28px', fontSize: 16, cursor: 'pointer', fontFamily: font.body }}>
          Compose your themes</button>
      </div>
    )
  }
  if (empty) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(56px,10vw,120px) 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(30px,4.6vw,46px)', color: color.inkStrong }}>The Archive</h1>
        <p style={{ fontSize: 18, color: color.muted, marginTop: 18, fontStyle: 'italic' }}>
          The bound volumes fill as editions are composed. Your first arrives {whenLabel(s.next_edition_at)}.</p>
      </div>
    )
  }
  const seg = (v: 'active' | 'inactive' | 'all', label: string) => (
    <button type="button" aria-label={label} onClick={() => setFilter(v)}
      style={{ padding: '7px 14px', fontSize: 13, cursor: 'pointer', borderRadius: 5,
        border: `1px solid ${color.borderStrong}`,
        background: filter === v ? color.dark : 'transparent',
        color: filter === v ? color.paper : color.muted }}>{label}</button>
  )
  const favBtn = (it: ArchiveItem) => (
    <button type="button" aria-label={it.favorite ? 'unfavourite' : 'favourite'}
      onClick={(e) => { e.stopPropagation(); setFlags.mutate({ id: it.id, patch: { favorite: !it.favorite } }) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
        color: it.favorite ? color.accent : color.faint }}>{it.favorite ? '★' : '☆'}</button>
  )
  const activeBtn = (it: ArchiveItem) => (
    <button type="button" aria-label={it.active ? 'move to inactive' : 'restore'}
      title={it.active ? 'Move to inactive' : 'Restore'}
      onClick={(e) => { e.stopPropagation(); setFlags.mutate({ id: it.id, patch: { active: !it.active } }) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
        color: color.faint }}>{it.active ? '⌦' : '↩'}</button>
  )
  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(40px,6vw,72px) clamp(24px,5vw,40px) 80px' }}>
      <header style={{ textAlign: 'center', borderBottom: `2px solid ${color.dark}`, paddingBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', color: color.accent, fontWeight: 600 }}>
          The bound volumes
        </div>
        <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(40px,6vw,64px)', lineHeight: 1,
          letterSpacing: '-.015em', color: color.inkStrong, margin: '14px 0 0' }}>
          The Archive
        </h1>
        <p style={{ fontStyle: 'italic', color: color.muted, fontSize: 17, marginTop: 14 }}>
          Every edition Againpage has composed for you. {spellOutCount(archive.data?.total ?? 0)}{' '}
          {(archive.data?.total ?? 0) === 1 ? 'morning' : 'mornings'}, and counting.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
          {seg('active', 'Active')}{seg('inactive', 'Inactive')}{seg('all', 'All')}
        </div>
      </header>
      {shown.map((g) => (
        <div key={g.label} style={{ marginTop: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: color.faint,
            fontWeight: 600, marginBottom: 6 }}>
            {g.label}
          </div>
          {g.items.map((it) => (
            <div key={it.id} role="button" tabIndex={0} onClick={() => onOpen(it.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(it.id) } }}
              style={{
              display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
              borderTop: `1px solid ${color.border}`, padding: '22px 4px', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                    <span style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 15, color: color.gold,
                      flex: '0 0 auto' }}>
                      No. {it.issue_no}
                    </span>
                    <h3 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 'clamp(22px,3vw,28px)',
                      lineHeight: 1.1, color: color.inkStrong, letterSpacing: '-.01em' }}>
                      {it.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: 16, color: color.muted, marginTop: 7, lineHeight: 1.5 }}>{it.dek}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {it.tags.map((t) => (
                      <span key={t} style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase',
                        color: color.accent, border: `1px solid ${color.chipBorder}`, borderRadius: 3,
                        padding: '3px 9px', fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: color.faint }}>{it.date}</div>
                  <div style={{ fontSize: 13, color: color.faint, marginTop: 4 }}>{it.reading_min} min</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
                    {favBtn(it)}
                    {activeBtn(it)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
