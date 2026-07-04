import { useEffect, useState } from 'react'
import { usePlatform } from '../../platform'
import { color, font } from '../../theme/tokens'
import { PROVIDER_DEFAULTS } from '../../lib/providerDefaults'
import type { Provider, Settings, SettingsPatch } from '../../types/settings'

const PROVIDERS: { key: Provider; label: string }[] = [
  { key: 'openrouter', label: 'OpenRouter' },
  { key: 'ollama', label: 'Ollama' },
  { key: 'custom', label: 'Custom' },
]

type TestStatus = 'idle' | 'testing' | 'ok'

const inputStyle = {
  width: '100%', background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
  padding: '11px 14px', fontFamily: font.mono, fontSize: 14, color: color.ink,
} as const

const segStyle = (active: boolean) => ({
  background: active ? color.dark : color.card,
  color: active ? color.paper : color.muted,
  border: `1px solid ${active ? color.dark : color.borderStrong}`,
  borderRadius: 5,
  padding: '9px 16px',
  fontSize: 15,
  cursor: 'pointer',
} as const)

/**
 * AI source settings. Unlike the other panels this does NOT auto-save — the
 * embedding/summarisation models drive an expensive re-index, so changes are
 * held locally until the user presses Save. Save diffs against the stored
 * settings: if the embedding or summarisation model changed it confirms and
 * runs a forced re-index (re-summarise + re-cluster); otherwise it just saves.
 */
export function AiSourcePanel({
  settings,
  onSave,
  onReindex,
}: {
  settings: Settings
  onSave: (patch: SettingsPatch) => void | Promise<unknown>
  onReindex: () => void | Promise<unknown>
}) {
  const platform = usePlatform()
  const [orKey, setOrKey] = useState('')
  const [ollamaKey, setOllamaKey] = useState('')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [provider, setProvider] = useState<Provider>(settings.provider)
  const [endpoint, setEndpoint] = useState(settings.ollama_endpoint)
  const [models, setModels] = useState({
    embed_model: settings.embed_model, summary_model: settings.summary_model, writer_model: settings.writer_model,
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Re-sync local state if the canonical settings change externally (e.g. a
  // query refetch resolves after our own save).
  useEffect(() => { setProvider(settings.provider) }, [settings.provider])
  useEffect(() => { setEndpoint(settings.ollama_endpoint) }, [settings.ollama_endpoint])
  useEffect(() => {
    setModels({ embed_model: settings.embed_model, summary_model: settings.summary_model, writer_model: settings.writer_model })
  }, [settings.embed_model, settings.summary_model, settings.writer_model])

  // Load any stored key back into the field on mount.
  useEffect(() => {
    platform.keyStore.get('openrouter').then((k) => { if (k) setOrKey(k) }).catch(() => {})
    platform.keyStore.get('ollama').then((k) => { if (k) setOllamaKey(k) }).catch(() => {})
  }, [platform])

  const isOR = provider === 'openrouter'
  const isOL = provider === 'ollama'
  const isCustom = provider === 'custom'
  const ph = PROVIDER_DEFAULTS[provider]

  function selectProvider(key: Provider) {
    setTestStatus('idle'); setSaveMsg('')
    setProvider(key)
    if (key === provider) return
    // Switching provider invalidates the old model names — fill the new
    // provider's real defaults (local only; committed on Save).
    setModels(PROVIDER_DEFAULTS[key])
  }

  function editModel(field: 'embed_model' | 'summary_model' | 'writer_model', v: string) {
    setSaveMsg('')
    setModels((m) => ({ ...m, [field]: v }))
  }

  async function testConnection() {
    setTestStatus('testing')
    await platform.connectionTest.run({
      provider, ollama_endpoint: endpoint,
      embed_model: models.embed_model, summary_model: models.summary_model, writer_model: models.writer_model,
    })
    setTestStatus('ok')
  }

  async function save() {
    const needsReindex =
      models.embed_model !== settings.embed_model || models.summary_model !== settings.summary_model
    if (needsReindex && !window.confirm(
      'This changes the embedding or summarisation model, which re-summarises and re-clusters your entire vault (a full re-index). Continue?',
    )) return

    setSaving(true)
    try {
      await platform.keyStore.set('openrouter', orKey).catch(() => {})
      await platform.keyStore.set('ollama', ollamaKey).catch(() => {})
      await onSave({
        provider, ollama_endpoint: endpoint,
        embed_model: models.embed_model, summary_model: models.summary_model, writer_model: models.writer_model,
      })
      if (needsReindex) {
        await onReindex()
        setSaveMsg('Saved — re-summarising and re-clustering your vault now.')
      } else {
        setSaveMsg('Saved — applies to your next edition.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
        AI source
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: color.muted, marginTop: 6 }}>
        Where the thinking happens. Pick a provider, point it at the models you want, test the connection,
        then save.
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {PROVIDERS.map((p) => (
          <button key={p.key} type="button" onClick={() => selectProvider(p.key)} style={segStyle(provider === p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {isOR && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>OpenRouter API key</div>
          <input value={orKey} onChange={(e) => { setSaveMsg(''); setOrKey(e.target.value) }}
            placeholder="sk-or-v1-…" style={inputStyle} />
        </div>
      )}
      {isOL && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Ollama endpoint</div>
            <input value={endpoint} onChange={(e) => { setSaveMsg(''); setEndpoint(e.target.value) }}
              placeholder="http://localhost:11434" style={inputStyle} />
            <div style={{ fontSize: 13, color: color.faint, marginTop: 6, fontStyle: 'italic' }}>
              Point this at a networked machine to run Ollama somewhere other than this one.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>
              API key <span style={{ color: color.faint }}>(optional · only if your endpoint requires one)</span>
            </div>
            <input value={ollamaKey} onChange={(e) => { setSaveMsg(''); setOllamaKey(e.target.value) }} placeholder="—" style={inputStyle} />
          </div>
        </div>
      )}
      {isCustom && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>OpenRouter API key</div>
            <input value={orKey} onChange={(e) => { setSaveMsg(''); setOrKey(e.target.value) }} placeholder="sk-or-v1-…" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Ollama endpoint</div>
              <input value={endpoint} onChange={(e) => { setSaveMsg(''); setEndpoint(e.target.value) }}
                placeholder="http://localhost:11434" style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Ollama API key</div>
              <input value={ollamaKey} onChange={(e) => { setSaveMsg(''); setOllamaKey(e.target.value) }} placeholder="—" style={inputStyle} />
            </div>
          </div>
          <div style={{ fontSize: 13, color: color.faint, fontStyle: 'italic', lineHeight: 1.5 }}>
            Use provider-prefixed model names below, e.g.{' '}
            <span style={{ fontFamily: font.mono, fontStyle: 'normal', color: color.accent }}>openrouter/openai/gpt-5</span> or{' '}
            <span style={{ fontFamily: font.mono, fontStyle: 'normal', color: color.accent }}>ollama/qwen3:8b</span>.
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Embedding model</div>
          <input value={models.embed_model} onChange={(e) => editModel('embed_model', e.target.value)}
            placeholder={ph.embed_model} style={{ ...inputStyle, fontSize: 13.5 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Summarisation model</div>
          <input value={models.summary_model} onChange={(e) => editModel('summary_model', e.target.value)}
            placeholder={ph.summary_model} style={{ ...inputStyle, fontSize: 13.5 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Writer model</div>
          <input value={models.writer_model} onChange={(e) => editModel('writer_model', e.target.value)}
            placeholder={ph.writer_model} style={{ ...inputStyle, fontSize: 13.5 }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" onClick={testConnection} disabled={testStatus === 'testing'}
          style={{ background: 'transparent', border: `1px solid ${color.dark}`, borderRadius: 5,
            padding: '10px 18px', fontSize: 14, color: color.inkStrong, cursor: 'pointer' }}>
          {testStatus === 'idle' && 'Test connection & models'}
          {testStatus === 'testing' && 'Testing…'}
          {testStatus === 'ok' && 'Test again'}
        </button>
        <button type="button" onClick={save} disabled={saving}
          style={{ background: color.dark, border: `1px solid ${color.dark}`, borderRadius: 5,
            padding: '10px 22px', fontSize: 14, color: color.paper, cursor: 'pointer', fontFamily: font.body }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {testStatus === 'ok' && !saveMsg && (
          <span style={{ fontSize: 14, color: color.ok, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.ok, display: 'inline-block' }} />
            Connected · all three models reachable
          </span>
        )}
        {saveMsg && <span style={{ fontSize: 14, color: color.muted, fontStyle: 'italic' }}>{saveMsg}</span>}
      </div>
    </div>
  )
}
