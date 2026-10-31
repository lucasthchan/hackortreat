import { useMemo } from 'react';
import { fmtDuration, HOUR, localTime, MAX_DELAYS } from '../lib/game.js';
import { isNight, nextTransition } from '../lib/sun.js';
import { NightBadge } from './SoulList.jsx';


export default function SoulPanel({ person: p, now, onClose, onReplay }) {
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
      <button className="btn btn-ghost back" onClick={onClose}>✕ Close</button>

      <header className="panel-head">
        <h2>{p.name}</h2>
        <p className="panel-place">
          {p.city}, {p.country} {alive && <NightBadge night={nightNow} />}
        </p>
        {p.bio && <p className="panel-bio">{p.bio}</p>}
      </header>


      <dl className="facts">
        <div><dt>Born</dt><dd>{dateFmt('UTC', p.birthAt)}</dd></div>
        <div><dt>Age</dt><dd>{ageAt(p, Math.min(now, p.reapedAt ?? now))}</dd></div>
        <div><dt>Appointed</dt><dd>{dateTimeFmt(p.tz, p.deathAt)}</dd></div>
        <div><dt>Age at death</dt><dd>{((p.deathAt - p.birthAt) / (365.2425 * 86400000)).toFixed(1)}</dd></div>
        <div><dt>Local time</dt><dd>{localTime(p.tz, now)}</dd></div>
        <div><dt>Delays used</dt><dd>{p.delays} / {MAX_DELAYS}</dd></div>
      </dl>

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
