import { ASSIGNMENT_WINDOW_H, ESCAPE_AFTER_H, fmtDuration, HOUR } from '../lib/game.js';
import { isNight } from '../lib/sun.js';

/* The 5 most urgent souls: time left, name, and a line that fills red as the deadline nears. */
export default function NextTargets({ world, now, selectedId, onSelect, count = 5 }) {
  const span = ASSIGNMENT_WINDOW_H * HOUR;
  const next = world.people
    .filter((p) => p.status === 'alive')
    .sort((a, b) => a.deathAt - b.deathAt)
    .slice(0, count);

  if (!next.length) return null;

  return (
    <ol className="next" aria-label="Next targets">
      {next.map((p) => {
        const until = p.deathAt - now;
        const over = until <= 0;
        // before the deadline the bar fills over the 24h window; once overdue it drains toward escape
        const fill = over
          ? Math.max(0, 1 + until / (ESCAPE_AFTER_H * HOUR))
          : Math.min(1, Math.max(0, 1 - until / span));
        const night = isNight(p.lat, p.lon, new Date(now));
        return (
          <li key={p.id}>
            <button
              className={`next-row ${over ? 'is-over' : ''} ${p.id === selectedId ? 'is-on' : ''} ${night ? '' : 'is-day'}`}
              onClick={() => onSelect(p.id)}
              title={`${p.name}, ${p.city} · ${night ? 'night: can reap' : 'daytime: wait for night'}`}
            >
              <span className="next-time mono">{over ? `+${fmtDuration(-until)}` : fmtDuration(until)}</span>
              <span className="next-name">{p.name}</span>
              <span className="next-bar"><span style={{ width: `${fill * 100}%` }} /></span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
