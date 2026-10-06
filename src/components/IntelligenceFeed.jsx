import { useMemo, useState } from 'react';
import { Radar, Search, Download, Inbox } from 'lucide-react';
import { Section, Empty, Select } from './ui.jsx';
import EntryCard from './EntryCard.jsx';
import { CATEGORIES, PRIORITIES, LEVELS, VERIFICATION, STATUSES } from '../constants.js';
import { dateValue, strengthRank, priorityRank, entriesToCsv, downloadText, todayISO } from '../utils/data.js';

const PAGE = 20;
const START = { q: '', category: 'all', sourceType: 'all', priority: 'all', strength: 'all', verification: 'all', status: 'all', sort: 'newest' };

export default function IntelligenceFeed({ entries, onUpdate, onDelete }) {
  const [f, setF] = useState(START);
  const [limit, setLimit] = useState(PAGE);
  const set = (k) => (v) => { setF((p) => ({ ...p, [k]: v })); setLimit(PAGE); };

  const sourceTypes = useMemo(
    () => [...new Set(entries.map((e) => e.sourceType).filter(Boolean))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const list = entries.filter((e) => {
      if (f.status === 'all' ? e.status === 'Archived' : e.status !== f.status) return false;
      if (f.category !== 'all' && e.category !== f.category) return false;
      if (f.sourceType !== 'all' && e.sourceType !== f.sourceType) return false;
      if (f.priority !== 'all' && e.priority !== f.priority) return false;
      if (f.strength !== 'all' && (f.strength === 'none' ? e.signalStrength : e.signalStrength !== f.strength)) return false;
      if (f.verification !== 'all' && e.verificationStatus !== f.verification) return false;
      if (q) {
        const hay = [e.title, e.source, e.organization, e.summary, e.whyItMatters, e.keySignal, e.tags, e.notes, e.category, e.sourceType]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorters = {
      newest: (a, b) => dateValue(b) - dateValue(a),
      strength: (a, b) => strengthRank(b.signalStrength) - strengthRank(a.signalStrength) || dateValue(b) - dateValue(a),
      priority: (a, b) => priorityRank(b.priority) - priorityRank(a.priority) || dateValue(b) - dateValue(a),
    };
    return list.sort(sorters[f.sort]);
  }, [entries, f]);

  const filtersActive = JSON.stringify({ ...f, sort: '' }) !== JSON.stringify({ ...START, sort: '' });

  return (
    <Section
      id="feed"
      icon={Radar}
      title="Intelligence feed"
      subtitle={`${filtered.length} of ${entries.length} entries shown. Archived entries are hidden unless you filter by that status.`}
      actions={
        <button
          type="button"
          className="btn"
          disabled={!filtered.length}
          onClick={() => downloadText(`torrential-news-${todayISO()}.csv`, entriesToCsv(filtered))}
        >
          <Download size={15} /> Export shown entries (CSV)
        </button>
      }
    >
      {entries.length === 0 ? (
        <Empty icon={Inbox} title="No entries yet">
          Connect a Google Sheet, upload an Excel/CSV file, or summarize a newsletter to start building the feed.
        </Empty>
      ) : (
        <>
          <div className="filters card">
            <label className="search">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search titles, sources, summaries, tags..."
                value={f.q}
                onChange={(e) => set('q')(e.target.value)}
              />
            </label>
            <div className="filter-row">
              <Select label="Category" value={f.category} onChange={set('category')} options={CATEGORIES} />
              <Select label="Source type" value={f.sourceType} onChange={set('sourceType')} options={sourceTypes} />
              <Select label="Priority" value={f.priority} onChange={set('priority')} options={PRIORITIES} />
              <Select
                label="Signal"
                value={f.strength}
                onChange={set('strength')}
                options={[...LEVELS, { value: 'none', label: 'Unrated' }]}
              />
              <Select label="Verification" value={f.verification} onChange={set('verification')} options={VERIFICATION} />
              <Select label="Status" value={f.status} onChange={set('status')} options={STATUSES} allLabel="Active (not archived)" />
              <label className="field field-inline">
                <span>Sort by</span>
                <select value={f.sort} onChange={(e) => set('sort')(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="strength">Signal strength</option>
                  <option value="priority">Priority</option>
                </select>
              </label>
              {filtersActive && (
                <button type="button" className="link-btn" onClick={() => { setF(START); setLimit(PAGE); }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty icon={Search} title="No entries match these filters">
              Try clearing a filter or searching for fewer words.
            </Empty>
          ) : (
            <div className="feed">
              {filtered.slice(0, limit).map((e) => (
                <EntryCard key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
              {filtered.length > limit && (
                <button type="button" className="btn btn-wide" onClick={() => setLimit(limit + PAGE)}>
                  Show {Math.min(PAGE, filtered.length - limit)} more
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
