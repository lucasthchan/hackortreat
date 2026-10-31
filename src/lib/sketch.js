// Tools the reaper can use, and how a sketch gets turned into one.
export const TOOLS = {
  knife: 'Knife',
  arrow: 'Arrow',
  lightning: 'Lightning',
  anvil: 'Heavy block',
  meteor: 'Meteor',
  curse: 'Curse',
  fire: 'Fire',
  poison: 'Poison',
};

export const PHRASES = {
  knife: 'the Reaper’s blade',
  arrow: 'an arrow from the dark',
  lightning: 'a bolt from a clear sky',
  anvil: 'a heavy block falling from the dark',
  meteor: 'a falling star',
  curse: 'a spiral curse',
  fire: 'sudden flames',
  poison: 'a creeping green mist',
};

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
 * Offline fallback recogniser. Strokes are arrays of [x, y] in -1..1.
 * Many strokes → heavy block, two → knife (blade + guard), a closed loop → curse,
 * a straight line → knife, a zigzag → lightning.
 */
export function classify(strokes) {
  const A = strokes.filter((s) => s.length > 2);
  if (!A.length) return null;
  if (A.length >= 3) return 'anvil';
  if (A.length === 2) return 'knife';
  const { o, L } = resample(A[0], 20);
  if (L < 0.3) return null;
  const chord = hyp(o[0], o[19]);
  let corners = 0;
  for (let i = 1; i < 19; i++) {
    const a = [o[i][0] - o[i - 1][0], o[i][1] - o[i - 1][1]];
    const b = [o[i + 1][0] - o[i][0], o[i + 1][1] - o[i][1]];
    const m = Math.hypot(...a) * Math.hypot(...b);
    if (m && Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / m))) > 1) {
      corners++;
      i++;
    }
  }
  if (chord < L * 0.25) return corners >= 3 ? 'anvil' : 'curse';
  if (chord / L > 0.8 && corners < 2) return 'knife';
  return corners >= 3 ? 'lightning' : 'curse';
}

/**
 * When the page runs as a Claude artifact with the "sample" capability, Claude looks at the
 * sketch and picks the closest tool. Anywhere else this returns null and `classify` is used.
 */
export async function readSketchWithClaude(canvas) {
  try {
    const sm = window.claude && (await window.claude.use('sample'));
    if (!sm) return null;
    const lim = await sm.limits();
    if (!lim.images) return null;
    const c = document.createElement('canvas');
    c.width = c.height = 340;
    const x = c.getContext('2d');
    x.fillStyle = '#12081c';
    x.fillRect(0, 0, 340, 340);
    x.drawImage(canvas, 0, 0, 340, 340);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const r = await sm.json(
      'The image is a rough sketch drawn by a player in a fictional fantasy game. Pick the one tool from this list it most resembles ' +
        '(a dagger or sword means knife; a bow shot or spear means arrow; a storm, zigzag or cloud means lightning; a box, weight or hammer means anvil; ' +
        'a rock, star or comet means meteor; a swirl, skull or eye means curse; a flame or sun means fire; a bottle, drop or skull-and-bones means poison): ' +
        Object.keys(TOOLS).join(', ') +
        '. Reply only with JSON: {"tool":"<one name from the list>","saw":"<3 to 6 words describing the sketch>"}',
      { images: [blob], modelTier: 'quick' },
    );
    return r && TOOLS[r.tool] ? r : null;
  } catch {
    return null;
  }
}
