import { useEffect, useRef, useState } from 'react';
import { classify, readSketchWithClaude, TOOL_DEFS, TOOL_KEYS } from '../lib/sketch.js';

const SIZE = 340;

/** "Draw the tool" dialog: sketch a way of death (or pick one), buy new ones, then unleash. */
export default function DrawPad({ person, canStillReap, unlocked, balance, onBuy, onUnleash, onCancel }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const alive = useRef(true);
  const [forced, setForced] = useState(null);
  const [offer, setOffer] = useState(null); // locked tool the player is thinking of buying
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false); // true while showing "Recognized: …"
  const [shopOpen, setShopOpen] = useState(false);

  const owned = TOOL_KEYS.filter((k) => unlocked.includes(k));
  const locked = TOOL_KEYS.filter((k) => !unlocked.includes(k)).sort((a, b) => TOOL_DEFS[a].cost - TOOL_DEFS[b].cost);

  function redraw() {
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    x.shadowBlur = 0;
    x.clearRect(0, 0, SIZE, SIZE);
    x.strokeStyle = 'rgba(120,80,170,.4)';
    x.lineWidth = 1;
    x.beginPath();
    x.arc(SIZE / 2, SIZE / 2, SIZE * 0.48, 0, Math.PI * 2);
    x.stroke();
    x.lineCap = x.lineJoin = 'round';
    x.lineWidth = 5;
    x.strokeStyle = '#efe6d2';
    x.shadowColor = '#e0587a';
    x.shadowBlur = 10;
    strokes.current.forEach((s) => {
      x.beginPath();
      s.forEach((q, i) => {
        const px = ((q[0] + 1) / 2) * SIZE;
        const py = ((1 - q[1]) / 2) * SIZE;
        if (i) x.lineTo(px, py);
        else x.moveTo(px, py);
      });
      x.stroke();
    });
  }

  useEffect(() => {
    alive.current = true;
    redraw();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => {
      alive.current = false;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const xy = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2];
  };
  const down = (e) => {
    if (busy) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    current.current = [xy(e)];
    strokes.current.push(current.current);
    setForced(null);
    setOffer(null);
    setError('');
    setInfo('');
    redraw();
  };
  const move = (e) => {
    const s = current.current;
    if (!s) return;
    const q = xy(e);
    const l = s[s.length - 1];
    if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.015) {
      s.push(q);
      redraw();
    }
  };
  const up = () => {
    current.current = null;
  };

  function pickChip(k) {
    setError('');
    setInfo('');
    if (unlocked.includes(k)) {
      setOffer(null);
      setForced(k);
      strokes.current = [];
      redraw();
    } else {
      setForced(null);
      setOffer(k);
    }
  }

  function buy() {
    const res = onBuy(offer);
    if (res.ok) {
      setInfo(`${TOOL_DEFS[offer].name} unlocked. Unleash when ready.`);
      setError('');
      setForced(offer);
      setOffer(null);
      strokes.current = [];
      redraw();
    } else setError(res.reason);
  }

  async function unleash() {
    if (busy) return;
    if (!canStillReap()) {
      setError(`Daylight has reached ${person.city}. Wait for night, or delay this soul.`);
      return;
    }
    if (forced) {
      onUnleash(forced, '', false);
      return;
    }
    if (!strokes.current.some((s) => s.length > 2)) {
      setError('Draw something first, or pick a tool below.');
      return;
    }

    setBusy(true);
    setError('');
    setInfo('The Reaper studies your sketch…');
    const r = await readSketchWithClaude(strokes.current);
    if (!alive.current) return;
    setBusy(false);
    setInfo('');

    let tool;
    let saw = '';
    if (r) {
      // Claude looked at it
      tool = r.tool;
      saw = r.saw;
      if (!tool) {
        setError(`Unrecognizable: it looks like ${saw ? `“${saw}”` : 'nothing'}, which isn’t a way of death the Reaper knows. Redraw it, or pick a tool below.`);
        return;
      }
    } else {
      // offline: only a line, a zigzag or a spiral can be read
      tool = classify(strokes.current);
      if (!tool) {
        setError('Unrecognizable. Offline, the Reaper can only read a straight line, a zigzag or a spiral. Pick a tool below.');
        return;
      }
    }

    const d = TOOL_DEFS[tool];
    if (!unlocked.includes(tool)) {
      setShopOpen(true);
      setOffer(tool);
      setError(`That’s ${d.icon} ${d.name}${saw ? ` (“${saw}”)` : ''}, but it’s locked. Unlock it for ${d.cost}, or draw something you own.`);
      return;
    }
    // show what the Reaper saw for a moment, then unleash
    setBusy(true);
    setOk(true);
    setInfo(`Recognized: ${d.icon} ${d.name}${saw ? ` (“${saw}”)` : ''}`);
    await new Promise((res) => setTimeout(res, 1300));
    if (!alive.current) return;
    onUnleash(tool, saw, true);
  }

  const offerDef = offer ? TOOL_DEFS[offer] : null;

  return (
    <div className="modal" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="card draw-card" role="dialog" aria-modal="true" aria-labelledby="pad-title">
        <h2 id="pad-title">Draw the fate of {person.name}</h2>
        <p className="card-note">
          Sketch a way of death: a car, a wave, a ghost, a bomb… Drawn fates earn a bonus. Or pick one below.
        </p>
        <canvas
          ref={canvasRef}
          className={`pad ${busy ? 'pad-busy' : ''}`}
          width={SIZE}
          height={SIZE}
          aria-label="Drawing pad"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <p className={`pad-err ${info && !error ? (ok ? 'pad-ok' : 'pad-info') : ''}`} role="alert">{error || info}</p>

        <div className="shelf-head">
          <span>Your tools</span>
          <span className="pad-balance">To spend: <strong className="mono">{balance}</strong></span>
        </div>
        <div className="shelf">
          {owned.map((k) => (
            <button
              key={k}
              type="button"
              className={`chip ${forced === k ? 'on' : ''}`}
              aria-pressed={forced === k}
              onClick={() => pickChip(k)}
            >
              <span aria-hidden="true">{TOOL_DEFS[k].icon}</span> {TOOL_DEFS[k].name}
            </button>
          ))}
        </div>

        {locked.length > 0 && (
          <>
            <button type="button" className="shelf-toggle" aria-expanded={shopOpen} onClick={() => setShopOpen((o) => !o)}>
              {shopOpen ? '▾' : '▸'} Locked fates ({locked.length})
            </button>
            {shopOpen && (
              <div className="shelf shelf-locked">
                {locked.map((k) => {
                  const d = TOOL_DEFS[k];
                  const afford = balance >= d.cost;
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`chip locked ${offer === k ? 'offer' : ''} ${afford ? 'afford' : ''}`}
                      onClick={() => pickChip(k)}
                    >
                      <span aria-hidden="true">{d.icon}</span> {d.name} <span className="chip-cost mono">{d.cost}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {offerDef && (
          <div className="shop-line">
            <span>
              Unlock <strong>{offerDef.icon} {offerDef.name}</strong> for {offerDef.cost}?
            </span>
            <button className="btn btn-sm" onClick={buy} disabled={balance < offerDef.cost}>
              {balance < offerDef.cost ? `Need ${offerDef.cost - balance} more` : 'Unlock'}
            </button>
          </div>
        )}

        <div className="card-actions">
          <button className="btn btn-ghost" disabled={busy} onClick={() => { strokes.current.pop(); redraw(); }}>Undo</button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => { strokes.current = []; setError(''); redraw(); }}>Clear</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-kill" onClick={unleash} disabled={busy}>{busy ? (ok ? 'Unleashing…' : 'Reading…') : 'Unleash'}</button>
        </div>
      </div>
    </div>
  );
}