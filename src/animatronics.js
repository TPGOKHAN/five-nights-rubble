import * as THREE from 'three';
import { G } from './state.js';
import * as SFX from './audio.js';
import { subtitle } from './ui.js';
import { t } from './i18n.js';
import { bump } from './save.js';
import { canSee } from './vision.js';
import { buildBody } from './models.js';

export const PLAYER_POS = new THREE.Vector3(0, 1.7, 13);

// Waypoints: p = [x, y, z]; dir = i18n key for the direction cue at attack
// nodes. Which camera shows a character is NOT stored here — the vision
// system works it out from what each camera can actually see.
// Attack spots sit inside the narrow window the player can see out of the
// debris (between the two leaning slabs); FN.audit() verifies every spot.
// Rooms two characters share have a separate spot for each, so they never
// stand inside one another.
export const WP = {
  stageL:    { p: [-3.5, 0.8, -12.5] },
  stageC:    { p: [0,    0.8, -12.8] },
  stageR:    { p: [3.5,  0.8, -12.5] },
  dining:    { p: [0,    0,   -2] },
  diningB:   { p: [2.4,  0,   -0.4] },
  backstage: { p: [-13,  0,   -8] },
  cove:      { p: [-13,  0,    2] },
  westHall:  { p: [-7,   0,    7] },
  eastHall:  { p: [7,    0,    7] },
  eastHallB: { p: [5.4,  0,    5.2] },
  kitchen:   { p: [13,   0,   -6] },
  kitchenB:  { p: [12.4, 0,   -3.6] },
  parts:     { p: [13,   0,    3] },
  attackW:   { p: [-2.1, 0,    8.6], dir: 'dirLeft' },
  attackE:   { p: [2.1,  0,    8.6], dir: 'dirRight' },
  attackC:   { p: [0.55, 0,    9.5], dir: 'dirFront' },
  attackC2:  { p: [-0.75, 0,   8.9], dir: 'dirFront' }
};

export const hooks = {
  jumpscare: () => {},
  blip: () => {}
};

function rand([a, b]) { return a + Math.random() * (b - a); }

let kitchenCued = false;

// ---------- rig helpers ----------
function resetRig(ch) {
  const u = ch.mesh.userData;
  if (u.arms) u.arms.forEach((a) => { a.rotation.x = 0; });
  if (u.jaw) u.jaw.rotation.x = 0;
  if (u.head) u.head.rotation.set(0, 0, 0);
  ch.twitch = null;
}

// Servo twitches: every few seconds the head snaps to a new angle, holds,
// and snaps back — fast, not eased, like a machine that isn't quite right.
// Characters at the debris twitch more often.
export function animateRig(ch, dt) {
  const head = ch.mesh.userData.head;
  if (!head || !ch.active) return;
  const close = ch.state === 'attack' || ch.running;
  if (!ch.twitch) ch.twitch = { t: 2 + Math.random() * 6, hold: 0, y: 0, z: 0 };
  const tw = ch.twitch;
  tw.t -= dt;
  if (tw.t <= 0) {
    tw.t = close ? 0.8 + Math.random() * 1.6 : 4 + Math.random() * 8;
    tw.hold = 0.35 + Math.random() * (close ? 0.5 : 1.2);
    tw.y = (Math.random() - 0.5) * (close ? 0.5 : 0.8);
    tw.z = (Math.random() - 0.5) * 0.45;
  }
  if (tw.hold > 0) tw.hold -= dt;
  const ty = tw.hold > 0 ? tw.y : 0;
  const tz = tw.hold > 0 ? tw.z : 0;
  const k = Math.min(1, dt * 22);
  head.rotation.y += (ty - head.rotation.y) * k;
  head.rotation.z += (tz - head.rotation.z) * k;
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

  resetPose() { resetRig(this); }

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
        if (this.path[this.idx].startsWith('kitchen')) {
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
    // A full belly keeps her away a long while — and the player controls how
    // long: a quick, unnoticed feed buys up to ~5x her normal pace; a slow one
    // ~3x; one she noticed (beam on her) a full step less. Skill saves food.
    const quick = Math.max(0, this.attackTimer / this.attackWindow);
    this.repel(3, 3.0 + 2.0 * quick - (this.noticed ? 1.0 : 0));
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
  // camera = the security camera the lure is played through
  // true = lured back, 'home' = already on stage (nothing to undo), false = not on this feed
  audio(camera) {
    if (!this.active) return false;
    if (!canSee(camera, this)) return false;
    if (this.idx === 0) return 'home';
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
    resetRig(this);
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
  // position along the sprint, t = 0..1: cove -> west hall -> the debris
  runPos(t) {
    const a = new THREE.Vector3(...WP.cove.p);
    const b = new THREE.Vector3(...WP.westHall.p);
    const c = new THREE.Vector3(PLAYER_POS.x - 0.5, 0, PLAYER_POS.z - 4.2);
    return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(c, (t - 0.5) * 2);
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
      this.mesh.position.copy(this.runPos(Math.min(1, this.runT / this.runDur)));
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
  flash(camera) {
    if (!this.active) return false;
    if (this.stunTimer > 0) return false;
    if (!this.running && this.stage === 0) return false; // still behind the curtain
    if (!canSee(camera, this)) return false;
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
  program(camera) {
    if (!this.active) return false;
    if (!canSee(camera, this)) return false;
    if (this.idx === 0 && this.state === 'idle') return 'home';
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
  CH.freddy = new Freddy('Freddy', 'freddy', 0x6b4a2a, ['stageC', 'dining', 'eastHallB', 'attackC'], scene);
  CH.foxy = new Foxy(scene);
  CH.endo = new Endo('Endo-01', 'endo', 0x30343a, ['parts', 'kitchenB', 'diningB', 'attackC2'], scene);
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
  Object.values(CH).forEach((ch) => {
    ch.update(dt, api);
    if (!(ch.stunTimer > 0)) animateRig(ch, dt);
  });
}

export function freezeEyes() {
  Object.values(CH).forEach((ch) => ch.setEyes(0.05, 0x8888ff));
}

// 0..1 threat level for the heartbeat
export function dangerLevel() {
  let d = 0;
  Object.values(CH).forEach((ch) => {
    if (!ch.active) return;
    if (ch.running && !(ch.stunTimer > 0)) d = Math.max(d, 1);
    else if (ch.state === 'attack') {
      d = Math.max(d, 0.65 + 0.35 * (1 - ch.attackTimer / (ch.attackWindow || 1)));
    } else if (ch.stage >= 2) d = Math.max(d, 0.35);
    else if (ch.idx >= ch.path?.length - 2 && ch.idx > 0) d = Math.max(d, 0.3);
  });
  return d;
}
