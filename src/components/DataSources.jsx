import { useRef, useState } from 'react';
import { Database, Link2, FileSpreadsheet, Cloud, Upload, Download, Loader2, Trash2 } from 'lucide-react';
import { Section, Notice } from './ui.jsx';
import {
  toGoogleCsvUrl, parseCsvText, parseFileToRows, parseBufferToRows, entriesFromRows,
} from '../utils/data.js';

const TABS = [
  { id: 'sheet', label: 'Google Sheet', icon: Link2 },
  { id: 'file', label: 'Excel / CSV upload', icon: FileSpreadsheet },
  { id: 'onedrive', label: 'OneDrive link', icon: Cloud },
];

export default function DataSources({ settings, setSettings, status, onImport, onClear, entryCount, lastImport }) {
  const [tab, setTab] = useState('sheet');
  const [merge, setMerge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const finish = (rows, label) => {
    const entries = entriesFromRows(rows);
    onImport(entries, label, merge);
    setMsg({ tone: 'success', text: `Imported ${entries.length} entries from ${label}.` });
  };

  const run = async (fn) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); }
    catch (err) { setMsg({ tone: 'error', text: err.message || 'Something went wrong.' }); }
    finally { setBusy(false); }
  };

  const importSheet = () => run(async () => {
    const raw = settings.sheetUrl.trim();
    if (!raw) throw new Error('Paste your published Google Sheet CSV link first.');
    let res;
    try { res = await fetch(toGoogleCsvUrl(raw)); }
    catch { throw new Error('Could not reach Google Sheets. Check the link and your internet connection.'); }
    if (!res.ok) throw new Error(`Google Sheets returned an error (${res.status}). Check that the sheet is published as CSV.`);
    const text = await res.text();
    if (/^\s*<(!doctype|html)/i.test(text)) {
      throw new Error('That link returned a web page instead of CSV data. In Google Sheets choose File, Share, Publish to web, pick your tab, select "Comma-separated values (.csv)", then copy that link.');
    }
    finish(parseCsvText(text), 'Google Sheet');
  });

  const importFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(async () => finish(await parseFileToRows(file), file.name));
  };

  const importOneDrive = () => run(async () => {
    const url = settings.oneDriveUrl.trim();
    if (!url) throw new Error('Paste your OneDrive or SharePoint share link first.');
    let res;
    try {
      res = await fetch('/api/onedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch {
      throw new Error('Could not reach the dashboard backend. Check your internet connection.');
    }
    const type = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (type.includes('application/json')) {
        const j = await res.json();
        throw new Error(j.message || `OneDrive import failed (${res.status}).`);
      }
      throw new Error('The backend is not running here. OneDrive import works after you deploy to Vercel (or run "vercel dev" locally).');
    }
    if (type.includes('text/html')) {
      throw new Error('The backend is not running here. OneDrive import works after you deploy to Vercel (or run "vercel dev" locally).');
    }
    finish(parseBufferToRows(await res.arrayBuffer()), 'OneDrive file');
  });

  const when = lastImport?.at ? new Date(lastImport.at).toLocaleString() : '';

  return (
    <Section
      id="data"
      icon={Database}
      title="Data sources"
      subtitle="Bring in your structured entries. Data is saved in this browser, so it stays after a refresh."
      actions={
        <a className="btn" href="/torrential-news-template.csv" download>
          <Download size={15} /> Download blank template
        </a>
      }
    >
      <div className="card sources">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); setMsg(null); }}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        <div className="tab-panel">
          {tab === 'sheet' && (
            <>
              <label className="field">
                <span>Published Google Sheet CSV link</span>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                  value={settings.sheetUrl}
                  onChange={(e) => setSettings({ ...settings, sheetUrl: e.target.value })}
                />
              </label>
              <p className="hint">
                In Google Sheets: File, Share, Publish to web. Choose your tab, pick "Comma-separated values (.csv)", click Publish, and paste the link here.
              </p>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={importSheet}>
                {busy ? <Loader2 size={15} className="spin" /> : <Link2 size={15} />} Import from Google Sheet
              </button>
            </>
          )}

          {tab === 'file' && (
            <>
              <p className="hint">Upload an Excel (.xlsx) or CSV (.csv) file. The first row must hold the column headers. For Excel, the first sheet is used.</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={importFile} />
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
                {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />} Choose Excel or CSV file
              </button>
            </>
          )}

          {tab === 'onedrive' && (
            <>
              {status.oneDriveEnterprise ? (
                <Notice tone="success">Company access is enabled. You can import files shared inside your organization.</Notice>
              ) : (
                <Notice tone="warn">
                  Company access is not set up yet. Links set to "Anyone with the link can view" work now. Restricted company files will work once an admin approves access (see the README, "OneDrive later").
                </Notice>
              )}
              <label className="field">
                <span>OneDrive or SharePoint share link</span>
                <input
                  type="url"
                  placeholder="https://1drv.ms/x/... or https://yourcompany.sharepoint.com/..."
                  value={settings.oneDriveUrl}
                  onChange={(e) => setSettings({ ...settings, oneDriveUrl: e.target.value })}
                />
              </label>
              <p className="hint">The file must be an .xlsx or .csv under 4 MB. The dashboard reads the first sheet. Your link is saved in this browser only.</p>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={importOneDrive}>
                {busy ? <Loader2 size={15} className="spin" /> : <Cloud size={15} />} Import from OneDrive link
              </button>
            </>
          )}

          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        </div>

        <div className="sources-foot">
          <label className="check">
            <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
            <span>Add to existing entries instead of replacing them</span>
          </label>
          <div className="sources-status">
            {lastImport ? (
              <span className="muted">Last import: {lastImport.label}, {lastImport.count} entries, {when}</span>
            ) : (
              <span className="muted">No data imported yet.</span>
            )}
            {entryCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                onClick={() => { if (window.confirm('Remove ALL entries from this browser? Your Google Sheet or files are not changed.')) onClear(); }}
              >
                <Trash2 size={15} /> Clear all entries
              </button>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
