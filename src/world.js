import * as THREE from 'three';

const flickerLights = [];
let dust = null;

function m(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.05, ...opts });
}

function box(scene, w, h, d, x, y, z, mat, ry = 0, rz = 0, rx = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  scene.add(mesh);
  return mesh;
}

// seeded-ish RNG so the ruin looks the same every load
let seed = 1337;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

// Builds the ruined pizzeria. Everything solid goes into one group so the
// vision system can raycast against it as the set of occluders; returns it.
export function buildWorld(rootScene) {
  rootScene.background = new THREE.Color(0x02030a);
  rootScene.fog = new THREE.FogExp2(0x02030a, 0.042);
  const scene = new THREE.Group();
  scene.name = 'world';
  rootScene.add(scene);

  const wallMat = m(0x2a2320);
  const wallMat2 = m(0x241e1c);
  const floorMat = m(0x1c1916);
  const debrisMat = m(0x3a3128);
  const woodMat = m(0x4a3520);

  // floor 36 x 30 (x: -18..18, z: -15..15). Player hides at z ~ 13.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 30, 12, 10), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // checkerboard hint: scattered lighter tiles
  const tileMat = m(0x262220);
  for (let i = 0; i < 40; i++) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), tileMat);
    t.rotation.x = -Math.PI / 2;
    t.position.set(Math.floor(rnd() * 18 - 9) * 2, 0.01, Math.floor(rnd() * 15 - 7) * 2);
    scene.add(t);
  }

  // perimeter walls, broken into segments with collapsed gaps
  const wallSpec = [
    { axis: 'x', fixed: -15, from: -18, to: 18 }, // back (stage side z=-15)
    { axis: 'x', fixed: 15, from: -18, to: 18 },  // front (player side)
    { axis: 'z', fixed: -18, from: -15, to: 15 }, // west
    { axis: 'z', fixed: 18, from: -15, to: 15 }   // east
  ];
  wallSpec.forEach((w) => {
    for (let s = w.from; s < w.to; s += 3) {
      const h = rnd() < 0.22 ? 1 + rnd() * 1.5 : 4.5 + rnd() * 1; // some collapsed
      const mat = rnd() < 0.5 ? wallMat : wallMat2;
      if (w.axis === 'x') box(scene, 3.05, h, 0.5, s + 1.5, h / 2, w.fixed, mat, 0, rnd() * 0.05 - 0.025);
      else box(scene, 0.5, h, 3.05, w.fixed, h / 2, s + 1.5, mat, 0, 0, rnd() * 0.05 - 0.025);
    }
  });

  // interior partial walls suggesting rooms (heavily destroyed)
  // west rooms divider (backstage / cove)
  for (let z = -15; z < 6; z += 3) {
    if (rnd() < 0.35) continue;
    const h = 2 + rnd() * 2.5;
    box(scene, 0.4, h, 2.8, -10.5, h / 2, z + 1.5, wallMat2);
  }
  // east rooms divider (kitchen / parts&service)
  for (let z = -15; z < 8; z += 3) {
    if (rnd() < 0.35) continue;
    const h = 2 + rnd() * 2.5;
    box(scene, 0.4, h, 2.8, 10.5, h / 2, z + 1.5, wallMat2);
  }

  // stage platform + torn curtain backdrop
  box(scene, 13, 0.8, 4.5, 0, 0.4, -13, m(0x2e2420));
  const curtainMat = m(0x3d0d14);
  for (let i = 0; i < 9; i++) {
    const h = 3 + rnd() * 1.6;
    box(scene, 1.35, h, 0.15, -6 + i * 1.5, 0.8 + h / 2, -14.6, curtainMat, 0, rnd() * 0.1 - 0.05);
  }
  // stage star decorations (fallen)
  box(scene, 0.8, 0.8, 0.1, -3, 0.85, -12, m(0x776622, { emissive: 0x221a00 }), 0.4, 0.9);

  // Pirate Cove: curtain arc at (-13, 2)
  const coveMat = m(0x4a1a52);
  box(scene, 0.18, 3.4, 2.2, -14.4, 1.7, 1.0, coveMat, 0.35);
  box(scene, 0.18, 3.4, 2.2, -14.4, 1.7, 3.2, coveMat, -0.35);
  box(scene, 2.6, 0.25, 0.25, -13.6, 3.5, 2.1, m(0x555555, { metalness: 0.6 }), 0.2);

  // dining tables — some standing, some flipped
  const tableTopGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.12, 10);
  const tableTopMat = m(0x59422a);
  const spots = [[-6, -6], [-2, -7], [3, -5], [7, -7], [-7, -1], [-3, 1], [2, 0], [6, 1], [-5, 4], [1, 4], [5, 5]];
  spots.forEach(([x, z]) => {
    const g = new THREE.Group();
    const top = new THREE.Mesh(tableTopGeo, tableTopMat);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.9, 6), m(0x333333, { metalness: 0.5 }));
    if (rnd() < 0.45) { // flipped on its side
      top.position.y = 0;
      leg.position.set(0, 0, 0.5);
      leg.rotation.x = Math.PI / 2;
      g.rotation.x = Math.PI / 2;
      g.position.set(x, 1.1, z);
      g.rotation.z = rnd() * Math.PI;
    } else {
      top.position.y = 0.95;
      leg.position.y = 0.45;
      g.position.set(x, 0, z);
      g.rotation.z = (rnd() - 0.5) * 0.15;
    }
    g.add(top); g.add(leg);
    scene.add(g);
  });

  // party chairs, scattered
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), m(0x6a2130));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.07), m(0x6a2130));
    seat.position.y = 0.45; back.position.set(0, 0.75, -0.22);
    g.add(seat); g.add(back);
    g.position.set(rnd() * 24 - 12, 0, rnd() * 20 - 12);
    if (rnd() < 0.6) { g.rotation.z = Math.PI / 2 * (rnd() < 0.5 ? 1 : -1); g.position.y = 0.25; }
    g.rotation.y = rnd() * Math.PI * 2;
    scene.add(g);
  }

  // arcade cabinets along east wall
  for (let i = 0; i < 3; i++) {
    const cab = box(scene, 1, 2, 0.9, 16.5, 1, -12 + i * 2.6, m(0x1a2440));
    const screen = box(scene, 0.6, 0.5, 0.05, 16.0, 1.4, -12 + i * 2.6, m(0x000000, { emissive: 0x001505, emissiveIntensity: 0.6 }));
    screen.rotation.y = -Math.PI / 2;
    cab.rotation.z = (rnd() - 0.5) * 0.12;
  }

  // ceiling slabs (partial — collapsed roof)
  const slabMat = m(0x211d1a);
  for (let x = -16; x < 16; x += 4.5) {
    for (let z = -13; z < 13; z += 4.5) {
      if (rnd() < 0.4) continue; // hole
      box(scene, 4.6, 0.3, 4.6, x + 2, 4.6 + rnd() * 0.4, z + 2, slabMat, 0, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.1);
    }
  }
  // dangling support beams
  for (let i = 0; i < 6; i++) {
    box(scene, 0.25, 3.5, 0.25, rnd() * 28 - 14, 3, rnd() * 22 - 11, m(0x4b3a24), 0, (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.9);
  }

  // general debris field
  for (let i = 0; i < 70; i++) {
    const s = 0.25 + rnd() * 1.1;
    const mat = rnd() < 0.5 ? debrisMat : woodMat;
    box(scene, s, s * (0.3 + rnd() * 0.6), s * (0.5 + rnd()), rnd() * 32 - 16, s * 0.25, rnd() * 27 - 13.5, mat, rnd() * Math.PI, (rnd() - 0.5) * 0.4);
  }

  // ---- the player's debris nest at (0, 13) ----
  // big slabs leaning over the camera, framing the view
  box(scene, 3.4, 0.35, 4.5, -2.3, 1.65, 12.6, slabMat, 0.15, 0.85);
  box(scene, 3.4, 0.35, 4.5, 2.3, 1.7, 12.6, slabMat, -0.12, -0.8);
  box(scene, 4.5, 0.3, 2.5, 0, 2.6, 14.2, slabMat, 0, 0, 0.28);
  // rubble heap around
  for (let i = 0; i < 22; i++) {
    const s = 0.3 + rnd() * 0.7;
    box(scene, s, s * 0.6, s, (rnd() - 0.5) * 5, s * 0.3, 11.5 + rnd() * 3, i % 2 ? debrisMat : woodMat, rnd() * Math.PI);
  }
  // a fallen "SHOW STAGE" style marquee of colored blocks near the player
  const partyColors = [0xaa2233, 0x2255aa, 0xaa8822, 0x22aa55];
  for (let i = 0; i < 6; i++) {
    box(scene, 0.16, 0.16, 0.16, -1.6 + i * 0.6 + (rnd() - 0.5) * 0.4, 0.08, 9.4 + rnd() * 0.9,
      m(partyColors[i % 4], { roughness: 0.6 }), rnd() * Math.PI, (rnd() - 0.5) * 0.6);
  }

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0x223344, 0.25));

  // moonlight shaft through the roof hole above dining
  const moon = new THREE.SpotLight(0x7788cc, 260, 45, 0.5, 0.55, 1.6);
  moon.position.set(4, 16, -3);
  moon.target.position.set(2, 0, -1);
  scene.add(moon); scene.add(moon.target);

  // second faint shaft near the player
  const moon2 = new THREE.SpotLight(0x667799, 120, 35, 0.6, 0.7, 1.7);
  moon2.position.set(-3, 14, 10);
  moon2.target.position.set(-1, 0, 11);
  scene.add(moon2); scene.add(moon2.target);

  // dying red emergency light in the kitchen
  const red = new THREE.PointLight(0xff2211, 30, 16, 1.8);
  red.position.set(13, 2.6, -6);
  scene.add(red);
  flickerLights.push({ light: red, base: 30, t: 0 });

  // sputtering fluorescent over west hall
  const flo = new THREE.PointLight(0xaabbcc, 14, 12, 1.8);
  flo.position.set(-7, 3.8, 7);
  scene.add(flo);
  flickerLights.push({ light: flo, base: 14, t: 0 });

  // drifting dust motes
  const count = 350;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * 34 - 17;
    pos[i * 3 + 1] = Math.random() * 4.5;
    pos[i * 3 + 2] = Math.random() * 28 - 14;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x8899aa, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true
  }));
  rootScene.add(dust); // not an occluder
  return scene;
}

export function worldTick(dt) {
  flickerLights.forEach((f) => {
    f.t -= dt;
    if (f.t <= 0) {
      f.t = 0.04 + Math.random() * 0.3;
      f.light.intensity = Math.random() < 0.75 ? f.base * (0.5 + Math.random() * 0.7) : f.base * 0.05;
    }
  });
  if (dust) {
    const p = dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * 0.07;
      if (y < 0) y = 4.5;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  }
}
