import { useMemo } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { Section, Empty, Badge, Val } from './ui.jsx';
import { dailyBrief, splitSummary } from '../utils/data.js';

export default function DailyBrief({ entries }) {
  const top = useMemo(() => dailyBrief([...entries], 5), [entries]);
  const [lead, ...rest] = top;

  return (
    <Section
      id="daily-brief"
      icon={Newspaper}
      title="Daily brief"
      subtitle="Highest-priority items, ranked by priority, then signal strength, then recency."
    >
      {top.length === 0 ? (
        <Empty icon={Newspaper} title="Nothing to brief yet">
          Import a Google Sheet or Excel/CSV file above, or add a newsletter below. The top items will appear here.
        </Empty>
      ) : (
        <div className="brief">
          <BriefItem entry={lead} lead />
          <div className="brief-rest">
            {rest.map((e) => <BriefItem key={e.id} entry={e} />)}
          </div>
        </div>
      )}
    </Section>
  );
}

function BriefItem({ entry: e, lead = false }) {
  const points = splitSummary(e.summary);
  return (
    <article className={`brief-item card ${lead ? 'brief-lead' : ''}`}>
      <div className="entry-top">
        <span className="kind">{e.category}</span>
        <Badge kind="signal" label="Signal" value={e.signalStrength} />
      </div>
      <h3 className={lead ? 'brief-title-lead' : 'brief-title'}>{e.title || 'Untitled entry'}</h3>
      <div className="entry-meta">
        <span><Val v={e.source} /></span>
      </div>
      {e.summary && (
        <div className="entry-summary clamped">
          {points.length > 1 ? <ul>{points.slice(0, lead ? 4 : 2).map((p, i) => <li key={i}>{p}</li>)}</ul> : <p>{e.summary}</p>}
        </div>
      )}
      <div className="why">
        <h4>Why it matters</h4>
        <p><Val v={e.whyItMatters} /></p>
      </div>
      <div className="brief-foot">
        {e.url ? (
          <a className="link" href={e.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> Open source
          </a>
        ) : (
          <span className="needs">URL: {'Needs verification'}</span>
        )}
      </div>
    </article>
  );
}
