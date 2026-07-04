import { lengthLabel } from '../../lib/readingLength'
import { color, font } from '../../theme/tokens'
import type { Cadence, Settings, SettingsPatch } from '../../types/settings'

const CADENCE_LABELS: { label: string; value: Cadence }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Every few days', value: 'few_days' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every two weeks', value: 'biweekly' },
]

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

export function PreferencesPanel({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (patch: SettingsPatch) => void
}) {
  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div
        style={{
          fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint,
          fontWeight: 600, marginBottom: 18,
        }}
      >
        Preferences
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: 10 }}>How often editions arrive</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CADENCE_LABELS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ cadence: o.value })}
                style={segStyle(settings.cadence === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: color.muted }}>Default reading length</span>
            <span style={{ fontFamily: font.display, fontSize: 17, color: color.inkStrong }}>
              {settings.reading_min} min · {lengthLabel(settings.reading_min)}
            </span>
          </div>
          <input
            className="ap-range"
            type="range"
            min={3}
            max={15}
            step={1}
            value={settings.reading_min}
            onChange={(e) => onChange({ reading_min: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div style={{ fontSize: 14, color: color.muted, marginBottom: 10 }}>Notes woven per edition</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {NOTES_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ notes_per_issue: n })}
                style={segStyle(settings.notes_per_issue === n)}
              >
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
      </div>
    </div>
  )
}
