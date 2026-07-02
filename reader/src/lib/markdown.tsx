import Markdown from 'react-markdown'
import { color, font } from '../theme/tokens'

export function LeadMarkdown({ source }: { source: string }) {
  let firstPara = true
  return (
    <Markdown
      components={{
        p({ children }) {
          const dropCap = firstPara
          firstPara = false
          return (
            <p style={{ fontSize: 19, lineHeight: 1.74, color: color.inkBody, marginTop: 24 }}>
              {dropCap ? <DropCap>{children}</DropCap> : children}
            </p>
          )
        },
        h2({ children }) {
          return <h2 style={{ fontFamily: font.display, fontWeight: 600, fontSize: 26,
            letterSpacing: '-.01em', color: color.inkStrong, margin: '10px 0 2px' }}>{children}</h2>
        },
        blockquote({ children }) {
          return <blockquote style={{ fontFamily: font.display, fontStyle: 'italic', fontWeight: 500,
            fontSize: 28, lineHeight: 1.34, color: color.accent, padding: '8px 0 8px 26px',
            borderLeft: `2px solid ${color.gold}`, margin: '8px 0' }}>{children}</blockquote>
        },
        ul({ children }) { return <ul style={{ listStyle: 'none', paddingLeft: 2 }}>{children}</ul> },
        li({ children }) {
          return <li style={{ display: 'flex', gap: 14, fontSize: 18, lineHeight: 1.55,
            color: color.inkBody, marginBottom: 11 }}>
            <span style={{ color: color.accent, fontWeight: 700 }}>—</span><span>{children}</span></li>
        },
      }}
    >{source}</Markdown>
  )
}

function DropCap({ children }: { children: React.ReactNode }) {
  // wrap: render first character large. react-markdown gives children as nodes;
  // for the fixture the first child is a string, so split it.
  if (Array.isArray(children) && typeof children[0] === 'string') {
    const [head, ...rest] = children
    return <>
      <span style={{ float: 'left', fontFamily: font.display, fontWeight: 600, fontSize: 88,
        lineHeight: .72, padding: '9px 14px 0 0', color: color.accent }}>{head[0]}</span>
      {head.slice(1)}{rest}
    </>
  }
  return <>{children}</>
}
