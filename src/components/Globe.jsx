import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import { subsolarPoint, isNight } from '../lib/sun.js';
import { ASSIGNMENT_WINDOW_H, HOUR } from '../lib/game.js';
import { addStars, createTweens, ease, ll2v } from '../lib/geo3d.js';

const LAND = feature(land110, land110.objects.land);

/** Real coastlines painted onto an equirectangular canvas, used as the globe's texture. */
function makeEarthTexture() {
  const W = 2048;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141638';
  ctx.fillRect(0, 0, W, H);
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
  const path = geoPath(proj, ctx);
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = 'rgba(160,150,220,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  path(LAND);
  ctx.fillStyle = '#5b4a78';
  ctx.fill();
  ctx.strokeStyle = '#8a76ad';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
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

export default function Globe({ world, now, selectedId, onSelect, paused }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
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
    const U = { map: { value: makeEarthTexture() }, sun: { value: new THREE.Vector3(1, 0, 0) } };
    globe.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1, 96, 64),
        new THREE.ShaderMaterial({
          uniforms: U,
          vertexShader:
            'varying vec2 vUv;varying vec3 vP;void main(){vUv=uv;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader: `uniform sampler2D map;uniform vec3 sun;varying vec2 vUv;varying vec3 vP;
            void main(){vec3 t=texture2D(map,vUv).rgb;float d=dot(normalize(vP),sun);float day=smoothstep(-.06,.1,d);
            vec3 night=t*vec3(.55,.5,.95)+vec3(0.,0.,.02);
            vec3 dc=t*vec3(1.5,1.38,1.1)+vec3(.07,.05,.0);
            vec3 col=mix(night,dc,day);col+=vec3(.9,.3,.5)*exp(-abs(d)*40.)*.35;gl_FragColor=vec4(col,1.);}`,
        }),
      ),
    );
    // atmosphere glow
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.12, 64, 48),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader:
            'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:
            'varying vec3 vN;void main(){float i=pow(clamp(-dot(vN,vec3(0.,0.,1.))*2.2,0.,1.),2.)*.7;gl_FragColor=vec4(.5,.3,.9,1.)*i;}',
        }),
      ),
    );
    addStars(scene);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.022, 0.03, 32),
      new THREE.MeshBasicMaterial({ color: 0xefe6d2, side: THREE.DoubleSide }),
    );
    ring.visible = false;
    globe.add(ring);

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
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    api.current = { U, dots, dGeo, globe, ring, reaper, face, faceQuat, state, oriented: false };
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
      return;
    }
    const v = ll2v(p.lat, p.lon);
    a.ring.position.copy(v).multiplyScalar(1.008);
    a.ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
    a.ring.visible = true;
    a.face(v);
    // only re-run when the selection changes, not every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (api.current) api.current.state.paused = !!paused;
  }, [paused]);

  return (
    <div className="globe" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Globe of scheduled deaths with live day and night. Drag to turn, scroll to zoom, click a dot to choose someone."
      />
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
