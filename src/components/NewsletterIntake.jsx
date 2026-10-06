import { useMemo, useRef, useState } from 'react';
import { Inbox, Upload, Sparkles, Loader2, Download, Plus, Check } from 'lucide-react';
import { Section, Notice, Badge, CopyButton, Val } from './ui.jsx';
import { COLUMNS, PRIORITIES, NEEDS } from '../constants.js';
import {
  htmlToText, parseEml, todayISO, entryToTSV, headerTSV, entriesToCsv, downloadText,
} from '../utils/data.js';

const BLANK = { text: '', sourceUrl: '', sourceName: '', author: '', publishedDate: '' };

export default function NewsletterIntake({ status, onAddToFeed }) {
  const [form, setForm] = useState(BLANK);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [priority, setPriority] = useState('Needs Review');
  const [added, setAdded] = useState(false);
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const raw = await file.text();
      const name = file.name.toLowerCase();
      let text = raw;
      const patch = {};
      if (/\.html?$/.test(name)) {
        text = htmlToText(raw);
      } else if (name.endsWith('.eml')) {
        const eml = parseEml(raw);
        text = (eml.subject ? `Subject: ${eml.subject}\n\n` : '') + eml.text;
        if (eml.from) patch.author = eml.from;
        if (eml.date) patch.publishedDate = eml.date;
      }
      if (!text.trim()) throw new Error('No readable text was found in that file.');
      setFileName(file.name);
      setForm((f) => ({
        ...f,
        text,
        author: f.author || patch.author || '',
        publishedDate: f.publishedDate || patch.publishedDate || '',
      }));
    } catch (err) {
      setError({ tone: 'error', text: err.message || 'Could not read that file.' });
    }
  }

  async function summarize() {
    setError(null);
    setResult(null);
    setAdded(false);
    if (form.text.trim().length < 80) {
      setError({ tone: 'error', text: 'Paste or upload more text first (at least a few sentences).' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!(res.headers.get('content-type') || '').includes('application/json')) {
        throw new Error('The summarization backend is not running here. It works after you deploy to Vercel (or run "vercel dev" locally). See the README.');
      }
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Summarization failed.');
        err.code = data.error;
        throw err;
      }
      setPriority('Needs Review');
      setResult(data);
    } catch (err) {
      setError({ tone: err.code === 'not_configured' ? 'warn' : 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const entry = useMemo(
    () =>
      result
        ? { ...result.entry, dateAdded: todayISO(), priority, status: 'New', notes: '' }
        : null,
    [result, priority]
  );

  function reset() {
    setForm(BLANK);
    setFileName('');
    setResult(null);
    setError(null);
    setAdded(false);
  }

  return (
    <Section
      id="intake"
      icon={Inbox}
      title="Newsletter intake"
      subtitle="Paste or upload a newsletter. The AI summarizes only what the text says and marks anything unclear as needing verification."
    >
      {status.loaded && status.backend && !status.ai && (
        <Notice tone="warn">
          AI summarization is not configured yet. Add your API key in environment variables to enable this feature.
        </Notice>
      )}
      {status.loaded && !status.backend && (
        <Notice tone="info">
          You are running without the backend, so AI summarization is off. Deploy to Vercel (or use "vercel dev") to enable it.
        </Notice>
      )}

      <div className="intake">
        <div className="card intake-form">
          <label className="field">
            <span>Newsletter text</span>
            <textarea
              rows={12}
              placeholder="Paste the newsletter here, or upload a file below."
              value={form.text}
              onChange={set('text')}
            />
          </label>
          <div className="upload-row">
            <input ref={fileRef} type="file" accept=".txt,.md,.html,.htm,.eml" hidden onChange={onFile} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Upload .txt, .md, .html or .eml
            </button>
            {fileName && <span className="muted">Loaded {fileName}</span>}
          </div>

          <div className="two-col">
            <label className="field">
              <span>Source name (optional)</span>
              <input type="text" placeholder="Newsletter or publication name" value={form.sourceName} onChange={set('sourceName')} />
            </label>
            <label className="field">
              <span>Author (optional)</span>
              <input type="text" value={form.author} onChange={set('author')} />
            </label>
            <label className="field">
              <span>Source URL (optional)</span>
              <input type="url" placeholder="https://" value={form.sourceUrl} onChange={set('sourceUrl')} />
            </label>
            <label className="field">
              <span>Published date (optional)</span>
              <input type="date" value={form.publishedDate} onChange={set('publishedDate')} />
            </label>
          </div>

          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={summarize}>
              {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
              {busy ? 'Summarizing...' : 'Summarize newsletter'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset}>Clear form</button>
          </div>
          {error && <Notice tone={error.tone}>{error.text}</Notice>}
        </div>

        <div className="intake-result">
          {!entry ? (
            <div className="card result-empty">
              <h3>Structured summary appears here</h3>
              <p className="muted">
                You will get a title, source, category, a short summary, why it matters to Torrent, the key signal, ratings, tags, a recommended action, and a row you can paste straight into your Google Sheet.
              </p>
            </div>
          ) : (
            <div className="card result">
              {result.truncated && (
                <Notice tone="warn">The newsletter was very long, so only the first 60,000 characters were summarized.</Notice>
              )}
              <div className="entry-top">
                <span className="kind">{entry.category}</span>
                <div className="entry-badges">
                  <Badge kind="signal" label="Signal" value={entry.signalStrength} />
                  <Badge kind="confidence" label="Confidence" value={entry.confidence} />
                </div>
              </div>
              <h3 className="entry-title">{entry.title}</h3>

              <dl className="facts">
                <div><dt>Source / author</dt><dd><Val v={entry.source} /></dd></div>
                <div><dt>Published</dt><dd><Val v={entry.publishedDate === NEEDS ? '' : entry.publishedDate} /></dd></div>
                <div><dt>Source type</dt><dd><Val v={entry.sourceType} /></dd></div>
                <div><dt>Organization</dt><dd><Val v={entry.organization === NEEDS ? '' : entry.organization} /></dd></div>
              </dl>

              <h4>Summary</h4>
              <ul className="bullets">{result.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>

              <div className="entry-grid">
                <div><h4>Why it matters to Torrent</h4><p>{entry.whyItMatters}</p></div>
                <div><h4>Key signal</h4><p>{entry.keySignal}</p></div>
                <div><h4>Recommended action</h4><p>{entry.recommendedAction}</p></div>
                <div>
                  <h4>Verification</h4>
                  <p><Badge kind="verification" value={entry.verificationStatus} /></p>
                </div>
              </div>

              {entry.tags && (
                <div className="chips">
                  {entry.tags.split(', ').map((t) => <span key={t} className="chip">{t}</span>)}
                </div>
              )}

              <label className="field field-inline">
                <span>Priority for this entry</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>

              <details className="row-preview">
                <summary>Suggested database row</summary>
                <table>
                  <tbody>
                    {COLUMNS.map((c) => (
                      <tr key={c.key}>
                        <th>{c.label}</th>
                        <td>{entry[c.key] || <span className="muted">(blank)</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>

              <div className="actions">
                <CopyButton className="btn-primary" label="Copy Row for Google Sheet" getText={() => entryToTSV(entry)} />
                <CopyButton label="Copy header row" getText={headerTSV} />
                <button
                  type="button"
                  className="btn"
                  onClick={() => downloadText(`newsletter-summary-${todayISO()}.csv`, entriesToCsv([entry]))}
                >
                  <Download size={15} /> Export Newsletter Summary as CSV
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={added}
                  onClick={() => { onAddToFeed(entry); setAdded(true); }}
                >
                  {added ? <Check size={15} /> : <Plus size={15} />} {added ? 'Added to feed' : 'Add to Intelligence Feed'}
                </button>
              </div>
              <p className="hint">
                Tip: click a cell in an empty row of your Google Sheet (column A), then paste. The row fills across all 19 columns. Use "Copy header row" once if your sheet has no headers yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
