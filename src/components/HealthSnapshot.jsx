import { useMemo } from 'react';
import { Activity, TrendingUp, Minus, Eye } from 'lucide-react';
import { Section, Badge, Val } from './ui.jsx';
import { computeThemes } from '../utils/data.js';

const ICONS = { Positive: TrendingUp, Neutral: Minus, Watch: Eye };

export default function HealthSnapshot({ entries }) {
  const themes = useMemo(() => computeThemes(entries), [entries]);

  return (
    <Section
      id="health"
      icon={Activity}
      title="AI health snapshot"
      subtitle="Latest signal per theme, built from your entries by category and tags."
    >
      <div className="themes">
        {themes.map((t) => {
          const Icon = t.direction ? ICONS[t.direction] : null;
          return (
            <div key={t.name} className={`card theme ${t.direction ? `dir-${t.direction.toLowerCase()}` : 'dir-none'}`}>
              <div className="theme-head">
                <h3>{t.name}</h3>
                {t.direction ? (
                  <span className={`direction dir-${t.direction.toLowerCase()}`}>
                    <Icon size={14} /> {t.direction}
                  </span>
                ) : (
                  <span className="direction dir-none">No data</span>
                )}
              </div>
              {t.latest ? (
                <>
                  <p className="theme-signal">{t.latest.keySignal || t.latest.title || 'Untitled entry'}</p>
                  <div className="theme-foot">
                    <Badge kind="confidence" label="Confidence" value={t.latest.confidence} />
                    <span className="muted">
                      Source: <Val v={t.latest.source} />
                    </span>
                    <span className="muted">{t.count} {t.count === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </>
              ) : (
                <p className="muted">No entries tagged to this theme yet.</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="hint">
        Direction comes from the latest matching entry's tags. Add the tag <b>positive</b>, <b>neutral</b> or <b>watch</b> to an entry to set it. Without a direction tag, the theme shows Neutral.
      </p>
    </Section>
  );
}
