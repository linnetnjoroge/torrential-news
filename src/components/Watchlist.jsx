import { useMemo, useRef, useState } from 'react';
import { Users, Plus, Upload, X, RotateCcw } from 'lucide-react';
import { Section, Notice, Badge, Val } from './ui.jsx';
import { PRIORITIES } from '../constants.js';
import { defaultWatchlist, makeId, parseFileToRows, watchRowsToSources } from '../utils/data.js';

const BLANK = { name: '', organization: '', focusArea: '', platform: '', priority: '', notes: '' };

export default function Watchlist({ watchlist, setWatchlist, entries }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const counts = useMemo(() => {
    const out = {};
    watchlist.forEach((w) => {
      const n = w.name.toLowerCase();
      out[w.id] = entries.filter((e) => n && String(e.source).toLowerCase().includes(n)).length;
    });
    return out;
  }, [watchlist, entries]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function addSource(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setWatchlist([...watchlist, { ...form, name: form.name.trim(), id: makeId() }]);
    setForm(BLANK);
    setAdding(false);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const incoming = watchRowsToSources(await parseFileToRows(file));
      if (!incoming.length) throw new Error('No sources with a name were found.');
      const byName = new Map(watchlist.map((w) => [w.name.toLowerCase(), w]));
      incoming.forEach((s) => {
        const existing = byName.get(s.name.toLowerCase());
        if (existing) {
          Object.keys(s).forEach((k) => { if (k !== 'id' && s[k]) existing[k] = s[k]; });
        } else {
          byName.set(s.name.toLowerCase(), s);
        }
      });
      setWatchlist([...byName.values()]);
      setMsg({ tone: 'success', text: `Loaded ${incoming.length} sources from ${file.name}.` });
    } catch (err) {
      setMsg({ tone: 'error', text: err.message });
    }
  }

  return (
    <Section
      id="watchlist"
      icon={Users}
      title="Source watchlist"
      subtitle="People and firms to monitor. Details you have not provided are shown as needing verification."
      actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" hidden onChange={onFile} />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import watchlist (CSV / Excel)
          </button>
          <button type="button" className="btn" onClick={() => setAdding(!adding)}>
            <Plus size={15} /> Add source
          </button>
        </>
      }
    >
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {adding && (
        <form className="card watch-form" onSubmit={addSource}>
          <div className="two-col three">
            <label className="field"><span>Name</span><input required value={form.name} onChange={set('name')} /></label>
            <label className="field"><span>Organization</span><input value={form.organization} onChange={set('organization')} /></label>
            <label className="field"><span>Focus area</span><input value={form.focusArea} onChange={set('focusArea')} /></label>
            <label className="field"><span>Platform</span><input placeholder="X, LinkedIn, Podcast..." value={form.platform} onChange={set('platform')} /></label>
            <label className="field">
              <span>Priority</span>
              <select value={form.priority} onChange={set('priority')}>
                <option value="">Needs verification</option>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field"><span>Notes</span><input value={form.notes} onChange={set('notes')} /></label>
          </div>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Save source</button>
            <button className="btn btn-ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="watch-grid">
        {watchlist.map((w) => (
          <div key={w.id} className="card watch">
            <div className="watch-head">
              <h3>{w.name}</h3>
              <button
                type="button"
                className="icon-btn"
                title="Remove from watchlist"
                aria-label={`Remove ${w.name}`}
                onClick={() => setWatchlist(watchlist.filter((x) => x.id !== w.id))}
              >
                <X size={15} />
              </button>
            </div>
            <dl className="facts stack">
              <div><dt>Organization</dt><dd><Val v={w.organization} /></dd></div>
              <div><dt>Focus area</dt><dd><Val v={w.focusArea} /></dd></div>
              <div><dt>Platform</dt><dd><Val v={w.platform} /></dd></div>
              <div><dt>Notes</dt><dd><Val v={w.notes} /></dd></div>
            </dl>
            <div className="watch-foot">
              <Badge kind="priority" value={w.priority} />
              <span className="muted">{counts[w.id]} in feed</span>
            </div>
          </div>
        ))}
      </div>

      {watchlist.length === 0 && (
        <div className="empty">
          <h3>Your watchlist is empty</h3>
          <button type="button" className="btn" onClick={() => setWatchlist(defaultWatchlist())}>
            <RotateCcw size={15} /> Restore starter list
          </button>
        </div>
      )}
    </Section>
  );
}
