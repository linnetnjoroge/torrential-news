import { useState } from 'react';
import { Copy, Check, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { copyText } from '../utils/data.js';
import { NEEDS } from '../constants.js';

export function Section({ id, icon: Icon, title, subtitle, actions, children }) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        <div className="section-title">
          {Icon && <Icon size={20} strokeWidth={1.75} className="section-icon" />}
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={26} strokeWidth={1.5} />}
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', children }) {
  const Icon = { info: Info, warn: AlertTriangle, error: XCircle, success: CheckCircle2 }[tone] || Info;
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={16} />
      <div>{children}</div>
    </div>
  );
}

/** Shows the value, or a "Needs verification" label when it is empty. */
export function Val({ v }) {
  return v ? <>{v}</> : <span className="needs">{NEEDS}</span>;
}

const toneFor = (kind, value) => {
  if (kind === 'signal') return { High: 'aqua', Medium: 'blue', Low: 'gray' }[value] || 'gray';
  if (kind === 'confidence') return { High: 'aqua', Medium: 'blue', Low: 'amber' }[value] || 'gray';
  if (kind === 'priority') return { Core: 'aqua', Secondary: 'blue', Monitor: 'gray', 'Needs Review': 'amber' }[value] || 'gray';
  if (kind === 'verification')
    return { 'Verified from source': 'green', 'Needs verification': 'amber', 'Missing source': 'red' }[value] || 'gray';
  return 'gray';
};

export function Badge({ kind, label, value }) {
  const shown = value || (kind === 'signal' || kind === 'confidence' ? 'Unrated' : NEEDS);
  return (
    <span className={`badge badge-${toneFor(kind, value)}`}>
      {label ? <span className="badge-label">{label}</span> : null}
      {shown}
    </span>
  );
}

export function CopyButton({ getText, label = 'Copy', doneLabel = 'Copied', className = '' }) {
  const [state, setState] = useState('idle');
  async function onClick() {
    const ok = await copyText(getText());
    setState(ok ? 'done' : 'fail');
    setTimeout(() => setState('idle'), 1800);
  }
  return (
    <button type="button" className={`btn ${className}`} onClick={onClick}>
      {state === 'done' ? <Check size={15} /> : <Copy size={15} />}
      {state === 'done' ? doneLabel : state === 'fail' ? 'Copy failed' : label}
    </button>
  );
}

export function Select({ label, value, onChange, options, allLabel = 'All' }) {
  return (
    <label className="field field-inline">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
