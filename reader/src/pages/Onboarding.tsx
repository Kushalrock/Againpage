import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSaveSettings } from '../api/queries'
import { setApiBase, storedApiBase } from '../api/base'
import { usePlatform } from '../platform'
import { lengthLabel } from '../lib/readingLength'
import { PROVIDER_DEFAULTS } from '../lib/providerDefaults'
import { Logo } from '../components/Logo'
import { color, font } from '../theme/tokens'
import type { Provider, SettingsPatch } from '../types/settings'

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

const cardStyle = (active: boolean) => ({
  textAlign: 'left',
  borderRadius: 8,
  padding: '18px 20px',
  cursor: 'pointer',
  border: active ? `1.5px solid ${color.accent}` : `1px solid ${color.borderStrong}`,
  background: active ? color.cardActive : color.card,
  boxShadow: active ? '0 0 0 3px rgba(124,45,42,.12)' : 'none',
} as const)

const labelStyle = {
  fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600,
} as const

export function Onboarding({ onDone }: { onDone: () => void }) {
  const platform = usePlatform()
  const save = useSaveSettings()

  const [step, setStep] = useState(0)
  const [folders, setFolders] = useState<{ path: string; count: number }[]>([])
  const [aiSource, setAiSource] = useState<Provider | ''>('')
  const [apiKey, setApiKey] = useState('')
  const [cadenceDays, setCadenceDays] = useState(1)
  const [readingMin, setReadingMin] = useState(7)
  const [notesPerIssue, setNotesPerIssue] = useState(3)
  const [deliveryTime, setDeliveryTime] = useState('07:00')
  const [profileText, setProfileText] = useState('')
  const [engineUrl, setEngineUrl] = useState(storedApiBase())
  const [pathInput, setPathInput] = useState('')
  const queryClient = useQueryClient()

  const canNext = step === 1 ? folders.length > 0 : step === 2 ? !!aiSource : true

  async function pickFolder() {
    const result = await platform.folderPicker.pick()
    if (result && !folders.some((f) => f.path === result.path)) setFolders([...folders, result])
  }
  function addPath() {
    const p = pathInput.trim()
    if (p && !folders.some((f) => f.path === p)) setFolders([...folders, { path: p, count: 0 }])
    setPathInput('')
  }
  function removeFolder(path: string) { setFolders(folders.filter((f) => f.path !== path)) }

  // Persist the engine URL as the user types; re-check the connection on blur so
  // that if a remote engine is now reachable (and already set up), the app can
  // leave onboarding on its own.
  function changeEngineUrl(url: string) { setEngineUrl(url); setApiBase(url) }
  function applyEngineUrl() { void queryClient.invalidateQueries() }

  async function finish() {
    const provider = aiSource || 'openrouter'
    const patch: SettingsPatch = {
      vault_paths: folders.map((f) => f.path),
      provider,
      ...PROVIDER_DEFAULTS[provider],
      cadence_days: cadenceDays,
      reading_min: readingMin,
      notes_per_issue: notesPerIssue,
      delivery_time: deliveryTime,
      profile_text: profileText,
    }
    // The key is stored with settings (reaches the engine; no .env needed).
    if (apiKey.trim()) {
      if (provider === 'ollama') patch.ollama_key = apiKey.trim()
      else patch.openrouter_key = apiKey.trim()
    }
    await save.mutateAsync(patch)
    setStep(5)
  }

  function next() {
    if (!canNext) return
    if (step === 4) {
      void finish()
      return
    }
    setStep((s) => Math.min(5, s + 1))
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  const stepLabel = step === 0 ? 'Welcome' : `Step ${step} of 5`
  const nextLabel = step === 0 ? 'Begin' : step === 4 ? 'Finish' : 'Continue'
  const showNav = step !== 5

  const aiSummary = aiSource === 'ollama'
    ? 'kept entirely local with Ollama'
    : aiSource === 'openrouter'
      ? 'composed with your OpenRouter key'
      : 'using your chosen AI'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: color.paper }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 22, color: color.inkStrong }}>Againpage</div>
          </div>
          <div style={labelStyle}>{stepLabel}</div>
        </div>

        <div style={{ minHeight: 340 }}>
          {step === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <h1 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(36px,5vw,52px)', lineHeight: 1.08, letterSpacing: '-.015em', color: color.inkStrong }}>
                A paper, from your<br />own mind.
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.6, color: color.muted, maxWidth: 420, margin: '22px auto 0' }}>
                Three calm choices and Againpage will start composing a daily edition from the notes you already keep. It takes about a minute.
              </p>
              <div style={{ maxWidth: 420, margin: '30px auto 0', textAlign: 'left' }}>
                <label style={{ fontSize: 13, color: color.faint }}>
                  Engine URL <span style={{ fontStyle: 'italic' }}>— advanced; only if the engine runs on another machine</span>
                </label>
                <input
                  value={engineUrl}
                  onChange={(e) => changeEngineUrl(e.target.value)}
                  onBlur={applyEngineUrl}
                  placeholder="http://localhost:8000"
                  aria-label="engine URL"
                  style={{ width: '100%', marginTop: 6, background: color.card, border: `1px solid ${color.borderStrong}`,
                    borderRadius: 6, padding: '10px 12px', fontFamily: font.mono, fontSize: 13, color: color.ink }}
                />
                <div style={{ fontSize: 12.5, color: color.faint, marginTop: 6, lineHeight: 1.5 }}>
                  Leave as-is if you're running Againpage on this computer. Set it to e.g.{' '}
                  <span style={{ fontFamily: font.mono }}>http://your-server:8000</span> to use an engine hosted elsewhere.
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, color: color.inkStrong, letterSpacing: '-.01em' }}>
                Point Againpage at your notes.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: color.muted, marginTop: 10 }}>
                Choose the folder of markdown files it should read. This is the only thing you grant access to — and it never leaves your machine.
              </p>
              {folders.length === 0 && (
                <button
                  type="button"
                  onClick={pickFolder}
                  style={{
                    marginTop: 24, width: '100%', border: `1.5px dashed ${color.borderStrong}`, background: color.card,
                    borderRadius: 8, padding: '38px 24px', cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ fontFamily: font.display, fontSize: 22, color: color.inkStrong }}>Choose folder…</div>
                  <div style={{ fontSize: 14, color: color.faint, marginTop: 6 }}>
                    Obsidian vault, Logseq graph, or any folder of .md files
                  </div>
                </button>
              )}
              {folders.length > 0 && (
                <>
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {folders.map((f) => (
                      <div key={f.path}
                        style={{ border: `1px solid ${color.dark}`, background: color.card, borderRadius: 8,
                          padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
                      >
                        <div>
                          <div style={{ fontFamily: font.mono, fontSize: 15, color: color.inkStrong }}>{f.path}</div>
                          <div style={{ fontSize: 14, color: color.ok, marginTop: 8, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.ok, display: 'inline-block' }} />
                            {f.count > 0 ? `${f.count} notes found · ready` : 'added · scanned when you index'}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeFolder(f.path)} aria-label={`remove ${f.path}`}
                          style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                            padding: '9px 14px', fontSize: 14, color: color.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={pickFolder}
                    style={{ marginTop: 12, background: 'transparent', border: `1px solid ${color.borderStrong}`,
                      borderRadius: 5, padding: '10px 16px', fontSize: 14, color: color.muted, cursor: 'pointer' }}>
                    + Add another folder
                  </button>
                  <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.55, color: color.muted }}>
                    <span style={{ color: color.ok, flex: '0 0 auto', fontWeight: 700 }}>✓</span>
                    <span>Indexing happens wherever the engine runs. You can fine-tune folders and exclusions later, in Settings.</span>
                  </div>
                </>
              )}
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addPath() }}
                    placeholder="/vault  (or a path the engine can read)"
                    aria-label="folder path"
                    style={{ flex: 1, background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 6,
                      padding: '10px 12px', fontFamily: font.mono, fontSize: 14, color: color.ink }}
                  />
                  <button type="button" onClick={addPath}
                    style={{ background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                      padding: '10px 16px', fontSize: 14, color: color.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Add path
                  </button>
                </div>
                <p style={{ fontSize: 13, color: color.faint, marginTop: 8, lineHeight: 1.5 }}>
                  Type the folder path <em>as the engine sees it</em> — e.g.{' '}
                  <span style={{ fontFamily: font.mono }}>/vault</span> in the Docker setup, or a path on your home-lab
                  server. A path on this computer only works when the engine runs here too.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, color: color.inkStrong, letterSpacing: '-.01em' }}>
                Bring your own AI.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: color.muted, marginTop: 10 }}>
                Againpage uses a model you control. Pick the path that fits — you can change it later, and mix models per step if you ever want to.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 22 }}>
                <button type="button" onClick={() => setAiSource('openrouter')} style={cardStyle(aiSource === 'openrouter')}>
                  <div style={labelStyle}>Cloud key</div>
                  <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 22, color: color.inkStrong, margin: '8px 0 6px' }}>OpenRouter</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: color.muted }}>Paste an API key. Reach frontier models. Notes are sent only when composing.</div>
                </button>
                <button type="button" onClick={() => setAiSource('ollama')} style={cardStyle(aiSource === 'ollama')}>
                  <div style={labelStyle}>Fully local</div>
                  <div style={{ fontFamily: font.display, fontWeight: 600, fontSize: 22, color: color.inkStrong, margin: '8px 0 6px' }}>Ollama</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: color.muted }}>Runs on your machine. Nothing leaves the device. Slower, fully private.</div>
                </button>
              </div>
              {aiSource === 'openrouter' && (
                <div style={{ marginTop: 16 }}>
                  <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-or-…  paste your OpenRouter key"
                    style={{
                      width: '100%', background: color.card, border: `1px solid ${color.borderStrong}`, borderRadius: 5,
                      padding: '13px 15px', fontFamily: font.mono, fontSize: 14, color: color.ink,
                    }}
                  />
                  <div style={{ fontSize: 13, color: color.faint, marginTop: 8, fontStyle: 'italic' }}>
                    Stored locally in your system keychain. Never synced.
                  </div>
                </div>
              )}
              {aiSource === 'ollama' && (
                <div style={{ marginTop: 16, border: '1px solid #C9D8C9', background: '#EEF4EE', borderRadius: 6, padding: '14px 16px', fontSize: 14, color: '#3E6B4C' }}>
                  Detected Ollama running locally · llama3.1 and nomic-embed-text available.
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, color: color.inkStrong, letterSpacing: '-.01em' }}>
                Your rhythm.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: color.muted, marginTop: 10 }}>
                How often an edition arrives, and how long it should take to read.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
                <div>
                  <div style={{ ...labelStyle, letterSpacing: '.16em', marginBottom: 10 }}>How often</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, color: color.muted }}>Every</span>
                    <button type="button" aria-label="fewer days"
                      onClick={() => setCadenceDays((d) => Math.max(1, d - 1))}
                      style={{ ...segStyle(false), width: 40, fontSize: 20, padding: '8px 0' }}>−</button>
                    <input aria-label="days between editions" type="number" min={1} max={90} value={cadenceDays}
                      onChange={(e) => setCadenceDays(Math.max(1, Math.min(90, Math.round(+e.target.value) || 1)))}
                      style={{ width: 64, textAlign: 'center', background: color.card,
                        border: `1px solid ${color.borderStrong}`, borderRadius: 5, padding: '9px 8px',
                        fontSize: 16, color: color.inkStrong, fontFamily: "'Source Code Pro', monospace" }} />
                    <button type="button" aria-label="more days"
                      onClick={() => setCadenceDays((d) => Math.min(90, d + 1))}
                      style={{ ...segStyle(false), width: 40, fontSize: 20, padding: '8px 0' }}>+</button>
                    <span style={{ fontSize: 15, color: color.muted }}>{cadenceDays === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ ...labelStyle, letterSpacing: '.16em' }}>Reading length</span>
                    <span style={{ fontFamily: font.display, fontSize: 18, color: color.inkStrong }}>{readingMin} min</span>
                  </div>
                  <input
                    className="ap-range"
                    type="range"
                    min={3}
                    max={15}
                    step={1}
                    value={readingMin}
                    onChange={(e) => setReadingMin(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 13, color: color.faint, marginTop: 6, fontStyle: 'italic' }}>{lengthLabel(readingMin)}</div>
                </div>
                <div>
                  <div style={{ ...labelStyle, letterSpacing: '.16em', marginBottom: 10 }}>Notes woven per edition</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {NOTES_OPTIONS.map((n) => (
                      <button key={n} type="button" onClick={() => setNotesPerIssue(n)} style={segStyle(notesPerIssue === n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ ...labelStyle, letterSpacing: '.16em', marginBottom: 10 }}>Delivered at</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {TIME_OPTIONS.map((t) => (
                      <button key={t} type="button" onClick={() => setDeliveryTime(to24h(t))} style={segStyle(to12h(deliveryTime) === t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 30, color: color.inkStrong, letterSpacing: '-.01em' }}>
                A few lines about you.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: color.muted, marginTop: 10 }}>
                Optional. What you're working on or curious about, so the takeaways land closer to home. Stays on your machine, like everything else.
              </p>
              <textarea
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                placeholder="e.g. Designing software, learning Italian, thinking a lot about attention and craft lately…"
                style={{
                  marginTop: 22, width: '100%', height: 150, background: color.card, border: `1px solid ${color.borderStrong}`,
                  borderRadius: 6, padding: 16, fontSize: 16, lineHeight: 1.6, color: color.ink, resize: 'none',
                }}
              />
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: 'center', paddingTop: 14 }}>
              <div style={{ fontFamily: font.display, fontStyle: 'italic', fontSize: 18, color: color.gold }}>All set</div>
              <h2 style={{ fontFamily: font.display, fontWeight: 500, fontSize: 'clamp(32px,4.5vw,46px)', lineHeight: 1.08, color: color.inkStrong, marginTop: 8, letterSpacing: '-.01em' }}>
                Your first edition arrives<br />tomorrow at {to12h(deliveryTime)}.
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: color.muted, maxWidth: 440, margin: '18px auto 0' }}>
                Composed from {folders.reduce((s, f) => s + f.count, 0)} notes in your {folders.length === 1 ? 'folder' : 'folders'}, {aiSummary}. Until then, here's a sample on the house.
              </p>
              <button
                type="button"
                onClick={onDone}
                style={{
                  marginTop: 30, background: color.dark, color: color.paper, border: `1px solid ${color.dark}`,
                  borderRadius: 6, padding: '14px 30px', fontSize: 16, cursor: 'pointer',
                }}
              >
                Read a sample edition
              </button>
            </div>
          )}
        </div>

        {showNav && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36, paddingTop: 24, borderTop: `1px solid ${color.border}` }}>
            <button type="button" onClick={back} style={{ background: 'transparent', border: 'none', fontSize: 15, color: color.faint, cursor: 'pointer', padding: '8px 0' }}>
              {step === 0 ? '← Home' : 'Back'}
            </button>
            <div style={{ display: 'flex', gap: 7 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  style={{
                    height: 6, borderRadius: 3, display: 'inline-block',
                    width: i === step ? 22 : 6,
                    background: i === step ? color.accent : i < step ? color.gold : color.border,
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              style={{
                background: color.dark, color: color.paper, border: `1px solid ${color.dark}`, borderRadius: 5,
                padding: '11px 24px', fontSize: 15, cursor: 'pointer',
              }}
            >
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
