import { useState } from 'react';
import { ASSIGNMENT_WINDOW_H, ESCAPE_AFTER_H, fmtDuration, HOUR, localTime } from '../lib/game.js';
import { isNight } from '../lib/sun.js';

export function NightBadge({ night }) {
  return (
    <span className={`badge ${night ? 'badge-night' : 'badge-day'}`} title={night ? 'Night — may reap' : 'Daytime — cannot reap'}>
      {night ? '☾ Night' : '☀ Day'}
    </span>
  );
}

export default function SoulList({ world, now, onSelect }) {
  const [tabState, setTab] = useState(null);
  const horizon = now + ASSIGNMENT_WINDOW_H * HOUR;
  const alive = world.people.filter((p) => p.status === 'alive');
  const due = alive.filter((p) => p.deathAt <= now).sort((a, b) => a.deathAt - b.deathAt);
  const soon = alive.filter((p) => p.deathAt > now && p.deathAt <= horizon).sort((a, b) => a.deathAt - b.deathAt);
  const done = world.people
    .filter((p) => p.status !== 'alive')
    .sort((a, b) => (b.reapedAt ?? b.deathAt) - (a.reapedAt ?? a.deathAt));

  // default to "Due now" when there's work, otherwise "Next 24h"
  const tab = tabState ?? (due.length ? 'due' : 'soon');
  const tabs = [
    { id: 'due', label: 'Due now', count: due.length },
    { id: 'soon', label: 'Next 24h', count: soon.length },
    { id: 'done', label: 'Ledger', count: done.length },
  ];
  const rows = tab === 'due' ? due : tab === 'soon' ? soon : done;

  return (
    <div className="list">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'on' : ''} ${t.id === 'due' && t.count ? 'tab-alert' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label} <span className="count">{t.count}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="empty">
          {tab === 'due' && 'No one is due. Enjoy the quiet while it lasts.'}
          {tab === 'soon' && 'Nobody scheduled in the next 24 hours.'}
          {tab === 'done' && 'No souls collected yet.'}
        </p>
      )}

      <ul className="rows">
        {rows.slice(0, 150).map((p) => {
          const night = isNight(p.lat, p.lon, new Date(now));
          const until = p.deathAt - now;
          const overdueFrac = until < 0 ? Math.min(1, -until / (ESCAPE_AFTER_H * HOUR)) : 0;
          return (
            <li key={p.id}>
              <button className="row" onClick={() => onSelect(p.id)}>
                <span className="row-main">
                  <span className="row-name">
                    {p.name}
                  </span>
                  <span className="row-sub">
                    {p.city}, {p.country} · {localTime(p.tz, now)}
                  </span>
                </span>
                <span className="row-side">
                  {p.status === 'alive' ? (
                    <>
                      <span className={`mono row-time ${until < 0 ? 'overdue' : ''}`}>
                        {until < 0 ? `+${fmtDuration(-until)}` : fmtDuration(until)}
                      </span>
                      <NightBadge night={night} />
                    </>
                  ) : (
                    <span className={`badge ${p.status === 'reaped' ? 'badge-reaped' : 'badge-lost'}`}>
                      {p.status === 'reaped' ? 'Reaped' : 'Ghost'}
                    </span>
                  )}
                </span>
                {overdueFrac > 0 && <span className="overdue-bar" style={{ width: `${overdueFrac * 100}%` }} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
