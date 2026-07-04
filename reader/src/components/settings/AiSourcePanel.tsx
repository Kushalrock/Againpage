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

export function AiSourcePanel({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (patch: SettingsPatch) => void
}) {
  const platform = usePlatform()
  const [orKey, setOrKey] = useState('')
  const [ollamaKey, setOllamaKey] = useState('')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [provider, setProvider] = useState<Provider>(settings.provider)
  // Model fields use local state so typing is applied immediately. (Binding
  // the inputs straight to server settings + a debounced save swallows every
  // keystroke, because the controlled value resets before the save resolves.)
  const [models, setModels] = useState({
    embed_model: settings.embed_model, summary_model: settings.summary_model, writer_model: settings.writer_model,
  })

  // Keep the local provider tab in sync if the canonical settings change externally
  // (e.g. a query refetch after a save resolves with a different provider).
  useEffect(() => { setProvider(settings.provider) }, [settings.provider])
  useEffect(() => {
    setModels({ embed_model: settings.embed_model, summary_model: settings.summary_model, writer_model: settings.writer_model })
  }, [settings.embed_model, settings.summary_model, settings.writer_model])

  // Load any stored key back into the field on mount, so a saved key is
  // visible instead of an always-blank input.
  useEffect(() => {
    platform.keyStore.get('openrouter').then((k) => { if (k) setOrKey(k) }).catch(() => {})
    platform.keyStore.get('ollama').then((k) => { if (k) setOllamaKey(k) }).catch(() => {})
  }, [platform])

  const isOR = provider === 'openrouter'
  const isOL = provider === 'ollama'
  const isCustom = provider === 'custom'
  const ph = PROVIDER_DEFAULTS[provider]

  function selectProvider(key: Provider) {
    setTestStatus('idle')
    setProvider(key)
    if (key === provider) { onChange({ provider: key }); return }
    // Switching provider invalidates the old model names — populate the new
    // provider's real defaults (not just placeholders) so the engine gets
    // usable values.
    const d = PROVIDER_DEFAULTS[key]
    setModels(d)
    onChange({ provider: key, ...d })
  }

  function commitModel(field: 'embed_model' | 'summary_model' | 'writer_model', v: string) {
    setModels((m) => ({ ...m, [field]: v }))
    onChange({ [field]: v })
  }

  async function testConnection() {
    setTestStatus('testing')
    await platform.connectionTest.run({
      provider,
      ollama_endpoint: settings.ollama_endpoint,
      embed_model: models.embed_model,
      summary_model: models.summary_model,
      writer_model: models.writer_model,
    })
    setTestStatus('ok')
  }

  async function commitOrKey(v: string) {
    setOrKey(v)
    await platform.keyStore.set('openrouter', v)
  }
  async function commitOllamaKey(v: string) {
    setOllamaKey(v)
    await platform.keyStore.set('ollama', v)
  }

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
        AI source
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: color.muted, marginTop: 6 }}>
        Where the thinking happens. Pick a provider, point it at the models you want, and test the connection.
        Set it once and forget it.
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
          <input
            value={orKey}
            onChange={(e) => commitOrKey(e.target.value)}
            placeholder="sk-or-v1-…"
            style={inputStyle}
          />
        </div>
      )}
      {isOL && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Ollama endpoint</div>
            <input
              value={settings.ollama_endpoint}
              onChange={(e) => onChange({ ollama_endpoint: e.target.value })}
              placeholder="http://localhost:11434"
              style={inputStyle}
            />
            <div style={{ fontSize: 13, color: color.faint, marginTop: 6, fontStyle: 'italic' }}>
              Point this at a networked machine to run Ollama somewhere other than this one.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>
              API key <span style={{ color: color.faint }}>(optional · only if your endpoint requires one)</span>
            </div>
            <input value={ollamaKey} onChange={(e) => commitOllamaKey(e.target.value)} placeholder="—" style={inputStyle} />
          </div>
        </div>
      )}
      {isCustom && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>OpenRouter API key</div>
            <input value={orKey} onChange={(e) => commitOrKey(e.target.value)} placeholder="sk-or-v1-…" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Ollama endpoint</div>
              <input
                value={settings.ollama_endpoint}
                onChange={(e) => onChange({ ollama_endpoint: e.target.value })}
                placeholder="http://localhost:11434"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Ollama API key</div>
              <input value={ollamaKey} onChange={(e) => commitOllamaKey(e.target.value)} placeholder="—" style={inputStyle} />
            </div>
          </div>
          <div style={{ fontSize: 13, color: color.faint, fontStyle: 'italic', lineHeight: 1.5 }}>
            Use provider-prefixed model names below, e.g.{' '}
            <span style={{ fontFamily: font.mono, fontStyle: 'normal', color: color.accent }}>openrouter/openai/gpt-5</span> or{' '}
            <span style={{ fontFamily: font.mono, fontStyle: 'normal', color: color.accent }}>ollama/qwen3:8b</span>.
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Embedding model</div>
          <input
            value={models.embed_model}
            onChange={(e) => commitModel('embed_model', e.target.value)}
            placeholder={ph.embed_model}
            style={{ ...inputStyle, fontSize: 13.5 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Summarisation model</div>
          <input
            value={models.summary_model}
            onChange={(e) => commitModel('summary_model', e.target.value)}
            placeholder={ph.summary_model}
            style={{ ...inputStyle, fontSize: 13.5 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 13, color: color.muted, marginBottom: 6 }}>Writer model</div>
          <input
            value={models.writer_model}
            onChange={(e) => commitModel('writer_model', e.target.value)}
            placeholder={ph.writer_model}
            style={{ ...inputStyle, fontSize: 13.5 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={testConnection}
          disabled={testStatus === 'testing'}
          style={{
            background: 'transparent', border: `1px solid ${color.dark}`, borderRadius: 5, padding: '10px 18px',
            fontSize: 14, color: color.inkStrong, cursor: 'pointer',
          }}
        >
          {testStatus === 'idle' && 'Test connection & models'}
          {testStatus === 'testing' && 'Testing…'}
          {testStatus === 'ok' && 'Test again'}
        </button>
        {testStatus === 'testing' && (
          <span style={{ fontSize: 14, color: color.faint, fontStyle: 'italic' }}>
            Verifying key, endpoint, and that each model responds…
          </span>
        )}
        {testStatus === 'ok' && (
          <span style={{ fontSize: 14, color: color.ok, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.ok, display: 'inline-block' }} />
            Connected · all three models reachable
          </span>
        )}
      </div>
    </div>
  )
}
