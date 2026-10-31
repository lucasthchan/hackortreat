// The kill cinematic, ported from "The Reaper's Atlas": a moonlit graveyard, the hooded reaper
// glides in, and the chosen fate plays out before the soul rises.
import * as THREE from 'three';
import { addStars, createTweens, ease } from './geo3d.js';
import { TOOL_DEFS } from './sketch.js';
import { lookFor } from './appearance.js';

const R = Math;
const PI = Math.PI;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + R.random() * (b - a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const YEAR_MS = 365.2425 * 86400000;

// In cinema.js, select from the line  <<<<<<< char_2  (line 14)
// down to and including the line  >>>>>>> main  (line 172),
// delete it, and paste everything BELOW this comment block in its place.
// The line right after should be a lone  }  (that closes the function).

/* =====================================================================
 * Looks: gender, region, age → a person's appearance
 * ===================================================================== */

// Skin tones, light to deep
const TONE = {
  porcelain: 0xf7dfd0, fair: 0xf1cdb3, light: 0xe9bf9c, warm: 0xebc8a2, beige: 0xdcae86, golden: 0xd9a777,
  olive: 0xc79566, tan: 0xb27b50, caramel: 0x9a6640, brown: 0x80502f, dark: 0x633b22, deep: 0x4a2b19,
};
const T_ = TONE;
const REGION_SKIN = {
  europe: [T_.porcelain, T_.fair, T_.fair, T_.light, T_.beige],
  mena: [T_.light, T_.beige, T_.golden, T_.olive, T_.tan],
  africa: [T_.caramel, T_.brown, T_.brown, T_.dark, T_.dark, T_.deep],
  south_asia: [T_.golden, T_.olive, T_.tan, T_.caramel, T_.brown],
  east_asia: [T_.fair, T_.warm, T_.warm, T_.beige, T_.golden],
  se_asia: [T_.beige, T_.golden, T_.olive, T_.tan, T_.caramel],
  latam: [T_.light, T_.beige, T_.golden, T_.olive, T_.tan, T_.caramel, T_.brown],
  pacific: [T_.tan, T_.caramel, T_.brown, T_.dark],
  mixed: Object.values(TONE),
};

const HAIR_C = { black: 0x15100e, dbrown: 0x3b2416, brown: 0x6b4426, auburn: 0x7a3218, blond: 0xc9a25a, ash: 0xa48a62 };
const REGION_HAIR = {
  europe: ['black', 'dbrown', 'dbrown', 'brown', 'brown', 'blond', 'ash', 'auburn'],
  mixed: ['black', 'black', 'dbrown', 'dbrown', 'brown', 'blond', 'auburn'],
  latam: ['black', 'black', 'dbrown', 'dbrown', 'brown'],
  default: ['black', 'black', 'black', 'dbrown'],
};
const EYE_C = { dark: 0x2a1a10, brown: 0x5a3418, hazel: 0x7a6a30, green: 0x3f7a4a, blue: 0x3f6aa8, grey: 0x7a8aa0 };
const REGION_EYES = {
  europe: ['brown', 'brown', 'hazel', 'green', 'blue', 'blue', 'grey'],
  mixed: ['dark', 'brown', 'brown', 'hazel', 'green', 'blue'],
  default: ['dark', 'dark', 'brown'],
};

const CLOTH_ADULT = [0x3a5a8a, 0x7a2a4a, 0x2f6a4a, 0xb06a2a, 0x5a4a8a, 0x8a8a3a, 0x2a2a3a, 0xa04040, 0x2a6a7a, 0x6a3a2a];
const CLOTH_KID = [0xe05a5a, 0x4aa0e0, 0xf2c14e, 0x5ac08a, 0xc070e0, 0xff8a3a];
const CLOTH_ELDER = [0x6a5a4a, 0x4a5a6a, 0x7a6a7a, 0x5a6a4a, 0x8a7a6a, 0x5a3a3a];
const PANTS = [0x22242e, 0x2c3550, 0x3a3226, 0x4a4a52, 0x1a1a20, 0x5a4a3a];

const COUNTRY_REGION = {
  Canada: 'mixed', USA: 'mixed', Australia: 'mixed', 'New Zealand': 'mixed', 'South Africa': 'africa',
  Mexico: 'latam', Cuba: 'latam', Colombia: 'latam', Peru: 'latam', Chile: 'latam', Argentina: 'latam', Brazil: 'latam',
  Iceland: 'europe', Ireland: 'europe', UK: 'europe', France: 'europe', Spain: 'europe', Portugal: 'europe', Italy: 'europe',
  Germany: 'europe', Netherlands: 'europe', Sweden: 'europe', Norway: 'europe', Czechia: 'europe', Poland: 'europe',
  Romania: 'europe', Greece: 'europe', Russia: 'europe',
  Turkey: 'mena', Egypt: 'mena', Morocco: 'mena', 'Saudi Arabia': 'mena', UAE: 'mena', Iran: 'mena',
  Nigeria: 'africa', Ghana: 'africa', Kenya: 'africa', Ethiopia: 'africa', 'DR Congo': 'africa', Madagascar: 'pacific',
  Pakistan: 'south_asia', India: 'south_asia', Bangladesh: 'south_asia', Nepal: 'south_asia',
  Thailand: 'se_asia', Vietnam: 'se_asia', Singapore: 'se_asia', Indonesia: 'se_asia', Philippines: 'se_asia',
  China: 'east_asia', Mongolia: 'east_asia', 'South Korea': 'east_asia', Japan: 'east_asia', Fiji: 'pacific',
};

/** Region from the country, or from coordinates if the backend adds a country we don't know. */
function regionOf(p) {
  if (COUNTRY_REGION[p.country]) return COUNTRY_REGION[p.country];
  const lat = p.lat ?? 0;
  const lon = p.lon ?? 0;
  if (lon < -30) return lat > 24 ? 'mixed' : 'latam';
  if (lon < 60 && lat > 36) return 'europe';
  if (lon < 62 && lat > 12) return 'mena';
  if (lon < 55) return 'africa';
  if (lon < 92 && lat > 5 && lat < 37) return 'south_asia';
  if (lat > 20 && lon < 150) return 'east_asia';
  if (lat > -11 && lon < 141) return 'se_asia';
  if (lon > 110 && lat < -10) return 'mixed';
  return 'pacific';
}

// Used only when the person has no `gender` field (ask the backend to add one).
const FEMALE = new Set(['ada', 'aiko', 'bea', 'chloé', 'chloe', 'elif', 'freya', 'hana', 'ines', 'lena', 'maya', 'nadia', 'priya', 'rosa', 'uma', 'vera', 'ximena', 'zara', 'morticia', 'lenore', 'dara']);
const MALE = new Set(['amir', 'bruno', 'dmitri', 'emeka', 'gustavo', 'ivan', 'kofi', 'luca', 'mateo', 'noah', 'olu', 'sven', 'tariq', 'yusuf', 'edgar', 'vlad', 'ichabod', 'boris']);

function seeded(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable looks for a person (same person → same look, so replays match). Accepts a person or an id. */
export function appearance(person) {
  const p = typeof person === 'object' && person ? person : { id: person };
  const r = seeded(p.id);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const chance = (x) => r() < x;
  // The backend may save a look per person ({ skin, hair, hairStyle, shirt, pants, height, build, gender }).
  // Anything it saved wins; anything missing is worked out here from gender, age and region.
  const l = p.look ?? {};
  const hex = (v) => (v == null ? null : typeof v === 'number' ? v : parseInt(String(v).replace('#', ''), 16));

  const first = String(p.name || '').split(' ')[0].toLowerCase();
  const g0 = l.gender ?? p.gender;
  const gender = g0 === 'female' || g0 === 'male'
    ? g0
    : FEMALE.has(first) ? 'female' : MALE.has(first) ? 'male' : chance(0.5) ? 'female' : 'male';
  const F = gender === 'female';

  const age = p.birthAt && p.deathAt ? (p.deathAt - p.birthAt) / YEAR_MS : 40;
  const stage = age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'elder';
  const old = age >= 78;

  const region = regionOf(p);
  const skin = hex(l.skin) ?? pick(chance(0.1) ? REGION_SKIN.mixed : REGION_SKIN[region]);
  let hair = hex(l.hair) ?? HAIR_C[pick(REGION_HAIR[region] || REGION_HAIR.default)];
  if (stage === 'elder') hair = old ? 0xe2e2e4 : chance(0.5) ? 0x9a9a9e : 0xbdbdc0;
  else if (stage === 'adult' && age > 48 && chance(0.4)) hair = 0x8a8a8e;
  const eye = EYE_C[pick(REGION_EYES[region] || REGION_EYES.default)];
  const curlyLikely = region === 'africa' || region === 'pacific';

  let hairStyle;
  if (F) {
    hairStyle = stage === 'child' ? pick(['pigtails', 'ponytail', 'bob', 'long'])
      : stage === 'elder' ? pick(['bun', 'bob', 'short', 'curly'])
      : pick(['long', 'long', 'ponytail', 'bun', 'bob', curlyLikely ? 'curly' : 'long']);
    if (curlyLikely && chance(0.4)) hairStyle = 'curly';
  } else {
    hairStyle = stage === 'elder' ? pick(['bald', 'bald', 'short', 'crop'])
      : stage === 'adult' && age > 40 && chance(0.25) ? 'bald'
      : pick(['short', 'short', 'crop', 'side', curlyLikely ? 'curly' : 'short']);
    if (curlyLikely && hairStyle !== 'bald' && chance(0.4)) hairStyle = 'curly';
  }
  if (l.hairStyle) hairStyle = l.hairStyle; // bald | short | long | crop | side | curly | bob | ponytail | bun | pigtails

  const kid = stage === 'child';
  const teen = stage === 'teen';
  const h = kid ? 0.55 + (age / 13) * 0.2 : teen ? 0.88 + r() * 0.08 : (F ? 0.92 : 0.98) + r() * 0.1 - (old ? 0.04 : 0);
  return {
    seed: p.id, gender, age, stage, region,
    skin, hair, eye, hairStyle,
    shirt: hex(l.shirt) ?? pick(kid ? CLOTH_KID : stage === 'elder' ? CLOTH_ELDER : CLOTH_ADULT),
    pants: hex(l.pants) ?? pick(kid ? CLOTH_KID : PANTS),
    shoe: F && !kid && chance(0.4) ? pick([0x7a1a2a, 0x1a1218, 0x5a3a2a]) : 0x1a1218,
    skirt: F && !teen && chance(kid ? 0.5 : 0.55),
    beard: !F && (stage === 'adult' || stage === 'elder') && chance(0.35) ? pick(['full', 'moustache', 'goatee']) : null,
    glasses: stage === 'elder' ? chance(0.6) : chance(0.12),
    cane: old && chance(0.6),
    h: h * (l.height ?? 1),
    w: ((F ? 0.85 : 0.95) + r() * (kid ? 0.1 : 0.3)) * (l.build ?? 1),
    headS: kid ? 1.35 - (age / 13) * 0.2 : teen ? 1.05 : 1,
    hunch: stage === 'elder' ? (old ? 0.2 : 0.1) : 0,
  };
}

/* =====================================================================
 * The cinema
 * ===================================================================== */
export function createCinema(canvas, flashEl) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const cscene = new THREE.Scene();
  const ccam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  const tw = createTweens();
  const anim = tw.anim;
  const setFlash = (o) => {
    if (flashEl) flashEl.style.opacity = o;
  };
  /** Coloured full-screen tint (underwater, etc.). tint(null) restores the white flash layer. */
  const tint = (col, o = 0) => {
    if (!flashEl) return;
    flashEl.style.background = col == null ? '' : `#${new THREE.Color(col).getHexString()}`;
    flashEl.style.opacity = o;
  };

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    ccam.aspect = w / h;
    ccam.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- set ---------- */
  const BG = 0x0b0616;
  cscene.background = new THREE.Color(BG);
  cscene.fog = new THREE.Fog(BG, 9, 34);
  addStars(cscene);
  const ambient = new THREE.AmbientLight(0x7a6aaa, 0.85);
  cscene.add(ambient);
  const moonL = new THREE.DirectionalLight(0xbcd0ff, 1);
  moonL.position.set(-4, 7, 6);
  cscene.add(moonL);
  const rimL = new THREE.DirectionalLight(0x8a4ad0, 0.7);
  rimL.position.set(5, 3, -6);
  cscene.add(rimL);
  const fillL = new THREE.DirectionalLight(0xffe2c8, 0.35); // soft front light so faces read
  fillL.position.set(1, 2, 8);
  cscene.add(fillL);
  const lamp = new THREE.PointLight(0xffc27a, 1, 10);
  lamp.position.set(2.4, 2.4, 1.2);
  cscene.add(lamp);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshLambertMaterial({ color: 0x1d1233 }));
  ground.rotation.x = -PI / 2;
  cscene.add(ground);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe9eeff, fog: false }));
  moon.position.set(-7, 7.5, -17);
  cscene.add(moon);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x8a9aff, transparent: true, opacity: 0.14, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.position.copy(moon.position);
  cscene.add(halo);
  for (let i = 0; i < 16; i++) {
    const a = rnd(0, PI * 2);
    const r = rnd(7, 13);
    const t = new THREE.Mesh(new THREE.ConeGeometry(rnd(0.5, 1), rnd(2.5, 4.5), 6), new THREE.MeshLambertMaterial({ color: 0x120a22 }));
    t.position.set(R.cos(a) * r, 1.6, -R.abs(R.sin(a)) * r - 2);
    cscene.add(t);
  }
  const graves = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.14), new THREE.MeshLambertMaterial({ color: 0x3a3350 }));
    g.position.set(rnd(-7, 7), 0.4, rnd(-5, -1.5));
    g.rotation.set(rnd(-0.1, 0.1), rnd(-0.4, 0.4), rnd(-0.1, 0.1));
    cscene.add(g);
    graves.push(g);
  }
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x1a1226 }));
  post.position.set(2.4, 1.2, 1.2);
  cscene.add(post);
  const lb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc27a }));
  lb.position.set(2.4, 2.45, 1.2);
  cscene.add(lb);

  /* ---------- particles ---------- */
  function PS(col, size, n, g, op) {
    const ge = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3).fill(-999);
    const vel = new Float32Array(n * 3);
    const life = new Float32Array(n);
    ge.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(
      ge,
      new THREE.PointsMaterial({ color: col, size, transparent: true, opacity: op || 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    m.frustumCulled = false;
    cscene.add(m);
    let h = 0;
    return {
      burst(p, k, sp, up, l = 1.2) {
        for (let i = 0; i < k; i++) {
          const j = h++ % n;
          pos[j * 3] = p.x; pos[j * 3 + 1] = p.y; pos[j * 3 + 2] = p.z;
          vel[j * 3] = rnd(-sp, sp); vel[j * 3 + 1] = rnd(0, sp) + up; vel[j * 3 + 2] = rnd(-sp, sp);
          life[j] = l * rnd(0.6, 1);
        }
      },
      up(dt) {
        for (let i = 0; i < n; i++) {
          if (life[i] > 0) {
            life[i] -= dt;
            pos[i * 3] += vel[i * 3] * dt;
            pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
            pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
            vel[i * 3 + 1] -= g * dt;
            if (life[i] <= 0) pos[i * 3 + 1] = -999;
          }
        }
        ge.attributes.position.needsUpdate = true;
      },
    };
  }
  const spark = PS(0xffc27a, 0.09, 300, 6);
  const dust = PS(0x8a7aa0, 0.3, 200, 0.3, 0.5);
  const mist = PS(0x6aff8a, 0.38, 300, -0.2, 0.45);
  const soulP = PS(0xcfe8ff, 0.1, 200, -1);
  const curseP = PS(0xb05aff, 0.12, 300, 0);
  const flame = PS(0xff7a20, 0.24, 400, -3.5, 0.8);
  const amb = PS(0x6a5a9a, 0.45, 120, 0, 0.18);
  const snow = PS(0xeef4ff, 0.22, 500, 2.5, 0.85);
  const flake = PS(0xdff2ff, 0.08, 300, 0.4, 0.9);
  const bubble = PS(0x9ad8ff, 0.12, 300, -1.5, 0.8);
  const germ = PS(0xb8ff4a, 0.16, 300, -0.2, 0.75);
  const ice = PS(0xbfefff, 0.11, 300, 1.5, 0.9);
  const heartP = PS(0xff3a5a, 0.12, 150, -0.5, 0.9);
  const fxs = [spark, dust, mist, soulP, curseP, flame, amb, snow, flake, bubble, germ, ice, heartP];

  /* ---------- loop ---------- */
  const cam = { p: V(5, 2.6, 10), t: V(0, 1, 0) };
  let actors = [];
  let fadeMats = [];
  let rpg = null;
  let shk = 0;
  let T = 0;
  let lastT = 0;
  let flick = false;
  let raf = 0;
  const add = (o) => {
    cscene.add(o);
    actors.push(o);
    return o;
  };
  function loop(now) {
    raf = requestAnimationFrame(loop);
    tw.step(now);
    const dt = R.min(0.05, (now - lastT) / 1000 || 0);
    lastT = now;
    T += dt;
    fxs.forEach((f) => f.up(dt));
    if (R.random() < dt * 10) amb.burst(V(rnd(-9, 9), 0.15, rnd(-7, 3)), 1, 0.2, 0.03, 6);
    ccam.position.set(cam.p.x + R.sin(T * 71) * shk * 0.06, cam.p.y + R.cos(T * 83) * shk * 0.06, cam.p.z);
    ccam.lookAt(cam.t);
    shk *= R.pow(0.04, dt);
    if (rpg) {
      const w = 1 + 0.05 * R.sin(T * 3);
      rpg.userData.cl.forEach((c) => c.scale.set(w * c.userData.k, c.userData.k, w * c.userData.k));
      (rpg.userData.rags || []).forEach((r) => {
        r.rotation.x = 0.25 * R.sin(T * 2.2 + r.userData.ph);
        r.rotation.z = 0.12 * R.sin(T * 1.7 + r.userData.ph);
      });
    }
    if (flick) lamp.intensity = 1 + 0.25 * R.sin(T * 17) + 0.1 * R.sin(T * 41);
    renderer.render(cscene, ccam);
  }
  raf = requestAnimationFrame(loop);

  /* ---------- materials & shapes ---------- */
  function mk(c, o) {
    const m = new THREE.MeshLambertMaterial(Object.assign({ color: c, transparent: true }, o || {}));
    m.userData.o = m.opacity; // base opacity, so the final fade keeps see-through parts see-through
    fadeMats.push(m);
    return m;
  }
  const glowMat = (c, o = 0.4) =>
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const darker = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();

  function limb(r1, r2, len, m, x, y, endMat) {
    const piv = new THREE.Group();
    piv.add(mesh(new THREE.CylinderGeometry(r1, r2, len, 10), m, 0, -len / 2, 0));
    piv.add(mesh(new THREE.SphereGeometry(r2 * 1.15, 10, 8), endMat || m, 0, -len, 0));
    piv.position.set(x, y, 0);
    return piv;
  }

  /* ---------- the person ---------- */
  function addHair(headGroup, a, r) {
    const rr = seeded(`${a.seed}-hair`);
    const head = new THREE.Group();
    head.rotation.x = -0.3; // tilt hair back: forehead and eyebrows stay visible
    headGroup.add(head);
    const side = THREE.DoubleSide;
    const hm = mk(a.hair, { side });
    // phi = PI/2 faces forward in SphereGeometry, so a gap around it keeps the face clear
    const cap = (t0 = 0, t1 = 0.42) => mesh(new THREE.SphereGeometry(r * 1.06, 22, 12, 0, PI * 2, PI * t0, PI * t1), hm);
    const band = (t0, t1, open = 1.0) =>
      mesh(new THREE.SphereGeometry(r * 1.06, 22, 8, PI / 2 + open, PI * 2 - open * 2, PI * t0, PI * (t1 - t0)), hm);
    const s = a.hairStyle;
    if (s === 'bald') {
      head.add(band(0.42, 0.6, 1.2)); // horseshoe of hair round the back
      return;
    }
    if (s === 'curly') {
      const n = a.gender === 'female' ? 26 : 18;
      const big = a.gender === 'female' ? 0.36 : 0.28;
      for (let i = 0; i < n; i++) {
        const th = R.acos(1 - rr() * (a.gender === 'female' ? 1.25 : 0.95));
        const ph = rr() * PI * 2;
        if (th > 0.9 && R.abs(R.sin(ph) - 1) < 0.6) continue; // keep the face open
        const b = mesh(new THREE.SphereGeometry(r * big * (0.8 + 0.2 * rr()), 10, 8), hm);
        b.position.set(-R.cos(ph) * R.sin(th) * r * 1.02, R.cos(th) * r * 1.02, R.sin(ph) * R.sin(th) * r * 1.02);
        head.add(b);
      }
      return;
    }
    head.add(cap(0, s === 'crop' ? 0.36 : 0.42));
    if (s === 'crop') return;
    if (s === 'short' || s === 'side') {
      head.add(band(0.42, 0.6, 1.1));
      if (s === 'side') {
        const f = mesh(new THREE.BoxGeometry(r * 0.9, r * 0.22, r * 0.4), hm, r * 0.25, r * 0.78, r * 0.62);
        f.rotation.set(-0.5, 0, -0.25);
        head.add(f);
      }
      return;
    }
    // longer styles: hair down to the jaw at the sides/back
    head.add(band(0.42, s === 'bob' ? 0.78 : 0.7, 0.85));
    const fringe = mesh(new THREE.SphereGeometry(r * 1.08, 16, 6, PI / 2 - 0.9, 1.8, PI * 0.22, PI * 0.14), hm);
    head.add(fringe);
    if (s === 'long') {
      const curtain = mesh(
        new THREE.CylinderGeometry(r * 1.0, r * 1.25, r * 2.6, 18, 1, true, PI * 0.25, PI * 1.5),
        hm, 0, -r * 1.2, -r * 0.05,
      );
      head.add(curtain);
    } else if (s === 'ponytail') {
      const tail = mesh(new THREE.SphereGeometry(r * 0.38, 12, 10), hm, 0, -r * 0.35, -r * 1.25);
      tail.scale.set(0.8, 1.9, 0.8);
      head.add(tail, mesh(new THREE.TorusGeometry(r * 0.2, r * 0.06, 6, 12), mk(0xc04060), 0, r * 0.25, -r * 1.05));
    } else if (s === 'bun') {
      head.add(mesh(new THREE.SphereGeometry(r * 0.45, 14, 10), hm, 0, r * 0.7, -r * 0.7));
    } else if (s === 'pigtails') {
      [-1, 1].forEach((sd) => {
        const t = mesh(new THREE.SphereGeometry(r * 0.32, 12, 10), hm, sd * r * 1.1, -r * 0.3, -r * 0.2);
        t.scale.set(0.8, 1.7, 0.8);
        head.add(t);
      });
    }
  }

  function addFace(head, a, r, mats) {
    const F = a.gender === 'female';
    const kid = a.stage === 'child';
    const elder = a.stage === 'elder';
    const eyeK = kid ? 1.3 : a.stage === 'teen' ? 1.1 : 1;
    const sk = mats.sk;
    const skull = mesh(new THREE.SphereGeometry(r, 26, 20), sk);
    skull.scale.set(0.94, 1.04, 0.98);
    head.add(skull);
    [-1, 1].forEach((sd) => {
      const ear = mesh(new THREE.SphereGeometry(r * 0.22, 10, 8), sk, sd * r * 0.92, -r * 0.02, -r * 0.02);
      ear.scale.set(0.45, 1, 0.75);
      head.add(ear);
    });
    const white = mk(0xf6f2ea);
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    shine.userData.o = 1;
    fadeMats.push(shine);
    const iris = mk(a.eye);
    const black = mk(0x0d0809);
    const brows = [];
    [-1, 1].forEach((sd) => {
      const x = sd * r * 0.36;
      const y = r * 0.1;
      const z = r * 0.82;
      const w = mesh(new THREE.SphereGeometry(r * 0.17 * eyeK, 14, 10), white, x, y, z);
      w.scale.z = 0.55;
      const ir = mesh(new THREE.SphereGeometry(r * 0.105 * eyeK, 12, 10), iris, x, y, z + r * 0.075);
      ir.scale.z = 0.5;
      const pu = mesh(new THREE.SphereGeometry(r * 0.055 * eyeK, 10, 8), black, x, y, z + r * 0.105);
      pu.scale.z = 0.5;
      const hl = mesh(new THREE.SphereGeometry(r * 0.025 * eyeK, 6, 6), shine, x + r * 0.04, y + r * 0.05, z + r * 0.13);
      head.add(w, ir, pu, hl);
      if (F) {
        const lash = mesh(new THREE.BoxGeometry(r * 0.36 * eyeK, r * 0.045, r * 0.05), black, x + sd * r * 0.02, y + r * 0.15 * eyeK, z + r * 0.06);
        lash.rotation.z = sd * -0.18;
        head.add(lash);
      }
      const bm = mk(elder ? 0xd0d0d4 : darker(a.hair, a.hair > 0x999999 ? 0.75 : 1));
      const b = mesh(new THREE.BoxGeometry(r * 0.4, r * (F ? 0.045 : 0.075), r * 0.06), bm, x, y + r * 0.31 * eyeK, z + r * 0.06);
      b.rotation.z = sd * 0.06;
      b.userData = { sd, y: b.position.y };
      head.add(b);
      brows.push(b);
    });
    const nose = mesh(new THREE.SphereGeometry(r * (elder ? 0.13 : 0.11), 10, 8), sk, 0, -r * 0.12, r * 0.96);
    nose.scale.set(0.85, 1, 1.15);
    head.add(nose);

    const lip = mk(F ? 0xb44a5c : darker(a.skin, 0.6));
    const smile = mesh(new THREE.TorusGeometry(r * 0.2, r * (F ? 0.05 : 0.035), 6, 16, PI), lip, 0, -r * 0.36, r * 0.88);
    smile.rotation.z = PI;
    const oMouth = mesh(new THREE.SphereGeometry(r * 0.12, 12, 10), mk(0x2a0a10), 0, -r * 0.46, r * 0.86);
    oMouth.scale.set(0.9, 1.3, 0.4);
    oMouth.visible = false;
    head.add(smile, oMouth);

    if (F || kid) {
      [-1, 1].forEach((sd) => {
        const c = mesh(new THREE.SphereGeometry(r * 0.13, 10, 8), mk(0xff7a8a, { opacity: 0.3, depthWrite: false }), sd * r * 0.55, -r * 0.2, r * 0.76);
        c.scale.z = 0.3;
        head.add(c);
      });
    }
    if (elder) {
      const wr = mk(darker(a.skin, 0.72));
      [0.5, 0.62].forEach((y) => head.add(mesh(new THREE.BoxGeometry(r * 0.55, r * 0.025, r * 0.03), wr, 0, r * y, r * 0.86 - r * (y - 0.5) * 0.4)));
      [-1, 1].forEach((sd) => {
        const l = mesh(new THREE.BoxGeometry(r * 0.025, r * 0.25, r * 0.03), wr, sd * r * 0.3, -r * 0.3, r * 0.88);
        l.rotation.z = sd * 0.35;
        head.add(l);
      });
    }
    if (a.glasses) {
      const gm = mk(elder ? 0xb8963a : 0x1e1e24);
      [-1, 1].forEach((sd) => head.add(mesh(new THREE.TorusGeometry(r * 0.21 * eyeK, r * 0.025, 6, 20), gm, sd * r * 0.36, r * 0.1, r * 0.99)));
      head.add(mesh(new THREE.BoxGeometry(r * 0.25, r * 0.03, r * 0.03), gm, 0, r * 0.14, r * 1.0));
    }
    if (a.beard) {
      const bd = mk(a.hair, { side: THREE.DoubleSide });
      if (a.beard === 'full') {
        const b = mesh(new THREE.SphereGeometry(r * 1.03, 20, 10, PI / 2 - 1.5, 3.0, PI * 0.64, PI * 0.3), bd, 0, -r * 0.02, 0);
        head.add(b);
        smile.position.z = r * 1.0;
        oMouth.position.z = r * 0.98;
      }
      if (a.beard !== 'goatee') head.add(mesh(new THREE.BoxGeometry(r * 0.46, r * 0.09, r * 0.08), bd, 0, -r * 0.26, r * 0.96)); // moustache
      else head.add(mesh(new THREE.SphereGeometry(r * 0.16, 10, 8), bd, 0, -r * 0.72, r * 0.72));
    }
    return {
      brows,
      setFear(k) {
        brows.forEach((b) => {
          b.position.y = b.userData.y + r * 0.08 * k;
          b.rotation.z = b.userData.sd * (0.06 - 0.4 * k); // inner ends lift: worried, not angry
        });
        smile.visible = k < 0.4;
        oMouth.visible = k >= 0.4;
        oMouth.scale.set(0.9, 1.3 * (0.6 + 0.4 * k), 0.4);
      },
    };
  }

  function makePerson(a) {
    const g = new THREE.Group();
    const body = new THREE.Group();
    const { h, w } = a;
    const F = a.gender === 'female';
    const sk = mk(a.skin);
    const sh = mk(a.shirt);
    const pa = mk(a.pants);
    const shoe = mk(a.shoe);
    g.add(body);

    const shoulderW = F ? 0.15 : 0.18;
    const hipW = F ? 0.2 : 0.19;
    const torso = mesh(new THREE.CylinderGeometry(shoulderW * w, hipW * w, 0.58 * h, 16), sh, 0, 0.98 * h, 0);
    const sh2 = mesh(new THREE.SphereGeometry(shoulderW * w * 1.05, 16, 10), sh, 0, 1.26 * h, 0);
    sh2.scale.y = 0.5;
    const neck = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8), sk, 0, 1.31 * h, 0);
    const collar = mesh(new THREE.TorusGeometry(0.055, 0.018, 6, 16), mk(darker(a.shirt, 0.7)), 0, 1.28 * h, 0);
    collar.rotation.x = PI / 2;
    body.add(torso, sh2, neck, collar);

    // the head
    const r = 0.14 * a.headS;
    const head = new THREE.Group();
    head.position.y = 1.33 * h + r * 0.92;
    if (a.hunch) {
      torso.rotation.x = a.hunch * 0.6;
      head.position.z = a.hunch * 0.35;
      head.position.y -= a.hunch * 0.08;
      neck.position.z = a.hunch * 0.15;
    }
    const face = addFace(head, a, r, { sk });
    addHair(head, a, r);

    // legs (skirt or trousers)
    const legMat = a.skirt ? (a.stage === 'elder' ? mk(0x3a3036) : sk) : pa;
    const legR1 = (a.skirt ? 0.06 : 0.075) * w;
    const legL = limb(legR1, 0.055 * w, 0.7 * h, legMat, -0.09 * w, 0.7 * h);
    const legR = limb(legR1, 0.055 * w, 0.7 * h, legMat, 0.09 * w, 0.7 * h);
    [legL, legR].forEach((l) => l.add(mesh(new THREE.BoxGeometry(0.11 * w, 0.07, 0.2), shoe, 0, -0.7 * h, 0.04)));
    if (a.skirt) {
      const sk2 = mesh(new THREE.CylinderGeometry(hipW * w * 0.95, 0.3 * w, 0.42 * h, 18), pa, 0, 0.56 * h, 0);
      body.add(sk2);
    } else {
      body.add(mesh(new THREE.CylinderGeometry(hipW * w * 1.01, hipW * w * 1.01, 0.05, 16), mk(0x1a1410), 0, 0.71 * h, 0)); // belt
    }

    // arms with skin-coloured hands
    const armL = limb(0.05, 0.042, 0.5 * h, sh, -(shoulderW + 0.07) * w, 1.25 * h, sk);
    const armR = limb(0.05, 0.042, 0.5 * h, sh, (shoulderW + 0.07) * w, 1.25 * h, sk);
    if (a.cane) {
      const cane = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.78 * h, 6), mk(0x5a3a20), 0, -0.5 * h - 0.37 * h, 0.06);
      armR.add(cane);
    }
    body.add(head, legL, legR, armL, armR);

    const shadowMat = new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false });
    shadowMat.userData.o = 0.45;
    const sd = mesh(new THREE.CircleGeometry(0.42 * w * (a.stage === 'child' ? 0.7 : 1), 20), shadowMat, 0, 0.02, 0);
    sd.rotation.x = -PI / 2;
    g.add(sd);
    const personMats = fadeMats.slice(); // every material made for this person so far
    fadeMats.push(shadowMat);
    g.userData = {
      body, head, legL, legR, armL, armR, face,
      skinMat: sk,
      mats: personMats,
      headY: head.position.y,
      headR: r,
      chestY: 1.1 * h,
      height: head.position.y + r,
    };
    return g;
  }

  function mkS(c, o) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, transparent: true, roughness: 0.9, metalness: 0 }, o || {}));
    m.userData.o = m.opacity;
    fadeMats.push(m);
    return m;
  }
  /** A cylinder running from point a to point b (r1 at a, r2 at b). */
  function between(a, b, r1, r2, m, open = false) {
    const d = b.clone().sub(a);
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, d.length(), 16, 1, open), m);
    me.position.copy(a).add(b).multiplyScalar(0.5);
    me.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    return me;
  }
  /** A skeletal hand; fingers point down -y, `curl` bends every joint. */
  function boneHand(bone, curl, spread = 0.12) {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.06, 0.016), bone);
    palm.position.y = -0.03;
    h.add(palm);
    for (let i = 0; i < 4; i++) {
      let p = new THREE.Group();
      p.position.set(-0.02 + i * 0.0135, -0.058, 0);
      p.rotation.set(curl, 0, (i - 1.5) * -spread);
      h.add(p);
      [0.034, 0.028, 0.022].forEach((len, j) => {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0065, len, 6), bone);
        seg.position.y = -len / 2;
        const kn = new THREE.Mesh(new THREE.SphereGeometry(0.0078, 6, 5), bone);
        p.add(seg, kn);
        if (j < 2) {
          const n = new THREE.Group();
          n.position.y = -len;
          n.rotation.x = curl;
          p.add(n);
          p = n;
        }
      });
    }
    const th = new THREE.Group();
    th.position.set(0.03, -0.02, 0.008);
    th.rotation.set(curl * 0.6, 0, 0.7);
    [0.03, 0.025].forEach((len, j) => {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.007, len, 6), bone);
      seg.position.y = -len / 2 - j * 0.03;
      th.add(seg);
    });
    h.add(th);
    return h;
  }
  function makeReaper() {
    const g = new THREE.Group();
    const cloth = mkS(0x0e0b12, { side: THREE.DoubleSide, roughness: 1 });
    const rimCloth = mk(0x34224c, { side: THREE.BackSide });
    const voidM = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, transparent: true });
    voidM.userData.o = 1;
    fadeMats.push(voidM);
    const bone = mkS(0xc4b89c, { roughness: 0.85 }); // aged bone
    const hole = new THREE.MeshBasicMaterial({ color: 0x050307, transparent: true });
    hole.userData.o = 1;
    fadeMats.push(hole);

    /* robe: a lathe with vertical folds and a torn, uneven hem */
    const prof = [[0.47, 0.0], [0.45, 0.18], [0.4, 0.45], [0.34, 0.75], [0.29, 1.0], [0.26, 1.15], [0.22, 1.25], [0.14, 1.32], [0.07, 1.36]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const rg = new THREE.LatheGeometry(prof, 72);
    const pos = rg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = R.atan2(z, x);
      const r = R.hypot(x, z);
      const fold = (R.sin(a * 11 + R.sin(y * 3) * 0.9) * 0.6 + R.sin(a * 5 + 1.3) * 0.4) * 0.028 * (1.3 - y / 1.36);
      let ny = y;
      if (y < 0.02) {
        const rag = R.sin(a * 7) * 0.5 + R.sin(a * 13 + 1) * 0.35 + R.sin(a * 23 + 2) * 0.15;
        ny = y + R.max(0, rag) * 0.16;
      }
      const k = r > 0 ? (r + fold) / r : 1;
      pos.setXYZ(i, x * k, ny, z * k);
    }
    rg.computeVertexNormals();
    const robe = new THREE.Mesh(rg, cloth);
    const robeRim = new THREE.Mesh(rg, rimCloth);
    robe.userData.k = 1;
    robeRim.userData.k = 1.035;

    /* broad shoulders under the hood */
    const mantle = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 12, 0, PI * 2, 0, PI * 0.5), cloth);
    mantle.scale.set(1, 0.45, 0.85);
    mantle.position.y = 1.2;

    /* hanging rags at the hem that sway */
    const rags = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + 0.3;
      const piv = new THREE.Group();
      piv.position.set(R.cos(a) * 0.43, 0.14, R.sin(a) * 0.43);
      piv.rotation.y = -a + PI / 2;
      const len = 0.16 + (i % 3) * 0.05;
      const rag = new THREE.Mesh(new THREE.PlaneGeometry(0.07, len), cloth);
      rag.position.y = -len / 2;
      piv.add(rag);
      piv.userData.ph = i * 1.7;
      rags.push(piv);
    }

    /* hood: an open-fronted shell with a pointed back, a lip around the opening and a black inside */
    const hoodG = new THREE.Group();
    hoodG.position.set(0, 1.47, -0.01);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 20, PI / 2 + 0.75, PI * 2 - 1.5, 0, PI * 0.8), cloth);
    shell.scale.set(1, 1.15, 1.12);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 16), voidM);
    inner.scale.set(0.95, 1.1, 1.05);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 14), cloth);
    tip.position.set(0, 0.16, -0.2);
    tip.rotation.x = -1.15;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 8, 28, PI * 1.25), cloth);
    lip.position.set(0, -0.02, 0.2);
    lip.rotation.z = -PI * 0.125;
    hoodG.add(inner, shell, tip, lip);

    /* skull, set back in the hood */
    const skull = new THREE.Group();
    skull.position.set(0, 1.42, 0.085);
    const cran = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), bone);
    cran.scale.set(0.88, 1, 0.95);
    cran.position.y = 0.025;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 14), bone);
    face.scale.set(1, 0.85, 0.9);
    face.position.set(0, -0.045, 0.035);
    skull.add(cran, face);
    [-1, 1].forEach((sx) => {
      const sock = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), hole);
      sock.scale.set(1, 0.9, 0.6);
      sock.position.set(sx * 0.04, 0.005, 0.093);
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4a2a }));
      ember.position.set(sx * 0.04, 0.003, 0.1);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), bone);
      cheek.position.set(sx * 0.058, -0.035, 0.07);
      skull.add(sock, ember, cheek);
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.034, 3), hole);
    nose.position.set(0, -0.036, 0.11);
    nose.rotation.x = PI;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.055), bone);
    jaw.position.set(0, -0.112, 0.06);
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.006, 0.01), hole);
    gap.position.set(0, -0.092, 0.1);
    skull.add(nose, jaw, gap);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.0095;
      const z = 0.098 - R.abs(i - 3) * 0.004;
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.006), bone);
      up.position.set(x, -0.081, z);
      const lo = up.clone();
      lo.position.y = -0.103;
      skull.add(up, lo);
    }

    /* scythe: curved wooden snath with two grips and a steel crescent blade */
    const sc = new THREE.Group();
    const wood = mkS(0x4a3020, { roughness: 0.8 });
    const snath = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -1.05, 0), V(0.03, -0.35, 0), V(-0.02, 0.45, 0), V(0, 1.15, 0)]), 40, 0.019, 8),
      wood,
    );
    const grip1 = between(V(0, 0.15, 0), V(0, 0.15, 0.13), 0.012, 0.012, wood);
    const grip2 = between(V(0.02, -0.4, 0), V(0.02, -0.4, 0.11), 0.012, 0.012, wood);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10), mkS(0x2a2a30, { metalness: 0.6, roughness: 0.4 }));
    collar.position.y = 1.12;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.05);
    shape.quadraticCurveTo(0.42, 0.26, 0.98, -0.16);
    shape.quadraticCurveTo(0.5, 0.03, 0.0, -0.05);
    shape.closePath();
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 1, curveSegments: 24 }),
      mkS(0xc6ccd6, { metalness: 0.55, roughness: 0.28, emissive: 0x161a24 }),
    );
    blade.rotation.y = -PI / 2;
    blade.position.set(0.004, 1.12, 0);
    const edge = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(0, -0.05, 0), V(0, 0.03, 0.5), V(0, -0.16, 0.98)), 24, 0.004, 4),
      new THREE.MeshBasicMaterial({ color: 0xeef3ff, transparent: true }),
    );
    edge.material.userData.o = 1;
    fadeMats.push(edge.material);
    edge.position.set(0, 1.12, 0);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat(0x9fb4ff, 0.35));
    gl.position.set(0, 1.18, 0.5);
    sc.add(snath, grip1, grip2, collar, blade, edge, gl);
    sc.position.set(0.36, 1.0, 0.2);

    /* arms: wide sleeves with bony hands. One grips the scythe, one reaches forward */
    const arm = (shoulder, wrist, curl, spread) => {
      const grp = new THREE.Group();
      grp.add(between(shoulder, wrist, 0.075, 0.125, cloth, true));
      const h = boneHand(bone, curl, spread);
      h.position.copy(wrist);
      h.quaternion.setFromUnitVectors(V(0, -1, 0), wrist.clone().sub(shoulder).normalize());
      grp.add(h);
      return grp;
    };
    const armHold = arm(V(0.2, 1.24, 0), V(0.34, 1.02, 0.19), 0.9, 0.05);
    const armReach = arm(V(-0.2, 1.24, 0.02), V(-0.14, 1.05, 0.42), 0.35, 0.2);

    g.add(robeRim, robe, mantle, hoodG, skull, sc, armHold, armReach, ...rags);
    g.userData = { cl: [robe, robeRim], sc, rags };
    return g;
  }

  /* ---------- shared effects ---------- */
  const flashOut = (a, d = 0.6) => anim(d, (k) => setFlash(a * (1 - k)));
  function idle(u, t) {
    u.body.position.y = 0.012 * R.sin(t * 2);
    u.legL.rotation.x = R.sin(t * 1.5) * 0.02;
    u.legR.rotation.x = -R.sin(t * 1.5) * 0.02;
  }
  function shock(x, z, col = 0xdfe6ff, y = 0.06) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 48),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    m.rotation.x = -PI / 2;
    m.position.set(x, y, z);
    cscene.add(m);
    anim(0.9, (k) => {
      m.scale.setScalar(1 + 9 * k);
      m.material.opacity = 0.9 * (1 - k);
    }).then(() => cscene.remove(m));
  }
  function impact(pt, big) {
    flashOut(big ? 1 : 0.8, 0.7);
    shk = big ? 1.8 : 1;
    spark.burst(pt, big ? 70 : 40, 4.5, 2, 0.9);
    shock(pt.x, pt.z);
    dust.burst(V(pt.x, 0.1, pt.z), 24, 1.8, 0.5, 1.8);
  }
  function bolt(x, z, t, w) {
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const j = i && i < n ? 1 : 0;
      pts.push(V(x * (1 - i / n) + j * rnd(-0.5, 0.5), 12 - (i * (12 - t)) / n, z * (1 - i / n) + j * rnd(-0.3, 0.3)));
    }
    const c = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(new THREE.TubeGeometry(c, 50, w, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })),
      new THREE.Mesh(new THREE.TubeGeometry(c, 50, w * 4, 6), glowMat(0x8fb0ff, 0.35)),
    );
    return g;
  }
  async function fly(m, a, b, d, arc) {
    await anim(d, (k) => {
      m.position.lerpVectors(a, b, k * k);
      m.position.y += arc * R.sin(k * PI);
      curseP.burst(m.position, 2, 0.3, 0, 0.5);
      spark.burst(m.position, 1, 0.5, 0, 0.4);
    });
  }
  async function die(per, u, dir) {
    await anim(0.25, (k) => {
      u.armL.rotation.z = 0.5 + 1.1 * k;
      u.armR.rotation.z = -0.5 - 1.1 * k;
      u.body.rotation.x = dir * 0.25 * k;
      u.head.rotation.x = -dir * 0.3 * k;
    });
    await anim(1.2, (k) => {
      const f = k < 0.85 ? ease(k / 0.85) : 1 - 0.05 * R.sin(((k - 0.85) / 0.15) * PI);
      u.body.rotation.x = dir * (0.25 + (PI / 2 - 0.25) * f);
      u.body.position.y = 0.1 * k;
      u.body.position.z = dir * 0.55 * ease(k);
      u.armL.rotation.z = 1.6;
      u.armR.rotation.z = -1.6;
      u.legL.rotation.x = -0.4 * k;
      u.legR.rotation.x = 0.3 * k;
      u.head.rotation.x = 0;
    });
    dust.burst(V(per.position.x, 0.1, per.position.z + dir * 0.8), 16, 1.3, 0.3, 1.5);
  }
  /** Lerp every material of the person toward a colour (freezing, sickness…). */
  function tintPerson(u, col, amt) {
    if (!u.orig) u.orig = u.mats.map((m) => m.color.clone());
    const c = new THREE.Color(col);
    u.mats.forEach((m, i) => m.color.lerpColors(u.orig[i], c, amt));
  }

  /* =====================================================================
   * Fates: one async function per tool.
   * Each gets c = { per, u, sc, rp, hand, chest } and returns how the body ends up:
   *   { dir }            then the shared fall: 1 = forwards, -1 = backwards
   *   { noDie: true }    the fate already left the body on the ground
   *   big: true          adds the dramatic camera push-in after the hit
   * ===================================================================== */
  const FATES = {};

  async function blade(c, isK) {
    const { sc, hand, chest } = c;
    const m = add(new THREE.Group());
    const mat = new THREE.MeshBasicMaterial({ color: 0xeef3ff });
    const bl = new THREE.Mesh(isK ? new THREE.ConeGeometry(0.07, 0.7, 4) : new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), mat);
    bl.rotation.z = -PI / 2;
    m.add(bl);
    if (isK) m.add(mesh(new THREE.BoxGeometry(0.22, 0.07, 0.06), new THREE.MeshBasicMaterial({ color: 0x3a2515 }), -0.4, 0, 0));
    else {
      const tip = mesh(new THREE.ConeGeometry(0.05, 0.15, 6), mat, 0.6, 0, 0);
      tip.rotation.z = -PI / 2;
      m.add(tip);
      [-1, 1].forEach((s) => {
        const f = mesh(new THREE.BoxGeometry(0.16, 0.005, 0.07), new THREE.MeshBasicMaterial({ color: 0xc04040, side: THREE.DoubleSide }), -0.5, 0, s * 0.03);
        m.add(f);
      });
    }
    m.position.copy(hand);
    await anim(0.9, (k) => {
      sc.rotation.z = -0.7 * R.sin(k * PI * 0.9);
      m.rotation.z = 0.5 * R.sin(k * PI) + k * 8 * (isK ? 1 : 0);
      m.position.y = hand.y + 0.25 * R.sin(k * PI);
      curseP.burst(m.position, 3, 0.4, 0.2, 0.7);
    });
    m.rotation.z = R.atan2(chest.y - hand.y, chest.x - hand.x);
    await fly(m, hand, chest, isK ? 0.28 : 0.2, 0.1);
    m.visible = false;
    impact(chest, false);
    return { dir: -1 };
  }
  FATES.knife = (c) => blade(c, true);
  FATES.arrow = (c) => blade(c, false);

  FATES.lightning = async ({ sc, u }) => {
    await anim(1.5, (k) => {
      moon.material.color.setScalar(1 - 0.8 * k);
      halo.material.opacity = 0.14 * (1 - k);
      cscene.background.setScalar(0.04 * (1 - k));
      shk = 0.25 * k;
      sc.rotation.z = -0.5 * k;
      u.face.setFear(k);
    });
    const g = add(new THREE.Group());
    g.add(bolt(0, 0, u.height, 0.05), bolt(0.6, 0.3, 6, 0.03), bolt(-0.7, -0.2, 7, 0.03));
    impact(V(0, u.height, 0), true);
    tintPerson(u, 0x1a1418, 0.5); // scorched
    anim(0.6, (k) => {
      g.visible = k < 0.65 ? ((k * 16) | 0) % 2 === 0 : false;
    });
    return { dir: -1, big: true };
  };

  FATES.anvil = async ({ sc, u }) => {
    const sd = add(mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0, depthWrite: false }), 0, 0.04, 0));
    sd.rotation.x = -PI / 2;
    const bk = add(mesh(new THREE.BoxGeometry(1, 0.6, 0.75), mk(0x55556a), 0, 12, 0));
    bk.add(mesh(new THREE.BoxGeometry(1.2, 0.18, 0.9), mk(0x44445a), 0, 0.38, 0));
    await anim(0.5, (k) => {
      sc.rotation.z = -0.5 * k;
      u.head.rotation.x = -0.5 * k;
      u.face.setFear(k);
    });
    await anim(1, (k) => {
      bk.position.y = 12 - (12 - 0.3 - 0.1) * k * k;
      sd.material.opacity = 0.6 * k;
      sd.scale.setScalar(0.4 + 0.9 * k);
    });
    u.body.scale.y = 0.1;
    u.armL.rotation.z = u.armR.rotation.z = 0;
    impact(V(0, 0.4, 0), true);
    return { noDie: true, big: true, hold: 900 };
  };

  FATES.meteor = async ({ sc, u }) => {
    const m = add(new THREE.Group());
    m.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffb050 })), new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), glowMat(0xff5020)));
    m.position.set(7, 16, -5); // start up in the sky, not at the person's feet
    await anim(0.8, (k) => {
      sc.rotation.z = -0.5 * k;
      shk = 0.15 * k;
      u.head.rotation.x = -0.4 * k;
      u.face.setFear(k);
    });
    const a = V(7, 16, -5);
    const b = V(0, 0.9, 0);
    await anim(1.1, (k) => {
      m.position.lerpVectors(a, b, k * k);
      flame.burst(m.position, 6, 0.8, 0, 0.9);
      spark.burst(m.position, 3, 1, 0, 0.6);
    });
    m.visible = false;
    impact(V(0, 0.6, 0), true);
    flame.burst(V(0, 0.4, 0), 60, 3, 1, 1);
    tintPerson(u, 0x1a1418, 0.45);
    return { dir: -1, big: true };
  };

  FATES.curse = async ({ sc, u }) => {
    const rings = [0, 1, 2].map((i) => {
      const t = add(new THREE.Mesh(new THREE.TorusGeometry(0.8 - i * 0.1, 0.03, 8, 40), glowMat(0x9a40e0, 0.8)));
      t.rotation.x = PI / 2;
      t.position.set(0, 0.4 + i * 0.6, 0);
      return t;
    });
    await anim(2.4, (k) => {
      rings.forEach((t, i) => {
        t.rotation.z = k * (9 + i * 4);
        t.scale.setScalar(1.3 - 0.6 * k);
        t.position.y = 0.4 + i * 0.6 + 0.2 * k;
      });
      for (let i = 0; i < 3; i++) {
        const a = T * 5 + i * 2.1;
        const r = 1.2 - 0.7 * k;
        curseP.burst(V(R.cos(a) * r, 0.3 + k * 1.5, R.sin(a) * r), 2, 0.2, 0.6, 0.9);
      }
      u.body.rotation.z = 0.07 * R.sin(k * 30) * k;
      sc.rotation.z = -0.6 * k;
      idle(u, T);
    });
    rings.forEach((t) => (t.visible = false));
    u.body.rotation.z = 0;
    impact(V(0, 1, 0), false);
    curseP.burst(V(0, 1, 0), 80, 3, 1, 1.4);
    return { dir: 1 };
  };

  FATES.fire = async ({ sc, u }) => {
    lamp.color.set(0xff6a20);
    await anim(2.6, (k) => {
      for (let i = 0; i < 2 + k * 8; i++) {
        const a = rnd(0, PI * 2);
        const r = 0.3 + 0.6 * (1 - k * 0.5);
        flame.burst(V(R.cos(a) * r, 0.05, R.sin(a) * r), 1, 0.4, 1.8 + k * 2, 1.1);
      }
      lamp.intensity = 1 + k * 2.5 + 0.4 * R.sin(T * 30);
      u.armL.rotation.z = 0.8 + 0.6 * R.sin(T * 22);
      u.armR.rotation.z = -0.8 - 0.6 * R.sin(T * 25);
      u.body.rotation.z = 0.06 * R.sin(T * 18) * k;
      sc.rotation.z = -0.5 * k;
      cam.t.y = 1 + 0.3 * k;
      tintPerson(u, 0x2a1a14, 0.6 * k);
      idle(u, T);
    });
    u.body.rotation.z = 0;
    impact(V(0, 1, 0), true);
    flame.burst(V(0, 0.3, 0), 120, 1.4, 4, 1.4);
    return { dir: 1, big: true };
  };

  FATES.poison = async ({ sc, u, hand }) => {
    const bt = add(new THREE.Group());
    const gm = new THREE.MeshBasicMaterial({ color: 0x4aff7a, transparent: true, opacity: 0.75 });
    bt.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), gm), mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), gm, 0, 0.22, 0));
    bt.position.copy(hand);
    await anim(0.8, (k) => {
      bt.position.set(-1.5 + 0.9 * ease(k), 1.7 + 0.6 * ease(k), 0.9 - 0.3 * ease(k));
      sc.rotation.z = -0.5 * k;
    });
    await anim(2, (k) => {
      bt.rotation.z = -1.9 * R.min(1, k * 3);
      mist.burst(bt.position.clone().add(V(0.2, 0.1, 0)), 4, 0.5, -0.1, 2.2);
      for (let i = 0; i < 3; i++) mist.burst(V(rnd(-0.6, 0.6), rnd(0.3, 1.6), rnd(-0.5, 0.5)), 1, 0.3, 0.1, 1.6);
      if (k > 0.5) {
        u.armR.rotation.z = -0.4;
        u.armR.rotation.x = -1.4;
        u.body.rotation.z = 0.05 * R.sin(T * 20);
      }
      u.head.rotation.x = 0.3 * k;
      u.skinMat.color.lerpColors(u.orig0, new THREE.Color(0x9ac48a), k * 0.6);
      idle(u, T);
    });
    bt.visible = false;
    u.armR.rotation.x = 0;
    u.body.rotation.z = 0;
    u.head.rotation.x = 0;
    flashOut(0.35, 0.8);
    shk = 0.5;
    mist.burst(V(0, 1, 0), 70, 1.5, 0.5, 2.2);
    return { dir: 1 };
  };

  /* ----- vehicles: car crash & train ----- */
  function makeCar() {
    const g = new THREE.Group();
    const paint = mk([0xb02a2a, 0x2a5ab0, 0xd8d8d8, 0x1a1a1a, 0xc09a2a][(R.random() * 5) | 0]);
    const dark = mk(0x111118);
    const glass = mk(0x24344e);
    g.add(mesh(new THREE.BoxGeometry(2.0, 0.42, 0.95), paint, 0, 0.42, 0));
    g.add(mesh(new THREE.BoxGeometry(1.05, 0.36, 0.86), glass, 0.15, 0.8, 0));
    g.add(mesh(new THREE.BoxGeometry(1.0, 0.06, 0.9), paint, 0.15, 1.0, 0));
    g.add(mesh(new THREE.BoxGeometry(0.06, 0.12, 0.98), mk(0xc8ccd8), -1.02, 0.3, 0));
    const wheels = [];
    [-0.65, 0.65].forEach((x) => [-0.48, 0.48].forEach((z) => {
      const wh = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 14), dark, x, 0.2, z);
      wh.rotation.x = PI / 2;
      g.add(wh);
      wheels.push(wh);
    }));
    [-0.32, 0.32].forEach((z) => {
      g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }), -1.0, 0.5, z));
      g.add(mesh(new THREE.SphereGeometry(0.3, 8, 6), glowMat(0xfff0b0, 0.3), -1.05, 0.5, z));
      g.add(mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), new THREE.MeshBasicMaterial({ color: 0xff2020 }), 1.01, 0.5, z));
    });
    const L = new THREE.PointLight(0xfff0c0, 0, 8);
    L.position.set(-1.8, 0.6, 0);
    g.add(L);
    g.userData = { L, wheels, len: 2 };
    return g;
  }
  function makeTrain() {
    const g = new THREE.Group();
    const body = mk(0x24242e);
    const red = mk(0x8a1a1a);
    const dark = mk(0x111116);
    g.add(mesh(new THREE.BoxGeometry(4.2, 1.1, 1.2), body, 0, 0.95, 0));
    const boiler = mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.4, 16), body, -0.9, 1.25, 0);
    boiler.rotation.z = PI / 2;
    g.add(boiler, mesh(new THREE.BoxGeometry(1.3, 0.9, 1.25), body, 1.4, 1.9, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.6, 10), dark, -1.5, 2.05, 0));
    g.add(mesh(new THREE.BoxGeometry(4.22, 0.12, 1.22), red, 0, 0.6, 0));
    const plow = mesh(new THREE.ConeGeometry(0.62, 0.5, 4), red, -2.3, 0.45, 0);
    plow.rotation.z = PI / 2;
    g.add(plow);
    g.add(mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), -2.15, 1.55, 0));
    g.add(mesh(new THREE.SphereGeometry(0.6, 10, 8), glowMat(0xfff0b0, 0.35), -2.25, 1.55, 0));
    const wheels = [];
    [-1.4, -0.3, 0.8, 1.6].forEach((x) => [-0.62, 0.62].forEach((z) => {
      const wh = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 14), mk(0x8a1a1a), x, 0.34, z);
      wh.rotation.x = PI / 2;
      g.add(wh);
      wheels.push(wh);
    }));
    [4.7, 9.4].forEach((x) => {
      g.add(mesh(new THREE.BoxGeometry(4.2, 1.5, 1.2), mk(0x4a2020), x, 1.15, 0));
      [-1.4, 1.4].forEach((wx) => [-0.62, 0.62].forEach((z) => {
        const wh = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), dark, x + wx, 0.3, z);
        wh.rotation.x = PI / 2;
        g.add(wh);
      }));
      for (let i = -1; i <= 1; i++) g.add(mesh(new THREE.BoxGeometry(0.5, 0.35, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd27a }), x + i * 1.2, 1.4, 0.61));
    });
    const L = new THREE.PointLight(0xfff0c0, 0, 12);
    L.position.set(-3, 1.4, 0);
    g.add(L);
    g.userData = { L, wheels, len: 12, smoke: V(-1.5, 2.4, 0) };
    return g;
  }
  async function vehicle(c, train) {
    const { per, u, rp, sc } = c;
    const z = per.position.z;
    if (train) {
      const steel = mk(0x8a8a9a);
      [-0.55, 0.55].forEach((dz) => add(mesh(new THREE.BoxGeometry(40, 0.06, 0.08), steel, 0, 0.05, z + dz)));
      for (let x = -18; x <= 18; x += 0.8) add(mesh(new THREE.BoxGeometry(0.22, 0.04, 1.5), mk(0x3a2a1a), x, 0.025, z));
    }
    const v = add(train ? makeTrain() : makeCar());
    const { L, wheels } = v.userData;
    const x0 = train ? 24 : 16;
    v.position.set(x0, 0, z);
    await anim(train ? 1.3 : 1.0, (k) => {
      v.position.x = x0 - (x0 - 7) * k;
      L.intensity = 3 * k;
      lamp.intensity = 1 + k;
      u.head.rotation.y = -0.9 + 1.9 * ease(k);
      u.face.setFear(k);
      rp.position.y = 0.15 + 1.3 * ease(k); // the Reaper floats out of the way
      rp.position.x = -1.6 - 1.2 * ease(k);
      sc.rotation.z = -0.5 * k;
      shk = (train ? 0.35 : 0.12) * k;
      if (train && R.random() < 0.6) dust.burst(v.position.clone().add(v.userData.smoke), 2, 0.3, 1.2, 1.4);
      idle(u, T);
    });
    await anim(train ? 0.32 : 0.28, (k) => {
      v.position.x = 7 - (7 - 0.95) * k;
      u.armL.rotation.z = 0.5 + 1.7 * k;
      u.armR.rotation.z = -0.5 - 1.7 * k;
      if (!train) spark.burst(V(v.position.x + 0.6, 0.05, z + rnd(-0.5, 0.5)), 3, 1, 0.3, 0.4);
    });
    impact(V(0.3, u.chestY, z), true);
    const vx = v.position.x;
    anim(train ? 1.3 : 0.9, (k) => {
      v.position.x = vx - (train ? 30 : 18) * k;
      wheels.forEach((wh) => (wh.rotation.y += 0.6));
    });
    await anim(0.85, (k) => {
      per.position.x = -3.4 * ease(k);
      per.position.y = 1.4 * R.sin(k * PI);
      u.body.rotation.z = (PI / 2) * k;
      u.armL.rotation.z = 2.2 + 0.6 * R.sin(T * 20);
    });
    per.position.y = 0;
    u.body.rotation.z = PI / 2;
    anim(0.9, (k) => cam.t.lerpVectors(V(0, 1, 0), V(-1.6, 0.6, z), ease(k)));
    dust.burst(V(per.position.x - 0.6, 0.1, z), 30, 1.6, 0.4, 1.6);
    shk = 1;
    return { noDie: true, big: true };
  }
  FATES.car_crash = (c) => vehicle(c, false);
  FATES.train = (c) => vehicle(c, true);

  FATES.fall = async ({ per, u, rp, sc }) => {
    const H = 7;
    const tower = add(new THREE.Group());
    tower.add(mesh(new THREE.BoxGeometry(2.6, H, 2.6), mk(0x2a2438), 0, H / 2, -1.55));
    tower.add(mesh(new THREE.BoxGeometry(2.8, 0.14, 2.8), mk(0x3a3448), 0, H, -1.55));
    const lit = new THREE.MeshBasicMaterial({ color: 0xffcf7a });
    const off = new THREE.MeshBasicMaterial({ color: 0x15121e });
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 4; col++) {
        tower.add(mesh(new THREE.PlaneGeometry(0.32, 0.42), R.random() < 0.35 ? lit : off, -0.9 + col * 0.6, 0.6 + row * 0.62, -0.24));
      }
    }
    setFlash(1);
    per.position.set(0, H, -0.75);
    rp.position.set(-1.4, H + 0.15, 0.1);
    cam.p.set(3.4, H + 1.0, 4.6);
    cam.t.set(0, H + 0.8, -0.5);
    flashOut(1, 0.6);
    await anim(0.7, (k) => {
      sc.rotation.z = -0.9 * R.sin(k * PI);
      u.head.rotation.y = -0.9 * (1 - k);
      idle(u, T);
    });
    await anim(1.1, (k) => {
      per.position.z = -0.75 + 0.55 * k;
      u.armL.rotation.z = 1.2 + 0.9 * R.sin(T * 14);
      u.armR.rotation.z = -1.2 - 0.9 * R.sin(T * 14 + 1);
      u.body.rotation.x = 0.25 * k + 0.08 * R.sin(T * 9);
      u.head.rotation.x = 0.5 * k; // looking down
    });
    const z0 = per.position.z;
    await anim(1.15, (k) => {
      per.position.y = H * (1 - k * k);
      per.position.z = z0 + 1.1 * k;
      u.body.rotation.x = 0.3 + (PI / 2 - 0.3) * k;
      u.head.rotation.x = 0;
      u.armL.rotation.z = 2 + 0.8 * R.sin(T * 25);
      u.armR.rotation.z = -2 - 0.8 * R.sin(T * 23);
      u.legL.rotation.x = 0.4 * R.sin(T * 18);
      cam.t.set(0, per.position.y + 0.8, per.position.z);
      cam.p.set(3.4 + 1.2 * k, H + 1.0 - (H - 0.5) * ease(k), 4.6 + 1.6 * k);
    });
    per.position.y = 0;
    u.body.rotation.x = PI / 2;
    u.armL.rotation.z = 1.6;
    u.armR.rotation.z = -1.6;
    u.legL.rotation.x = 0;
    impact(V(0, 0.15, per.position.z + 0.7), true);
    rp.position.y = 0.15;
    return { noDie: true };
  };

  FATES.disease = async ({ u, sc, hand, chest }) => {
    const sick = new THREE.Color(0xa8b88a);
    await anim(0.8, (k) => {
      sc.rotation.z = -0.5 * k;
      germ.burst(V(hand.x + (chest.x - hand.x) * k, hand.y + (chest.y - hand.y) * k, hand.z * (1 - k)), 4, 0.15, 0, 1);
    });
    await anim(2.8, (k) => {
      for (let i = 0; i < 3; i++) {
        const a = T * 3 + i * 2.1;
        const r = 0.9 - 0.45 * k;
        germ.burst(V(R.cos(a) * r, 0.5 + i * 0.45 + 0.3 * R.sin(T * 2), R.sin(a) * r - 0.25), 1, 0.15, 0.1, 1.2);
      }
      const cough = R.pow(R.max(0, R.sin(T * 8)), 8) * R.min(1, k * 2);
      u.body.rotation.x = 0.22 * cough + 0.18 * k;
      u.head.rotation.x = 0.35 * cough;
      u.armR.rotation.x = -1.7 * R.min(1, k * 3);
      u.armR.rotation.z = 0.3 * R.min(1, k * 3);
      u.skinMat.color.lerpColors(u.orig0, sick, k * 0.8);
      if (cough > 0.85) germ.burst(V(0, u.headY - 0.05, 0.1), 3, 0.6, 0.1, 0.6);
      if (k > 0.65) u.body.position.y = -0.15 * ((k - 0.65) / 0.35);
      idle(u, T);
    });
    u.armR.rotation.x = 0;
    u.armR.rotation.z = -0.5;
    return { dir: 1 };
  };

  FATES.drowning = async ({ u, sc }) => {
    const water = add(mesh(new THREE.CircleGeometry(15, 48), new THREE.MeshBasicMaterial({ color: 0x1f5a9a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), 0, 0.02, 0));
    water.rotation.x = -PI / 2;
    const top = u.height + 0.5;
    lamp.color.set(0x6ab0ff);
    await anim(0.6, (k) => {
      sc.rotation.z = -0.5 * k;
      u.head.rotation.x = 0.4 * k;
      u.face.setFear(k);
    });
    let lastRing = 0;
    await anim(2.2, (k) => {
      water.position.y = top * ease(k);
      if (T - lastRing > 0.35) {
        shock(0, -0.25, 0x9ad8ff, water.position.y + 0.01);
        lastRing = T;
      }
      const under = water.position.y > cam.p.y;
      tint(0x0a3a7a, under ? 0.35 : 0);
      bubble.burst(V(rnd(-0.6, 0.6), rnd(0.1, water.position.y), rnd(-0.6, 0.4)), 2, 0.1, 0.4, 1.4);
      if (water.position.y > u.chestY) {
        u.armL.rotation.z = 2.4 + 0.5 * R.sin(T * 12);
        u.armR.rotation.z = -2.4 - 0.5 * R.sin(T * 13);
        u.head.rotation.x = -0.5;
        bubble.burst(V(0, u.headY, 0), 3, 0.1, 0.8, 1.6);
      }
      idle(u, T);
    });
    await anim(1.2, (k) => {
      u.armL.rotation.z = (2.4 + 0.5 * R.sin(T * 12)) * (1 - k) + 0.5 * k;
      u.armR.rotation.z = -(2.4 + 0.5 * R.sin(T * 13)) * (1 - k) - 0.5 * k;
      u.head.rotation.x = -0.5 * (1 - k) + 0.4 * k;
      if (R.random() < 1 - k) bubble.burst(V(0, u.headY, 0), 1, 0.1, 0.8, 1.6);
    });
    await anim(1.0, (k) => {
      water.position.y = top * (1 - ease(k));
      tint(0x0a3a7a, water.position.y > cam.p.y ? 0.35 : 0);
    });
    tint(null, 0);
    water.visible = false;
    lamp.color.set(0xffc27a);
    return { dir: 1 };
  };

  FATES.avalanche = async ({ per, u, sc }) => {
    const mount = add(new THREE.Group());
    mount.add(mesh(new THREE.ConeGeometry(6, 9, 7), mk(0x2a2440), 0, 4.5, 0));
    mount.add(mesh(new THREE.ConeGeometry(2.5, 3.8, 7), mk(0xeef2ff), 0, 7.1, 0));
    mount.position.set(1.5, 0, -14);
    await anim(1.4, (k) => {
      shk = 0.45 * k;
      sc.rotation.z = -0.5 * k;
      snow.burst(V(1.5 + rnd(-2, 2), 6 + rnd(0, 2), -13), 4, 0.6, 0.5, 1.6);
      u.head.rotation.y = -0.9 * (1 - k);
      u.head.rotation.x = -0.3 * k;
      u.face.setFear(k);
      idle(u, T);
    });
    const wall = add(new THREE.Group());
    const sm = mk(0xf2f5ff);
    for (let i = 0; i < 18; i++) wall.add(mesh(new THREE.SphereGeometry(rnd(0.7, 1.4), 12, 10), sm, rnd(-7, 7), rnd(0.2, 1.6), rnd(-0.8, 0.8)));
    wall.position.z = -10;
    let buried = false;
    const mound = add(mesh(new THREE.SphereGeometry(0.9, 18, 10, 0, PI * 2, 0, PI / 2), sm, per.position.x, 0, per.position.z));
    mound.scale.set(0.01, 0.01, 0.01);
    await anim(1.4, (k) => {
      wall.position.z = -10 + 14.5 * R.pow(k, 1.4);
      wall.children.forEach((b, i) => (b.rotation.x += 0.1 + i * 0.003));
      for (let i = 0; i < 8; i++) snow.burst(V(rnd(-7, 7), rnd(0.2, 2.4), wall.position.z + 1), 1, 1.2, 1.5, 1.2);
      shk = 1.2;
      u.armL.rotation.z = 2.2;
      u.armR.rotation.z = -2.2;
      if (!buried && wall.position.z > per.position.z - 1) {
        buried = true;
        per.visible = false;
        flashOut(0.5, 0.5);
      }
      if (buried) mound.scale.set(1, R.min(0.7, mound.scale.y + 0.05), 1);
    });
    wall.visible = false;
    mound.scale.set(1, 0.7, 1);
    snow.burst(V(per.position.x, 0.6, per.position.z), 60, 2, 1.5, 1.6);
    return { noDie: true, big: true, hold: 700 };
  };

  FATES.earthquake = async ({ per, u, sc }) => {
    const z = per.position.z;
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push([-5 + i * 0.625, (i % 2 ? 0.18 : -0.12) * (1 + R.random())]);
    const top = pts.map(([x, y]) => new THREE.Vector2(x, y + 0.25));
    const bot = pts.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y - 0.25));
    const shape = new THREE.Shape([...top, ...bot]);
    const crack = add(mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x050208 }), 0, 0.03, z));
    crack.rotation.x = -PI / 2;
    const glow = add(mesh(new THREE.ShapeGeometry(shape), glowMat(0xff4a10, 0.5), 0, 0.035, z));
    glow.rotation.x = -PI / 2;
    crack.scale.set(1, 0.01, 1);
    glow.scale.set(0.9, 0.01, 1);
    const baseG = graves.map((g) => g.rotation.z);
    const camFrom = cam.p.clone();
    await anim(1.8, (k) => {
      cam.p.lerpVectors(camFrom, V(0.6, 3.4, 5.6), ease(R.min(1, k * 1.5)));
      cam.t.set(0, 1 - 0.6 * ease(R.min(1, k * 1.5)), 0);
      shk = R.max(shk, 1.1);
      crack.scale.y = 0.01 + 2.2 * ease(k);
      glow.scale.y = crack.scale.y * 0.4;
      if (R.random() < 0.5) dust.burst(V(rnd(-5, 5), 0.1, z), 3, 0.8, 0.8, 1.2);
      graves.forEach((g, i) => (g.rotation.z = baseG[i] + 0.15 * R.sin(T * 20 + i)));
      u.body.rotation.z = 0.15 * R.sin(T * 13);
      u.armL.rotation.z = 1.1 + 0.3 * R.sin(T * 17);
      u.armR.rotation.z = -1.1 - 0.3 * R.sin(T * 15);
      u.face.setFear(k);
      sc.rotation.z = -0.5 * k;
    });
    await anim(0.8, (k) => {
      per.position.y = -2.8 * k * k;
      u.armL.rotation.z = 2.6;
      u.armR.rotation.z = -2.6;
      u.body.rotation.z = 0;
      shk = 1.4;
    });
    per.visible = false;
    dust.burst(V(0, 0.2, z), 50, 1.8, 1.2, 1.8);
    graves.forEach((g, i) => (g.rotation.z = baseG[i]));
    anim(0.8, (k) => {
      crack.scale.y = 2.21 - 1.6 * ease(k);
      glow.scale.y = crack.scale.y * 0.4;
    });
    return { noDie: true, big: true, hold: 500 };
  };

  FATES.explosion = async ({ per, u, sc }) => {
    const bombMat = mk(0x18181f);
    const bomb = add(new THREE.Group());
    bomb.add(mesh(new THREE.SphereGeometry(0.28, 16, 12), bombMat));
    bomb.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), mk(0x4a4a52), 0, 0.3, 0));
    const fuse = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), mk(0xb89a6a), 0.05, 0.42, 0);
    fuse.rotation.z = -0.4;
    bomb.add(fuse);
    const tip = () => bomb.localToWorld(V(0.1, 0.52, 0));
    const a = V(-1.3, 0.28, 0.6);
    const b = V(0.4, 0.28, 0.15);
    await anim(1.0, (k) => {
      bomb.position.lerpVectors(a, b, ease(k));
      bomb.rotation.z = -ease(k) * 6;
      sc.rotation.z = -0.6 * R.sin(k * PI);
      spark.burst(tip(), 2, 0.6, 0.6, 0.4);
    });
    bomb.rotation.z = 0;
    await anim(1.2, (k) => {
      const blink = R.sin(T * (10 + k * 40)) > 0;
      bombMat.emissive.setHex(blink ? 0xaa1010 : 0x000000);
      spark.burst(tip(), 3, 0.7, 0.7, 0.4);
      u.head.rotation.x = 0.5 * R.min(1, k * 3);
      u.head.rotation.y = -0.9 * (1 - R.min(1, k * 3));
      u.face.setFear(R.min(1, k * 2));
      u.armL.rotation.z = 0.5 + 0.8 * k;
      u.armR.rotation.z = -0.5 - 0.8 * k;
      idle(u, T);
    });
    bomb.visible = false;
    setFlash(1);
    flashOut(1, 1);
    shk = 2.4;
    lamp.color.set(0xff8a30);
    lamp.intensity = 5;
    const fb = add(new THREE.Group());
    const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), glowMat(0xff6020, 0.9));
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), glowMat(0xffe080, 0.9));
    fb.add(outer, inner);
    fb.position.copy(b);
    anim(0.9, (k) => {
      fb.scale.setScalar(0.2 + 3 * ease(k));
      outer.material.opacity = 0.9 * (1 - k);
      inner.material.opacity = 0.9 * (1 - k) * (1 - k);
      lamp.intensity = 5 * (1 - k) + 1;
    });
    shock(b.x, b.z, 0xffa040);
    setTimeout(() => shock(b.x, b.z, 0xff6020), 120);
    flame.burst(b, 160, 4, 2, 1.2);
    spark.burst(b, 120, 6, 2, 1);
    dust.burst(b, 50, 2.5, 1, 2.4);
    tintPerson(u, 0x1a1418, 0.55);
    await anim(0.75, (k) => {
      per.position.z = -0.25 - 1.6 * ease(k);
      per.position.y = 0.9 * R.sin(k * PI);
      u.body.rotation.x = (-PI / 2) * k;
      u.armL.rotation.z = 1.6;
      u.armR.rotation.z = -1.6;
    });
    per.position.y = 0;
    dust.burst(V(0, 0.1, per.position.z - 0.8), 20, 1.4, 0.3, 1.5);
    return { noDie: true, big: true };
  };

  function makeWolf() {
    const g = new THREE.Group();
    const fur = mk(0x34303a);
    const fur2 = mk(0x4a4450);
    const bodyM = mesh(new THREE.SphereGeometry(0.45, 14, 10), fur, 0, 0.75, 0);
    bodyM.scale.set(1.7, 0.75, 0.7);
    g.add(bodyM, mesh(new THREE.SphereGeometry(0.34, 12, 10), fur2, -0.55, 0.85, 0));
    const head = new THREE.Group();
    head.position.set(-0.85, 1.05, 0);
    head.add(mesh(new THREE.SphereGeometry(0.24, 12, 10), fur));
    const snout = mesh(new THREE.ConeGeometry(0.13, 0.36, 8), fur2, -0.3, -0.05, 0);
    snout.rotation.z = PI / 2;
    head.add(snout, mesh(new THREE.SphereGeometry(0.04, 6, 6), mk(0x050505), -0.47, -0.04, 0));
    [-0.1, 0.1].forEach((z) => {
      const ear = mesh(new THREE.ConeGeometry(0.07, 0.2, 6), fur, 0.02, 0.24, z);
      head.add(ear);
      head.add(mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd040 }), -0.18, 0.07, z));
    });
    [-0.06, 0.06].forEach((z) => {
      const f = mesh(new THREE.ConeGeometry(0.018, 0.06, 4), mk(0xf0f0f0), -0.38, -0.13, z);
      f.rotation.z = PI;
      head.add(f);
    });
    g.add(head);
    const legs = [];
    [[-0.5, -0.18], [-0.5, 0.18], [0.5, -0.18], [0.5, 0.18]].forEach(([x, z]) => {
      const l = limb(0.06, 0.05, 0.55, fur, x, 0.6);
      l.position.z = z;
      g.add(l);
      legs.push(l);
    });
    const tail = mesh(new THREE.ConeGeometry(0.09, 0.6, 8), fur, 0.95, 0.9, 0);
    tail.rotation.z = -1.1;
    g.add(tail);
    g.userData = { legs, head };
    return g;
  }

  FATES.beast = async ({ per, u, sc, chest }) => {
    const eyes = add(new THREE.Group());
    const em = new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0 });
    [[-4, 0.6, -4], [3.5, 0.7, -4.5], [-2, 0.5, -5.5]].forEach(([x, y, z]) => {
      [-0.09, 0.09].forEach((dx) => eyes.add(mesh(new THREE.SphereGeometry(0.04, 6, 6), em, x + dx, y, z)));
    });
    flick = false;
    await anim(1.4, (k) => {
      em.opacity = R.min(1, k * 2) * (R.sin(T * 3) > -0.9 ? 1 : 0);
      lamp.intensity = 1 - 0.7 * k;
      shk = 0.15 * R.sin(k * PI);
      sc.rotation.z = -0.5 * k;
      u.head.rotation.y = -0.9 + 1.4 * ease(k);
      u.face.setFear(k);
      idle(u, T);
    });
    eyes.visible = false;
    const wolf = add(makeWolf());
    const start = V(5, 0, -3);
    const mid = V(1.6, 0, -0.5);
    const dx = per.position.x - start.x;
    const dz = per.position.z - start.z;
    wolf.rotation.y = R.atan2(dz, -dx);
    wolf.position.copy(start);
    const { legs } = wolf.userData;
    await anim(0.8, (k) => {
      wolf.position.lerpVectors(start, mid, k);
      wolf.position.y = 0.08 * R.abs(R.sin(T * 16));
      legs.forEach((l, i) => (l.rotation.z = 0.6 * R.sin(T * 16 + (i < 2 ? 0 : PI))));
    });
    const hit = V(0.25, 0, per.position.z);
    await anim(0.32, (k) => {
      wolf.position.lerpVectors(mid, hit, k);
      wolf.position.y = 0.6 * R.sin(k * PI);
      legs.forEach((l, i) => (l.rotation.z = i < 2 ? -0.9 : 0.9));
    });
    const claws = [-1, 0, 1].map((i) => {
      const cl = add(mesh(new THREE.TorusGeometry(0.4, 0.018, 4, 18, PI * 0.6), glowMat(0xffffff, 1), 0.1 + i * 0.09, chest.y, per.position.z + 0.3));
      cl.rotation.z = -0.9;
      return cl;
    });
    anim(0.4, (k) => claws.forEach((cl) => (cl.material.opacity = 1 - k)));
    impact(V(0, chest.y, per.position.z), false);
    const end = V(-6, 0, 3);
    anim(0.9, (k) => {
      wolf.position.lerpVectors(hit, end, k);
      wolf.position.y = 0.08 * R.abs(R.sin(T * 16));
      legs.forEach((l, i) => (l.rotation.z = 0.6 * R.sin(T * 16 + (i < 2 ? 0 : PI))));
    }).then(() => (wolf.visible = false));
    flick = true;
    return { dir: -1 };
  };

  FATES.freeze = async ({ per, u, sc }) => {
    const bgFrom = cscene.background.clone();
    const bgTo = new THREE.Color(0x0a1a2e);
    lamp.color.set(0x9ad8ff);
    const frost = add(mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.45, depthWrite: false }), 0, 0.03, per.position.z));
    frost.rotation.x = -PI / 2;
    frost.scale.setScalar(0.01);
    const bh = u.height + 0.15;
    const blockGeo = new THREE.BoxGeometry(0.95, bh, 0.85);
    blockGeo.translate(0, bh / 2, 0);
    const block = add(new THREE.Group());
    block.add(new THREE.Mesh(blockGeo, new THREE.MeshLambertMaterial({ color: 0xbfefff, transparent: true, opacity: 0.4, emissive: 0x204a6a, depthWrite: false })));
    block.add(new THREE.LineSegments(new THREE.EdgesGeometry(blockGeo), new THREE.LineBasicMaterial({ color: 0xeaffff, transparent: true, opacity: 0.8 })));
    block.position.z = per.position.z;
    block.scale.y = 0.001;
    block.visible = false;
    await anim(2.6, (k) => {
      cscene.background.lerpColors(bgFrom, bgTo, k);
      sc.rotation.z = -0.5 * k;
      frost.scale.setScalar(0.1 + 2.6 * k);
      for (let i = 0; i < 2; i++) flake.burst(V(rnd(-5, 5), 5, rnd(-4, 3)), 1, 0.1, -0.6, 6);
      const a = T * 4;
      ice.burst(V(R.cos(a) * 0.6, 0.1 + k * 1.6, R.sin(a) * 0.6 + per.position.z), 2, 0.1, 0.3, 0.8);
      u.body.rotation.z = 0.025 * R.sin(T * 60) * (1 - k * 0.5);
      u.armL.rotation.x = -0.9 * R.min(1, k * 2);
      u.armR.rotation.x = -0.9 * R.min(1, k * 2);
      u.armL.rotation.z = -0.25 * R.min(1, k * 2);
      u.armR.rotation.z = 0.25 * R.min(1, k * 2);
      tintPerson(u, 0xbfe6ff, 0.6 * k);
      if (k > 0.6) {
        block.visible = true;
        block.scale.y = ease((k - 0.6) / 0.4);
      }
    });
    u.body.rotation.z = 0;
    await wait(350);
    block.visible = false;
    ice.burst(V(0, 1, per.position.z), 140, 2.6, 1, 1.3);
    shock(0, per.position.z, 0xbfefff);
    flashOut(0.6, 0.6);
    shk = 0.9;
    await anim(0.9, (k) => {
      u.body.rotation.x = (PI / 2) * k * k; // falls stiff, like a statue
    });
    ice.burst(V(0, 0.1, per.position.z + 1), 50, 1.5, 0.6, 1);
    shk = 0.8;
    anim(1.5, (k) => cscene.background.lerpColors(bgTo, bgFrom, k));
    return { noDie: true };
  };

  FATES.heart_attack = async ({ per, u, sc }) => {
    const heart = add(new THREE.Group());
    const hm = new THREE.MeshBasicMaterial({ color: 0xff2a4a, transparent: true, opacity: 0.95 });
    [-0.5, 0.5].forEach((x) => heart.add(mesh(new THREE.SphereGeometry(0.55, 14, 10), hm, x, 0.25, 0)));
    const tipC = mesh(new THREE.ConeGeometry(1.0, 1.3, 16), hm, 0, -0.55, 0);
    tipC.rotation.z = PI;
    heart.add(tipC, new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), glowMat(0xff2040, 0.25)));
    heart.position.set(0.05, u.chestY + 0.05, per.position.z + 0.35);
    // ECG line floating above the head
    const N = 90;
    const ecgPos = new Float32Array(N * 3);
    const ecgGeo = new THREE.BufferGeometry();
    ecgGeo.setAttribute('position', new THREE.BufferAttribute(ecgPos, 3));
    const ecgMat = new THREE.LineBasicMaterial({ color: 0x6aff8a, transparent: true, opacity: 0.95 });
    const ecg = add(new THREE.Line(ecgGeo, ecgMat));
    const samples = new Array(N).fill(0);
    const baseY = u.height + 0.5;
    const draw = () => {
      for (let i = 0; i < N; i++) {
        ecgPos[i * 3] = -1.3 + (2.6 * i) / (N - 1);
        ecgPos[i * 3 + 1] = baseY + samples[i];
        ecgPos[i * 3 + 2] = per.position.z + 0.4;
      }
      ecgGeo.attributes.position.needsUpdate = true;
    };
    const beatShape = (ph) => (ph < 0.05 ? (ph / 0.05) * 0.35 : ph < 0.1 ? 0.35 - ((ph - 0.05) / 0.05) * 0.5 : ph < 0.14 ? -0.15 + ((ph - 0.1) / 0.04) * 0.15 : 0);
    let phase = 0;
    let flat = false;
    let lastBeat = 0;
    sc.rotation.z = -0.5;
    await anim(3.4, (k) => {
      const bpm = k < 0.75 ? 70 + 180 * k * k : 0;
      flat = k >= 0.8;
      const dt = 1 / 60;
      const prev = phase;
      phase = (phase + (bpm / 60) * dt) % 1;
      if (phase < prev && !flat) lastBeat = T;
      samples.shift();
      samples.push(flat ? 0 : beatShape(phase) * (1 + (R.random() - 0.5) * 0.4 * k));
      draw();
      const pulse = flat ? 0 : R.exp(-(T - lastBeat) * 9);
      heart.scale.setScalar(0.09 * (1 + 0.45 * pulse) * (flat ? 1 - (k - 0.8) * 3 : 1));
      if (pulse > 0.95) heartP.burst(heart.position, 4, 0.4, 0.2, 0.5);
      if (k > 0.25) {
        const c = R.min(1, (k - 0.25) * 4);
        u.armR.rotation.x = -1.3 * c;
        u.armR.rotation.z = 0.6 * c;
        u.armL.rotation.z = 0.5 + 0.3 * c;
        u.body.rotation.x = 0.22 * c + 0.03 * pulse;
        u.head.rotation.x = 0.3 * c;
        u.face.setFear(c);
      }
      if (flat) {
        ecgMat.color.setHex(0xff4040);
        hm.color.lerp(new THREE.Color(0x555560), 0.1);
      }
      shk = R.max(shk, 0.05 * pulse);
      idle(u, T);
    });
    heart.visible = false;
    anim(1.5, (k) => (ecgMat.opacity = 0.95 * (1 - k)));
    u.armR.rotation.x = 0;
    return { dir: 1 };
  };

  function makeGhost() {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xeef2ff, emissive: 0x5a6a90, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), m));
    const sheet = mesh(new THREE.ConeGeometry(0.42, 0.95, 16, 1, true), m, 0, -0.33, 0);
    g.add(sheet);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x0a0a14 });
    [-0.1, 0.1].forEach((x) => {
      const e = mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeM, x, 0.05, 0.26);
      e.scale.set(0.8, 1.3, 0.4);
      g.add(e);
    });
    const mo = mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeM, 0, -0.12, 0.27);
    mo.scale.set(1, 1.4, 0.4);
    g.add(mo, new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), glowMat(0x9fb4ff, 0.12)));
    g.userData = { m };
    return g;
  }

  FATES.haunt = async ({ per, u, sc, chest }) => {
    flick = false;
    const ghosts = [0, 1, 2, 3].map((i) => {
      const g = add(makeGhost());
      const gr = graves[i % graves.length].position;
      g.position.set(gr.x, -1, gr.z);
      g.userData.from = V(gr.x, -1, gr.z);
      return g;
    });
    const centre = V(0, 0, per.position.z);
    await anim(1.3, (k) => {
      lamp.intensity = 1 - 0.85 * k + (R.random() < 0.1 ? 0.6 : 0);
      moon.material.color.setScalar(1 - 0.5 * k);
      sc.rotation.z = -0.5 * k;
      ghosts.forEach((g, i) => {
        const kk = R.min(1, R.max(0, k * 1.6 - i * 0.15));
        g.position.y = -1 + 2.3 * ease(kk);
        g.lookAt(centre.x, 1.2, centre.z);
      });
      u.face.setFear(k);
      idle(u, T);
    });
    const ang = ghosts.map((g) => R.atan2(g.position.z - centre.z, g.position.x - centre.x));
    const rad = ghosts.map((g) => R.hypot(g.position.x - centre.x, g.position.z - centre.z));
    let spin = 0;
    await anim(2.6, (k) => {
      spin += (1.5 + 5 * k) / 60;
      ghosts.forEach((g, i) => {
        const r = rad[i] * (1 - k) + 0.9 * k;
        const a = ang[i] * (1 - k) + (i * PI) / 2 * k + spin;
        g.position.set(centre.x + R.cos(a) * r, 1.15 + 0.25 * R.sin(T * 3 + i), centre.z + R.sin(a) * r);
        g.lookAt(centre.x, 1.2, centre.z);
      });
      u.head.rotation.y = R.sin(T * 4) * 0.9;
      u.armL.rotation.z = 2.0 + 0.15 * R.sin(T * 40);
      u.armR.rotation.z = -2.0 - 0.15 * R.sin(T * 38);
      u.body.rotation.z = 0.04 * R.sin(T * 30);
      if (R.random() < 0.08) lamp.intensity = 0.8;
      else lamp.intensity = 0.15;
    });
    const froms = ghosts.map((g) => g.position.clone());
    await anim(0.4, (k) => {
      ghosts.forEach((g, i) => {
        g.position.lerpVectors(froms[i], V(chest.x, chest.y, per.position.z), k * k);
        g.scale.setScalar(1 - 0.7 * k);
      });
    });
    ghosts.forEach((g) => (g.visible = false));
    setFlash(0.9);
    flashOut(0.9, 0.9);
    soulP.burst(V(0, chest.y, per.position.z), 80, 2, 0.5, 1.2);
    shk = 0.8;
    u.body.rotation.z = 0;
    u.head.rotation.y = 0;
    flick = true;
    moon.material.color.set(0xe9eeff);
    return { dir: -1 };
  };

  /* ---------- the fate itself ---------- */
  async function play(person, toolKey) {
    const fate = FATES[toolKey] || FATES[TOOL_DEFS[toolKey]?.anim] || FATES.knife;
    actors.forEach((a) => cscene.remove(a));
    actors = [];
    fadeMats = [];
    lamp.intensity = 1;
    lamp.color.set(0xffc27a);
    flick = true;
    shk = 0;
    moon.material.color.set(0xe9eeff);
    halo.material.opacity = 0.14;
    cscene.background.set(BG);
    tint(null, 0);

    const look = appearance(person);
    const per = add(makePerson(look));
    const u = per.userData;
    u.orig0 = u.skinMat.color.clone();
    const rp = add(new THREE.Group());
    const rg = makeReaper();
    rg.scale.setScalar(1.25);
    rg.rotation.y = -0.55; // three-quarter view, so the skull in the hood faces the camera
    rp.add(rg);
    rpg = rg;
    rp.position.set(-9, 0, 0.8);
    rp.rotation.y = PI / 2;
    cam.p.set(5, 2.6, 10);
    cam.t.set(0, 1, 0);
    setFlash(1);
    flashOut(1, 1);

    // the Reaper glides in
    await anim(2.8, (k) => {
      const e = ease(k);
      rp.position.x = -9 + 7.4 * e;
      rp.position.y = 0.15 + 0.1 * R.sin(k * 16);
      cam.p.set(5 - 5 * e, 2.6 - 1.1 * e, 10 - 3.8 * e);
      idle(u, T);
    });

    // the person turns: close-up on their face
    const hy = u.headY;
    const c0 = cam.p.clone();
    const t0 = cam.t.clone();
    const d = 0.55 + u.headR * 2.2; // camera distance from the face
    const cClose = V(R.sin(-0.9) * d, hy + 0.04, -0.25 + R.cos(-0.9) * d);
    const tClose = V(0, hy - 0.06, -0.25);
    await anim(1.0, (k) => {
      const e = ease(k);
      u.head.rotation.y = -0.9 * e;
      u.armL.rotation.z = 0.5 * e;
      u.armR.rotation.z = -0.5 * e;
      per.position.z = -0.25 * e;
      cam.p.lerpVectors(c0, cClose, e);
      cam.t.lerpVectors(t0, tClose, e);
      idle(u, T);
    });
    await anim(0.8, (k) => {
      u.face.setFear(R.min(1, k * 1.5));
      idle(u, T);
    });
    await anim(0.7, (k) => {
      const e = ease(k);
      cam.p.lerpVectors(cClose, c0, e);
      cam.t.lerpVectors(tClose, t0, e);
      idle(u, T);
    });

    const sc = rg.userData.sc;
    const hand = V(-1.5, 1.7, 0.9);
    const chest = V(0, u.chestY, 0.1);
    const res = (await fate({ per, u, sc, rp, hand, chest })) || { dir: -1 };

    if (res.big) await wait(110);
    if (res.big) anim(0.9, (k) => cam.p.lerpVectors(V(0, 1.5, 6.2), V(0.3, 1.3, 3.8), ease(k)));
    if (res.noDie) await wait(res.hold ?? 600);
    else await die(per, u, res.dir ?? -1);

    // the soul rises
    const soul = add(new THREE.Group());
    const sm = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, blending: THREE.AdditiveBlending });
    const hm = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    soul.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), sm), new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), hm));
    const c1 = cam.p.clone();
    const ct = cam.t.clone();
    lamp.intensity = 0.6;
    lamp.color.set(0xffc27a);
    await anim(3.6, (k) => {
      soul.position.set(per.position.x, 0.8 + k * 5.5, per.position.z);
      const o = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      sm.opacity = o;
      hm.opacity = o * 0.3;
      soulP.burst(soul.position, 2, 0.3, 0, 1.2);
      const f = R.max(0, 1 - k * 1.4);
      fadeMats.forEach((m) => (m.opacity = (m.userData.o ?? 1) * f));
      cam.p.lerpVectors(c1, V(0, 3.4, 6.6), ease(k));
      cam.t.set(ct.x * (1 - k), ct.y * (1 - k) + (1 + k * 3.2) * k, ct.z * (1 - k));
    });
    rp.visible = false;
    per.visible = false;
    flick = false;
  }

  return {
    play,
    dispose() {
      cancelAnimationFrame(raf);
      tw.clear();
      window.removeEventListener('resize', resize);
      tint(null, 0);
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
