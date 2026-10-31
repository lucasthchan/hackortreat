import { useMemo } from 'react';
import { ageAt, DELAY_MAX_MIN, DELAY_MIN_MIN, ESCAPE_AFTER_H, fmtDuration, HOUR, localTime, MAX_DELAYS } from '../lib/game.js';
import { isNight, nextTransition } from '../lib/sun.js';
import { TOOLS } from '../lib/sketch.js';
import { NightBadge } from './SoulList.jsx';

const dateFmt = (tz, at) => localTime(tz, at, { year: 'numeric', month: 'short', day: 'numeric', hour: undefined, minute: undefined });
const dateTimeFmt = (tz, at) => localTime(tz, at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function SoulPanel({ person: p, now, onClose, onKill, onDelay, onReplay }) {
  const nightNow = isNight(p.lat, p.lon, new Date(now));
  const minuteKey = Math.floor(now / 60000);
  const transition = useMemo(
    () => nextTransition(p.lat, p.lon, new Date(minuteKey * 60000)),
    [p.lat, p.lon, minuteKey],
  );

  const until = p.deathAt - now;
  const alive = p.status === 'alive';
  const killBlock = !alive
    ? null
    : nightNow
      ? null
      : transition
        ? `It’s daytime in ${p.city}. Night falls in ${fmtDuration(transition.getTime() - now)} (${localTime(p.tz, transition.getTime())} local).`
        : `Endless polar day in ${p.city} right now. You cannot reap here.`;
  const delayBlock = alive && p.delays >= MAX_DELAYS ? 'No more delays allowed for this soul.' : null;

  return (
    <div className="panel">
      <button className="btn btn-ghost back" onClick={onClose}>← All souls</button>

      <header className="panel-head">
        <h2>{p.name}</h2>
        <p className="panel-place">
          {p.city}, {p.country} {alive && <NightBadge night={nightNow} />}
        </p>
        {p.bio && <p className="panel-bio">{p.bio}</p>}
      </header>

      <div className={`countdown ${until < 0 && alive ? 'countdown-over' : ''}`}>
        {alive ? (
          <>
            <span className="countdown-label">{until < 0 ? 'Overdue by' : 'Death in'}</span>
            <span className="countdown-val mono">{fmtDuration(Math.abs(until))}</span>
            {until < 0 && (
              <span className="countdown-note">Becomes a ghost in {fmtDuration(p.deathAt + ESCAPE_AFTER_H * HOUR - now)}</span>
            )}
          </>
        ) : (
          <>
            <span className="countdown-label">{p.status === 'reaped' ? `Reaped with ${(TOOLS[p.tool] || 'a tool').toLowerCase()}` : 'Escaped as a ghost'}</span>
            <span className="countdown-val mono">{dateTimeFmt(p.tz, p.reapedAt ?? p.deathAt)}</span>
          </>
        )}
      </div>

      <dl className="facts">
        <div><dt>Born</dt><dd>{dateFmt('UTC', p.birthAt)}</dd></div>
        <div><dt>Age</dt><dd>{ageAt(p, Math.min(now, p.reapedAt ?? now))}</dd></div>
        <div><dt>Appointed</dt><dd>{dateTimeFmt(p.tz, p.deathAt)}</dd></div>
        <div><dt>Age at death</dt><dd>{((p.deathAt - p.birthAt) / (365.2425 * 86400000)).toFixed(1)}</dd></div>
        <div><dt>Local time</dt><dd>{localTime(p.tz, now)}</dd></div>
        <div><dt>Delays used</dt><dd>{p.delays} / {MAX_DELAYS}</dd></div>
      </dl>

      {alive && (
        <div className="actions">
          <button className="btn btn-kill" disabled={!!killBlock} onClick={() => onKill(p.id)}>
            Kill now
            <small>draw the tool</small>
          </button>
          <button className="btn btn-delay" disabled={!!delayBlock} onClick={() => onDelay(p.id)}>
            Delay death
            <small>{DELAY_MIN_MIN}m – {DELAY_MAX_MIN / 60}h, random</small>
          </button>
        </div>
      )}
      {alive && killBlock && <p className="note note-warn">{killBlock}</p>}
      {alive && !killBlock && until > HOUR && (
        <p className="note">Their time isn&rsquo;t up yet. Early reaps only earn 20 points.</p>
      )}
      {alive && delayBlock && <p className="note">{delayBlock}</p>}
      {p.status === 'reaped' && p.tool && (
        <div className="actions">
          <button className="btn" onClick={() => onReplay(p.id)}>Replay the fate</button>
        </div>
      )}
    </div>
  );
}
