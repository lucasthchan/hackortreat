// Data access for the people database. The game reads people only through this module,
// so swapping the JSON file for a real backend (e.g. Supabase) means changing this file alone.
import PEOPLE from './data/people.json';

const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));

/** Number of people in the database. */
export const DATABASE_SIZE = PEOPLE.length;

/** Every person's id, in database order. */
export function allPersonIds() {
  return PEOPLE.map((p) => p.id);
}

/** One person's database record, or undefined if the id is unknown. */
export function getPerson(id) {
  return BY_ID.get(id);
}

export { CITIES } from './data/cities.js';
