import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  COLUMNS, CATEGORIES, SOURCE_TYPES, PRIORITIES, LEVELS, STATUSES, THEMES,
  DIRECTION_TAGS, POSITIVE_WORDS, WATCH_WORDS, DEFAULT_WATCHLIST_NAMES,
} from '../constants.js';

/* ---------- small helpers ---------- */

export const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

export function matchEnum(value, list) {
  const v = norm(value);
  if (!v) return '';
  return list.find((x) => norm(x) === v) || '';
}

const cleanCell = (v) => {
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return String(v ?? '').trim();
};

/* ---------- column mapping (headers can be in any order / casing) ---------- */

const HEADER_MAP = {};
COLUMNS.forEach((c) => {
  HEADER_MAP[norm(c.label)] = c.key;
  HEADER_MAP[norm(c.key)] = c.key;
});
Object.assign(HEADER_MAP, {
  author: 'source',
  sourceauthor: 'source',
  link: 'url',
  sourceurl: 'url',
  whymatters: 'whyItMatters',
  signal: 'signalStrength',
  verification: 'verificationStatus',
  action: 'recommendedAction',
});

export function normalizeRow(raw, origin = 'import') {
  const e = {};
  COLUMNS.forEach((c) => { e[c.key] = ''; });
  Object.entries(raw || {}).forEach(([header, value]) => {
    const key = HEADER_MAP[norm(header)];
    if (key) e[key] = cleanCell(value);
  });
  if (!e.title && !e.summary && !e.keySignal) return null; // blank row

  e.category = matchEnum(e.category, CATEGORIES) || 'Other';
  e.sourceType = matchEnum(e.sourceType, SOURCE_TYPES) || e.sourceType;
  e.signalStrength = matchEnum(e.signalStrength, LEVELS);
  e.confidence = matchEnum(e.confidence, LEVELS);
  e.priority = matchEnum(e.priority, PRIORITIES) || 'Needs Review';
  e.status = matchEnum(e.status, STATUSES) || 'New';

  const v = norm(e.verificationStatus);
  if (v.startsWith('verified')) e.verificationStatus = 'Verified from source';
  else if (v.startsWith('missing')) e.verificationStatus = 'Missing source';
  else if (v.startsWith('needs')) e.verificationStatus = 'Needs verification';
  else e.verificationStatus = e.url ? 'Needs verification' : 'Missing source';

  return { ...e, id: makeId(), origin };
}

export function entriesFromRows(rows, origin = 'import') {
  if (!rows || !rows.length) throw new Error('The file has no rows.');
  const recognized = Object.keys(rows[0]).filter((h) => HEADER_MAP[norm(h)]);
  if (!recognized.length) {
    throw new Error(
      `None of the column headers were recognised. The first row must contain headers such as: ${COLUMNS.slice(0, 7).map((c) => c.label).join(', ')}...`
    );
  }
  const entries = rows.map((r) => normalizeRow(r, origin)).filter(Boolean);
  if (!entries.length) throw new Error('No usable rows found. Each row needs at least a Title or a Summary.');
  return entries;
}

/* ---------- file parsing ---------- */

export function parseCsvText(text) {
  const res = Papa.parse(String(text).replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy' });
  return res.data;
}

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('The workbook has no sheets.');
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
}

export async function parseFileToRows(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsvText(await file.text());
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseWorkbook(await file.arrayBuffer());
  throw new Error('Unsupported file type. Please upload a .xlsx or .csv file.');
}

export function parseBufferToRows(buffer) {
  const u8 = new Uint8Array(buffer);
  const isZip = u8[0] === 0x50 && u8[1] === 0x4b; // .xlsx
  const isOle = u8[0] === 0xd0 && u8[1] === 0xcf; // .xls
  if (isZip || isOle) return parseWorkbook(buffer);
  return parseCsvText(new TextDecoder('utf-8').decode(buffer));
}

// Accepts a published CSV link as-is. If a normal Google Sheet link is pasted,
// it is converted to the CSV export link (works only if the sheet is shared as "Anyone with the link").
export function toGoogleCsvUrl(input) {
  const url = input.trim();
  if (/output=csv|format=csv/i.test(url) || /\/spreadsheets\/d\/e\//.test(url)) return url;
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) {
    const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1] || '0';
    return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
  }
  return url;
}

/* ---------- ranking ---------- */

export const strengthRank = (s) => ({ High: 3, Medium: 2, Low: 1 }[s] || 0);
export const priorityRank = (p) => ({ Core: 4, Secondary: 3, Monitor: 2, 'Needs Review': 1 }[p] || 0);
export const dateValue = (e) => Date.parse(e.publishedDate) || Date.parse(e.dateAdded) || 0;

export function dailyBrief(entries, limit = 5) {
  return entries
    .filter((e) => e.status !== 'Archived')
    .sort(
      (a, b) =>
        priorityRank(b.priority) - priorityRank(a.priority) ||
        strengthRank(b.signalStrength) - strengthRank(a.signalStrength) ||
        dateValue(b) - dateValue(a)
    )
    .slice(0, limit);
}

export const tagList = (e) =>
  String(e.tags || '').split(/[,;|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);

export const splitSummary = (s) =>
  String(s || '').split(/\s•\s|\n+/).map((x) => x.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

/* ---------- AI Health Snapshot ---------- */

const hasWord = (tag, word) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(tag);

export function computeThemes(entries) {
  const live = entries.filter((e) => e.status !== 'Archived');
  return THEMES.map((theme) => {
    const matched = live
      .filter((e) => theme.categories.includes(e.category) || tagList(e).some((t) => theme.keywords.some((k) => hasWord(t, k))))
      .sort((a, b) => dateValue(b) - dateValue(a) || strengthRank(b.signalStrength) - strengthRank(a.signalStrength));
    const latest = matched[0];
    let direction = null;
    if (latest) {
      const tags = tagList(latest);
      direction = DIRECTION_TAGS.find((d) => tags.includes(d));
      if (!direction) {
        if (tags.some((t) => WATCH_WORDS.some((w) => hasWord(t, w)))) direction = 'watch';
        else if (tags.some((t) => POSITIVE_WORDS.some((w) => hasWord(t, w)))) direction = 'positive';
        else direction = 'neutral';
      }
      direction = direction.charAt(0).toUpperCase() + direction.slice(1);
    }
    return { name: theme.name, count: matched.length, latest, direction };
  });
}

/* ---------- Google Sheet row / CSV export ---------- */

const flat = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim();
const rowArray = (e) => COLUMNS.map((c) => e[c.key] ?? '');

export const entryToTSV = (e) => rowArray(e).map(flat).join('\t');
export const headerTSV = () => COLUMNS.map((c) => c.label).join('\t');

export function entriesToCsv(entries) {
  return Papa.unparse(
    { fields: COLUMNS.map((c) => c.label), data: entries.map(rowArray) },
    { escapeFormulae: true }
  );
}

export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the old method */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

/* ---------- browser storage ---------- */

export const KEYS = {
  entries: 'torrential.entries.v1',
  watchlist: 'torrential.watchlist.v1',
  settings: 'torrential.settings.v1',
  lastImport: 'torrential.lastImport.v1',
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ---------- newsletter file reading ---------- */

export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,noscript,head').forEach((n) => n.remove());
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6,blockquote').forEach((n) => n.append('\n'));
  return (doc.body?.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeBytes(u8, charset) {
  try { return new TextDecoder(charset || 'utf-8').decode(u8); }
  catch { return new TextDecoder('utf-8').decode(u8); }
}
function decodeQP(s, charset) {
  const cleaned = s.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(cleaned.substr(i + 1, 2))) {
      bytes.push(parseInt(cleaned.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(cleaned.charCodeAt(i) & 255);
    }
  }
  return decodeBytes(new Uint8Array(bytes), charset);
}
function decodeB64(s, charset) {
  try {
    const bin = atob(s.replace(/\s+/g, ''));
    return decodeBytes(Uint8Array.from(bin, (c) => c.charCodeAt(0)), charset);
  } catch { return s; }
}
function decodeWords(s) {
  return String(s || '').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, txt) =>
    enc.toLowerCase() === 'b' ? decodeB64(txt, cs) : decodeQP(txt.replace(/_/g, ' '), cs)
  );
}
function splitHeaders(raw) {
  const idx = raw.search(/\r?\n\r?\n/);
  const head = idx === -1 ? raw : raw.slice(0, idx);
  const body = idx === -1 ? '' : raw.slice(idx).replace(/^\r?\n\r?\n/, '');
  const headers = {};
  head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) headers[m[1].toLowerCase()] = m[2];
  });
  return { headers, body };
}
function readPart(raw) {
  const { headers, body } = splitHeaders(raw);
  const ct = headers['content-type'] || 'text/plain';
  const cte = (headers['content-transfer-encoding'] || '').toLowerCase();
  const charset = (ct.match(/charset="?([^";\s]+)/i) || [])[1];
  const boundary = (ct.match(/boundary="?([^";]+)"?/i) || [])[1];
  if (/multipart/i.test(ct) && boundary) {
    let plain = '';
    let html = '';
    body.split('--' + boundary).slice(1).forEach((p) => {
      if (p.startsWith('--')) return;
      const r = readPart(p.replace(/^\r?\n/, ''));
      if (r.type === 'plain' && !plain) plain = r.text;
      if (r.type === 'html' && !html) html = r.text;
    });
    return plain ? { type: 'plain', text: plain } : { type: 'html', text: html };
  }
  let text = body;
  if (cte === 'quoted-printable') text = decodeQP(body, charset);
  else if (cte === 'base64') text = decodeB64(body, charset);
  if (/text\/html/i.test(ct)) return { type: 'html', text };
  if (/text\/plain/i.test(ct)) return { type: 'plain', text };
  return { type: 'other', text: '' };
}

export function parseEml(raw) {
  const { headers } = splitHeaders(raw);
  const part = readPart(raw);
  const text = part.type === 'html' ? htmlToText(part.text) : part.text.trim();
  let date = '';
  const d = new Date(headers.date || '');
  if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
  return {
    text,
    subject: decodeWords(headers.subject),
    from: decodeWords(headers.from),
    date,
  };
}

/* ---------- watchlist ---------- */

export const defaultWatchlist = () =>
  DEFAULT_WATCHLIST_NAMES.map((name) => ({
    id: makeId(), name, organization: '', focusArea: '', platform: '', priority: '', notes: '',
  }));

const WATCH_HEADERS = {
  name: 'name', source: 'name', person: 'name',
  organization: 'organization', org: 'organization', firm: 'organization',
  focusarea: 'focusArea', focus: 'focusArea',
  platform: 'platform',
  priority: 'priority',
  notes: 'notes',
};

export function watchRowsToSources(rows) {
  if (!rows?.length) throw new Error('The file has no rows.');
  if (!Object.keys(rows[0]).some((h) => WATCH_HEADERS[norm(h)] === 'name')) {
    throw new Error('The file needs a "Name" column. Other columns: Organization, Focus Area, Platform, Priority, Notes.');
  }
  return rows
    .map((r) => {
      const s = { id: makeId(), name: '', organization: '', focusArea: '', platform: '', priority: '', notes: '' };
      Object.entries(r).forEach(([h, v]) => {
        const key = WATCH_HEADERS[norm(h)];
        if (key) s[key] = cleanCell(v);
      });
      s.priority = matchEnum(s.priority, PRIORITIES);
      return s;
    })
    .filter((s) => s.name);
}
