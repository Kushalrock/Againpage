import { useState } from 'react'
import { lengthLabel } from '../../lib/readingLength'
import { useStatus } from '../../api/queries'
import { useCountdown, nextEditionAt } from '../../lib/countdown'
import { color, font } from '../../theme/tokens'
import type { Settings, SettingsPatch } from '../../types/settings'

const NOTES_OPTIONS = [2, 3, 4, 5]

const segStyle = (active: boolean) => ({
  background: active ? color.dark : color.card,
  color: active ? color.paper : color.muted,
  border: `1px solid ${active ? color.dark : color.borderStrong}`,
  borderRadius: 5,
  padding: '9px 16px',
  fontSize: 15,
  cursor: 'pointer',
} as const)

const stepStyle = {
  background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
  width: 38, height: 40, fontSize: 20, color: color.inkStrong, cursor: 'pointer', lineHeight: 1,
} as const

export function PreferencesPanel({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (patch: SettingsPatch) => void
}) {
  const status = useStatus()
  // Local state so the day input edits smoothly (server round-trip doesn't snap it back).
  const [days, setDays] = useState(settings.cadence_days)

  function setCadence(n: number) {
    const v = Math.max(1, Math.min(90, Math.round(n) || 1))
    setDays(v)
    onChange({ cadence_days: v })
  }

  // Live preview of when the next edition lands. Prefer the engine's
  // next_edition_at (timezone-aware, computed in the user's configured zone);
  // fall back to a client-side projection before status has loaded.
  const projected = nextEditionAt(settings.delivery_time, days, status.data?.latest_issue_date ?? null, new Date())
  const target = status.data?.next_edition_at ?? projected
  const cd = useCountdown(target)

  const zones: string[] =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint,
        fontWeight: 600, marginBottom: 18 }}>
        Preferences
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: 10 }}>How often editions arrive</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, color: color.muted }}>Every</span>
            <button type="button" aria-label="fewer days" style={stepStyle} onClick={() => setCadence(days - 1)}>−</button>
            <input aria-label="days between editions" type="number" min={1} max={90} value={days}
              onChange={(e) => setCadence(+e.target.value)}
              style={{ width: 64, textAlign: 'center', background: color.card, border: `1px solid ${color.borderStrong}`,
                borderRadius: 5, padding: '10px 8px', fontSize: 16, color: color.inkStrong,
                fontFamily: "'Source Code Pro', monospace" }} />
            <button type="button" aria-label="more days" style={stepStyle} onClick={() => setCadence(days + 1)}>+</button>
            <span style={{ fontSize: 15, color: color.muted }}>{days === 1 ? 'day' : 'days'}</span>
          </div>
          <div style={{ fontSize: 13, color: color.faint, marginTop: 8, fontStyle: 'italic' }}>
            {cd.due
              ? 'Your next edition is being composed…'
              : `Your next edition arrives ${cd.label} · ${days === 1 ? 'daily' : `every ${days} days`} at ${settings.delivery_time}`}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: color.muted }}>Default reading length</span>
            <span style={{ fontFamily: font.display, fontSize: 17, color: color.inkStrong }}>
              {settings.reading_min} min · {lengthLabel(settings.reading_min)}
            </span>
          </div>
          <input className="ap-range" type="range" min={3} max={15} step={1} value={settings.reading_min}
            onChange={(e) => onChange({ reading_min: Number(e.target.value) })} style={{ width: '100%' }} />
        </div>

        <div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: 10 }}>Notes woven per edition</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {NOTES_OPTIONS.map((n) => (
              <button key={n} type="button" onClick={() => onChange({ notes_per_issue: n })}
                style={segStyle(settings.notes_per_issue === n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: 10 }}>Delivery time</div>
          <input aria-label="Delivery time" type="time" value={settings.delivery_time}
            onChange={(e) => onChange({ delivery_time: e.target.value })}
            style={{ background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
              padding: '10px 14px', fontSize: 15, color: color.inkStrong, fontFamily: "'Source Code Pro', monospace" }} />
        </div>

        <div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: 10 }}>Timezone</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {zones.length > 0 ? (
              <select aria-label="Timezone" value={settings.timezone || 'UTC'}
                onChange={(e) => onChange({ timezone: e.target.value })}
                style={{ background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                  padding: '10px 14px', fontSize: 15, color: color.inkStrong, maxWidth: '100%' }}>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            ) : (
              <input aria-label="Timezone" value={settings.timezone || 'UTC'} placeholder="Asia/Kolkata"
                onChange={(e) => onChange({ timezone: e.target.value })}
                style={{ background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                  padding: '10px 14px', fontSize: 15, color: color.inkStrong, fontFamily: "'Source Code Pro', monospace" }} />
            )}
            {deviceZone && settings.timezone !== deviceZone && (
              <button type="button" onClick={() => onChange({ timezone: deviceZone })}
                style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                  padding: '9px 14px', fontSize: 13, color: color.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Use this device ({deviceZone})
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: color.faint, marginTop: 8, fontStyle: 'italic' }}>
            Editions are scheduled at your delivery time in this zone — set it to where you are, not the server.
          </div>
        </div>
      </div>
    </div>
  )
}
