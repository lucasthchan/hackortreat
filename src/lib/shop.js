// Unlocking tools. Pure functions: they take a world and return a new one.
// Nothing here needs createWorld() to change: a world with no `unlocked` / `spent`
// fields (old saves, fresh worlds) falls back to the starter tools and 0 spent.
import { DEFAULT_UNLOCKED, TOOL_DEFS } from './sketch.js';

export const getUnlocked = (world) => world?.unlocked ?? DEFAULT_UNLOCKED;
export const isUnlocked = (world, key) => getUnlocked(world).includes(key);

/** Score you can still spend. `score` itself never goes down when you buy. */
export const getBalance = (world) => (world?.score ?? 0) - (world?.spent ?? 0);

export function buyTool(world, key, at = Date.now()) {
  const def = TOOL_DEFS[key];
  if (!def) return { world, ok: false, reason: 'Unknown tool.' };
  if (isUnlocked(world, key)) return { world, ok: false, reason: `${def.name} is already unlocked.` };
  const balance = getBalance(world);
  if (balance < def.cost) {
    return { world, ok: false, reason: `${def.name} costs ${def.cost}. You have ${Math.max(0, balance)}.` };
  }
  return {
    ok: true,
    reason: '',
    world: {
      ...world,
      unlocked: [...getUnlocked(world), key],
      spent: (world.spent ?? 0) + def.cost,
      log: [{ at, text: `Unlocked ${def.name} for ${def.cost}.` }, ...world.log].slice(0, 80),
    },
  };
}