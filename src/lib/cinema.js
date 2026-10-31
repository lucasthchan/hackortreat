// The kill cinematic, ported from "The Reaper's Atlas": a moonlit graveyard, the hooded reaper
// glides in, and the chosen tool plays out before the soul rises.
import * as THREE from 'three';
import { addStars, createTweens, ease } from './geo3d.js';

const R = Math;
const PI = Math.PI;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + R.random() * (b - a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const HAIR_STYLES = ['bald', 'short', 'long'];
const toColor = (hex) => parseInt(String(hex).replace('#', ''), 16);

/** The person's look from the database, in the shape makePerson expects. */
export function appearance(person) {
  const l = person.look ?? {};
  return {
    skin: toColor(l.skin ?? '#d9a27a'),
    hair: toColor(l.hair ?? '#4a2c17'),
    hs: Math.max(0, HAIR_STYLES.indexOf(l.hairStyle ?? 'short')),
    shirt: toColor(l.shirt ?? '#3a5a8a'),
    pants: toColor(l.pants ?? '#2a2a3a'),
    h: l.height ?? 1,
    w: l.build ?? 1,
  };
}

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
  cscene.background = new THREE.Color(0x0b0616);
  cscene.fog = new THREE.Fog(0x0b0616, 9, 34);
  addStars(cscene);
  cscene.add(new THREE.AmbientLight(0x7a6aaa, 0.85));
  const moonL = new THREE.DirectionalLight(0xbcd0ff, 1);
  moonL.position.set(-4, 7, 6);
  cscene.add(moonL);
  const rimL = new THREE.DirectionalLight(0x8a4ad0, 0.7);
  rimL.position.set(5, 3, -6);
  cscene.add(rimL);
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
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.14), new THREE.MeshLambertMaterial({ color: 0x3a3350 }));
    g.position.set(rnd(-7, 7), 0.4, rnd(-5, -1.5));
    g.rotation.set(rnd(-0.1, 0.1), rnd(-0.4, 0.4), rnd(-0.1, 0.1));
    cscene.add(g);
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
  const fxs = [spark, dust, mist, soulP, curseP, flame, amb];

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
    }
    if (flick) lamp.intensity = 1 + 0.25 * R.sin(T * 17) + 0.1 * R.sin(T * 41);
    renderer.render(cscene, ccam);
  }
  raf = requestAnimationFrame(loop);

  /* ---------- actors ---------- */
  function mk(c, o) {
    const m = new THREE.MeshLambertMaterial(Object.assign({ color: c, transparent: true }, o || {}));
    fadeMats.push(m);
    return m;
  }
  function limb(r1, r2, len, m, x, y) {
    const piv = new THREE.Group();
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10), m);
    me.position.y = -len / 2;
    piv.add(me);
    const e = new THREE.Mesh(new THREE.SphereGeometry(r2 * 1.15, 10, 8), m);
    e.position.y = -len;
    piv.add(e);
    piv.position.set(x, y, 0);
    return piv;
  }
  function makePerson(p) {
    const g = new THREE.Group();
    const body = new THREE.Group();
    const { h, w } = p;
    const sk = mk(p.skin), sh = mk(p.shirt), pa = mk(p.pants), hr = mk(p.hair), shoe = mk(0x1a1218);
    g.add(body);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * w, 0.2 * w, 0.58 * h, 14), sh);
    torso.position.y = 0.98 * h;
    const sh2 = new THREE.Mesh(new THREE.SphereGeometry(0.2 * w, 14, 10), sh);
    sh2.scale.y = 0.5;
    sh2.position.y = 1.26 * h;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8), sk);
    neck.position.y = 1.31 * h;
    const head = new THREE.Group();
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), sk));
    head.position.y = 1.46 * h;
    [-0.05, 0.05].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0x140c10 }));
      e.position.set(x, 0.02, 0.125);
      head.add(e);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.01), hr);
      b.position.set(x, 0.065, 0.13);
      head.add(b);
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), sk);
    nose.position.set(0, -0.01, 0.14);
    head.add(nose);
    if (p.hs) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, PI * 2, 0, PI * 0.55), hr);
      cap.position.y = 0.01;
      cap.rotation.x = -0.25;
      head.add(cap);
      if (p.hs === 2) {
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.09), hr);
        bk.position.set(0, -0.1, -0.11);
        head.add(bk);
      }
    }
    const legL = limb(0.075 * w, 0.06 * w, 0.7 * h, pa, -0.09 * w, 0.7 * h);
    const legR = limb(0.075 * w, 0.06 * w, 0.7 * h, pa, 0.09 * w, 0.7 * h);
    [legL, legR].forEach((l) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), shoe);
      s.position.set(0, -0.7 * h, 0.04);
      l.add(s);
    });
    const armL = limb(0.05, 0.042, 0.5 * h, sh, -0.25 * w, 1.25 * h);
    const armR = limb(0.05, 0.042, 0.5 * h, sh, 0.25 * w, 1.25 * h);
    body.add(torso, sh2, neck, head, legL, legR, armL, armR);
    const sd = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false }));
    sd.rotation.x = -PI / 2;
    sd.position.y = 0.02;
    g.add(sd);
    g.userData = { body, head, legL, legR, armL, armR };
    return g;
  }
  function makeReaper() {
    const g = new THREE.Group();
    const dark = mk(0x07030c, { side: THREE.DoubleSide });
    const rim = mk(0x8a50c8, { side: THREE.BackSide });
    const eye = new THREE.MeshBasicMaterial({ color: 0xffd060 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.3, 20, 1, true), dark);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.3, 20, 1, true), rim);
    cone.position.y = c2.position.y = 0.65;
    cone.userData.k = 1;
    c2.userData.k = 1.1;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), dark);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), rim);
    hood.position.y = h2.position.y = 1.38;
    h2.scale.setScalar(1.14);
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eye);
    const e2 = e1.clone();
    e1.position.set(-0.08, 1.38, 0.19);
    e2.position.set(0.08, 1.38, 0.19);
    const sc = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2, 6), mk(0x4a3320));
    const bl = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 6, 22, PI * 0.85), mk(0xdfe6f8));
    const gl = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    bl.position.set(-0.33, 1, 0);
    bl.rotation.z = PI * 0.6;
    gl.position.set(-0.5, 1.15, 0);
    sc.add(pole, bl, gl);
    sc.position.set(0.55, 1, 0.25);
    g.add(c2, cone, h2, hood, e1, e2, sc);
    g.userData = { cl: [cone, c2], sc };
    return g;
  }

  /* ---------- effects ---------- */
  const flashOut = (a, d = 0.6) => anim(d, (k) => setFlash(a * (1 - k)));
  function idle(u, t) {
    u.body.position.y = 0.012 * R.sin(t * 2);
    u.legL.rotation.x = R.sin(t * 1.5) * 0.02;
    u.legR.rotation.x = -R.sin(t * 1.5) * 0.02;
  }
  function shock(x, z, col = 0xdfe6ff) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 48),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    m.rotation.x = -PI / 2;
    m.position.set(x, 0.06, z);
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
      new THREE.Mesh(
        new THREE.TubeGeometry(c, 50, w * 4, 6),
        new THREE.MeshBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }),
      ),
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

  /* ---------- the fate itself ---------- */
  async function play(person, tool) {
    actors.forEach((a) => cscene.remove(a));
    actors = [];
    fadeMats = [];
    lamp.intensity = 1;
    lamp.color.set(0xffc27a);
    flick = true;
    shk = 0;
    moon.material.color.set(0xe9eeff);
    halo.material.opacity = 0.14;
    cscene.background.set(0x0b0616);
    const per = add(makePerson(appearance(person)));
    const u = per.userData;
    const rp = add(new THREE.Group());
    const rg = makeReaper();
    rg.scale.setScalar(1.25);
    rp.add(rg);
    rpg = rg;
    rp.position.set(-9, 0, 0.8);
    rp.rotation.y = PI / 2;
    cam.p.set(5, 2.6, 10);
    cam.t.set(0, 1, 0);
    setFlash(1);
    flashOut(1, 1);

    await anim(2.8, (k) => {
      const e = ease(k);
      rp.position.x = -9 + 7.4 * e;
      rp.position.y = 0.15 + 0.1 * R.sin(k * 16);
      cam.p.set(5 - 5 * e, 2.6 - 1.1 * e, 10 - 3.8 * e);
      idle(u, T);
    });
    await anim(0.9, (k) => {
      const e = ease(k);
      u.head.rotation.y = -0.9 * e;
      u.armL.rotation.z = 0.5 * e;
      u.armR.rotation.z = -0.5 * e;
      per.position.z = -0.25 * e;
      idle(u, T);
    });

    const sc = rg.userData.sc;
    const hand = V(-1.5, 1.7, 0.9);
    const chest = V(0, 1.15, 0.1);
    let dir = -1;
    let big = false;

    if (tool === 'knife' || tool === 'arrow') {
      const m = add(new THREE.Group());
      const isK = tool === 'knife';
      const mat = new THREE.MeshBasicMaterial({ color: 0xeef3ff });
      const bl = new THREE.Mesh(isK ? new THREE.ConeGeometry(0.07, 0.7, 4) : new THREE.CylinderGeometry(0.015, 0.015, 1.1, 6), mat);
      bl.rotation.z = -PI / 2;
      m.add(bl);
      if (isK) {
        const hd = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.06), new THREE.MeshBasicMaterial({ color: 0x3a2515 }));
        hd.position.x = -0.4;
        m.add(hd);
      } else {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), mat);
        tip.rotation.z = -PI / 2;
        tip.position.x = 0.6;
        m.add(tip);
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
    } else if (tool === 'lightning') {
      await anim(1.5, (k) => {
        moon.material.color.setScalar(1 - 0.8 * k);
        halo.material.opacity = 0.14 * (1 - k);
        cscene.background.setScalar(0.04 * (1 - k));
        shk = 0.25 * k;
        sc.rotation.z = -0.5 * k;
      });
      const g = add(new THREE.Group());
      g.add(bolt(0, 0, 1.75, 0.05), bolt(0.6, 0.3, 6, 0.03), bolt(-0.7, -0.2, 7, 0.03));
      impact(V(0, 1.7, 0), true);
      anim(0.6, (k) => {
        g.visible = k < 0.65 ? ((k * 16) | 0) % 2 === 0 : false;
      });
      big = true;
    } else if (tool === 'anvil') {
      const sd = add(new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0, depthWrite: false })));
      sd.rotation.x = -PI / 2;
      sd.position.y = 0.04;
      const bk = add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.75), new THREE.MeshLambertMaterial({ color: 0x55556a })));
      bk.position.set(0, 12, 0);
      const tp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.9), new THREE.MeshLambertMaterial({ color: 0x44445a }));
      tp.position.y = 0.38;
      bk.add(tp);
      await anim(0.5, (k) => {
        sc.rotation.z = -0.5 * k;
      });
      await anim(1, (k) => {
        bk.position.y = 12 - 11.6 * k * k;
        sd.material.opacity = 0.6 * k;
        sd.scale.setScalar(0.4 + 0.9 * k);
      });
      u.body.scale.y = 0.1;
      u.armL.rotation.z = u.armR.rotation.z = 0;
      impact(V(0, 0.4, 0), true);
      dir = 0;
      big = true;
    } else if (tool === 'meteor') {
      const m = add(new THREE.Group());
      m.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffb050 })),
        new THREE.Mesh(
          new THREE.SphereGeometry(0.7, 14, 10),
          new THREE.MeshBasicMaterial({ color: 0xff5020, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
        ),
      );
      await anim(0.8, (k) => {
        sc.rotation.z = -0.5 * k;
        shk = 0.15 * k;
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
      big = true;
    } else if (tool === 'curse') {
      const rings = [0, 1, 2].map((i) => {
        const t = add(
          new THREE.Mesh(
            new THREE.TorusGeometry(0.8 - i * 0.1, 0.03, 8, 40),
            new THREE.MeshBasicMaterial({ color: 0x9a40e0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
          ),
        );
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
      dir = 1;
    } else if (tool === 'fire') {
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
        idle(u, T);
      });
      u.body.rotation.z = 0;
      impact(V(0, 1, 0), true);
      flame.burst(V(0, 0.3, 0), 120, 1.4, 4, 1.4);
      dir = 1;
      big = true;
    } else {
      // poison
      const bt = add(new THREE.Group());
      const gm = new THREE.MeshBasicMaterial({ color: 0x4aff7a, transparent: true, opacity: 0.75 });
      const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8), gm);
      nk.position.y = 0.22;
      bt.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), gm), nk);
      bt.position.copy(hand);
      await anim(0.8, (k) => {
        bt.position.set(-1.5 + 0.9 * ease(k), 1.7 + 0.6 * ease(k), 0.9 - 0.3 * ease(k));
        sc.rotation.z = -0.5 * k;
      });
      await anim(2, (k) => {
        bt.rotation.z = -1.9 * R.min(1, k * 3);
        const mo = bt.position.clone().add(V(0.2, 0.1, 0));
        mist.burst(mo, 4, 0.5, -0.1, 2.2);
        for (let i = 0; i < 3; i++) mist.burst(V(rnd(-0.6, 0.6), rnd(0.3, 1.6), rnd(-0.5, 0.5)), 1, 0.3, 0.1, 1.6);
        if (k > 0.5) {
          u.armR.rotation.z = -0.4;
          u.armR.rotation.x = -1.4;
          u.body.rotation.z = 0.05 * R.sin(T * 20);
        }
        u.head.rotation.x = 0.3 * k;
        idle(u, T);
      });
      bt.visible = false;
      u.armR.rotation.x = 0;
      u.body.rotation.z = 0;
      u.head.rotation.x = 0;
      flashOut(0.35, 0.8);
      shk = 0.5;
      mist.burst(V(0, 1, 0), 70, 1.5, 0.5, 2.2);
      dir = 1;
    }

    if (big) await wait(110);
    if (big) anim(0.9, (k) => cam.p.lerpVectors(V(0, 1.5, 6.2), V(0.3, 1.3, 3.8), ease(k)));
    if (tool === 'anvil') await wait(900);
    else await die(per, u, dir);

    // the soul rises
    const soul = add(new THREE.Group());
    const sm = new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, blending: THREE.AdditiveBlending });
    const hm = new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    soul.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), sm), new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), hm));
    const c1 = cam.p.clone();
    lamp.intensity = 0.6;
    lamp.color.set(0xffc27a);
    await anim(3.6, (k) => {
      soul.position.set(per.position.x, 0.8 + k * 5.5, per.position.z);
      const o = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
      sm.opacity = o;
      hm.opacity = o * 0.3;
      soulP.burst(soul.position, 2, 0.3, 0, 1.2);
      fadeMats.forEach((m) => (m.opacity = R.max(0, 1 - k * 1.4)));
      cam.p.lerpVectors(c1, V(0, 3.4, 6.6), ease(k));
      cam.t.set(0, 1 + k * 3.2, 0);
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
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
