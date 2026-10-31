import { useEffect, useRef, useState } from 'react';
import { classify, readSketchWithClaude, TOOLS } from '../lib/sketch.js';

const SIZE = 340;

/** "Draw the tool" dialog: sketch a weapon (or pick one), then unleash. */
export default function DrawPad({ person, canStillReap, onUnleash, onCancel }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const [forced, setForced] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
    redraw();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const xy = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2];
  };
  const down = (e) => {
    canvasRef.current.setPointerCapture(e.pointerId);
    current.current = [xy(e)];
    strokes.current.push(current.current);
    setForced(null);
    setError('');
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

  async function unleash() {
    if (busy) return;
    if (!canStillReap()) {
      setError(`Daylight has reached ${person.city}. Wait for night, or delay this soul.`);
      return;
    }
    let tool = forced;
    let saw = '';
    if (!tool) {
      if (!strokes.current.some((s) => s.length > 2)) {
        setError('Draw something first, or pick a tool below.');
        return;
      }
      setBusy(true);
      setError('The Reaper studies your sketch…');
      const r = await readSketchWithClaude(canvasRef.current);
      setBusy(false);
      if (r) {
        tool = r.tool;
        saw = r.saw;
      } else tool = classify(strokes.current);
      if (!tool) {
        setError('The Reaper can’t tell what this is. Redraw it, or pick a tool below.');
        return;
      }
    }
    onUnleash(tool, saw);
  }

  return (
    <div className="modal" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="pad-title">
        <h2 id="pad-title">Draw the tool for {person.name}</h2>
        <p className="card-note">
          Sketch anything: a dagger, a storm, a flame, a bottle. The Reaper reads your drawing and picks the closest
          tool. Or choose one below.
        </p>
        <canvas
          ref={canvasRef}
          className="pad"
          width={SIZE}
          height={SIZE}
          aria-label="Drawing pad"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <p className="pad-err" role="alert">{error}</p>
        <div className="shelf">
          {Object.entries(TOOLS).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`chip ${forced === k ? 'on' : ''}`}
              aria-pressed={forced === k}
              onClick={() => {
                setForced(k);
                strokes.current = [];
                setError('');
                redraw();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="card-actions">
          <button className="btn btn-ghost" onClick={() => { strokes.current.pop(); redraw(); }}>Undo</button>
          <button className="btn btn-ghost" onClick={() => { strokes.current = []; redraw(); }}>Clear</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-kill" onClick={unleash} disabled={busy}>Unleash</button>
        </div>
      </div>
    </div>
  );
}
