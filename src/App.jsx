import { useEffect, useState } from 'react';
import { Database, Newspaper, Radar, Inbox, Activity, Users } from 'lucide-react';
import DataSources from './components/DataSources.jsx';
import DailyBrief from './components/DailyBrief.jsx';
import IntelligenceFeed from './components/IntelligenceFeed.jsx';
import NewsletterIntake from './components/NewsletterIntake.jsx';
import HealthSnapshot from './components/HealthSnapshot.jsx';
import Watchlist from './components/Watchlist.jsx';
import { Notice } from './components/ui.jsx';
import { KEYS, loadJSON, saveJSON, makeId, defaultWatchlist } from './utils/data.js';

const NAV = [
  { id: 'data', label: 'Data sources', icon: Database },
  { id: 'daily-brief', label: 'Daily brief', icon: Newspaper },
  { id: 'feed', label: 'Intelligence feed', icon: Radar },
  { id: 'intake', label: 'Newsletter intake', icon: Inbox },
  { id: 'health', label: 'AI health snapshot', icon: Activity },
  { id: 'watchlist', label: 'Source watchlist', icon: Users },
];

export default function App() {
  const [entries, setEntries] = useState(() => loadJSON(KEYS.entries, []));
  const [watchlist, setWatchlist] = useState(() => loadJSON(KEYS.watchlist, null) || defaultWatchlist());
  const [settings, setSettings] = useState(() => loadJSON(KEYS.settings, { sheetUrl: '', oneDriveUrl: '' }));
  const [lastImport, setLastImport] = useState(() => loadJSON(KEYS.lastImport, null));
  const [status, setStatus] = useState({ loaded: false, backend: false, ai: false, oneDriveEnterprise: false });
  const [storageFailed, setStorageFailed] = useState(false);

  // Ask the backend which features are configured (never returns secrets).
  useEffect(() => {
    fetch('/api/status')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setStatus({ loaded: true, backend: true, ai: !!j.ai, oneDriveEnterprise: !!j.oneDriveEnterprise }))
      .catch(() => setStatus({ loaded: true, backend: false, ai: false, oneDriveEnterprise: false }));
  }, []);

  // Save to the browser whenever data changes.
  useEffect(() => { if (!saveJSON(KEYS.entries, entries)) setStorageFailed(true); }, [entries]);
  useEffect(() => { saveJSON(KEYS.watchlist, watchlist); }, [watchlist]);
  useEffect(() => { saveJSON(KEYS.settings, settings); }, [settings]);
  useEffect(() => { saveJSON(KEYS.lastImport, lastImport); }, [lastImport]);

  const handleImport = (incoming, label, merge) => {
    setEntries((prev) =>
      merge ? [...prev, ...incoming] : [...prev.filter((e) => e.origin === 'newsletter'), ...incoming]
    );
    setLastImport({ label, count: incoming.length, at: new Date().toISOString() });
  };
  const addEntry = (entry) => setEntries((prev) => [{ ...entry, id: makeId(), origin: 'newsletter' }, ...prev]);
  const updateEntry = (id, patch) => setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const deleteEntry = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const clearAll = () => { setEntries([]); setLastImport(null); };

  const high = entries.filter((e) => e.signalStrength === 'High' && e.status !== 'Archived').length;
  const needsCheck = entries.filter((e) => e.verificationStatus !== 'Verified from source' && e.status !== 'Archived').length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#12203a" />
            <path d="M16 5c4.5 5.6 7 9 7 12.4A7 7 0 0 1 9 17.4C9 14 11.5 10.6 16 5z" fill="#22d3ee" />
            <path d="M13 18.5a3.2 3.2 0 0 0 3 3.3" stroke="#12203a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          <div>
            <div className="brand-name">Torrential News</div>
            <div className="brand-sub">Torrent Capital</div>
          </div>
        </div>
        <nav className="nav" aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}>
              <n.icon size={16} strokeWidth={1.75} /> {n.label}
            </a>
          ))}
        </nav>
        <p className="sidebar-note">
          Internal use only. Summaries use only the data and text you provide. Anything unclear is marked "Needs verification".
        </p>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Torrential News</h1>
            <p className="subtitle">AI &amp; Software Intelligence for Torrent Capital</p>
          </div>
          <div className="stats">
            <div className="stat"><b>{entries.length}</b><span>Entries</span></div>
            <div className="stat"><b>{high}</b><span>High signal</span></div>
            <div className="stat"><b>{needsCheck}</b><span>To verify</span></div>
          </div>
        </header>

        {storageFailed && (
          <Notice tone="warn">
            This browser could not save all your data (storage is full or blocked). Export your entries to CSV so nothing is lost.
          </Notice>
        )}

        <DataSources
          settings={settings}
          setSettings={setSettings}
          status={status}
          onImport={handleImport}
          onClear={clearAll}
          entryCount={entries.length}
          lastImport={lastImport}
        />
        <DailyBrief entries={entries} />
        <IntelligenceFeed entries={entries} onUpdate={updateEntry} onDelete={deleteEntry} />
        <NewsletterIntake status={status} onAddToFeed={addEntry} />
        <HealthSnapshot entries={entries} />
        <Watchlist watchlist={watchlist} setWatchlist={setWatchlist} entries={entries} />

        <footer className="footer">Torrential News. Private intelligence dashboard for Torrent Capital.</footer>
      </main>
    </div>
  );
}
