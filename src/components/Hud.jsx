import { useEffect, useState } from 'react';

export default function Hud({ world, now, onReset }) {
  const d = new Date(now);
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const id = setTimeout(() => setArm(false), 4000);
    return () => clearTimeout(id);
  }, [arm]);

  return (
    <header className="hud">
      <div className="brand">
        <span className="brand-sigil" aria-hidden="true">☠</span>
        <span className="brand-name">Reaper&rsquo;s Ledger</span>
      </div>

      <div className="hud-clock mono" title="Game time is real time">
        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        <small>UTC {d.toISOString().slice(11, 16)}</small>
      </div>

      <div className="hud-status">
        Last seen in <strong>{world.reaper.place}</strong>
      </div>

      <button
        className={`btn btn-sm ${arm ? 'btn-kill' : 'btn-ghost'}`}
        onClick={() => (arm ? (setArm(false), onReset()) : setArm(true))}
      >
        {arm ? 'Click again to wipe' : 'New ledger'}
      </button>
    </header>
  );
}
