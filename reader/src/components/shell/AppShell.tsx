import type { ReactNode } from 'react'
import { color, font } from '../../theme/tokens'
import { useSettings, useStatus } from '../../api/queries'
import { volumeLabel } from '../../lib/masthead'
import { Logo } from '../Logo'

export type Screen = 'reader' | 'archive' | 'settings'

const NAV_ITEMS: { key: Screen; label: string }[] = [
  { key: 'reader', label: 'Reader' },
  { key: 'archive', label: 'The Archive' },
  { key: 'settings', label: 'Settings' },
]

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: Screen
  onNavigate: (screen: Screen) => void
  children: ReactNode
}) {
  const { data: settings } = useSettings()
  const { data: status } = useStatus()
  const folders = settings?.vault_paths ?? []
  const latestNo = status?.issue_count ?? 0   // editions published so far → current No.
  return (
    <div style={{ display: 'flex', minHeight: 'var(--app-h)' }}>
      <aside
        style={{
          flex: '0 0 240px',
          background: color.dark,
          color: color.onDark,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 'env(safe-area-inset-top)',
          height: 'var(--app-h)',
          padding: '26px 0',
        }}
      >
        <div style={{ padding: '0 26px 26px', borderBottom: `1px solid ${color.darkRule}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Logo size={30} />
            <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 24, color: color.paper }}>
              Againpage
            </div>
          </div>
          {latestNo > 0 && (
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: color.fainter,
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              {volumeLabel(latestNo)} · No. {latestNo}
            </div>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '18px 14px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                style={{
                  background: isActive ? color.darkRule : 'transparent',
                  color: isActive ? color.paper : color.onDark,
                  border: 'none',
                  borderRadius: 5,
                  padding: '11px 14px',
                  fontSize: 15,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: font.body,
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '18px 26px 0', borderTop: `1px solid ${color.darkRule}` }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: color.fainter,
              fontWeight: 600,
            }}
          >
            {folders.length === 1 ? 'Notes folder' : 'Notes folders'}
          </div>
          {(folders.length ? folders : ['—']).map((p) => (
            <div
              key={p}
              style={{
                fontFamily: font.mono,
                fontSize: 12,
                color: color.onDark,
                marginTop: 6,
                wordBreak: 'break-all',
              }}
            >
              {p.replace(/^.*\/([^/]+\/[^/]+)$/, '…/$1')}
            </div>
          ))}
          <div
            style={{
              fontSize: 12,
              color: color.okDim,
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: color.ok,
                display: 'inline-block',
              }}
            />
            local
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  )
}
