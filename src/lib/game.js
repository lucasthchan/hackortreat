import { CITIES, FIRST_NAMES, LAST_NAMES } from './data.js';
import { isNight } from './sun.js';
import { TOOLS } from './sketch.js';

export const YEAR_MS = 365.2425 * 86400000;
export const HOUR = 3600000;
export const MIN = 60000;

export const AGE_SPREAD = 9; // std-dev (years) around the chosen average age of death
export const SCHEDULE_HORIZON_H = 72; // souls are scheduled to die within the next 3 days
export const ASSIGNMENT_WINDOW_H = 24; // the reaper's list shows deaths due within 24h
export const ESCAPE_AFTER_H = 6; // an unreaped soul becomes a lost ghost after 6h overdue
export const MAX_DELAYS = 3;
export const DELAY_MIN_MIN = 30; // delay range: 30 min …
export const DELAY_MAX_MIN = 12 * 60; // … to 12 hours

/* ---------- random helpers ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function gaussian(mean, sd) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const uid = () => Math.random().toString(36).slice(2, 10);

const JOBS = ['baker', 'clockmaker', 'nurse', 'ferry pilot', 'teacher', 'beekeeper', 'courier', 'tailor', 'mechanic',
  'lamplighter', 'librarian', 'fisher', 'brewer', 'gardener', 'painter', 'farmer', 'taxi driver', 'accountant'];
const HABITS = ['hums on the walk home', 'collects odd buttons', 'never misses market day', 'feeds the stray cats',
  'writes letters nobody sends', 'grows enormous pumpkins', 'whistles off-key', 'keeps a diary of the weather'];

/* ---------- people ---------- */
/**
 * Each soul gets an age at death drawn around the chosen average, and a death date in the
 * coming days (so the real-time game always has work). The birth date is derived from the two,
 * so birth + age-at-death = death date.
 */
export function createPerson(avgAge, windowStart, windowEnd) {
  const city = pick(CITIES);
  const ageAtDeath = Math.min(115, Math.max(1, gaussian(avgAge, AGE_SPREAD)));
  const deathAt = rand(windowStart, windowEnd);
  const birthAt = deathAt - ageAtDeath * YEAR_MS;
  const job = pick(JOBS);
  return {
    id: uid(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    job,
    bio: `Works as a ${job} in ${city.name} and ${pick(HABITS)}.`,
    city: city.name,
    country: city.country,
    tz: city.tz,
    // scatter people a little around the city centre so dots don't stack perfectly
    lat: city.lat + rand(-0.6, 0.6),
    lon: city.lon + rand(-0.6, 0.6),
    birthAt: Math.round(birthAt),
    deathAt: Math.round(deathAt),
    originalDeathAt: Math.round(deathAt),
    delays: 0,
    status: 'alive', // alive | reaped | lost
    reapedAt: null,
    tool: null,
  };
}

export function createWorld({ avgAge, population, startCity, now }) {
  const people = [];
  for (let i = 0; i < population; i++) {
    // a handful start already due so there's something to do immediately
    const early = i < Math.max(3, Math.ceil(population * 0.04));
    const ws = early ? now - 45 * MIN : now;
    const we = early ? now + 5 * MIN : now + SCHEDULE_HORIZON_H * HOUR;
    people.push(createPerson(avgAge, ws, we));
  }
  const city = CITIES.find((c) => c.name === startCity) ?? CITIES[0];
  return {
    version: 2,
    createdAt: now,
    avgAge,
    population,
    scheduledUntil: now + SCHEDULE_HORIZON_H * HOUR,
    people,
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
    const fresh = Array.from({ length: share }, () => createPerson(w.avgAge, w.scheduledUntil, newUntil));
    w = { ...w, people: [...w.people, ...fresh], scheduledUntil: newUntil };
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
const KEY = 'reaper-ledger-v2';
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
