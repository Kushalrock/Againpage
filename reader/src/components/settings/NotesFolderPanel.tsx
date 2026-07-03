import { usePlatform } from '../../platform'
import { color, font } from '../../theme/tokens'

export function NotesFolderPanel({
  path,
  count,
  onChange,
}: {
  path: string
  count: number
  onChange: (patch: { vault_path: string }) => void
}) {
  const platform = usePlatform()

  async function changeFolder() {
    const result = await platform.folderPicker.pick()
    if (result) onChange({ vault_path: result.path })
  }

  return (
    <div style={{ padding: '28px 0', borderBottom: `1px solid ${color.border}` }}>
      <div style={{ fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: color.faint, fontWeight: 600 }}>
        Notes folder
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginTop: 12 }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 15, color: color.inkStrong }}>{path}</div>
          <div style={{ fontSize: 14, color: color.muted, marginTop: 6 }}>
            {count} markdown notes · scanned just now
          </div>
        </div>
        <button
          type="button"
          onClick={changeFolder}
          style={{
            background: 'transparent', border: `1px solid ${color.borderStrong}`, borderRadius: 5,
            padding: '10px 16px', fontSize: 14, color: color.muted, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Change folder
        </button>
      </div>
    </div>
  )
}
