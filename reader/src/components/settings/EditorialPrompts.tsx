import { useState } from 'react'
import { usePromptDefaults, useSaveSettings } from '../../api/queries'
import { color, font } from '../../theme/tokens'
import type { Settings, SettingsPatch } from '../../types/settings'

function VoiceEditor({ label, field, current, def }:
  { label: string; field: 'writer_prompt' | 'note_expand_prompt'; current: string; def: string }) {
  const save = useSaveSettings()
  const [text, setText] = useState(current || def)
  const canSave = text.trim().length > 0
  return (
    <div style={{ marginTop: 18 }}>
      <label style={{ fontSize: 14, color: color.muted, display: 'block', marginBottom: 6 }}>{label}</label>
      <textarea aria-label={label} value={text} onChange={(e) => setText(e.target.value)} rows={8}
        style={{ width: '100%', boxSizing: 'border-box', background: color.card,
          border: `1px solid ${color.borderStrong}`, borderRadius: 5, padding: '10px 12px',
          fontFamily: font.mono, fontSize: 13, color: color.ink }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {/* Accessible name comes from visible text (not aria-label) so these buttons
            don't also match getByLabelText(label) — only the textarea's aria-label should. */}
        <button type="button" disabled={!canSave}
          onClick={() => canSave && save.mutate({ [field]: text } as SettingsPatch)}
          style={{ background: color.dark, color: color.paper, border: 'none', borderRadius: 5,
            padding: '8px 16px', fontSize: 13, cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.5 }}>Save {label}</button>
        <button type="button"
          onClick={() => { setText(def); save.mutate({ [field]: '' } as SettingsPatch) }}
          style={{ background: 'transparent', color: color.muted, border: `1px solid ${color.borderStrong}`,
            borderRadius: 5, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Revert {label} to default</button>
      </div>
    </div>
  )
}

export function EditorialPrompts({ settings }: { settings: Settings }) {
  const defaults = usePromptDefaults()
  const save = useSaveSettings()
  const [words, setWords] = useState(settings.note_expand_words)
  if (defaults.isLoading || !defaults.data) return null   // wait for the default voice text
  return (
    <div style={{ marginTop: 24, borderTop: `1px solid ${color.border}`, paddingTop: 20 }}>
      <div style={{ fontSize: 13, color: color.inkStrong, fontWeight: 600 }}>Editorial prompts</div>
      <p style={{ fontSize: 13, color: color.faint, marginTop: 6, lineHeight: 1.5 }}>
        The output format is fixed and added automatically — editing the voice can't break generation.
      </p>
      <VoiceEditor label="Writer voice" field="writer_prompt"
        current={settings.writer_prompt} def={defaults.data.writer} />
      <VoiceEditor label="Note-expand voice" field="note_expand_prompt"
        current={settings.note_expand_prompt} def={defaults.data.note_expand} />
      <div style={{ marginTop: 18 }}>
        <label style={{ fontSize: 14, color: color.muted, display: 'block', marginBottom: 6 }}>Note-expand word count</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input aria-label="Note-expand word count" type="number" min={100} max={2000} value={words}
            onChange={(e) => setWords(Math.max(100, Math.min(2000, +e.target.value || 500)))}
            style={{ width: 100, background: color.card, border: `1px solid ${color.borderStrong}`,
              borderRadius: 5, padding: '8px 10px', fontSize: 14, color: color.inkStrong, fontFamily: font.mono }} />
          <button type="button"
            onClick={() => save.mutate({ note_expand_words: words })}
            style={{ background: color.dark, color: color.paper, border: 'none', borderRadius: 5,
              padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Save note-expand word count</button>
          <button type="button"
            onClick={() => { setWords(500); save.mutate({ note_expand_words: 500 }) }}
            style={{ background: 'transparent', color: color.muted, border: `1px solid ${color.borderStrong}`,
              borderRadius: 5, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Revert note-expand word count to default</button>
        </div>
      </div>
    </div>
  )
}
