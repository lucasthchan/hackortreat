import { useEffect, useRef, useState } from 'react';
import { isNight, nextTransition } from '../lib/sun.js';
import Portrait from './Portrait.jsx';
import { ageAt, DELAY_MAX_MIN, DELAY_MIN_MIN, ESCAPE_AFTER_H, fmtDuration, HOUR, localTime, MAX_DELAYS, YEAR_MS } from '../lib/game.js';
import { TOOLS } from '../lib/sketch.js';

const dateFmt = (tz, at) => localTime(tz, at, { year: 'numeric', month: 'short', day: 'numeric', hour: undefined, minute: undefined });
const dateTimeFmt = (tz, at) => localTime(tz, at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/* Hour + minute (0-24 as a float) in the target's own time zone. */
function localHours(tz, at) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(at);
    const h = Number(parts.find((x) => x.type === 'hour').value) % 24;
    const m = Number(parts.find((x) => x.type === 'minute').value);
    return h + m / 60;
  } catch {
    const d = new Date(at);
    return d.getHours() + d.getMinutes() / 60;
  }
}
const hhmm = (hours) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/* ---------- icons ---------- */
function SunMoon({ night }) {
  return night ? (
      <svg viewBox="0 0 48 48" className="ov-sky ov-moon" aria-label="Night">
        <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" />
      </svg>
  ) : (
      <svg viewBox="0 0 48 48" className="ov-sky ov-sun" aria-label="Day">
        <circle cx="24" cy="24" r="9" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return <line key={i} x1={24 + Math.cos(a) * 14} y1={24 + Math.sin(a) * 14} x2={24 + Math.cos(a) * 20} y2={24 + Math.sin(a) * 20} />;
        })}
      </svg>
  );
}

/* Circular clock: the ring fills through the local day, the hand points at the current hour. */
function DayRing({ hours, night }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const frac = hours / 24;
  const a = frac * 2 * Math.PI - Math.PI / 2;
  return (
      <svg viewBox="0 0 44 44" className={`ov-ring ${night ? 'is-night' : ''}`} aria-hidden="true">
        <circle cx="22" cy="22" r={r} className="ov-ring-track" />
        <circle
            cx="22" cy="22" r={r}
            className="ov-ring-fill"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            transform="rotate(-90 22 22)"
        />
        <line x1="22" y1="22" x2={22 + Math.cos(a) * 10} y2={22 + Math.sin(a) * 10} className="ov-ring-hand" />
        <circle cx="22" cy="22" r="2" className="ov-ring-dot" />
      </svg>
  );
}

/* Round gold-ringed action button with click effects.
   onClick may return a short string, which floats up from the button (e.g. "+3h 10m"). */
function RoundAction({ label, sub, disabled, title, onClick, kind = 'gold', children }) {
  const [fx, setFx] = useState(null); // 'go' | 'no'
  const [floats, setFloats] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const play = (name) => {
    setFx(null);
    requestAnimationFrame(() => setFx(name));
    later(() => setFx(null), 800);
  };
  const handle = () => {
    if (disabled) {
      play('no');
      return;
    }
    play('go');
    const text = onClick?.();
    if (typeof text === 'string') {
      const id = Math.random();
      setFloats((f) => [...f, { id, text }]);
      later(() => setFloats((f) => f.filter((x) => x.id !== id)), 1400);
    }
  };

  return (
    <button
      className={`ov-act ov-act-${kind} ${disabled ? 'is-disabled' : ''} ${fx ? `fx-${fx}` : ''}`}
      aria-disabled={disabled || undefined}
      title={title}
      onClick={handle}
    >
      <span className="ov-act-ring">
        <span className="ov-act-wave" />
        <span className="ov-act-wave w2" />
        <svg viewBox="0 0 48 48" aria-hidden="true">{children}</svg>
      </span>
      <span className="ov-act-label">{label}</span>
      {sub && <span className="ov-act-sub">{sub}</span>}
      {floats.map((f) => (
        <span key={f.id} className="ov-act-float mono" aria-live="polite">{f.text}</span>
      ))}
    </button>
  );
}

/* Time left / overdue, with a thin bar that drains toward the soul escaping. */
function Countdown({ person: p, now }) {
  const until = p.deathAt - now;
  if (p.status !== 'alive') {
    return (
        <div className="ov-count is-done">
          <div className="ov-count-label">
            {p.status === 'reaped' ? `Reaped with ${(TOOLS[p.tool] || 'a tool').toLowerCase()}` : 'Escaped as a ghost'}
          </div>
          <div className="ov-count-val mono">{dateTimeFmt(p.tz, p.reapedAt ?? p.deathAt)}</div>
        </div>
    );
  }
  const over = until < 0;
  const escapeIn = p.deathAt + ESCAPE_AFTER_H * HOUR - now;
  const left = over ? Math.max(0, escapeIn / (ESCAPE_AFTER_H * HOUR)) : 1;
  return (
      <div className={`ov-count ${over ? 'is-over' : ''}`}>
        <div className="ov-count-row">
          <span className="ov-count-label">{over ? 'Overdue by' : 'Death in'}</span>
          <span className="ov-count-val mono">{fmtDuration(Math.abs(until))}</span>
        </div>
        {over && (
            <>
              <div className="ov-count-bar"><span style={{ width: `${left * 100}%` }} /></div>
              <div className="ov-count-note">Escapes in {fmtDuration(escapeIn)}</div>
            </>
        )}
      </div>
  );
}

/** Top-left place/time card + middle-left target card, drawn over the globe. */
export default function MapOverlay({ person, now, onAccept, onDelay, onReplay, onClose }) {
  if (!person) return null;
  const night = isNight(person.lat, person.lon, new Date(now));
  const hours = localHours(person.tz, now);
  const alive = person.status === 'alive';
  const delaysLeft = MAX_DELAYS - person.delays;
  const until = person.deathAt - now;
  // when daytime: how long until the Reaper may act here (null = polar day)
  const nightFalls = alive && !night ? nextTransition(person.lat, person.lon, new Date(Math.floor(now / 60000) * 60000)) : null;
  const acceptSub = night
      ? until > HOUR ? 'early: only 20 pts' : 'reap the soul'
      : nightFalls ? `night in ${fmtDuration(nightFalls.getTime() - now)}` : 'polar day';
  return (
      <div className="overlay" aria-live="polite">
        <div className="ov-place">
          <SunMoon night={night} />
          <div>
            <div className="ov-city">{person.city}</div>
            <div className="ov-phase">{night ? 'Night' : 'Day'}</div>
          </div>
          <div className="ov-time">
            <DayRing hours={hours} night={night} />
            <span className="mono">{hhmm(hours)}</span>
          </div>
        </div>

        <div className="ov-target">
          <button className="ov-close" onClick={onClose} aria-label="Close target" title="Close (Esc)">✕</button>
          <div className="ov-frame">
            <Portrait person={person} age={ageAt(person, Math.min(now, person.reapedAt ?? now))} />
          </div>
          <div className="ov-pin">
            <svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 15s5-5.5 5-9A5 5 0 0 0 1 6c0 3.5 5 9 5 9z" /><circle cx="6" cy="6" r="1.8" /></svg>
            {person.city}
          </div>
          <h2 className="ov-name">{person.name}</h2>
          <div className="ov-country">{person.country}</div>
          <dl className="ov-facts">
            <div><dt>Born</dt><dd>{dateFmt(person.tz, person.birthAt)}</dd></div>
            <div><dt>Age</dt><dd>{ageAt(person, Math.min(now, person.reapedAt ?? now))}</dd></div>
            <div><dt>Appointed</dt><dd>{dateTimeFmt(person.tz, person.deathAt)}</dd></div>
            <div><dt>Age at death</dt><dd>{((person.deathAt - person.birthAt) / YEAR_MS).toFixed(1)}</dd></div>
            <div><dt>Delays used</dt><dd>{person.delays} / {MAX_DELAYS}</dd></div>
          </dl>
          <Countdown person={person} now={now} />
          {alive && (
              <div className="ov-actions">
                <RoundAction
                    label="Accept"
                    sub={acceptSub}
                    disabled={!night}
                    title={night ? 'Draw your tool and reap' : nightFalls ? `It’s daytime in ${person.city}. Night falls at ${localTime(person.tz, nightFalls.getTime())} local.` : `Endless polar day in ${person.city}. You cannot reap here right now.`}
                    onClick={() => { const id = person.id; setTimeout(() => onAccept(id), 420); }}
                >
                  {/* ankh */}
                  <ellipse cx="24" cy="13" rx="6" ry="7.5" />
                  <path d="M24 20.5 V42 M14 24 H34" />
                </RoundAction>
                <RoundAction
                    label="Delay"
                    sub={delaysLeft > 0 ? `${delaysLeft} left · ${DELAY_MIN_MIN}m–${DELAY_MAX_MIN / 60}h` : 'no delays left'}
                    disabled={delaysLeft <= 0}
                    title="Grant a random amount of extra life"
                    kind="teal"
                    onClick={() => { const ms = onDelay(person.id); return ms ? `+${fmtDuration(ms)}` : undefined; }}
                >
                  {/* hourglass */}
                  <path d="M14 8 H34 M14 40 H34 M17 8 C17 18 31 18 31 24 C31 30 17 30 17 40 M31 8 C31 18 17 18 17 24 C17 30 31 30 31 40" />
                  <path d="M20 37 Q24 31 28 37z" className="fill" />
                </RoundAction>
              </div>
          )}
          {person.status === 'reaped' && person.tool && (
              <div className="ov-actions">
                <RoundAction label="Replay" sub="watch the fate again" onClick={() => onReplay(person.id)}>
                  <path d="M18 14 L34 24 L18 34z" className="fill" />
                </RoundAction>
              </div>
          )}
        </div>
      </div>
  );
}
