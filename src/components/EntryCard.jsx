import { useState } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { Badge, CopyButton, Val } from './ui.jsx';
import { STATUSES } from '../constants.js';
import { entryToTSV, splitSummary, tagList } from '../utils/data.js';

export default function EntryCard({ entry: e, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const points = splitSummary(e.summary);
  const long = e.summary.length > 320 || points.length > 3;

  return (
    <article className="entry card">
      <div className="entry-top">
        <div className="entry-kinds">
          <span className="kind">{e.category}</span>
          <span className="kind kind-quiet">{e.sourceType || 'Source type: needs verification'}</span>
        </div>
        <div className="entry-badges">
          <Badge kind="signal" label="Signal" value={e.signalStrength} />
          <Badge kind="confidence" label="Confidence" value={e.confidence} />
          <Badge kind="priority" value={e.priority} />
        </div>
      </div>

      <h3 className="entry-title">
        {e.url ? (
          <a href={e.url} target="_blank" rel="noopener noreferrer">
            {e.title || 'Untitled entry'}
          </a>
        ) : (
          e.title || 'Untitled entry'
        )}
      </h3>

      <div className="entry-meta">
        <span><Val v={e.source} /></span>
        <span><Val v={e.organization} /></span>
        <span>Published <Val v={e.publishedDate} /></span>
        {e.dateAdded && <span className="muted">Added {e.dateAdded}</span>}
      </div>

      {e.summary && (
        <div className={`entry-summary ${open || !long ? '' : 'clamped'}`}>
          {points.length > 1 ? (
            <ul>{points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          ) : (
            <p>{e.summary}</p>
          )}
        </div>
      )}
      {long && (
        <button type="button" className="link-btn" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Show full summary'}
        </button>
      )}

      <div className="entry-grid">
        <div>
          <h4>Why it matters</h4>
          <p><Val v={e.whyItMatters} /></p>
        </div>
        <div>
          <h4>Key signal</h4>
          <p><Val v={e.keySignal} /></p>
        </div>
        {e.recommendedAction && (
          <div>
            <h4>Recommended action</h4>
            <p>{e.recommendedAction}</p>
          </div>
        )}
        {e.notes && (
          <div>
            <h4>Notes</h4>
            <p>{e.notes}</p>
          </div>
        )}
      </div>

      {tagList(e).length > 0 && (
        <div className="chips">
          {tagList(e).map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
      )}

      <div className="entry-foot">
        <div className="entry-foot-left">
          <Badge kind="verification" value={e.verificationStatus} />
          <label className="field field-inline compact">
            <span>Status</span>
            <select value={e.status} onChange={(ev) => onUpdate(e.id, { status: ev.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="entry-foot-right">
          {e.url && (
            <a className="btn btn-ghost" href={e.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} /> Open source
            </a>
          )}
          <CopyButton className="btn-ghost" label="Copy row" getText={() => entryToTSV(e)} />
          <button
            type="button"
            className="btn btn-ghost btn-danger"
            title="Remove from dashboard (does not change your Google Sheet)"
            onClick={() => { if (window.confirm('Remove this entry from the dashboard? Your Google Sheet is not changed.')) onDelete(e.id); }}
          >
            <Trash2 size={15} /> Remove
          </button>
        </div>
      </div>
    </article>
  );
}
