// Tools the reaper can use, and how a sketch gets turned into one.
//
//   name     label shown on the shelf / ledger
//   icon     emoji shown on the shelf chip
//   phrase   used in the closing line: "<name> was taken by <phrase>."
//   starter  true = unlocked from the beginning, false = must be bought
//   cost     score the Reaper spends to unlock it (0 for starters)
//   hint     what the tool looks like when drawn (sent to Claude)
//   anim     optional: borrow another tool's animation (only needed if cinema.js
//            has no animation with this tool's own key)
export const TOOL_DEFS = {
  // ----- starters -----
  knife:        { name: 'Knife',          icon: '🗡️', phrase: 'the Reaper’s blade',                  starter: true,  cost: 0,   hint: 'dagger, sword, blade, knife, a straight line with a handle' },
  arrow:        { name: 'Arrow',          icon: '🏹', phrase: 'an arrow from the dark',              starter: true,  cost: 0,   hint: 'arrow, bow, spear, crossbow' },
  lightning:    { name: 'Lightning',      icon: '⚡', phrase: 'a bolt from a clear sky',             starter: true,  cost: 0,   hint: 'lightning bolt, zigzag, storm cloud' },
  anvil:        { name: 'Heavy block',    icon: '🧱', phrase: 'a heavy block falling from the dark', starter: true,  cost: 0,   hint: 'anvil, box, square block, weight, safe, hammer' },
  meteor:       { name: 'Meteor',         icon: '☄️', phrase: 'a falling star',                      starter: true,  cost: 0,   hint: 'meteor, comet, star, rock with a tail' },
  curse:        { name: 'Curse',          icon: '🌀', phrase: 'a spiral curse',                      starter: true,  cost: 0,   hint: 'spiral, swirl, evil eye, pentagram, magic wand' },
  fire:         { name: 'Fire',           icon: '🔥', phrase: 'sudden flames',                       starter: true,  cost: 0,   hint: 'flame, fire, torch, candle, campfire' },
  poison:       { name: 'Poison',         icon: '🧪', phrase: 'a creeping green mist',               starter: true,  cost: 0,   hint: 'potion bottle, flask, drop, skull and crossbones, poison apple' },
  // ----- unlockable (cheapest first) -----
  car_crash:    { name: 'Car crash',      icon: '🚗', phrase: 'a screech of tyres',                  starter: false, cost: 150, hint: 'car, truck, vehicle, wheels, steering wheel, road' },
  fall:         { name: 'Long fall',      icon: '🏢', phrase: 'a long way down',                     starter: false, cost: 150, hint: 'tall building, skyscraper, tower, cliff, ledge, ladder' },
  disease:      { name: 'Disease',        icon: '🦠', phrase: 'a quiet sickness',                    starter: false, cost: 200, hint: 'germ, virus, bacteria, thermometer, pill, syringe, sneeze' },
  drowning:     { name: 'Drowning',       icon: '🌊', phrase: 'the dark water',                      starter: false, cost: 200, hint: 'waves, water, sea, boat, anchor, fish, bathtub' },
  train:        { name: 'Train',          icon: '🚂', phrase: 'the midnight train',                  starter: false, cost: 250, hint: 'train, locomotive, rails, railway tracks, tram' },
  avalanche:    { name: 'Avalanche',      icon: '🏔️', phrase: 'a wall of snow',                      starter: false, cost: 300, hint: 'snowy mountain, peaks, triangle mountain, snowball' },
  earthquake:   { name: 'Earthquake',     icon: '🌋', phrase: 'the ground splitting open',           starter: false, cost: 300, hint: 'crack in the ground, jagged split, volcano, rubble' },
  explosion:    { name: 'Explosion',      icon: '💣', phrase: 'a blinding blast',                    starter: false, cost: 350, hint: 'bomb with fuse, dynamite, burst, spiky explosion star, grenade' },
  beast:        { name: 'Wild beast',     icon: '🐺', phrase: 'teeth in the dark',                   starter: false, cost: 400, hint: 'wolf, bear, shark, claws, fangs, paw print, snake, spider' },
  freeze:       { name: 'Freezing',       icon: '❄️', phrase: 'a bitter, creeping frost',            starter: false, cost: 450, hint: 'snowflake, icicle, ice cube, snowman, thermometer at zero' },
  heart_attack: { name: 'Heart attack',   icon: '💔', phrase: 'a heart that simply stopped',         starter: false, cost: 500, hint: 'heart, broken heart, heartbeat / ECG line' },
  haunt:        { name: 'Haunting',       icon: '👻', phrase: 'a fright beyond bearing',             starter: false, cost: 600, hint: 'ghost, sheet ghost, coffin, bat, haunted house, tombstone' },
};

export const TOOL_KEYS = Object.keys(TOOL_DEFS);
export const DEFAULT_UNLOCKED = TOOL_KEYS.filter((k) => TOOL_DEFS[k].starter);

// Old exports, kept so SoulPanel.jsx, Cinema.jsx and game.js keep working unchanged.
export const TOOLS = Object.fromEntries(TOOL_KEYS.map((k) => [k, TOOL_DEFS[k].name]));
export const PHRASES = Object.fromEntries(TOOL_KEYS.map((k) => [k, TOOL_DEFS[k].phrase]));

/* =====================================================================
 * 1. Offline recogniser (used only when Claude can't be reached)
 * ===================================================================== */
const hyp = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function resample(s, n) {
  let L = 0;
  const d = [0];
  for (let i = 1; i < s.length; i++) {
    L += hyp(s[i], s[i - 1]);
    d.push(L);
  }
  const o = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const t = (L * i) / (n - 1);
    while (j < s.length - 1 && d[j] < t) j++;
    const a = s[j - 1];
    const b = s[j];
    const u = (t - d[j - 1]) / (d[j] - d[j - 1] || 1);
    o.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return { o, L };
}

/**
 * Strokes are arrays of [x, y] in -1..1. Only three shapes are clear enough to read without AI:
 *   one straight line        → knife
 *   one zigzag (2+ corners)  → lightning
 *   one spiral (1.5+ turns)  → curse
 * Anything else returns null, which the dialog reports as "unrecognizable".
 */
export function classify(strokes) {
  const A = strokes.filter((s) => s.length > 2);
  if (A.length !== 1) return null;
  const N = 32;
  const { o, L } = resample(A[0], N);
  if (L < 0.3) return null;
  const chord = hyp(o[0], o[N - 1]);
  // signed turn at point i, looking `w` points back and ahead
  const turnAt = (i, w) => {
    const a = [o[i][0] - o[i - w][0], o[i][1] - o[i - w][1]];
    const b = [o[i + w][0] - o[i][0], o[i + w][1] - o[i][1]];
    return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
  };
  let turning = 0; // total signed turning: ~0 for a zigzag, ~2π per loop for a circle or spiral
  for (let i = 1; i < N - 1; i++) turning += turnAt(i, 1);
  let corners = 0; // sharp bends, measured over a wider window so a corner split between samples still counts
  for (let i = 2; i < N - 2; i++) {
    if (Math.abs(turnAt(i, 2)) > 1) {
      corners++;
      i += 2;
    }
  }
  const turns = Math.abs(turning) / (2 * Math.PI);
  if (chord / L > 0.85 && corners === 0) return 'knife';
  if (turns >= 1.5) return 'curse';
  if (corners >= 2 && turns < 0.75) return 'lightning'; // sharp corners that turn both ways
  return null;
}

/* =====================================================================
 * 2. Claude recogniser
 * ===================================================================== */
export const CLAUDE_MODEL = 'claude-haiku-5-5'; // swap for 'claude-sonnet-5-5' if you want sharper reading

/** Draw the strokes black-on-white (much easier for a vision model than the glowing pad). */
export function sketchToPng(strokes, size = 384) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, size, size);
  x.strokeStyle = '#000000';
  x.lineWidth = size / 60;
  x.lineCap = x.lineJoin = 'round';
  strokes.forEach((s) => {
    x.beginPath();
    s.forEach((q, i) => {
      const px = ((q[0] + 1) / 2) * size;
      const py = ((1 - q[1]) / 2) * size;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    });
    if (s.length === 1) x.lineTo(((s[0][0] + 1) / 2) * size + 0.1, ((1 - s[0][1]) / 2) * size);
    x.stroke();
  });
  return c.toDataURL('image/png');
}

/**
 * The exact request body for POST https://api.anthropic.com/v1/messages.
 * Shared by the browser (dev mode) and the server, so the prompt lives in one place.
 * `base64` is the PNG data WITHOUT the "data:image/png;base64," prefix.
 */
const SYSTEM_PROMPT =
    'You are the eyes of the Grim Reaper in a cartoon Halloween game. The player sketches a way of death with a mouse ' +
    'or finger, so drawings are rough. Match the sketch to ONE tool from the list. Be generous with rough sketches that ' +
    'clearly aim at a tool, but if the drawing does not resemble any tool (random scribbles, letters, a smiley, a house, ' +
    'a flower...) answer "unknown". Never force a match.';
const toolList = () => TOOL_KEYS.map((k) => `- ${k}: ${TOOL_DEFS[k].name} (looks like: ${TOOL_DEFS[k].hint})`).join('\n');
const SAW_HINT = 'What the sketch looks like, 2 to 5 words, e.g. "a car with two wheels".';

export function claudeRequestBody(base64) {
  const list = toolList();
  return {
    model: CLAUDE_MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: 'pick_tool',
        description: 'Report which tool the sketch shows.',
        input_schema: {
          type: 'object',
          properties: {
            saw: { type: 'string', description: SAW_HINT },
            tool: { type: 'string', enum: [...TOOL_KEYS, 'unknown'] },
          },
          required: ['saw', 'tool'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'pick_tool' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: `Tools:\n${list}\n\nWhich tool is this sketch?` },
        ],
      },
    ],
  };
}

/** Turn Claude's raw API reply into { tool, saw }. tool is null when the sketch is unrecognizable. */
export function parseClaudeReply(data) {
  const block = data?.content?.find?.((b) => b.type === 'tool_use');
  const input = block?.input;
  if (!input) throw new Error('Claude gave no answer');
  const saw = String(input.saw || '').slice(0, 60);
  return { tool: TOOL_DEFS[input.tool] ? input.tool : null, saw };
}

/* ----- Gemini (Google) version of the same request ----- */
// Flash-Lite is Google's fastest Gemini model and thinks only minimally by default, which suits a quick
// "which of these doodles is it?" question. If it isn't available for your key, we retry once on 3.8 Flash.
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_FALLBACK = 'gemini-3.8-flash';
const SKETCH_PX = 256; // small image = faster upload and fewer image tokens; a doodle doesn't need more
export const geminiUrl = (model = GEMINI_MODEL) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Body for POST geminiUrl(), with header  x-goog-api-key: <key>. */
export function geminiRequestBody(base64, model = GEMINI_MODEL) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          { text: `Tools:\n${toolList()}\n\nWhich tool is this sketch?` },
        ],
      },
    ],
    generationConfig: {
      // keep thinking as short as the model allows (3.8 Flash doesn't accept "minimal")
      thinkingConfig: { thinkingLevel: model.includes('lite') ? 'minimal' : 'low' },
      maxOutputTokens: 120,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          saw: { type: 'STRING', description: SAW_HINT },
          tool: { type: 'STRING', enum: [...TOOL_KEYS, 'unknown'] },
        },
        required: ['saw', 'tool'],
      },
    },
  };
}

/** Gemini's raw reply → { tool, saw }. tool is null when the sketch is unrecognizable. */
export function parseGeminiReply(data) {
  const text = data?.candidates?.[0]?.content?.parts?.find?.((p) => p.text)?.text;
  if (!text) throw new Error('Gemini gave no answer');
  const input = JSON.parse(text);
  return { tool: TOOL_DEFS[input.tool] ? input.tool : null, saw: String(input.saw || '').slice(0, 60) };
}

/**
 * Ask the AI (Claude or Gemini) what the sketch is.
 *   → { tool: 'car_crash', saw: 'a small car', via: 'claude' }   recognised
 *   → { tool: null, saw: 'a smiley face', via: 'claude' }        Claude looked, it's not a tool
 *   → null                                                        Claude can't be reached → use classify()
 *
 * Route 1 (normal): POST /api/recognize on our own server, which holds the API key.
 * Route 2 (dev only): a key in .env.local calls the AI straight from the browser:
 *   VITE_GEMINI_API_KEY → Gemini, VITE_ANTHROPIC_API_KEY → Claude.
 *   `import.meta.env.DEV` is false in `npm run build`, so the key never ships.
 */
export async function readSketchWithClaude(strokes) {
  const image = sketchToPng(strokes, SKETCH_PX);
  const base64 = image.split(',')[1];
  const devGemini = import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY;

  // in dev with a Gemini key there's no game server to ask, so go straight to Gemini
  if (!devGemini) try {
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    if (res.ok) {
      const r = await res.json(); // server returns { tool, saw }
      return { tool: TOOL_DEFS[r?.tool] ? r.tool : null, saw: String(r?.saw || ''), via: 'claude' };
    }
  } catch {
    /* no server running: try the dev route */
  }

  if (devGemini) {
    const ask = (model) =>
      fetch(geminiUrl(model), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY },
        body: JSON.stringify(geminiRequestBody(base64, model)),
      });
    try {
      const t0 = performance.now();
      let model = GEMINI_MODEL;
      let res = await ask(model);
      if (res.status === 400 || res.status === 404) {
        console.warn(`[sketch] ${model} unavailable (${res.status}), retrying on ${GEMINI_FALLBACK}`, await res.text());
        model = GEMINI_FALLBACK;
        res = await ask(model);
      }
      if (!res.ok) {
        console.warn('[sketch] Gemini API error', res.status, await res.text());
        return null;
      }
      const out = { ...parseGeminiReply(await res.json()), via: 'gemini' };
      console.info(`[sketch] ${model} answered in ${Math.round(performance.now() - t0)} ms:`, out);
      return out;
    } catch (e) {
      console.warn('[sketch] Gemini API unreachable', e);
      return null;
    }
  }

  if (import.meta.env.DEV && import.meta.env.VITE_ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(claudeRequestBody(base64)),
      });
      if (!res.ok) {
        console.warn('[sketch] Claude API error', res.status, await res.text());
        return null;
      }
      return { ...parseClaudeReply(await res.json()), via: 'claude' };
    } catch (e) {
      console.warn('[sketch] Claude API unreachable', e);
    }
  }
  return null;
}