import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import { subsolarPoint, isNight } from '../lib/sun.js';
import { ASSIGNMENT_WINDOW_H, HOUR } from '../lib/game.js';
import { addStars, createTweens, ease, ll2v } from '../lib/geo3d.js';

const LAND = feature(land110, land110.objects.land);

/**
 * Earth data texture (equirectangular). Channels are masks the shader colours:
 *   R = land, G = dotted "city light" grid on land, B = coastlines (+ faint graticule).
 */
function makeEarthTexture() {
  const W = 2048;
  const H = 1024;
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);

  // land mask, used to decide where dots go
  const m = document.createElement('canvas');
  m.width = W;
  m.height = H;
  const mctx = m.getContext('2d');
  mctx.fillStyle = '#fff';
  mctx.beginPath();
  geoPath(proj, mctx)(LAND);
  mctx.fill();
  const mask = mctx.getImageData(0, 0, W, H).data;
  const isLand = (x, y) => mask[(Math.min(H - 1, Math.max(0, y | 0)) * W + Math.min(W - 1, Math.max(0, x | 0))) * 4] > 128;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const path = geoPath(proj, ctx);

  ctx.beginPath();
  path(LAND);
  ctx.fillStyle = 'rgb(255,0,0)';
  ctx.fill();

  // dot grid, spaced evenly on the sphere (wider in x near the poles)
  ctx.fillStyle = 'rgb(0,255,0)';
  const step = 7;
  for (let y = step / 2; y < H; y += step) {
    const lat = (0.5 - y / H) * Math.PI;
    const sx = step / Math.max(0.15, Math.cos(lat));
    const off = (Math.round(y / step) % 2) * sx * 0.5;
    for (let x = off; x < W; x += sx) {
      if (!isLand(x, y)) continue;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = 'rgb(0,0,45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  path(LAND);
  ctx.strokeStyle = 'rgb(0,0,255)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}

const COLORS = {
  due: new THREE.Color(0xe0587a),
  soon: new THREE.Color(0xf2c14e),
  later: new THREE.Color(0x9a90b0),
  reaped: new THREE.Color(0x6a3a9a),
  lost: new THREE.Color(0x6fc2c0),
};
const DAY_DIM = new THREE.Color(0x4a4458);

export default function Globe({ world, now, selectedId, onSelect, paused, markedIds = [], hidePins = false }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const leaderRef = useRef(null);
  const markersRef = useRef(null);
  const flashRef = useRef(null);
  const api = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* ---------- one-time scene setup ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 100);
    camera.position.set(0, 0, 3.4);
    const tweens = createTweens();

    const globe = new THREE.Group();
    scene.add(globe);
    const U = { map: { value: makeEarthTexture() }, sun: { value: new THREE.Vector3(1, 0, 0) }, time: { value: 0 } };
    globe.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1, 128, 96),
        new THREE.ShaderMaterial({
          uniforms: U,
          vertexShader: `varying vec2 vUv;varying vec3 vP;varying vec3 vN;
            void main(){vUv=uv;vP=position;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform sampler2D map;uniform vec3 sun;uniform float time;varying vec2 vUv;varying vec3 vP;varying vec3 vN;
            float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
            void main(){
              vec4 t=texture2D(map,vUv);
              float land=t.r, dots=t.g, line=t.b;
              float d=dot(normalize(vP),sun);
              float day=smoothstep(-.08,.12,d);
              // night side: near-black land, crimson coasts, flickering red city lights
              float flick=.55+.45*hash(floor(vP*180.));
              flick*=.85+.15*sin(time*1.7+hash(floor(vP*60.))*6.28);
              vec3 night=vec3(.012,.008,.02)+land*vec3(.05,.025,.04)
                +line*vec3(.75,.12,.2)
                +dots*flick*vec3(1.,.22,.26)*.95;
              // day side: muted violet-grey, dots and coasts faint
              vec3 dayc=vec3(.05,.045,.09)+land*vec3(.17,.14,.2)
                +line*vec3(.42,.36,.5)
                +dots*vec3(.28,.25,.32);
              vec3 col=mix(night,dayc,day);
              // ember glow along the dusk line
              col+=vec3(1.,.35,.2)*exp(-abs(d)*28.)*.32;
              // rim light
              float rim=pow(1.-max(dot(vN,vec3(0.,0.,1.)),0.),3.);
              col+=mix(vec3(.75,.1,.22),vec3(.55,.45,.85),day)*rim*.55;
              gl_FragColor=vec4(col,1.);
            }`,
        }),
      ),
    );
    // atmosphere glow: crimson on the night side, violet by day
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.14, 64, 48),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader:
            'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:
            'varying vec3 vN;void main(){float i=pow(clamp(-dot(vN,vec3(0.,0.,1.))*2.4,0.,1.),2.4)*.85;gl_FragColor=vec4(.8,.16,.3,1.)*i;}',
        }),
      ),
    );
    // a faint 24-hour dial around the globe (a clock for Death)
    const dial = new THREE.Group();
    {
      const pts = [];
      const R = 1.3;
      for (let i = 0; i < 360; i += 2) {
        const a0 = (i * Math.PI) / 180;
        const a1 = ((i + 1.2) * Math.PI) / 180; // dashed circle
        pts.push(Math.cos(a0) * R, Math.sin(a0) * R, 0, Math.cos(a1) * R, Math.sin(a1) * R, 0);
      }
      for (let h = 0; h < 24; h++) {
        const a = (h / 24) * Math.PI * 2;
        const r0 = h % 6 === 0 ? 1.34 : 1.32;
        pts.push(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0, Math.cos(a) * r0 * 1.02, Math.sin(a) * r0 * 1.02, 0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      dial.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xd9b36a, transparent: true, opacity: 0.22 })));
    }
    scene.add(dial);
    addStars(scene);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.022, 0.03, 32),
      new THREE.MeshBasicMaterial({ color: 0xff5a64, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    );
    ring.visible = false;
    globe.add(ring);
    // a light beam rising from the selected soul
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.32, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff4a5a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    beam.visible = false;
    globe.add(beam);

    // the reaper's marker: a little hooded cone standing on the globe
    const reaper = new THREE.Group();
    const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 12), new THREE.MeshBasicMaterial({ color: 0x0c0614 }));
    cloak.position.y = 0.03;
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.position.y = 0.035;
    const eyes = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd060 }));
    eyes.position.set(0, 0.05, 0.009);
    reaper.add(glow, cloak, eyes);
    globe.add(reaper);

    const dGeo = new THREE.SphereGeometry(0.012, 8, 6);
    const dots = new Map(); // id -> mesh

    /* ---------- input ---------- */
    let drag = null;
    let busy = false;
    let lastInteract = 0;
    const onDown = (e) => {
      drag = { x: e.clientX, y: e.clientY, m: 0 };
      canvas.setPointerCapture(e.pointerId);
      lastInteract = performance.now();
    };
    const onMove = (e) => {
      if (!drag || busy) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.m += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      globe.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.006, dx * 0.006, 0)));
      lastInteract = performance.now();
    };
    const onUp = (e) => {
      if (drag && drag.m < 6 && !busy) tap(e);
      drag = null;
    };
    const onWheel = (e) => {
      camera.position.z = Math.min(5, Math.max(1.6, camera.position.z + e.deltaY * 0.002));
      lastInteract = performance.now();
    };
    function tap(e) {
      const r = canvas.getBoundingClientRect();
      let best = null;
      let bd = 28;
      dots.forEach((d) => {
        const w = globe.localToWorld(d.position.clone());
        if (w.dot(camera.position) < 1) return; // back side of the globe
        const s = w.project(camera);
        const x = ((s.x + 1) / 2) * r.width + r.left;
        const y = ((1 - s.y) / 2) * r.height + r.top;
        const k = Math.hypot(x - e.clientX, y - e.clientY);
        if (k < bd) {
          bd = k;
          best = d.userData.id;
        }
      });
      if (best) onSelectRef.current(best);
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });

    // rotation that brings v to the front of the globe while keeping north up
    function faceQuat(v) {
      const yaw = Math.atan2(-v.x, v.z);
      const r = Math.hypot(v.x, v.z);
      const tilt = Math.atan2(v.y, r) * 0.85; // tilt slightly less so the poles stay in view
      const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
      return qx.multiply(qy);
    }
    async function face(v) {
      busy = true;
      const q0 = globe.quaternion.clone();
      const q1 = faceQuat(v);
      await tweens.anim(0.9, (k) => globe.quaternion.copy(q0).slerp(q1, ease(k)));
      busy = false;
      lastInteract = performance.now();
    }

    /* ---------- resize + loop ---------- */
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // keep the whole globe visible on narrow screens
      camera.position.z = Math.max(camera.position.z, width / height < 0.9 ? 4.2 : 3.4);
      camera.updateProjectionMatrix();
    });
    ro.observe(wrapRef.current);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.0006, 0));
    let raf = 0;
    const state = { paused: false, selected: null };
    function loop(t) {
      raf = requestAnimationFrame(loop);
      if (state.paused) return;
      tweens.step(t);
      const idle = !drag && !busy && !state.selected && t - lastInteract > 4000;
      if (idle && !reduce) globe.quaternion.premultiply(spin);
      glow.material.opacity = 0.35 + 0.15 * Math.sin(t / 400);
      U.time.value = t / 1000;
      if (!reduce) dial.rotation.z = -t / 60000;
      if (ring.visible) ring.scale.setScalar(1 + 0.35 * (0.5 + 0.5 * Math.sin(t / 260)));
      beam.material.opacity = 0.55 + 0.25 * Math.sin(t / 300);
      renderer.render(scene, camera);
      drawLeader();
      drawMarkers();
    }
    raf = requestAnimationFrame(loop);

    /* leader line: from the selected soul's dot to the target card on the left */
    const tmp = new THREE.Vector3();
    function drawLeader() {
      const svg = leaderRef.current;
      if (!svg) return;
      const path = svg.querySelector('path');
      const dot = svg.querySelector('circle');
      const m = state.selected && dots.get(state.selected);
      const card = m && wrapRef.current.parentElement.querySelector('.ov-frame');
      if (!m || !card) {
        svg.style.opacity = 0;
        return;
      }
      globe.localToWorld(tmp.copy(m.position));
      const facing = tmp.clone().normalize().dot(camera.position.clone().normalize());
      const wr = wrapRef.current.getBoundingClientRect();
      tmp.project(camera);
      const x = ((tmp.x + 1) / 2) * wr.width;
      const y = ((1 - tmp.y) / 2) * wr.height;
      const cr = card.getBoundingClientRect();
      const ax = cr.right - wr.left + 6;
      const ay = cr.top - wr.top + cr.height * 0.5;
      const kx = ax + Math.max(24, (x - ax) * 0.35); // elbow
      path.setAttribute('d', `M${ax},${ay} H${kx} L${x},${y}`);
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      svg.style.opacity = facing > 0.15 && x > ax + 30 ? 1 : 0;
    }

    /* floating pins over the 5 most urgent souls (HTML, positioned every frame) */
    const mv = new THREE.Vector3();
    function drawMarkers() {
      const box = markersRef.current;
      if (!box) return;
      const wr = wrapRef.current.getBoundingClientRect();
      const camDir = camera.position.clone().normalize();
      box.querySelectorAll('.gm').forEach((el) => {
        const m = dots.get(el.dataset.id);
        if (!m) {
          el.style.opacity = 0;
          return;
        }
        globe.localToWorld(mv.copy(m.position));
        const facing = mv.clone().normalize().dot(camDir);
        mv.project(camera);
        const x = ((mv.x + 1) / 2) * wr.width;
        const y = ((1 - mv.y) / 2) * wr.height;
        el.style.transform = `translate(${x}px, ${y}px)`;
        const show = facing > 0.12;
        el.style.opacity = show ? Math.min(1, (facing - 0.12) * 6) : 0;
        el.style.pointerEvents = show ? 'auto' : 'none';
        el.style.zIndex = Math.round(facing * 100);
      });
    }

    /* click effect: shockwave rings on the surface + camera punch-in */
    const waveGeo = new THREE.RingGeometry(0.03, 0.038, 48);
    function burst(v) {
      for (let i = 0; i < 3; i++) {
        const w = new THREE.Mesh(
          waveGeo,
          new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffc06a : 0xff3b4e, transparent: true, opacity: 0.95, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        w.position.copy(v).multiplyScalar(1.01);
        w.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
        globe.add(w);
        setTimeout(() => {
          tweens.anim(1.1, (k) => {
            w.scale.setScalar(1 + ease(k) * 9);
            w.material.opacity = 0.95 * (1 - k);
          }).then(() => {
            globe.remove(w);
            w.material.dispose();
          });
        }, i * 160);
      }
      if (!reduce) {
        const z0 = camera.position.z;
        const zIn = Math.max(1.7, z0 * 0.72);
        tweens.anim(0.55, (k) => { camera.position.z = z0 + (zIn - z0) * ease(k); })
          .then(() => tweens.anim(0.8, (k) => { camera.position.z = zIn + (z0 * 0.9 - zIn) * ease(k); }));
      }
      const f = flashRef.current;
      if (f) {
        f.classList.remove('on');
        void f.offsetWidth; // restart the animation
        f.classList.add('on');
      }
    }

    api.current = { U, dots, dGeo, globe, ring, beam, reaper, face, faceQuat, state, burst, oriented: false };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
      renderer.dispose();
      api.current = null;
    };
  }, []);

  /* ---------- sync people → dots (every second) ---------- */
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const date = new Date(now);
    const s = subsolarPoint(date);
    a.U.sun.value.copy(ll2v(s.lat, s.lon));

    const seen = new Set();
    const horizon = now + ASSIGNMENT_WINDOW_H * HOUR;
    for (const p of world.people) {
      seen.add(p.id);
      let m = a.dots.get(p.id);
      if (!m) {
        m = new THREE.Mesh(a.dGeo, new THREE.MeshBasicMaterial());
        m.position.copy(ll2v(p.lat, p.lon)).multiplyScalar(1.006);
        m.userData = { id: p.id };
        a.globe.add(m);
        a.dots.set(p.id, m);
      }
      const night = isNight(p.lat, p.lon, date);
      let key = 'later';
      if (p.status === 'reaped') key = 'reaped';
      else if (p.status === 'lost') key = 'lost';
      else if (p.deathAt <= now) key = 'due';
      else if (p.deathAt <= horizon) key = 'soon';
      const col = COLORS[key].clone();
      if (!night && p.status === 'alive') col.lerp(DAY_DIM, 0.55);
      m.material.color.copy(col);
      const urgent = key === 'due' || key === 'soon';
      m.scale.setScalar(key === 'later' || key === 'reaped' ? 0.7 : urgent && night ? 1.6 : 1.1);
    }
    for (const [id, m] of a.dots) {
      if (!seen.has(id)) {
        a.globe.remove(m);
        m.material.dispose();
        a.dots.delete(id);
      }
    }

    const rv = ll2v(world.reaper.lat, world.reaper.lon);
    if (!a.oriented) {
      a.globe.quaternion.copy(a.faceQuat(rv)); // open facing the reaper's lair
      a.oriented = true;
    }
    a.reaper.position.copy(rv);
    a.reaper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rv);
  }, [world, now]);

  /* ---------- selection ring + face the selected person ---------- */
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const p = world.people.find((x) => x.id === selectedId);
    a.state.selected = p ? p.id : null;
    if (!p) {
      a.ring.visible = false;
      a.beam.visible = false;
      return;
    }
    const v = ll2v(p.lat, p.lon);
    a.ring.position.copy(v).multiplyScalar(1.008);
    a.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
    a.ring.visible = true;
    a.beam.position.copy(v).multiplyScalar(1.16);
    a.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    a.beam.visible = true;
    a.face(v);
    // only re-run when the selection changes, not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (api.current) api.current.state.paused = !!paused;
  }, [paused]);

  const onMarker = (id, el) => {
    el.classList.remove('is-burst');
    void el.offsetWidth;
    el.classList.add('is-burst');
    setTimeout(() => el.classList.remove('is-burst'), 900);
    const p = world.people.find((x) => x.id === id);
    if (p && api.current) api.current.burst(ll2v(p.lat, p.lon));
    onSelect(id);
  };

  return (
    <div className="globe" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Globe of scheduled deaths with live day and night. Drag to turn, scroll to zoom, click a dot to choose someone."
      />
      <div className="globe-flash" ref={flashRef} aria-hidden="true" />
      <div className={`gm-layer ${hidePins ? 'is-hidden' : ''}`} ref={markersRef}>
        {markedIds.map((id, i) => {
          const p = world.people.find((x) => x.id === id);
          if (!p) return null;
          const over = p.deathAt <= now;
          const night = isNight(p.lat, p.lon, new Date(now));
          return (
            <button
              key={id}
              data-id={id}
              className={`gm ${over ? 'is-over' : ''} ${night ? '' : 'is-day'} ${id === selectedId ? 'is-on' : ''}`}
              style={{ opacity: 0 }}
              onClick={(e) => onMarker(id, e.currentTarget)}
              aria-label={`Target ${i + 1}: ${p.name}, ${p.city}`}
            >
              <span className="gm-float">
                <span className="gm-pin">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 21 L15 4" />
                    <path d="M14.5 5 C18 3.6 21.5 5.8 22 9.5 C19.4 7.6 16.6 7.2 13.6 7.1" />
                  </svg>
                  <span className="gm-rank">{i + 1}</span>
                </span>
                <span className="gm-name">{p.name}</span>
              </span>
              <span className="gm-base" />
              <span className="gm-sparks" aria-hidden="true">
                {Array.from({ length: 12 }, (_, k) => <i key={k} style={{ '--a': `${k * 30}deg` }} />)}
              </span>
            </button>
          );
        })}
      </div>
      <svg className="leader" ref={leaderRef} aria-hidden="true">
        <path />
        <circle r="5" />
      </svg>
      <div className="map-legend">
        <span><i className="lg lg-due" /> Due now</span>
        <span><i className="lg lg-soon" /> Next 24h</span>
        <span><i className="lg lg-later" /> Later</span>
        <span><i className="lg lg-reaped" /> Reaped</span>
        <span className="lg-hint">Dim dots are in daylight</span>
      </div>
    </div>
  );
}
