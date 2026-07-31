import * as THREE from 'three';
import { G } from './state.js';
import * as SFX from './audio.js';
import { subtitle } from './ui.js';
import { t } from './i18n.js';
import { bump } from './save.js';

export const PLAYER_POS = new THREE.Vector3(0, 1.7, 13);

// Waypoints: p = [x, y, z], cam = camera index that sees this spot,
// dir = i18n key for the direction cue at attack nodes
export const WP = {
  stageL:    { p: [-3.5, 0.8, -12.5], cam: 0 },
  stageC:    { p: [0,    0.8, -12.8], cam: 0 },
  stageR:    { p: [3.5,  0.8, -12.5], cam: 0 },
  dining:    { p: [0,    0,   -2],    cam: 1 },
  backstage: { p: [-13,  0,   -8],    cam: 2 },
  cove:      { p: [-13,  0,    2],    cam: 3 },
  westHall:  { p: [-7,   0,    7],    cam: 4 },
  eastHall:  { p: [7,    0,    7],    cam: 5 },
  kitchen:   { p: [13,   0,   -6],    cam: 6 },
  parts:     { p: [13,   0,    3],    cam: 7 },
  attackW:   { p: [-2.6, 0,   10.3],  cam: 1, dir: 'dirLeft' },
  attackE:   { p: [2.6,  0,   10.3],  cam: 1, dir: 'dirRight' },
  attackC:   { p: [0,    0,   10.0],  cam: 1, dir: 'dirFront' }
};

export const hooks = {
  jumpscare: () => {},
  blip: () => {}
};

function rand([a, b]) { return a + Math.random() * (b - a); }

let kitchenCued = false;

// ---------- model building (all primitives) ----------
function mat(c, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.2, ...extra });
}
function limb(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function buildBody(kind, color) {
  const g = new THREE.Group();
  const bodyMat = mat(color);
  const darkMat = mat(new THREE.Color(color).multiplyScalar(0.55));

  if (kind === 'endo') {
    const metal = mat(0x30343a, { metalness: 0.9, roughness: 0.35 });
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6), metal);
    legL.position.set(-0.22, 0.55, 0);
    const legR = legL.clone(); legR.position.x = 0.22;
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 6), metal);
    spine.position.y = 1.65;
    const ribs = limb(0.68, 0.75, 0.36, metal); ribs.position.y = 1.75;
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), metal);
    armL.position.set(-0.48, 1.7, 0); armL.rotation.z = 0.15;
    const armR = armL.clone(); armR.position.x = 0.48; armR.rotation.z = -0.15;
    const head = limb(0.46, 0.5, 0.5, metal); head.position.y = 2.5;
    const jaw = limb(0.4, 0.14, 0.4, mat(0x22262c, { metalness: 0.9 })); jaw.position.set(0, 2.22, 0.06);
    g.add(legL, legR, spine, ribs, armL, armR, head, jaw);
    const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.2 });
    const eL = new THREE.Mesh(eyeGeo, eyeMat); eL.position.set(-0.13, 2.56, 0.24);
    const eR = eL.clone(); eR.position.x = 0.13;
    g.add(eL, eR);
    g.userData.eyes = [eL, eR];
    g.userData.arms = [armL, armR];
    g.userData.jaw = jaw;
    g.userData.headY = 2.5;
    return g;
  }

  // suit characters
  const legL = limb(0.34, 1.05, 0.36, bodyMat); legL.position.set(-0.26, 0.52, 0);
  const legR = legL.clone(); legR.position.x = 0.26;
  const torso = limb(1.1, 1.2, 0.66, bodyMat); torso.position.y = 1.7;
  const belly = limb(0.72, 0.75, 0.1, mat(new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35)));
  belly.position.set(0, 1.62, 0.36);
  const armL = limb(0.28, 1.05, 0.3, bodyMat); armL.position.set(-0.72, 1.72, 0); armL.rotation.z = 0.12;
  const armR = armL.clone(); armR.position.x = 0.72; armR.rotation.z = -0.12;
  const head = limb(0.82, 0.74, 0.74, bodyMat); head.position.y = 2.68;
  const jaw = limb(0.56, 0.16, 0.5, darkMat); jaw.position.set(0, 2.33, 0.16);
  g.add(legL, legR, torso, belly, armL, armR, head, jaw);

  const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const mkEye = () => new THREE.Mesh(eyeGeo, new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.0
  }));
  const eL = mkEye(); eL.position.set(-0.19, 2.74, 0.38);
  const eR = mkEye(); eR.position.set(0.19, 2.74, 0.38);
  g.add(eL, eR);
  g.userData.eyes = [eL, eR];
  g.userData.arms = [armL, armR];
  g.userData.jaw = jaw;
  g.userData.headY = 2.7;

  if (kind === 'bonnie') {
    const earL = limb(0.17, 0.95, 0.12, bodyMat); earL.position.set(-0.22, 3.4, 0); earL.rotation.z = 0.12;
    const earR = earL.clone(); earR.position.x = 0.22; earR.rotation.z = -0.12;
    const muzzle = limb(0.34, 0.22, 0.24, darkMat); muzzle.position.set(0, 2.52, 0.44);
    const bow = limb(0.34, 0.18, 0.12, mat(0xaa1122)); bow.position.set(0, 2.2, 0.36);
    g.add(earL, earR, muzzle, bow);
  } else if (kind === 'chica') {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.34, 4), mat(0xcc7711));
    beak.rotation.x = Math.PI / 2; beak.position.set(0, 2.56, 0.5);
    const bib = limb(0.82, 0.62, 0.06, mat(0xf5f0e0)); bib.position.set(0, 2.0, 0.4);
    const tuft = limb(0.1, 0.28, 0.1, bodyMat); tuft.position.set(0, 3.14, 0); tuft.rotation.z = 0.3;
    const tuft2 = tuft.clone(); tuft2.rotation.z = -0.35; tuft2.position.x = 0.12;
    g.add(beak, bib, tuft, tuft2);
  } else if (kind === 'foxy') {
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 4), bodyMat);
    earL.position.set(-0.24, 3.2, 0);
    const earR = earL.clone(); earR.position.x = 0.24;
    const snout = limb(0.26, 0.18, 0.5, darkMat); snout.position.set(0, 2.5, 0.55);
    const patch = limb(0.2, 0.12, 0.03, mat(0x111111)); patch.position.set(-0.19, 2.74, 0.4);
    const hook = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 6), mat(0xb9c2cc, { metalness: 0.9, roughness: 0.3 }));
    hook.position.set(0.72, 1.12, 0.12); hook.rotation.x = Math.PI;
    legR.material = mat(0x30343a, { metalness: 0.9, roughness: 0.35 });
    g.add(earL, earR, snout, patch, hook);
  } else if (kind === 'freddy') {
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 8), bodyMat);
    earL.rotation.x = Math.PI / 2; earL.position.set(-0.32, 3.12, 0);
    const earR = earL.clone(); earR.position.x = 0.32;
    const muzzle = limb(0.36, 0.24, 0.26, mat(0x8a6a40)); muzzle.position.set(0, 2.5, 0.44);
    const nose = limb(0.12, 0.1, 0.08, mat(0x221100)); nose.position.set(0, 2.56, 0.58);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 10), mat(0x111111));
    hat.position.set(0, 3.2, 0);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 10), mat(0x111111));
    brim.position.set(0, 3.06, 0);
    const bow = limb(0.34, 0.18, 0.12, mat(0x111111)); bow.position.set(0, 2.2, 0.36);
    g.add(earL, earR, muzzle, nose, hat, brim, bow);
  }

  for (let i = 0; i < 3; i++) {
    const gash = limb(0.18 + Math.random() * 0.2, 0.3, 0.05, mat(0x0d0d0d));
    gash.position.set((Math.random() - 0.5) * 0.8, 1.3 + Math.random() * 1.2, 0.34);
    gash.rotation.z = Math.random() * 1.5;
    g.add(gash);
  }
  return g;
}

// ---------- character classes ----------
class Walker {
  constructor(name, kind, color, path, scene) {
    this.name = name;
    this.kind = kind;
    this.path = path;
    this.screechPitch = 1;
    this.mesh = buildBody(kind, color);
    scene.add(this.mesh);
    this.active = false;
    this.interval = [20, 30];
    this.reset();
  }

  reset() {
    this.idx = 0;
    this.state = 'idle';
    this.moveTimer = rand(this.interval);
    this.attackTimer = 0;
    this.attackWindow = 1;
    this.shine = 0;
    this.noticed = false;
    this.place();
    this.setEyes(0, 0xffffff);
    this.resetPose();
    this.mesh.rotation.x = this.active ? 0 : 0.12;
  }

  resetPose() {
    const u = this.mesh.userData;
    if (u.arms) { u.arms[0].rotation.x = 0; u.arms[1].rotation.x = 0; }
    if (u.jaw) { u.jaw.rotation.x = 0; u.jaw.position.y = u.jaw.userData?.baseY ?? u.jaw.position.y; }
  }

  activate(interval) {
    this.active = true;
    this.interval = interval;
    this.reset();
  }

  deactivate() {
    this.active = false;
    this.reset();
  }

  wp() { return WP[this.path[this.idx]]; }
  locCam() { return this.wp().cam; }

  place() {
    const w = this.wp();
    this.mesh.position.set(w.p[0], w.p[1], w.p[2]);
    const look = PLAYER_POS.clone(); look.y = w.p[1];
    this.mesh.lookAt(look);
    this.mesh.rotation.x = 0;
  }

  setEyes(intensity, color) {
    (this.mesh.userData.eyes || []).forEach((e) => {
      e.material.emissiveIntensity = intensity;
      if (color !== undefined) e.material.emissive.set(color);
    });
  }

  distToPlayer() { return this.mesh.position.distanceTo(PLAYER_POS); }

  stepSound() {
    const d = this.distToPlayer();
    SFX.step(Math.min(0.45, 6 / (d + 2)), this.kind === 'endo' ? 90 : 55);
  }

  enterAttack() {
    this.state = 'attack';
    this.setEyes(2.2, 0xff2222);
    hooks.blip();
  }

  repel(steps, cooldownMult = 1) {
    this.idx = Math.max(0, this.idx - steps);
    this.state = 'idle';
    this.shine = 0;
    this.noticed = false;
    this.moveTimer = rand(this.interval) * cooldownMult;
    this.setEyes(this.active ? 0.35 : 0, 0xffffff);
    this.place();
    this.stepSound();
    hooks.blip();
  }

  update(dt, api) {
    if (!this.active) return;
    if (this.state === 'idle') {
      this.moveTimer -= dt;
      if (this.moveTimer <= 0) {
        if (this.idx < this.path.length - 1) this.idx++;
        this.place();
        this.stepSound();
        hooks.blip();
        if (this.path[this.idx] === 'kitchen') {
          SFX.pots();
          if (!kitchenCued) { kitchenCued = true; subtitle(t('sub_kitchen'), 4); }
        }
        if (this.idx === this.path.length - 1) {
          this.enterAttack();
          this.onArriveAttack();
        } else {
          this.moveTimer = rand(this.interval);
          this.setEyes(0.35, 0xffffff);
        }
      }
    } else if (this.state === 'attack') {
      this.updateAttack(dt, api);
    }
  }

  onArriveAttack() {}
  updateAttack(dt, api) {}
}

class Bonnie extends Walker {
  constructor(...a) { super(...a); this.screechPitch = 0.8; }
  onArriveAttack() {
    this.attackTimer = this.attackWindow = 7.5;
    SFX.growl(60);
    subtitle(t('sub_bonnieNear', t(this.wp().dir)), 5);
  }
  updateAttack(dt, api) {
    this.attackTimer -= dt;
    if (api.aimedAt(this) && G.flashlight && !G.monitorUp) {
      this.shine += dt;
      this.setEyes(2.2 + this.shine * 3, 0xffeecc);
      if (this.shine >= 1.1) {
        subtitle(t('sub_bonnieRepel'), 4);
        SFX.growl(90, 0.8);
        bump('bonnieRepels');
        this.repel(2);
        return;
      }
    } else {
      this.shine = Math.max(0, this.shine - dt * 1.5);
      this.setEyes(2.2, 0xff2222);
    }
    if (this.attackTimer <= 0) api.jumpscare(this);
  }
}

class Chica extends Walker {
  constructor(...a) { super(...a); this.screechPitch = 1.15; }
  onArriveAttack() {
    this.attackTimer = this.attackWindow = 9;
    this.noticed = false;
    SFX.cluck();
    subtitle(t('sub_chicaNear', t(this.wp().dir)), 5);
  }
  updateAttack(dt, api) {
    if (api.aimedAt(this) && G.flashlight && !G.monitorUp) {
      if (!this.noticed) {
        this.noticed = true;
        subtitle(t('sub_chicaNoticed'), 3.5);
        SFX.cluck();
      }
      this.attackTimer -= dt * 2.5;
    } else {
      this.attackTimer -= dt;
    }
    if (this.attackTimer <= 0) api.jumpscare(this);
  }
  feed() {
    if (this.state !== 'attack') return false;
    if (G.food <= 0) {
      subtitle(t('sub_chicaEmpty'), 3);
      return false;
    }
    if (G.flashlight) {
      subtitle(t('sub_chicaLightOn'), 3);
      return false;
    }
    G.food--;
    SFX.throwFood();
    SFX.cluck();
    subtitle(t('sub_chicaFed'), 4);
    bump('chicaFeeds');
    // a full belly keeps her away for a long while — food is scarce,
    // so each piece has to buy real time
    this.repel(3, 4.0);
    return true;
  }
}

class Freddy extends Walker {
  constructor(...a) { super(...a); this.screechPitch = 0.6; }
  onArriveAttack() {
    this.attackTimer = this.attackWindow = 12;
    SFX.laugh();
    subtitle(t('sub_freddyNear', t(this.wp().dir)), 5);
  }
  updateAttack(dt, api) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) api.jumpscare(this);
  }
  audio(camIdx) {
    if (!this.active) return false;
    if (this.locCam() !== camIdx) return false;
    SFX.laugh();
    subtitle(t('sub_freddyLure'), 4);
    bump('freddyLures');
    this.repel(2, 0.9);
    return true;
  }
}

class Foxy {
  constructor(scene) {
    this.name = 'Foxy';
    this.kind = 'foxy';
    this.screechPitch = 1.35;
    this.mesh = buildBody('foxy', 0xa33b1f);
    scene.add(this.mesh);
    this.active = false;
    this.interval = [16, 26];
    this.reset();
  }
  reset() {
    this.stage = 0;
    this.running = false;
    this.runT = 0;
    this.runDur = 7;
    this.stunTimer = 0;
    this.stageTimer = rand(this.interval);
    this.state = 'idle';
    this.place();
    this.setEyes(0);
    const u = this.mesh.userData;
    if (u.arms) { u.arms[0].rotation.x = 0; u.arms[1].rotation.x = 0; }
    if (u.jaw) u.jaw.rotation.x = 0;
    SFX.runSteps(false);
  }
  activate(interval) { this.active = true; this.interval = interval; this.reset(); }
  deactivate() { this.active = false; this.reset(); }
  setEyes(intensity, color = 0xffdd66) {
    (this.mesh.userData.eyes || []).forEach((e) => {
      e.material.emissiveIntensity = intensity;
      e.material.emissive.set(color);
    });
  }
  place() {
    const c = WP.cove.p;
    this.mesh.position.set(c[0] - 0.6 + this.stage * 0.55, 0, c[2] + this.stage * 0.35);
    const look = PLAYER_POS.clone(); look.y = 0;
    this.mesh.lookAt(look);
    this.mesh.rotation.x = this.active ? 0 : 0.12;
  }
  locCam() {
    if (!this.running) return 3;
    return this.runT < this.runDur * 0.55 ? 4 : 1;
  }
  update(dt, api) {
    if (!this.active) return;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.setEyes(0.1);
      if (this.stunTimer <= 0) {
        this.running = false;
        this.runT = 0;
        this.stage = 1;
        this.stageTimer = rand(this.interval);
        this.place();
        subtitle(t('sub_foxyStir'), 3);
      }
      return;
    }
    if (!this.running) {
      this.stageTimer -= dt;
      this.setEyes(this.stage > 0 ? 0.9 : 0);
      if (this.stageTimer <= 0) {
        this.stage++;
        hooks.blip();
        if (this.stage >= 3) {
          this.running = true;
          this.runT = 0;
          SFX.runSteps(true);
          SFX.growl(110, 0.7);
          subtitle(t('sub_foxyRun'), 4);
        } else {
          this.stageTimer = rand(this.interval);
          SFX.step(0.15, 70);
        }
        this.place();
      }
    } else {
      this.runT += dt;
      const tt = this.runT / this.runDur;
      const a = new THREE.Vector3(...WP.cove.p);
      const b = new THREE.Vector3(...WP.westHall.p);
      const c = new THREE.Vector3(PLAYER_POS.x - 0.5, 0, PLAYER_POS.z - 2.2);
      const pos = tt < 0.5 ? a.clone().lerp(b, tt * 2) : b.clone().lerp(c, (tt - 0.5) * 2);
      this.mesh.position.copy(pos);
      const look = PLAYER_POS.clone(); look.y = 0;
      this.mesh.lookAt(look);
      this.mesh.position.y = Math.abs(Math.sin(this.runT * 14)) * 0.18;
      this.setEyes(2.5, 0xffdd66);
      if (this.runT >= this.runDur) {
        SFX.runSteps(false);
        api.jumpscare(this);
      }
    }
  }
  flash(camIdx) {
    if (!this.active) return false;
    if (this.stunTimer > 0) return false;
    if (this.locCam() !== camIdx) return false;
    if (!this.running && this.stage === 0) return false;
    this.stunTimer = 30;
    SFX.runSteps(false);
    SFX.growl(140, 0.6);
    subtitle(t('sub_foxyFlash'), 4);
    bump('foxyFlashes');
    return true;
  }
}

class Endo extends Walker {
  constructor(...a) { super(...a); this.screechPitch = 1.6; }
  onArriveAttack() {
    this.attackTimer = this.attackWindow = 8;
    SFX.beep(false);
    subtitle(t('sub_endoNear', t(this.wp().dir)), 5);
  }
  updateAttack(dt, api) {
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) api.jumpscare(this);
  }
  program(camIdx) {
    if (!this.active) return false;
    if (this.locCam() !== camIdx) return false;
    SFX.beep(true);
    subtitle(t('sub_endoProg'), 4);
    bump('endoPrograms');
    this.idx = 0;
    this.state = 'idle';
    this.moveTimer = rand(this.interval) + 40;
    this.setEyes(3.2, 0xffffff);
    this.place();
    hooks.blip();
    return true;
  }
}

// ---------- registry / night setup ----------
export const CH = {};

export function initChars(scene) {
  CH.bonnie = new Bonnie('Bonnie', 'bonnie', 0x4a3f9f, ['stageL', 'backstage', 'westHall', 'attackW'], scene);
  CH.chica = new Chica('Chica', 'chica', 0xd8c22a, ['stageR', 'kitchen', 'eastHall', 'attackE'], scene);
  CH.freddy = new Freddy('Freddy', 'freddy', 0x6b4a2a, ['stageC', 'dining', 'eastHall', 'attackC'], scene);
  CH.foxy = new Foxy(scene);
  CH.endo = new Endo('Endo-01', 'endo', 0x30343a, ['parts', 'kitchen', 'dining', 'attackC'], scene);
  return CH;
}

const NIGHTS = {
  1: { bonnie: [16, 26] },
  2: { bonnie: [13, 22], chica: [15, 25] },
  3: { bonnie: [12, 20], chica: [13, 22], foxy: [16, 26] },
  4: { bonnie: [11, 18], chica: [12, 20], foxy: [13, 22], freddy: [20, 30] },
  5: { bonnie: [8, 14], chica: [9, 15], foxy: [10, 18], freddy: [13, 20], endo: [14, 20] }
};

export function setupNight(n) {
  kitchenCued = false;
  const cfg = NIGHTS[n] || NIGHTS[5];
  Object.entries(CH).forEach(([key, ch]) => {
    if (cfg[key]) ch.activate(cfg[key]);
    else ch.deactivate();
  });
}

// Custom Night: aggression 0-10 per character → move interval.
// 0 = inactive; 10 ≈ [5, 9] seconds between moves (merciless).
export function aggToInterval(a) {
  if (a <= 0) return null;
  const lo = 22 - a * 1.7;
  const hi = 32 - a * 2.3;
  return [Math.max(4.5, lo), Math.max(8, hi)];
}

export function setupCustomNight(levels) {
  kitchenCued = false;
  Object.entries(CH).forEach(([key, ch]) => {
    const iv = aggToInterval(levels[key] || 0);
    if (iv) ch.activate(iv);
    else ch.deactivate();
  });
}

export function updateChars(dt, api) {
  Object.values(CH).forEach((ch) => ch.update(dt, api));
}

export function freezeEyes() {
  Object.values(CH).forEach((ch) => ch.setEyes(0.05, 0x8888ff));
}

// 0..1 threat level for the heartbeat
export function dangerLevel() {
  let d = 0;
  Object.values(CH).forEach((ch) => {
    if (!ch.active) return;
    if (ch.running) d = Math.max(d, 1);
    else if (ch.state === 'attack') {
      d = Math.max(d, 0.65 + 0.35 * (1 - ch.attackTimer / (ch.attackWindow || 1)));
    } else if (ch.stage >= 2) d = Math.max(d, 0.35);
    else if (ch.idx >= ch.path?.length - 2 && ch.idx > 0) d = Math.max(d, 0.3);
  });
  return d;
}
