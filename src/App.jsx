import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Setup from './components/Setup.jsx';
import Globe from './components/Globe.jsx';
import SoulList from './components/SoulList.jsx';
import SoulPanel from './components/SoulPanel.jsx';
import Hud from './components/Hud.jsx';
import DrawPad from './components/DrawPad.jsx';
import Cinema from './components/Cinema.jsx';
import { canReap, delayDeath, fmtDuration, loadWorld, reap, saveWorld, tick } from './lib/game.js';

export default function App() {
  const [world, setWorld] = useState(() => loadWorld());
  const [now, setNow] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState(null);
  const [drawFor, setDrawFor] = useState(null); // person id with the draw dialog open
  const [fate, setFate] = useState(null); // { id, tool, saw, at, replay }
  const [toasts, setToasts] = useState([]);
  const worldRef = useRef(world);
  worldRef.current = world;
  const fateRef = useRef(fate);
  fateRef.current = fate;

  const toast = useCallback((text, tone = 'info') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, tone }].slice(-4));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  // Real-time clock: game time == wall-clock time.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Advance the world each tick.
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    const { world: next, events } = tick(w, now, fateRef.current?.id ?? drawFor);
    if (next !== w) setWorld(next);
    events.forEach((e) => {
      if (e.type === 'lost') toast(`${e.person.name} became a wandering ghost (−50)`, 'bad');
    });
  }, [now, toast, drawFor]);

  useEffect(() => saveWorld(world), [world]);

  const selected = useMemo(() => world?.people.find((p) => p.id === selectedId) ?? null, [world, selectedId]);
  const drawPerson = useMemo(() => world?.people.find((p) => p.id === drawFor) ?? null, [world, drawFor]);
  const fatePerson = useMemo(() => world?.people.find((p) => p.id === fate?.id) ?? null, [world, fate]);

  if (!world) {
    return <Setup onStart={(w) => setWorld(w)} />;
  }

  const onKill = (id) => {
    const p = world.people.find((x) => x.id === id);
    if (!canReap(p, Date.now())) toast('It’s daytime there. The Reaper only works at night.', 'warn');
    else setDrawFor(id);
  };
  const onUnleash = (tool, saw) => {
    // the moment of death is when you unleash; the cinematic just shows it
    setFate({ id: drawFor, tool, saw, at: Date.now(), replay: false });
    setDrawFor(null);
  };
  const onReaped = () => {
    const f = fateRef.current;
    if (!f || f.replay) return;
    const { world: next, result } = reap(worldRef.current, f.id, f.tool, f.at);
    if (result) {
      setWorld(next);
      toast(`+${result.pts}: ${result.label}`, 'good');
    }
  };
  const onDelay = (id) => {
    const { world: next, delayMs } = delayDeath(world, id, Date.now());
    if (delayMs) {
      setWorld(next);
      toast(`Granted ${fmtDuration(delayMs)} more life.`, 'info');
    }
  };
  const onReplay = (id) => {
    const p = world.people.find((x) => x.id === id);
    if (p?.tool) setFate({ id, tool: p.tool, saw: '', at: p.reapedAt, replay: true });
  };
  const onReset = () => {
    setSelectedId(null);
    setWorld(null);
  };

  return (
    <div className="app">
      <Hud world={world} now={now} onReset={onReset} />
      <main className="main">
        <section className="map-wrap" aria-label="Globe">
          <Globe world={world} now={now} selectedId={selectedId} onSelect={setSelectedId} paused={!!fate} />
        </section>
        <aside className="sidebar">
          {selected ? (
            <SoulPanel
              person={selected}
              now={now}
              onClose={() => setSelectedId(null)}
              onKill={onKill}
              onDelay={onDelay}
              onReplay={onReplay}
            />
          ) : (
            <SoulList world={world} now={now} onSelect={setSelectedId} />
          )}
        </aside>
      </main>

      {drawPerson && (
        <DrawPad
          person={drawPerson}
          canStillReap={() => canReap(drawPerson, Date.now())}
          onUnleash={onUnleash}
          onCancel={() => setDrawFor(null)}
        />
      )}
      {fate && fatePerson && (
        <Cinema
          key={`${fate.id}-${fate.at}-${fate.replay}`}
          person={fatePerson}
          tool={fate.tool}
          saw={fate.saw}
          onReaped={onReaped}
          onClose={() => setFate(null)}
        />
      )}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}
