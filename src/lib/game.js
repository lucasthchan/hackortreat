import { allPersonIds, CITIES, DATABASE_SIZE, getPerson } from '../../server/db.js';
import { isNight } from './sun.js';
import { TOOLS } from './sketch.js';

export const YEAR_MS = 365.2425 * 86400000;
export const HOUR = 3600000;
export const MIN = 60000;

export const AGE_SPREAD = 12; // std-dev (years) of the main bump of lifespans
export const EARLY_DEATH_SHARE = 0.06; // share of people who die unexpectedly young …
export const EARLY_DEATH_GAP = 15; // … at any age from 1 up to this many years below the average
export const SCHEDULE_HORIZON_H = 72; // souls are scheduled to die within the next 3 days
export const ASSIGNMENT_WINDOW_H = 24; // the reaper's list shows deaths due within 24h
export const ESCAPE_AFTER_H = 6; // an unreaped soul becomes a lost ghost after 6h overdue
export const MAX_DELAYS = 3;
export const DELAY_MIN_MIN = 30; // delay range: 30 min …
export const DELAY_MAX_MIN = 12 * 60; // … to 12 hours

/* ---------- random helpers ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
function gaussian(mean, sd) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- lifespans ---------- */
/**
 * Lifespans are a mix of two parts:
 *  - most people (94%) fall in a bell curve around the peak,
 *  - a few (6%) die unexpectedly young, at any age from 1 to (average - 15).
 * The peak sits slightly above the chosen average so that the overall average still matches it.
 */
function lifespanModel(avgAge) {
  const youngMax = Math.max(2, avgAge - EARLY_DEATH_GAP);
  const youngMean = (1 + youngMax) / 2;
  const peak = (avgAge - EARLY_DEATH_SHARE * youngMean) / (1 - EARLY_DEATH_SHARE);
  return { youngMax, peak };
}

export function sampleLifespan(avgAge) {
  const { youngMax, peak } = lifespanModel(avgAge);
  const age = Math.random() < EARLY_DEATH_SHARE ? rand(1, youngMax) : gaussian(peak, AGE_SPREAD);
  return Math.min(115, Math.max(1, age));
}

/** Probability density of dying at `age` (used to draw the setup screen's curve). */
export function lifespanDensity(age, avgAge) {
  const { youngMax, peak } = lifespanModel(avgAge);
  const bell = Math.exp(-((age - peak) ** 2) / (2 * AGE_SPREAD ** 2)) / (AGE_SPREAD * Math.sqrt(2 * Math.PI));
  const young = age >= 1 && age <= youngMax ? 1 / (youngMax - 1) : 0;
  return (1 - EARLY_DEATH_SHARE) * bell + EARLY_DEATH_SHARE * young;
}

/* ---------- people (from the database) ---------- */
export { DATABASE_SIZE };

/**
 * Birth timestamp on the person's fixed birthday (from the database) in whichever year makes
 * their age at `deathAt` closest to `targetAge`.
 */
function birthFor(birthday, deathAt, targetAge) {
  const [m, d] = birthday.split('-').map(Number);
  const y0 = Math.round(new Date(deathAt).getUTCFullYear() - targetAge);
  let best = null;
  for (const y of [y0 - 1, y0, y0 + 1]) {
    const t = Date.UTC(y, m - 1, d, 12);
    if (t >= deathAt) continue;
    const diff = Math.abs((deathAt - t) / YEAR_MS - targetAge);
    if (!best || diff < best.diff) best = { t, diff };
  }
  return best.t;
}

/**
 * Turns a database record into a soul on the schedule. Everything about who they are comes
 * from the database; the game only adds when they die (in [windowStart, windowEnd]) and, from a
 * lifespan drawn around the chosen average, which year they were born.
 */
export function schedulePerson(record, avgAge, windowStart, windowEnd) {
  const deathAt = Math.round(rand(windowStart, windowEnd));
  const targetAge = sampleLifespan(avgAge);
  return {
    ...record,
    birthAt: birthFor(record.birthday, deathAt, targetAge),
    deathAt,
    originalDeathAt: deathAt,
    delays: 0,
    status: 'alive', // alive | reaped | lost
    reapedAt: null,
    tool: null,
  };
}

export function createWorld({ avgAge, population, startCity, now }) {
  const order = shuffle(allPersonIds());
  const first = order.slice(0, Math.min(population, order.length));
  const early = Math.max(3, Math.ceil(population * 0.04));
  // a handful start already due so there's something to do immediately
  const people = first.map((id, i) =>
      i < early
          ? schedulePerson(getPerson(id), avgAge, now - 45 * MIN, now + 5 * MIN)
          : schedulePerson(getPerson(id), avgAge, now, now + SCHEDULE_HORIZON_H * HOUR),
  );
  const city = CITIES.find((c) => c.name === startCity) ?? CITIES[0];
  return {
    version: 3,
    createdAt: now,
    avgAge,
    population,
    scheduledUntil: now + SCHEDULE_HORIZON_H * HOUR,
    people,
    queue: order.slice(first.length), // database ids not yet scheduled
    reaper: { lat: city.lat, lon: city.lon, place: city.name },
    log: [{ at: now, text: `The ledger opens. Average age of death set to ${avgAge}.` }],
    score: 0,
  };
}

/* ---------- scoring ---------- */
function scoreReap(person, at) {
  const diffH = (at - person.deathAt) / HOUR;
  if (diffH < -1) return { pts: 20, label: 'early, taking time that wasn’t yours' };
  if (diffH <= 1) return { pts: 100, label: 'right on time' };
  return { pts: Math.max(30, Math.round(100 - diffH * 12)), label: `${diffH.toFixed(1)}h late` };
}

/* ---------- state transitions (pure: return new world) ---------- */
export function canReap(person, at) {
  if (!person || person.status !== 'alive') return false;
  return isNight(person.lat, person.lon, new Date(at));
}

/** The reaper travels instantly, so a reap happens wherever and whenever it is night. */
export function reap(world, personId, toolKey, at) {
  const toolName = (TOOLS[toolKey] || toolKey).toLowerCase();
  const person = world.people.find((p) => p.id === personId);
  if (!canReap(person, at)) return { world, result: null };
  const s = scoreReap(person, at);
  return {
    world: {
      ...world,
      reaper: { lat: person.lat, lon: person.lon, place: person.city },
      score: world.score + s.pts,
      people: world.people.map((p) =>
          p.id === personId ? { ...p, status: 'reaped', reapedAt: at, tool: toolKey } : p,
      ),
      log: [{ at, text: `Reaped ${person.name} in ${person.city} with ${toolName}, ${s.label} (+${s.pts}).` }, ...world.log].slice(0, 80),
    },
    result: s,
  };
}

export function delayDeath(world, personId, now) {
  const person = world.people.find((p) => p.id === personId);
  if (!person || person.status !== 'alive' || person.delays >= MAX_DELAYS) return { world, delayMs: 0 };
  const delayMs = Math.round(rand(DELAY_MIN_MIN, DELAY_MAX_MIN) * MIN);
  const base = Math.max(person.deathAt, now);
  const people = world.people.map((p) =>
      p.id === personId ? { ...p, deathAt: base + delayMs, delays: p.delays + 1 } : p,
  );
  return {
    world: {
      ...world,
      people,
      log: [{ at: now, text: `${person.name} granted ${fmtDuration(delayMs)} more.` }, ...world.log].slice(0, 80),
    },
    delayMs,
  };
}

/** Advance the world to `now`: mark lost souls, schedule new deaths. `protectId` is mid-reap. */
export function tick(world, now, protectId = null) {
  let w = world;
  let changed = false;
  const events = [];

  const cutoff = now - ESCAPE_AFTER_H * HOUR;
  const escaping = (p) => p.status === 'alive' && p.deathAt < cutoff && p.id !== protectId;
  if (w.people.some(escaping)) {
    const lost = w.people.filter(escaping);
    w = {
      ...w,
      people: w.people.map((p) => (escaping(p) ? { ...p, status: 'lost' } : p)),
      score: w.score - 50 * lost.length,
      log: [...lost.map((p) => ({ at: now, text: `${p.name} slipped away as a wandering ghost (−50).` })), ...w.log],
    };
    lost.forEach((p) => events.push({ type: 'lost', person: p }));
    changed = true;
  }

  // keep the schedule topped up so real time never runs dry
  if (w.scheduledUntil < now + (SCHEDULE_HORIZON_H - 12) * HOUR) {
    const newUntil = now + SCHEDULE_HORIZON_H * HOUR;
    const share = Math.round((w.population * (newUntil - w.scheduledUntil)) / (SCHEDULE_HORIZON_H * HOUR));
    const ids = w.queue.slice(0, share); // once the database runs out, nobody new is scheduled
    const fresh = ids.map((id) => schedulePerson(getPerson(id), w.avgAge, w.scheduledUntil, newUntil));
    w = { ...w, people: [...w.people, ...fresh], queue: w.queue.slice(ids.length), scheduledUntil: newUntil };
    changed = true;
  }

  return { world: changed ? { ...w, log: w.log.slice(0, 80) } : world, events };
}

/* ---------- formatting ---------- */
export function fmtDuration(ms) {
  const neg = ms < 0;
  let s = Math.abs(Math.round(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  let out;
  if (d) out = `${d}d ${h}h`;
  else if (h) out = `${h}h ${String(m).padStart(2, '0')}m`;
  else if (m) out = `${m}m ${String(s).padStart(2, '0')}s`;
  else out = `${s}s`;
  return neg ? `-${out}` : out;
}

export function ageAt(person, at) {
  return Math.floor((at - person.birthAt) / YEAR_MS);
}

export function localTime(tz, at, opts = {}) {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit', ...opts }).format(at);
  } catch {
    return new Date(at).toLocaleTimeString();
  }
}

/* ---------- persistence ---------- */
const KEY = 'reaper-ledger-v3';
export function loadWorld() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveWorld(world) {
  try {
    if (world) localStorage.setItem(KEY, JSON.stringify(world));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — game still runs in memory */
  }
}