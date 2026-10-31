/*
 * How a soul looks, shared by the map portrait (src/components/Portrait.jsx) and the kill cinematic
 * (src/lib/cinema.js), so it's always the same person in both.
 *
 * From the database (`person.look`, `person.gender`): hair style (bald / short / long), shirt, build.
 * From where they live: skin tone and natural hair colour, picked from a natural range for the region
 *   (mixed countries get a wide range, so not everyone from one place looks the same).
 * From their age: greying / white hair, wrinkles, glasses (drawn by the portrait).
 * Everything is seeded by the person's id, so it never changes between visits.
 */

/* ---------- palettes ---------- */
const SKIN = {
  eastAsia: ['#f3d9bf', '#efd0b0', '#e8c39e', '#dfb48c', '#f1d3b3'],
  seAsia: ['#e2b48a', '#d9a878', '#c99566', '#b9845a', '#d4a070'],
  southAsia: ['#d6a273', '#c68e5f', '#b97f52', '#a8714a', '#8c5a3a'],
  mena: ['#e3b993', '#d9a97f', '#c79670', '#b8875f', '#a8774f'],
  africa: ['#7d5236', '#6e4630', '#5b3a26', '#4a2e1e', '#3c2418'],
  northEurope: ['#f7e2d3', '#f4dccb', '#efd0b8', '#e8c4a6', '#f2d6c2'],
  southEurope: ['#f0d2b6', '#e9c7a5', '#e0b893', '#d4a882', '#c9996f'],
  latam: ['#f0d0b0', '#e8c29c', '#d9a679', '#c48e62', '#b47a50', '#8a5a3a'],
  pacific: ['#a06a44', '#8a5a3a', '#7a4e32', '#b07a50'],
};
SKIN.mixed = [
  ...SKIN.northEurope, ...SKIN.southEurope, ...SKIN.africa.slice(0, 3),
  ...SKIN.eastAsia.slice(0, 2), ...SKIN.southAsia.slice(1, 4), ...SKIN.latam.slice(2, 5),
];

const DARK_HAIR = ['#1b1512', '#2a1f1a', '#33241b'];
const HAIR = {
  eastAsia: DARK_HAIR,
  seAsia: DARK_HAIR,
  southAsia: DARK_HAIR,
  mena: [...DARK_HAIR, '#4a3020'],
  africa: ['#151110', '#1f1814', '#2a201a'],
  northEurope: ['#d8b56a', '#c9a45c', '#a8763e', '#6b4429', '#4a2f1d', '#9a4a24', '#2b1d14'],
  southEurope: ['#2b1d14', '#3a2618', '#4a2f1d', '#6b4429', '#1b1512'],
  latam: ['#1b1512', '#2b1d14', '#3a2618', '#4a2f1d'],
  pacific: DARK_HAIR,
};
HAIR.mixed = [...HAIR.northEurope, ...DARK_HAIR];

const REGION = {
  China: 'eastAsia', 'Hong Kong SAR': 'eastAsia', Japan: 'eastAsia', 'South Korea': 'eastAsia', Mongolia: 'eastAsia', Vietnam: 'eastAsia',
  Thailand: 'seAsia', Indonesia: 'seAsia', Philippines: 'seAsia',
  India: 'southAsia', Pakistan: 'southAsia', Bangladesh: 'southAsia', Nepal: 'southAsia',
  'Saudi Arabia': 'mena', UAE: 'mena', Iran: 'mena', Egypt: 'mena', Morocco: 'mena', Turkey: 'mena',
  Nigeria: 'africa', Ghana: 'africa', Kenya: 'africa', Ethiopia: 'africa', 'DR Congo': 'africa',
  Madagascar: 'pacific', Fiji: 'pacific',
  Iceland: 'northEurope', Ireland: 'northEurope', UK: 'northEurope', Sweden: 'northEurope', Norway: 'northEurope',
  Netherlands: 'northEurope', Germany: 'northEurope', Poland: 'northEurope', Czechia: 'northEurope', Russia: 'northEurope',
  France: 'southEurope', Spain: 'southEurope', Portugal: 'southEurope', Italy: 'southEurope', Greece: 'southEurope', Romania: 'southEurope',
  Mexico: 'latam', Cuba: 'latam', Colombia: 'latam', Peru: 'latam', Chile: 'latam', Argentina: 'latam', Brazil: 'latam',
  // USA, Canada, Australia, New Zealand, South Africa, Singapore … → mixed
};

const SHIRTS = ['#2b2433', '#3a2a2a', '#22303a', '#2f3a2a', '#3a3424', '#40222c', '#1f2430', '#4a3a52'];
const YEAR_MS = 365.2425 * 86400000;

/* ---------- helpers ---------- */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p, sh) => (p >> sh) & 255;
  const m = (sh) => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * t);
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}

/** Current age in whole years (or at the moment they were reaped). */
export function ageOf(person, now = Date.now()) {
  if (person.birthAt == null) return 40;
  return Math.max(0, Math.floor((Math.min(now, person.reapedAt ?? now) - person.birthAt) / YEAR_MS));
}

/**
 * Everything the portrait and the cinematic need to draw this soul.
 * `style` is the detailed 2D hair style; `hairStyle` stays one of the database's bald / short / long.
 */
export function lookFor(person, age = ageOf(person)) {
  const r = rng(hash(person.id));
  const db = person.look ?? {};
  const region = REGION[person.country] || 'mixed';
  const gender = person.gender ?? (r() < 0.5 ? 'm' : 'f');

  const skin = pick(r, SKIN[region]);
  let hair = pick(r, HAIR[region]);
  if (age >= 72) hair = pick(r, ['#ecebe6', '#dcdcd8', '#c9c9c6']);
  else if (age >= 55) hair = mix(hair, '#bdbdbd', 0.45 + r() * 0.3);
  else if (age >= 45) hair = mix(hair, '#a9a9a9', r() * 0.3);

  const child = age < 13;
  const hairStyle = db.hairStyle ?? pick(r, ['short', 'short', 'long', 'bald']);
  let style;
  if (hairStyle === 'bald') style = child ? 'buzz' : 'bald';
  else if (hairStyle === 'long') style = gender === 'f' && r() < 0.35 ? 'bun' : 'long';
  else {
    const shortStyles = region === 'africa' ? ['curly', 'buzz', 'curly', 'short'] : ['short', 'side', 'swept', 'curly', 'buzz'];
    style = pick(r, shortStyles);
  }

  const facial = gender === 'm' && !child && age >= 18 && r() < 0.38 ? pick(r, ['mustache', 'beard', 'stubble']) : null;
  const glasses = age >= 60 ? r() < 0.5 : r() < 0.12;

  return {
    region, gender, age, child, skin, hair, hairStyle, style, facial, glasses,
    shirt: db.shirt ?? pick(r, SHIRTS),
    build: db.build ?? 1,
    line: mix(skin, '#1a0f0a', 0.5),
    wrinkle: mix(skin, '#3a2014', 0.45),
    lip: mix(skin, '#8a3a3a', 0.35),
    bg: hash(person.id + 'bg') % 360,
  };
}
