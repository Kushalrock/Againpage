import { LeadMarkdown } from '../../lib/markdown'

export function Lead({ source }: { source: string }) {
  return (
    <section style={{ maxWidth: 646, margin: '46px auto 0' }}>
      <LeadMarkdown source={source} />
    </section>
  )
}
