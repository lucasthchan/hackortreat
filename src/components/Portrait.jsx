/*
 * A small painted bust for each soul. What they look like (skin, hair, style, shirt, build) comes from
 * src/lib/appearance.js, the same source the kill cinematic uses; this file adds age lines, glasses and
 * facial details on top.
 */

import { hash, lookFor, mix } from '../lib/appearance.js';

/* ---------- drawing ---------- */
export default function Portrait({ person, age }) {
  const L = lookFor(person, age);
  const clothes = L.shirt;
  const uid = `p${hash(person.id).toString(36)}`; // safe for url(#…) references
  const cx = 120;
  const cy = L.child ? 50 : 46;
  const rx = L.child ? 20 : 18.5;
  const ry = L.child ? 21 : 24;
  const old = L.age >= 60;
  const veryOld = L.age >= 75;
  const mid = L.age >= 45;
  const eyeY = cy + (L.child ? 2 : 0);
  const eyeR = L.child ? 2.4 : 1.9;
  const stroke = { stroke: L.line, strokeWidth: 1.1, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const top = cy - ry;

  // hair pieces drawn behind and in front of the head
  const back = L.style === 'long' ? (
    <path d={`M${cx - rx - 4} ${cy - 6} Q${cx - rx - 8} ${cy + 30} ${cx - rx + 2} ${cy + 36} L${cx + rx - 2} ${cy + 36} Q${cx + rx + 8} ${cy + 30} ${cx + rx + 4} ${cy - 6} Z`} fill={L.hair} />
  ) : null;

  let front = null;
  switch (L.style) {
    case 'short':
    case 'long':
      front = <path d={`M${cx - rx - 1} ${cy - 2} Q${cx - rx - 3} ${top - 6} ${cx} ${top - 5} Q${cx + rx + 3} ${top - 6} ${cx + rx + 1} ${cy - 2} Q${cx + rx - 4} ${top + 8} ${cx + 4} ${top + 7} Q${cx - 10} ${top + 9} ${cx - rx - 1} ${cy - 2}Z`} fill={L.hair} />;
      break;
    case 'side':
      front = <path d={`M${cx - rx - 1} ${cy - 4} Q${cx - rx} ${top - 6} ${cx + 2} ${top - 5} Q${cx + rx + 3} ${top - 4} ${cx + rx + 1} ${cy - 4} Q${cx + rx - 2} ${top + 6} ${cx - 6} ${top + 4} Q${cx - rx + 2} ${top + 12} ${cx - rx - 1} ${cy - 4}Z`} fill={L.hair} />;
      break;
    case 'swept':
      front = <path d={`M${cx - rx - 1} ${cy - 6} Q${cx - rx - 4} ${top - 10} ${cx + 6} ${top - 8} Q${cx + rx + 6} ${top - 2} ${cx + rx + 1} ${cy - 4} Q${cx + 4} ${top + 4} ${cx - rx - 1} ${cy - 6}Z`} fill={L.hair} />;
      break;
    case 'bun':
      front = (
        <g fill={L.hair}>
          <circle cx={cx} cy={top - 6} r="7" />
          <path d={`M${cx - rx - 1} ${cy - 3} Q${cx - rx - 2} ${top - 4} ${cx} ${top - 3} Q${cx + rx + 2} ${top - 4} ${cx + rx + 1} ${cy - 3} Q${cx + 8} ${top + 6} ${cx} ${top + 5} Q${cx - 8} ${top + 6} ${cx - rx - 1} ${cy - 3}Z`} />
        </g>
      );
      break;
    case 'curly':
      front = (
        <g fill={L.hair}>
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * (0.98 + (i / 10) * 1.04);
            return <circle key={i} cx={cx + Math.cos(a) * (rx + 1)} cy={cy - 4 + Math.sin(a) * (ry + 1)} r={6.5} />;
          })}
        </g>
      );
      break;
    case 'buzz':
      front = <path d={`M${cx - rx} ${cy - 6} Q${cx - rx} ${top - 2} ${cx} ${top - 2} Q${cx + rx} ${top - 2} ${cx + rx} ${cy - 6} Q${cx} ${top + 5} ${cx - rx} ${cy - 6}Z`} fill={L.hair} opacity="0.75" />;
      break;
    case 'bald':
      front = (
        <g fill={L.hair}>
          <path d={`M${cx - rx - 1} ${cy + 4} Q${cx - rx - 2} ${cy - 10} ${cx - rx + 5} ${cy - 13} L${cx - rx + 3} ${cy + 2}Z`} />
          <path d={`M${cx + rx + 1} ${cy + 4} Q${cx + rx + 2} ${cy - 10} ${cx + rx - 5} ${cy - 13} L${cx + rx - 3} ${cy + 2}Z`} />
        </g>
      );
      break;
    default:
  }

  const shoulderW = (L.child ? 34 : 50) * Math.min(1.2, Math.max(0.85, L.build));
  return (
    <svg viewBox="30 2 180 75" preserveAspectRatio="xMidYMid slice" className="ov-portrait" aria-label={`Portrait of ${person.name}, age ${L.age}`}>
      <defs>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor={`hsl(${L.bg} 28% 24%)`} />
          <stop offset="1" stopColor="#0b0a0e" />
        </radialGradient>
        <radialGradient id={`sk-${uid}`} cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor={mix(L.skin, '#ffffff', 0.12)} />
          <stop offset="1" stopColor={mix(L.skin, '#000000', 0.12)} />
        </radialGradient>
      </defs>
      <rect width="240" height="100" fill={`url(#bg-${uid})`} />

      {back}

      {/* shoulders + neck */}
      <path d={`M${cx - shoulderW - 14} 104 Q${cx - shoulderW} ${cy + ry + 12} ${cx} ${cy + ry + 10} Q${cx + shoulderW} ${cy + ry + 12} ${cx + shoulderW + 14} 104Z`} fill={clothes} {...stroke} />
      <path d={`M${cx - 7} ${cy + ry - 6} L${cx - 7} ${cy + ry + 9} Q${cx} ${cy + ry + 14} ${cx + 7} ${cy + ry + 9} L${cx + 7} ${cy + ry - 6}Z`} fill={mix(L.skin, '#000000', 0.15)} {...stroke} />
      {veryOld && <path d={`M${cx - 4} ${cy + ry + 1} q4 3 8 0`} fill="none" stroke={L.wrinkle} strokeWidth=".8" />}

      {/* ears + head */}
      <ellipse cx={cx - rx} cy={eyeY + 3} rx="3.4" ry="5.5" fill={L.skin} {...stroke} />
      <ellipse cx={cx + rx} cy={eyeY + 3} rx="3.4" ry="5.5" fill={L.skin} {...stroke} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#sk-${uid})`} {...stroke} />

      {/* facial hair under the features */}
      {L.facial === 'beard' && (
        <path d={`M${cx - rx + 1} ${cy + 2} Q${cx - rx + 2} ${cy + ry + 4} ${cx} ${cy + ry + 3} Q${cx + rx - 2} ${cy + ry + 4} ${cx + rx - 1} ${cy + 2} Q${cx + 10} ${cy + 14} ${cx} ${cy + 13} Q${cx - 10} ${cy + 14} ${cx - rx + 1} ${cy + 2}Z`} fill={L.hair} opacity=".92" />
      )}
      {L.facial === 'stubble' && (
        <path d={`M${cx - rx + 2} ${cy + 4} Q${cx} ${cy + ry + 6} ${cx + rx - 2} ${cy + 4} Q${cx} ${cy + 16} ${cx - rx + 2} ${cy + 4}Z`} fill={L.hair} opacity=".28" />
      )}

      {front}

      {/* brows */}
      <path d={`M${cx - 10} ${eyeY - 6 + (old ? 1 : 0)} q4 -2.5 7 0 M${cx + 3} ${eyeY - 6 + (old ? 1 : 0)} q4 -2.5 7 0`} fill="none" stroke={old ? mix(L.hair, '#ffffff', 0.2) : mix(L.hair, '#000000', 0.2)} strokeWidth={old ? 1.8 : 1.6} strokeLinecap="round" />
      {/* eyes */}
      <g fill="#1a1210">
        <ellipse cx={cx - 6.5} cy={eyeY} rx={eyeR} ry={eyeR * (old ? 0.75 : 1)} />
        <ellipse cx={cx + 6.5} cy={eyeY} rx={eyeR} ry={eyeR * (old ? 0.75 : 1)} />
      </g>
      <g fill="#fff" opacity=".8">
        <circle cx={cx - 5.9} cy={eyeY - 0.7} r=".6" />
        <circle cx={cx + 7.1} cy={eyeY - 0.7} r=".6" />
      </g>
      {/* nose + mouth */}
      <path d={`M${cx + 0.5} ${eyeY + 2} q1.5 6 -1.5 8 q2 1 3.5 -0.5`} fill="none" stroke={L.line} strokeWidth="1" strokeLinecap="round" />
      {L.facial === 'mustache' || L.facial === 'beard' ? (
        <path d={`M${cx - 7} ${cy + 13} Q${cx} ${cy + 9} ${cx + 7} ${cy + 13} Q${cx} ${cy + 11.5} ${cx - 7} ${cy + 13}Z`} fill={L.hair} stroke={L.hair} strokeWidth="1.6" strokeLinejoin="round" />
      ) : null}
      <path d={`M${cx - 4.5} ${cy + 15} q4.5 ${old ? 1.2 : 2.6} 9 0`} fill="none" stroke={L.lip} strokeWidth="1.6" strokeLinecap="round" />
      {L.child && <g fill="#e07a7a" opacity=".25"><circle cx={cx - 11} cy={eyeY + 7} r="3.5" /><circle cx={cx + 11} cy={eyeY + 7} r="3.5" /></g>}

      {/* age lines */}
      <g fill="none" stroke={L.wrinkle} strokeWidth=".8" strokeLinecap="round" opacity=".85">
        {mid && <path d={`M${cx - 8} ${eyeY - 11} q8 -2.5 16 0`} />}
        {old && <path d={`M${cx - 9} ${eyeY - 14} q9 -3 18 0 M${cx - 4.5} ${eyeY + 4} q-4 4 -4.5 9 M${cx + 5} ${eyeY + 4} q4 4 4.5 9`} />}
        {old && <path d={`M${cx - 9.5} ${eyeY + 2.6} q-2 -1 -3.6 -0.4 M${cx + 9.5} ${eyeY + 2.6} q2 -1 3.6 -0.4 M${cx - 9.5} ${eyeY - 0.5} l-3 -1 M${cx + 9.5} ${eyeY - 0.5} l3 -1`} />}
        {veryOld && <path d={`M${cx - 7} ${eyeY - 17.5} q7 -2 14 0 M${cx - 8.5} ${eyeY + 2.8} q2 1.6 4 0 M${cx + 4.5} ${eyeY + 2.8} q2 1.6 4 0 M${cx - 7} ${cy + 17} q-1 2.5 0 4.5 M${cx + 7} ${cy + 17} q1 2.5 0 4.5`} />}
      </g>

      {/* glasses */}
      {L.glasses && (
        <g fill="none" stroke="#d9c79a" strokeWidth="1" opacity=".9">
          <circle cx={cx - 6.5} cy={eyeY} r="4.6" />
          <circle cx={cx + 6.5} cy={eyeY} r="4.6" />
          <path d={`M${cx - 1.9} ${eyeY} h3.8 M${cx - 11.1} ${eyeY - 1} l-6 -1 M${cx + 11.1} ${eyeY - 1} l6 -1`} />
        </g>
      )}
    </svg>
  );
}
