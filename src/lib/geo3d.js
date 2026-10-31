import * as THREE from 'three';

const D = Math.PI / 180;

/** Latitude/longitude → unit vector, matching three.js SphereGeometry UVs (u = (lon+180)/360). */
export function ll2v(lat, lon) {
  const ph = (lon + 180) * D;
  const th = (90 - lat) * D;
  return new THREE.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));
}

export const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Tiny tween runner: call `step(now)` every frame; `anim(seconds, fn)` resolves when done. */
export function createTweens() {
  const list = [];
  return {
    anim(d, fn) {
      return new Promise((res) => list.push({ t0: performance.now(), d: d * 1000, fn, res }));
    },
    step(now) {
      for (let i = list.length - 1; i >= 0; i--) {
        const a = list[i];
        const k = Math.min(1, (now - a.t0) / a.d);
        a.fn(k);
        if (k >= 1) {
          list.splice(i, 1);
          a.res();
        }
      }
    },
    clear() {
      list.length = 0;
    },
  };
}

export function addStars(scene, n = 700) {
  const a = [];
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      .normalize()
      .multiplyScalar(40);
    a.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, color: 0xcfc4e6 })));
}
