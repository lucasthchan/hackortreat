import { useEffect, useRef, useState } from 'react';
import { createCinema } from '../lib/cinema.js';
import { PHRASES } from '../lib/sketch.js';

/** Full-screen kill cinematic. Calls onReaped once the soul has risen, onClose when dismissed. */
export default function Cinema({ person, tool, saw, onReaped, onClose }) {
  const canvasRef = useRef(null);
  const flashRef = useRef(null);
  const [done, setDone] = useState(false);
  const cbs = useRef({ onReaped });
  cbs.current.onReaped = onReaped;

  useEffect(() => {
    const cin = createCinema(canvasRef.current, flashRef.current);
    let alive = true;
    cin.play(person, tool).then(() => {
      if (!alive) return;
      cbs.current.onReaped();
      setDone(true);
    });
    return () => {
      alive = false;
      cin.dispose();
    };
    // play once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cinema" role="dialog" aria-modal="true" aria-label={`The fate of ${person.name}`}>
      <canvas ref={canvasRef} className="cinema-canvas" />
      <div ref={flashRef} className="flash" />
      {!done && (
        <p className="cinema-cap">
          {person.name}, {person.city}
        </p>
      )}
      {done && (
        <div className="cinema-end">
          <p>
            {person.name} was taken by {PHRASES[tool]}. {person.city} is quieter tonight.
            {saw ? ` Your sketch read as “${saw}”.` : ''}
          </p>
          <button className="btn btn-primary" onClick={onClose} autoFocus>
            Return to the world
          </button>
        </div>
      )}
    </div>
  );
}
