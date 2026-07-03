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
const TIME_OPTIONS = ['6:00 am', '7:00 am', '8:00 am', '8:00 pm']

function to12h(hhmm: string): string {
  const [hStr, m] = hhmm.split(':')
  let h = Number(hStr)
  const suffix = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m ?? '00'} ${suffix}`
}
function to24h(label: string): string {
  const m = /^(\d+):(\d+)\s*(am|pm)$/i.exec(label.trim())
  if (!m) return label
  let h = Number(m[1])
  const min = m[2]
  const suffix = m[3].toLowerCase()
  if (suffix === 'pm' && h !== 12) h += 12
  if (suffix === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}

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
  function changeEmbedModel(next: string) {
    if (next === settings.embed_model) return
    const proceed = window.confirm(
      'Changing the embedding model re-embeds and re-clusters all notes. Continue?',
    )
    if (proceed) onChange({ embed_model: next })
  }

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ delivery_time: to24h(t) })}
                style={segStyle(to12h(settings.delivery_time) === t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Embedding model</div>
          <input
            defaultValue={settings.embed_model}
            onBlur={(e) => changeEmbedModel(e.target.value)}
            style={{
              width: '100%', background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
              padding: '11px 14px', fontFamily: font.mono, fontSize: 13.5, color: color.ink,
            }}
          />
          <div style={{ fontSize: 13, color: color.faint, marginTop: 6, fontStyle: 'italic' }}>
            Changing this re-embeds and re-clusters your entire vault.
          </div>
        </div>
      </div>
    </div>
  )
}
