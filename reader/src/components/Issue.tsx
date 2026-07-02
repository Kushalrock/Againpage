import type { IssueResponse } from '../types/issue'
import { cfg } from '../lib/readingLength'
import { color } from '../theme/tokens'
import { Masthead } from './sections/Masthead'
import { EditionHead } from './sections/EditionHead'
import { Lead } from './sections/Lead'
import { Connections } from './sections/Connections'
import { StandaloneSummaries } from './sections/StandaloneSummaries'
import { Questions } from './sections/Questions'
import { Apply } from './sections/Apply'
import { Wildcard } from './sections/Wildcard'
import { Forgotten } from './sections/Forgotten'
import { Colophon } from './sections/Colophon'

export function Issue({ issue, minutes }: { issue: IssueResponse; minutes: number }) {
  const c = cfg(minutes)
  const { content } = issue
  const dateLabel = new Date(issue.issue_date + 'T00:00:00').toLocaleDateString('en-GB',
    { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <article style={{ background: color.paper, padding: '56px clamp(28px,6vw,88px) 64px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Masthead issueNo={issue.issue_no} dateLabel={dateLabel} />
        <EditionHead dek={content.dek} title={content.title}
          standfirst={content.standfirst} sources={content.sources} />
        <Lead source={content.lead} />
        <Connections items={content.connections.slice(0, c.connections)} />
        {c.summaries && <StandaloneSummaries items={content.standalone_summaries} />}
        <Questions items={content.questions.slice(0, c.questions)} />
        {c.apply && <Apply items={content.apply.slice(0, c.applyN)} />}
        {c.wildcard && content.wildcard && <Wildcard wildcard={content.wildcard} />}
        {c.forgotten && content.forgotten && <Forgotten forgotten={content.forgotten} />}
        <Colophon issueNo={issue.issue_no} />
      </div>
    </article>
  )
}
