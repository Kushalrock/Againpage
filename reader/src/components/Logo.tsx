// Againpage masthead mark — high-contrast Didone "A" on the brand's oxblood tile.
// Pure vector (no web-font dependency) so it renders identically everywhere.
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Againpage"
      className={className} style={{ display: 'block' }}>
      <rect width="100" height="100" rx="18" fill="#7C2D2A" />
      <g fill="#F4EEDF">
        <polygon points="46,16 51,16 36,84 24,84" />
        <polygon points="49,16 55,16 80,84 57,84" />
        <rect x="40" y="58" width="14" height="6" />
        <rect x="22" y="80.5" width="18" height="3.5" />
        <rect x="54" y="80.5" width="28" height="3.5" />
      </g>
    </svg>
  )
}
