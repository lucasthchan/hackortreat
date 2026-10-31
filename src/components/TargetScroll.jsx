import { useEffect, useState } from 'react';
import { ASSIGNMENT_WINDOW_H, fmtDuration, HOUR } from '../lib/game.js';
import { isNight } from '../lib/sun.js';

/* A bony hand. `flip` mirrors it for the right side. Fingers curl over the paper's edge. */
function BoneHand({ flip = false, className = '' }) {
  return (
    <svg viewBox="0 0 120 140" className={`bone-hand ${className}`} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      {/* wrist bones */}
      <path d="M40 140 L48 96 M62 140 L64 96" className="bone thick" />
      {/* palm / carpals */}
      <path d="M38 98 Q56 84 78 96 Q70 106 56 106 Q44 106 38 98z" className="bone-fill" />
      {/* fingers: metacarpal + two phalanges each, tips curling forward */}
      <path d="M46 92 L42 62 M42 58 L40 40 M40 36 Q40 28 46 26" className="bone" />
      <path d="M58 88 L60 56 M60 52 L61 32 M61 28 Q62 20 68 20" className="bone" />
      <path d="M70 90 L78 60 M79 56 L84 38 M85 34 Q88 27 94 28" className="bone" />
      <path d="M78 96 L92 74 M94 70 L102 56 M104 52 Q108 46 113 48" className="bone" />
      {/* thumb, in front of the paper */}
      <path d="M40 100 L22 80 M20 76 L12 60 M11 56 Q10 48 16 46" className="bone" />
      {/* knuckles */}
      {[[42, 60], [40, 38], [60, 54], [61, 30], [78, 58], [84, 36], [93, 72], [103, 54], [21, 78], [12, 58]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.6" className="knuckle" />
      ))}
    </svg>
  );
}

/* The little closed-scroll icon used on the button. */
function ScrollIcon() {
  return (
    <svg viewBox="0 0 64 64" className="scroll-icon" aria-hidden="true">
      <path d="M16 8 h30 l4 4 -3 4 3 5 -3 6 3 6 -3 6 3 6 -3 5 3 6 H16 l2 -6 -3 -5 3 -6 -3 -6 3 -6 -3 -6 3 -5 -2 -4z" className="paper" />
      <path d="M22 18 h20 M22 26 h18 M22 34 h20 M22 42 h14" className="ink" />
      <path d="M22 18 h20" className="ink-red" />
    </svg>
  );
}

export default function TargetScroll({ world, now, onSelect }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const horizon = now + ASSIGNMENT_WINDOW_H * HOUR;
  const todo = world.people
    .filter((p) => p.status === 'alive' && p.deathAt <= horizon)
    .sort((a, b) => a.deathAt - b.deathAt);
  const done = world.people
    .filter((p) => p.status === 'reaped')
    .sort((a, b) => b.reapedAt - a.reapedAt)
    .slice(0, 5);
  const dueCount = todo.filter((p) => p.deathAt <= now).length;

  const go = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <>
      <button className="scroll-btn" onClick={() => setOpen(true)} aria-label={`Open the to-do list, ${todo.length} targets`}>
        <span className="scroll-btn-art">
          <ScrollIcon />
          <BoneHand className="hand-mini" />
        </span>
        <span className="scroll-btn-label">To Do List</span>
        {dueCount > 0 && <span className="scroll-btn-count">{dueCount}</span>}
      </button>

      {open && (
        <div className="scroll-backdrop" onClick={() => setOpen(false)}>
          <div className="scroll-held" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Reaper's to-do list">
            <div className="scroll-paper">
              <h2 className="scroll-title">To Do List</h2>
              <ul className="scroll-rows">
                {todo.length === 0 && done.length === 0 && <li className="scroll-empty">Nothing to do… for now.</li>}
                {todo.map((p) => {
                  const until = p.deathAt - now;
                  const night = isNight(p.lat, p.lon, new Date(now));
                  return (
                    <li key={p.id}>
                      <button className={`scroll-row ${until <= 0 ? 'is-due' : ''}`} onClick={() => go(p.id)}>
                        <span className="scroll-box" />
                        <span className="scroll-text">
                          Reap {p.name} <small>in {p.city}</small>
                        </span>
                        <span className="scroll-when">
                          {night ? '☾' : '☀'} {until <= 0 ? 'now!' : fmtDuration(until)}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {done.map((p) => (
                  <li key={p.id}>
                    <button className="scroll-row is-done" onClick={() => go(p.id)}>
                      <span className="scroll-box">✓</span>
                      <span className="scroll-text">
                        Reap {p.name} <small>in {p.city}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="scroll-sign">— Death</div>
            </div>
            <BoneHand className="hand-left" />
            <BoneHand className="hand-right" flip />
          </div>
        </div>
      )}
    </>
  );
}
