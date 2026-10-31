// Generates the people database: server/data/people.json
//
//   npm run generate:people              (3000 people, seed 1031)
//   node server/scripts/generate-people.mjs 3000 42
//
// The output is deterministic for a given count + seed, so the database only changes when you
// regenerate it on purpose. Everyone is fictional.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '../data/cities.js';
import { FIRST_NAMES, LAST_NAMES, formatName, lastNameFor } from '../data/names.js';

const COUNT = Number(process.argv[2] ?? 3000);
const SEED = Number(process.argv[3] ?? 1031);
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'people.json');

/* ---------- seeded random ---------- */
let s = SEED >>> 0;
function rnd() {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];

/** Pick an item with probability proportional to weight(item). */
function pickWeighted(items, weight) {
  const total = items.reduce((sum, x) => sum + weight(x), 0);
  let r = rnd() * total;
  for (const x of items) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return items[items.length - 1];
}
const between = (a, b) => a + rnd() * (b - a);

/* ---------- ingredients ---------- */
/* ---------- names ---------- */
const appliesTo = (entry, city) => entry.cities.includes(city);

/** Last names that fit this city and this first name's culture and gender. */
function lastNamesFor(first, city) {
  return LAST_NAMES.filter(
      (l) => appliesTo(l, city) && first.with.includes(l.culture) && lastNameFor(l, first.gender),
  );
}

/** Pick a first name that fits the city, then a last name that fits both. */
function nameFor(city) {
  const first = pick(FIRST_NAMES.filter((f) => appliesTo(f, city)));
  const options = lastNamesFor(first, city);
  const last = pick(options);
  const parts = [lastNameFor(last, first.gender)];
  if (last.count === 2) {
    // a second, different surname from the same culture (paternal + maternal)
    const more = options.filter((l) => l.culture === last.culture && l !== last);
    parts.push(lastNameFor(pick(more), first.gender));
  }
  return { name: formatName(first, parts, last), gender: first.gender };
}

/* Fail loudly if the name lists leave any city, or any first name, without a match. */
function validate() {
  const known = new Set(CITIES.map((c) => c.name));
  const problems = [];
  for (const e of [...FIRST_NAMES, ...LAST_NAMES]) {
    for (const c of e.cities) if (!known.has(c)) problems.push(`unknown city "${c}" for ${JSON.stringify(e.name)}`);
  }
  for (const c of known) {
    if (!FIRST_NAMES.some((f) => appliesTo(f, c))) problems.push(`no first names for ${c}`);
  }
  for (const f of FIRST_NAMES) {
    for (const c of f.cities) {
      if (!lastNamesFor(f, c).length) problems.push(`no last name fits ${f.name} (${f.culture}) in ${c}`);
    }
  }
  if (problems.length) {
    console.error([...new Set(problems)].join('\n'));
    process.exit(1);
  }
}
validate();

const JOBS = [
  'baker', 'clockmaker', 'nurse', 'ferry pilot', 'teacher', 'beekeeper', 'courier', 'tailor', 'mechanic', 'lamplighter',
  'librarian', 'fisher', 'brewer', 'gardener', 'painter', 'farmer', 'taxi driver', 'accountant', 'chef', 'electrician',
  'florist', 'pharmacist', 'bus driver', 'architect', 'night guard', 'violinist', 'potter', 'shopkeeper', 'carpenter',
  'translator', 'midwife', 'astronomer', 'barber', 'postal worker', 'tram conductor', 'retired sailor',
];
const HABITS = [
  'hums on the walk home', 'collects odd buttons', 'never misses market day', 'feeds the stray cats',
  'writes letters nobody sends', 'grows enormous pumpkins', 'whistles off-key', 'keeps a diary of the weather',
  'swims in the sea all year round', 'knows every pigeon by name', 'is always ten minutes early',
  'plays chess in the park on Sundays', 'bakes too much bread for one', 'reads ghost stories before bed',
  'calls their mother every evening', 'fixes neighbours’ bicycles for free', 'sings in a choir',
  'keeps a jar of sea glass on the windowsill', 'walks a very old dog', 'tells the same three jokes',
];
const SKIN = [0xf1c7a5, 0xd9a27a, 0xb87a52, 0x8a5638, 0x5e3a26, 0xf6d6bd];
const HAIR = [0x1a1210, 0x4a2c17, 0x8a5a2a, 0xc9a14a, 0xb5b5b5, 0x7a2a1a];
const CLOTHES = [0x3a5a8a, 0x7a2a4a, 0x2f6a4a, 0xb06a2a, 0x5a4a8a, 0x8a8a3a, 0x2a2a3a, 0xa04040];
const HAIR_STYLES = ['bald', 'short', 'long'];
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

/* ---------- build ---------- */
const used = new Set();
const people = [];
for (let i = 0; i < COUNT; i++) {
  // location first (bigger cities are more likely), then a name that fits it
  const city = pickWeighted(CITIES, (c) => c.population);
  let who = nameFor(city.name);
  for (let tries = 0; used.has(who.name) && tries < 50; tries++) who = nameFor(city.name);
  used.add(who.name);

  const job = pick(JOBS);
  const habit = pick(HABITS);
  const month = 1 + Math.floor(rnd() * 12);
  const day = 1 + Math.floor(rnd() * MONTH_DAYS[month - 1]);

  people.push({
    id: 'p' + String(i + 1).padStart(4, '0'),
    name: who.name,
    gender: who.gender,
    job,
    bio: `Works as a ${job} in ${city.name} and ${habit}.`,
    city: city.name,
    country: city.country,
    tz: city.tz,
    // scattered a little around the city centre so dots don't stack
    lat: round(city.lat + between(-0.6, 0.6), 3),
    lon: round(city.lon + between(-0.6, 0.6), 3),
    birthday: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    look: {
      skin: hex(pick(SKIN)),
      hair: hex(pick(HAIR)),
      hairStyle: pick(HAIR_STYLES),
      shirt: hex(pick(CLOTHES)),
      pants: hex(pick(CLOTHES)),
      height: round(between(0.9, 1.1), 2),
      build: round(between(0.85, 1.2), 2),
    },
  });
}

// one person per line: readable in an editor, small diffs when regenerated
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, '[\n' + people.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n]\n');
console.log(`Wrote ${people.length} people to ${OUT}`);