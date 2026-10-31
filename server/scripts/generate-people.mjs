// Generates the people database: server/data/people.json
//
//   npm run generate:people              (1500 people, seed 1031)
//   node scripts/generate-people.mjs 3000 42
//
// The output is deterministic for a given count + seed, so the database only changes when you
// regenerate it on purpose. Everyone is fictional.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '../data/cities.js';

const COUNT = Number(process.argv[2] ?? 1500);
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
const between = (a, b) => a + rnd() * (b - a);

/* ---------- ingredients ---------- */
const FIRST = [
  'Ada', 'Amir', 'Aiko', 'Amara', 'Anya', 'Bea', 'Bruno', 'Chen', 'Chloé', 'Ciaran', 'Dmitri', 'Dara', 'Diego', 'Elif',
  'Emeka', 'Esme', 'Farah', 'Freya', 'Gustavo', 'Hana', 'Hugo', 'Ines', 'Ivan', 'Jun', 'Jonas', 'Kofi', 'Kira', 'Lena',
  'Luca', 'Lior', 'Maya', 'Mateo', 'Mei', 'Nadia', 'Noah', 'Nkechi', 'Olu', 'Orla', 'Priya', 'Pavel', 'Quinn', 'Rosa',
  'Rafael', 'Sven', 'Sana', 'Tariq', 'Tomás', 'Uma', 'Vera', 'Viktor', 'Wei', 'Wren', 'Ximena', 'Yusuf', 'Yara', 'Zara',
  'Zoltan', 'Edgar', 'Morticia', 'Vlad', 'Ichabod', 'Lenore', 'Boris', 'Agatha', 'Silas', 'Hester', 'Ezra', 'Odile',
];
const LAST = [
  'Abara', 'Bergström', 'Castillo', 'Dubois', 'Eriksen', 'Fujita', 'García', 'Haddad', 'Ivanova', 'Jansen', 'Kowalski',
  'Li', 'Mbeki', 'Nakamura', 'Okafor', 'Petrov', 'Quispe', 'Rossi', 'Silva', 'Tanaka', 'Usman', 'Varga', 'Wójcik', 'Xu',
  'Yilmaz', 'Zhang', 'Mensah', 'Novak', 'Oyelaran', 'Park', 'Reyes', 'Sato', 'Torres', 'Volkov', 'Weiss', 'Kaur',
  'Poe', 'Crane', 'Graves', 'Blackwood', 'Hollow', 'Ashworth', 'Thorne', 'Marsh', 'Nightingale', 'Vale', 'Wick', 'Moor',
];
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
  let name;
  do name = `${pick(FIRST)} ${pick(LAST)}`;
  while (used.has(name) && used.size < FIRST.length * LAST.length);
  used.add(name);

  const city = pick(CITIES);
  const job = pick(JOBS);
  const habit = pick(HABITS);
  const month = 1 + Math.floor(rnd() * 12);
  const day = 1 + Math.floor(rnd() * MONTH_DAYS[month - 1]);

  people.push({
    id: 'p' + String(i + 1).padStart(4, '0'),
    name,
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
