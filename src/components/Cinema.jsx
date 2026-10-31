import { useEffect, useRef, useState } from 'react';
import { createCinema } from '../lib/cinema.js';
import { PHRASES } from '../lib/sketch.js';

/** Full-screen kill cinematic. Calls onReaped once the soul has risen, onClose when dismissed. */
export default function Cinema({ person, tool, saw, onReaped, onClose }) {
  const hostRef = useRef(null);
  const flashRef = useRef(null);
  const [done, setDone] = useState(false);
  const cbs = useRef({ onReaped });
  cbs.current.onReaped = onReaped;

  useEffect(() => {
    // A fresh <canvas> per mount: dispose() destroys the WebGL context, and a canvas whose
    // context was destroyed can never get a new one (this is what broke under StrictMode).
    const canvas = document.createElement('canvas');
    canvas.className = 'cinema-canvas';
    hostRef.current.prepend(canvas);
    const cin = createCinema(canvas, flashRef.current);
    let alive = true;
    cin.play(person, tool).then(() => {
      if (!alive) return;
      cbs.current.onReaped();
      setDone(true);
    });
    return () => {
      alive = false;
      cin.dispose();
      canvas.remove();
    };
    // play once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
      <div ref={hostRef} className="cinema" role="dialog" aria-modal="true" aria-label={`The fate of ${person.name}`}>
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