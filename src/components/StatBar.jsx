/* Score / due / reaped / escaped counters, shown over the top-right of the globe. */

const ICONS = {
  // laurel-style medal
  score: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M12 6.2 l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" />
      <path d="M8.5 14 L7 22 l5-2.5 5 2.5 -1.5-8" />
    </>
  ),
  // clock
  due: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9 v4 l3 2 M9 2.5 h6 M12 2.5 v2.5" />
    </>
  ),
  // scythe
  reaped: (
    <>
      <path d="M6 22 L14 3" />
      <path d="M13.5 4 C17 3 21 5 22 9 C19 7 16 6.5 12.6 6.3" />
    </>
  ),
  // broken chain
  escaped: (
    <>
      <path d="M9.5 14.5 l-3 3 a3 3 0 0 1 -4.2 -4.2 l3 -3 a3 3 0 0 1 4.2 0" />
      <path d="M14.5 9.5 l3 -3 a3 3 0 0 1 4.2 4.2 l-3 3 a3 3 0 0 1 -4.2 0" />
      <path d="M8 3 v3 M3 8 h3 M16 21 v-3 M21 16 h-3" />
    </>
  ),
};

function Stat({ kind, label, value, hot, title }) {
  return (
    <div className={`stat stat-${kind} ${hot ? 'is-hot' : ''}`} title={title}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[kind]}</svg>
      <div>
        <div className="stat-val mono">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function StatBar({ world, now }) {
  const reaped = world.people.filter((p) => p.status === 'reaped').length;
  const escaped = world.people.filter((p) => p.status === 'lost').length;
  const due = world.people.filter((p) => p.status === 'alive' && p.deathAt <= now).length;
  return (
    <div className="statbar">
      <Stat kind="score" label="Score" value={world.score} title="Your total score" />
      <Stat kind="due" label="Due" value={due} hot={due > 0} title="Souls whose time is up right now" />
      <Stat kind="reaped" label="Reaped" value={reaped} title="Souls you collected" />
      <Stat kind="escaped" label="Escaped" value={escaped} hot={escaped > 0} title="Souls you missed. They slipped away as wandering ghosts (−50 each)" />
    </div>
  );
}
