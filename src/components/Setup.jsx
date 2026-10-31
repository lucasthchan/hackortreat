import { useMemo, useState } from 'react';
import { CITIES } from '../lib/data.js';
import { AGE_SPREAD, createWorld, SCHEDULE_HORIZON_H } from '../lib/game.js';

const POPULATIONS = [
  { value: 60, label: 'Quiet', hint: '~1 death / hour' },
  { value: 144, label: 'Busy', hint: '~2 deaths / hour' },
  { value: 288, label: 'Plague year', hint: '~4 deaths / hour' },
];

function BellCurve({ avg }) {
  const W = 320;
  const H = 70;
  const min = 0;
  const max = 120;
  const x = (a) => ((a - min) / (max - min)) * W;
  const pts = [];
  for (let a = min; a <= max; a += 1) {
    const y = Math.exp(-((a - avg) ** 2) / (2 * AGE_SPREAD ** 2));
    pts.push(`${x(a).toFixed(1)},${(H - 6 - y * (H - 14)).toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="bell" aria-hidden="true">
      <polygon points={`0,${H - 6} ${pts.join(' ')} ${W},${H - 6}`} className="bell-fill" />
      <polyline points={pts.join(' ')} className="bell-line" />
      <line x1={x(avg)} x2={x(avg)} y1={4} y2={H - 6} className="bell-mark" />
      {[0, 30, 60, 90, 120].map((a) => (
        <text key={a} x={x(a)} y={H + 10} textAnchor={a === 0 ? 'start' : a === 120 ? 'end' : 'middle'}>
          {a}
        </text>
      ))}
    </svg>
  );
}

export default function Setup({ onStart }) {
  const [avgAge, setAvgAge] = useState(78);
  const [population, setPopulation] = useState(144);
  const [startCity, setStartCity] = useState('Salem');
  const cities = useMemo(() => [...CITIES].sort((a, b) => a.name.localeCompare(b.name)), []);

  const begin = (e) => {
    e.preventDefault();
    onStart(createWorld({ avgAge, population, startCity, now: Date.now() }));
  };

  return (
    <div className="setup">
      <form className="setup-card" onSubmit={begin}>
        <div className="setup-sigil" aria-hidden="true">☠</div>
        <h1>The Reaper&rsquo;s Ledger</h1>
        <p className="setup-sub">
          Every soul on Earth has an appointment. Set the terms, then keep them, in real time, under cover of night.
        </p>

        <label className="field">
          <span className="field-label">
            Average age of death <strong className="mono">{avgAge}</strong>
          </span>
          <input
            type="range"
            min="30"
            max="110"
            value={avgAge}
            onChange={(e) => setAvgAge(Number(e.target.value))}
          />
          <BellCurve avg={avgAge} />
          <span className="field-hint">
            Each soul&rsquo;s lifespan is drawn around this average (±{AGE_SPREAD} yrs). Their appointments fall
            within the next {SCHEDULE_HORIZON_H} hours.
          </span>
        </label>

        <fieldset className="field">
          <legend className="field-label">Workload</legend>
          <div className="seg">
            {POPULATIONS.map((p) => (
              <button
                type="button"
                key={p.value}
                className={population === p.value ? 'on' : ''}
                onClick={() => setPopulation(p.value)}
                aria-pressed={population === p.value}
              >
                <span>{p.label}</span>
                <small>{p.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span className="field-label">Reaper&rsquo;s starting lair</span>
          <select value={startCity} onChange={(e) => setStartCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}, {c.country}
              </option>
            ))}
          </select>
        </label>

        <ul className="rules">
          <li>You may only reap where it is <strong>night</strong> when you arrive.</li>
          <li>The Reaper travels instantly. Draw your tool, then watch the fate unfold.</li>
          <li>Each soul can be <strong>delayed</strong> up to 3 times by a random amount.</li>
          <li>Souls left 6 hours past their time become wandering ghosts.</li>
        </ul>

        <button type="submit" className="btn btn-primary btn-big">Open the ledger</button>
      </form>
    </div>
  );
}
