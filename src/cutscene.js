// Night 5 ending: dawn. Seen from the debris, the animatronics have gathered
// in front of the player. A police officer and William Afton walk in; the
// officer shoots three of them down, and Afton switches the other two off by
// hand — he built them. Then he stands over the bear, looking at the parts.
import * as THREE from 'three';
import { G } from './state.js';
import { CH, PLAYER_POS } from './animatronics.js';
import * as SFX from './audio.js';
import * as UI from './ui.js';
import { t } from './i18n.js';

let scene = null;
let cut = null;

function mat(c, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...extra });
}
function cap(r, len, m) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m); }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }

// a person built from capsules, facing +z, with hip/shoulder pivots for walking
function makeHuman({ shirt, pants, skin = 0xc9a58a, cap: hatColor, badge = false, smile = false }) {
  const g = new THREE.Group();
  const shirtM = mat(shirt), pantsM = mat(pants), skinM = mat(skin);
  const legs = [-0.12, 0.12].map((x) => {
    const hip = at(new THREE.Group(), x, 0.95, 0);
    hip.add(at(cap(0.085, 0.72, pantsM), 0, -0.47, 0));
    hip.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.26), mat(0x111111)), 0, -0.9, 0.05));
    g.add(hip);
    return hip;
  });
  g.add(at(cap(0.2, 0.42, shirtM), 0, 1.3, 0));
  const arms = [-0.29, 0.29].map((x) => {
    const sh = at(new THREE.Group(), x, 1.56, 0);
    sh.add(at(cap(0.065, 0.52, shirtM), 0, -0.3, 0));
    sh.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skinM), 0, -0.62, 0));
    g.add(sh);
    return sh;
  });
  const head = at(new THREE.Group(), 0, 1.72, 0);
  head.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skinM), 0, 0.1, 0));
  if (hatColor !== undefined) {
    const hm = mat(hatColor);
    head.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.09, 14), hm), 0, 0.22, 0));
    head.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), hm), 0, 0.18, 0.13));
  }
  if (smile) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 4, 12, Math.PI), mat(0xffffff, { emissive: 0x666666 }));
    s.rotation.z = Math.PI;
    head.add(at(s, 0, 0.06, 0.125));
  }
  if (badge) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.02), mat(0xd8b448, { metalness: 0.8, roughness: 0.3 })), -0.1, 1.45, 0.19));
  g.userData = { legs, arms, head };
  return g;
}

function faceDir(obj, dx, dz) { obj.rotation.y = Math.atan2(dx, dz); }

// walker: moves obj from a to b between t0 and t1, legs swinging
function walk(actor, a, b, t0, t1) {
  actor.walks.push({ a: new THREE.Vector3(...a), b: new THREE.Vector3(...b), t0, t1 });
}

const LINEUP = {
  bonnie: [-3.0, 2.8], foxy: [-1.4, 1.8], freddy: [0.2, 1.2], endo: [1.7, 2.0], chica: [3.1, 2.8]
};

export function initCutscene(s) { scene = s; }

export function startCutscene(onDone) {
  const added = [];
  const add = (...objs) => { objs.forEach((o) => { scene.add(o); added.push(o); }); };

  // the machines, gathered in front of the debris and facing it
  const bots = {};
  Object.entries(LINEUP).forEach(([key, [x, z]]) => {
    const ch = CH[key];
    ch.active = false;
    ch.mesh.position.set(x, 0, z);
    ch.mesh.lookAt(PLAYER_POS.x, 0, PLAYER_POS.z);
    ch.setEyes(1.8, 0xff2222);
    bots[key] = { ch, base: null, fall: 0, falling: false, slump: 0, slumping: false, speed: 1.6 };
  });

  const officer = { obj: makeHuman({ shirt: 0x1f2c4f, pants: 0x161d33, cap: 0x10162a, badge: true }), walks: [] };
  const afton = { obj: makeHuman({ shirt: 0x4b1d63, pants: 0x1a1420, skin: 0xb59a8c, smile: true }), walks: [] };
  officer.obj.position.set(-9, 0, 7.2);
  afton.obj.position.set(-10.2, 0, 8.2);
  add(officer.obj, afton.obj);
  walk(officer, [-9, 0, 7.2], [-1.0, 0, 6.1], 0, 5.2);
  walk(afton, [-10.2, 0, 8.2], [1.2, 0, 6.7], 0.4, 6.4);
  walk(afton, [1.2, 0, 6.7], [0.25, 0, 2.9], 9.4, 11.0);
  walk(afton, [0.25, 0, 2.9], [1.75, 0, 3.7], 11.9, 12.9);

  // officer's flashlight and the muzzle flash
  const beam = new THREE.SpotLight(0xf4f1ff, 0, 26, 0.42, 0.5, 1.3);
  const beamTarget = new THREE.Object3D();
  const muzzle = new THREE.PointLight(0xffd27a, 0, 9, 1.6);
  const spark = new THREE.PointLight(0x9fd0ff, 0, 6, 1.6);
  beam.target = beamTarget;
  // first light of day through the broken roof
  const dawn = new THREE.HemisphereLight(0x8fa3c8, 0x1a1410, 0);
  // soft grey daylight falling on the two men from the broken roof
  const fill = new THREE.PointLight(0xc8d2e8, 0, 9, 1.4);
  add(beam, beamTarget, muzzle, spark, dawn, fill);

  cut = { t: 0, bots, officer, afton, beam, beamTarget, muzzle, spark, dawn, fill, added, fired: new Set(), onDone };
  G.phase = 'cutscene';
  G.flashlight = false;
  G.yaw = 0.12; G.pitch = 0.0;
}

const EVENTS = [
  [0.4, () => UI.subtitle(t('cut1'), 4)],
  [2.0, (c) => { Object.values(c.bots).forEach((b) => { b.step = 0; }); }],
  [3.2, () => UI.subtitle(t('cut2'), 4)],
  [5.4, () => UI.subtitle(t('cut3'), 4)],
  [6.6, (c) => shoot(c, 'bonnie')],
  [7.7, (c) => shoot(c, 'chica')],
  [8.8, (c) => shoot(c, 'foxy')],
  [11.2, (c) => switchOff(c, 'freddy')],
  [13.1, (c) => switchOff(c, 'endo')],
  [13.6, () => UI.subtitle(t('cut4'), 4)],
  [17.8, (c) => c.onDone()]
];

function shoot(c, key) {
  const b = c.bots[key];
  SFX.gunshot();
  c.muzzleT = 0.07;
  const hand = new THREE.Vector3();
  c.officer.obj.userData.arms[1].localToWorld(hand.set(0, -0.62, 0.05));
  c.muzzle.position.copy(hand);
  b.ch.setEyes(0, 0xffffff);
  b.falling = true;
  b.speed = 2.2;
  SFX.clank();
}

function switchOff(c, key) {
  const b = c.bots[key];
  SFX.sparks();
  SFX.buzz(0.4, 0.25);
  c.sparkT = 0.7;
  c.spark.position.copy(b.ch.mesh.position).add(new THREE.Vector3(0, 1.8, 0.4));
  b.ch.setEyes(0, 0xffffff);
  b.slumping = true;
  b.slumpFor = 0.65; // then it keels over (game time, not wall clock)
  c.afton.reach = 0.6;
}

function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

function animateActor(actor, tNow, dt, faceTarget) {
  const o = actor.obj;
  let moving = false;
  for (const w of actor.walks) {
    if (tNow >= w.t0 && tNow <= w.t1) {
      const k = (tNow - w.t0) / (w.t1 - w.t0);
      o.position.lerpVectors(w.a, w.b, k);
      faceDir(o, w.b.x - w.a.x, w.b.z - w.a.z);
      moving = true;
    }
  }
  const u = o.userData;
  actor.phase = (actor.phase || 0) + (moving ? dt * 7 : 0);
  const swing = moving ? Math.sin(actor.phase) * 0.5 : 0;
  u.legs[0].rotation.x = swing;
  u.legs[1].rotation.x = -swing;
  if (!actor.aim) {
    u.arms[0].rotation.x = -swing * 0.8;
    u.arms[1].rotation.x = swing * 0.8 - (actor.reach > 0 ? 1.3 : 0);
  }
  if (actor.reach > 0) actor.reach -= dt;
  if (!moving && faceTarget) {
    const want = Math.atan2(faceTarget.x - o.position.x, faceTarget.z - o.position.z);
    o.rotation.y = lerpAngle(o.rotation.y, want, Math.min(1, dt * 4));
  }
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
const qTmp = new THREE.Quaternion();

export function updateCutscene(dt) {
  if (!cut) return;
  const c = cut;
  c.t += dt;
  EVENTS.forEach(([tt, fn], i) => {
    if (cut && c.t >= tt && !c.fired.has(i)) { c.fired.add(i); fn(c); }
  });
  if (!cut) return;

  c.dawn.intensity = Math.min(0.9, 0.15 + c.t * 0.12);
  c.fill.intensity = Math.min(9, c.t * 3);
  c.fill.position.lerpVectors(c.officer.obj.position, c.afton.obj.position, 0.5).setY(3.2);

  // the machines lurch one step forward, then fall as they're stopped
  Object.values(c.bots).forEach((b) => {
    const m = b.ch.mesh;
    if (b.step !== undefined && b.step < 1 && !b.falling) {
      const d = Math.min(dt * 1.2, 1 - b.step);
      b.step += d;
      m.translateZ(0.6 * d);
    }
    if (b.slumping) {
      if (!b.falling && (b.slumpFor -= dt) <= 0) { b.falling = true; b.speed = 1.1; }
      const head = m.userData.head;
      if (head) head.rotation.x = Math.min(0.65, head.rotation.x + dt * 2.5);
      (m.userData.arms || []).forEach((a) => { a.rotation.x *= 0.9; });
    }
    if (b.falling) {
      if (!b.base) b.base = m.quaternion.clone();
      b.fall = Math.min(1, b.fall + dt * b.speed * (0.35 + b.fall));
      m.quaternion.copy(b.base).multiply(qTmp.setFromAxisAngle(X_AXIS, -1.45 * b.fall));
    } else if (b.ch.mesh.userData.head && !b.slumping) {
      // still standing: twitching, fixed on the debris
      const h = b.ch.mesh.userData.head;
      h.rotation.y = Math.sin(c.t * 9 + m.position.x) * 0.05;
    }
  });

  const focusMachines = new THREE.Vector3(0, 1.4, 2.4);
  animateActor(c.officer, c.t, dt, focusMachines);
  animateActor(c.afton, c.t, dt, c.t > 13 ? c.bots.freddy.ch.mesh.position : focusMachines);
  // officer raises his sidearm for the shots
  const oa = c.officer.obj.userData.arms[1];
  c.officer.aim = c.t > 6.1 && c.t < 9.6;
  if (c.officer.aim) oa.rotation.x += (-1.5 - oa.rotation.x) * Math.min(1, dt * 10);
  // at the end Afton stands over the bear, looking down at the parts
  if (c.t > 14.2) {
    const h = c.afton.obj.userData.head;
    h.rotation.x = Math.min(0.55, h.rotation.x + dt * 0.6);
  }

  // officer's flashlight sweeps the machines
  c.beam.intensity = Math.min(300, c.t * 120);
  c.beam.position.copy(c.officer.obj.position).add(new THREE.Vector3(0.2, 1.45, 0));
  const live = Object.values(c.bots).find((b) => !b.falling);
  c.beamTarget.position.copy(live ? live.ch.mesh.position : focusMachines).setY(1.6);

  c.muzzleT = Math.max(0, (c.muzzleT || 0) - dt);
  c.muzzle.intensity = c.muzzleT > 0 ? 60 : 0;
  c.sparkT = Math.max(0, (c.sparkT || 0) - dt);
  c.spark.intensity = c.sparkT > 0 && Math.random() < 0.6 ? 25 * Math.random() + 8 : 0;

  // the player's eyes drift after the newcomers, then the man in purple —
  // only a little: the debris slabs hem the view in on both sides
  const focus = c.t < 9.2 ? c.officer.obj.position : c.afton.obj.position;
  const d = new THREE.Vector3().subVectors(focus, PLAYER_POS);
  const wantYaw = Math.max(-0.16, Math.min(0.16, Math.atan2(-d.x, -d.z) * 0.4));
  G.yaw = lerpAngle(G.yaw, wantYaw, Math.min(1, dt * 1.2));
  G.pitch += (-0.05 - G.pitch) * Math.min(1, dt * 1.2);
}

export function endCutscene() {
  if (!cut) return;
  cut.added.forEach((o) => scene.remove(o));
  cut = null;
}

export function cutsceneRunning() { return !!cut; }

// QA: deterministically advance the scene to a given time (debug only)
export function seekCutscene(target) {
  while (cut && cut.t < target) updateCutscene(1 / 30);
}
