// QA tools, exposed on window.FN in debug builds only.
//  - FN.autoplay(night, opts): a bot that plays a night with sound strategy,
//    used to verify every night is winnable and the food economy holds.
//  - FN.audit(): checks the fairness invariants of the level layout — every
//    place a character can stand is visible on at least one camera, the
//    player can see the eyes of anything at the debris, and no two characters
//    can occupy the same spot.
import * as THREE from 'three';
import { G } from './state.js';
import { CH, WP, PLAYER_POS } from './animatronics.js';
import * as MON from './monitor.js';
import { eyePoints, lineOfSight } from './vision.js';

function aimAt(camera, ch) {
  const head = new THREE.Vector3();
  ch.mesh.getWorldPosition(head);
  head.y += ch.mesh.userData.headY || 2.6;
  const d = head.sub(camera.position);
  G.yaw = Math.atan2(-d.x, -d.z);
  G.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
}

function ensureMonitor(open) {
  if (open && !G.monitorUp) MON.openMonitor();
  if (!open && G.monitorUp) MON.closeMonitor();
}

// switch to a camera that actually shows this character; false if none does
function focusOn(ch) {
  const cams = MON.camsSeeing(ch);
  if (!cams.length) return false;
  if (!cams.includes(G.cam)) MON.switchCam(cams[0]);
  return true;
}

function strategyTick(FN) {
  const { bonnie, chica, foxy, freddy, endo } = CH;
  if (G.stunTimer > 0) { ensureMonitor(false); return; }

  const attacks = [bonnie, chica, freddy, endo].filter((c) => c && c.active && c.state === 'attack').length
    + (foxy && foxy.active && foxy.running ? 1 : 0);

  if (attacks >= 2 && G.shockUnlocked && G.shockCharges > 0) { FN.shock(); return; }

  if (foxy && foxy.active && foxy.running) {
    ensureMonitor(true);
    if (focusOn(foxy)) MON.flashAction();
    return;
  }
  if (endo && endo.active && endo.state === 'attack') {
    ensureMonitor(true);
    if (focusOn(endo)) MON.programAction();
    return;
  }
  if (bonnie && bonnie.active && bonnie.state === 'attack') {
    ensureMonitor(false);
    aimAt(FN.camera, bonnie);
    G.flashlight = true;
    return;
  }
  if (chica && chica.active && chica.state === 'attack') {
    ensureMonitor(false);
    G.flashlight = false;
    chica.feed();
    return;
  }
  if (freddy && freddy.active && freddy.state === 'attack') {
    ensureMonitor(true);
    if (focusOn(freddy)) MON.audioAction();
    return;
  }

  // pre-emptive maintenance
  if (endo && endo.active && endo.idx >= 2) {
    ensureMonitor(true);
    if (focusOn(endo)) MON.programAction();
    return;
  }
  if (freddy && freddy.active && freddy.idx >= 2) {
    ensureMonitor(true);
    if (focusOn(freddy)) MON.audioAction();
    return;
  }
  if (foxy && foxy.active && !foxy.running && foxy.stage >= 2 && foxy.stunTimer <= 0 && G.monitorUnlocked) {
    ensureMonitor(true);
    if (focusOn(foxy)) MON.flashAction();
    return;
  }

  ensureMonitor(false);
  G.flashlight = false;
}

// ---------------------------------------------------------------- audit
const CAM_NAMES = () => MON.CAMS.map((c) => c.id);

function snapshot(ch) {
  const keys = ['idx', 'state', 'moveTimer', 'attackTimer', 'stage', 'running', 'runT', 'stunTimer', 'stageTimer'];
  const s = {};
  keys.forEach((k) => { if (k in ch) s[k] = ch[k]; });
  s.pos = ch.mesh.position.clone();
  s.quat = ch.mesh.quaternion.clone();
  return s;
}
function restore(ch, s) {
  Object.keys(s).forEach((k) => { if (k !== 'pos' && k !== 'quat') ch[k] = s[k]; });
  ch.mesh.position.copy(s.pos);
  ch.mesh.quaternion.copy(s.quat);
}

export function audit() {
  const problems = [];
  const table = [];
  const names = CAM_NAMES();
  const eyeOrigin = PLAYER_POS.clone();

  ['bonnie', 'chica', 'freddy', 'endo'].forEach((key) => {
    const ch = CH[key];
    const snap = snapshot(ch);
    ch.path.forEach((node, i) => {
      ch.idx = i;
      ch.place();
      const cams = MON.camsSeeing(ch).map((c) => names[c]);
      const row = { who: ch.name, node, cams: cams.join(', ') || '—' };
      if (!cams.length) problems.push(`${ch.name} at ${node} is not visible on any camera`);
      if (WP[node].dir) {
        const eyes = eyePoints(ch).filter((p) => lineOfSight(eyeOrigin, p)).length;
        row.playerSeesEyes = eyes;
        if (!eyes) problems.push(`${ch.name} at ${node}: player cannot see its eyes from the debris`);
      }
      table.push(row);
    });
    restore(ch, snap);
  });

  // Foxy: peeking out of the cove, and every point of the sprint
  const foxy = CH.foxy;
  const fs = snapshot(foxy);
  [1, 2].forEach((stage) => {
    foxy.stage = stage; foxy.running = false; foxy.place();
    const cams = MON.camsSeeing(foxy).map((c) => names[c]);
    table.push({ who: 'Foxy', node: 'cove stage ' + stage, cams: cams.join(', ') || '—' });
    if (!cams.length) problems.push(`Foxy at cove stage ${stage} is not visible on any camera`);
  });
  const blind = [];
  for (let k = 0; k <= 20; k++) {
    const tt = k / 20;
    foxy.mesh.position.copy(foxy.runPos(tt));
    foxy.mesh.lookAt(PLAYER_POS.x, 0, PLAYER_POS.z);
    if (!MON.camsSeeing(foxy).length) blind.push(tt.toFixed(2));
  }
  table.push({ who: 'Foxy', node: 'sprint (21 samples)', cams: blind.length ? 'blind at t=' + blind.join(',') : 'always on some camera' });
  if (blind.length) problems.push('Foxy sprint is off-camera at t=' + blind.join(','));
  restore(foxy, fs);

  // no two characters may share a spot (night 5 has everyone active)
  const owners = [];
  ['bonnie', 'chica', 'freddy', 'endo'].forEach((key) => {
    CH[key].path.forEach((node) => owners.push({ who: CH[key].name, node, p: WP[node].p }));
  });
  owners.push({ who: 'Foxy', node: 'cove', p: WP.cove.p });
  for (let a = 0; a < owners.length; a++) {
    for (let b = a + 1; b < owners.length; b++) {
      if (owners[a].who === owners[b].who) continue;
      const d = Math.hypot(owners[a].p[0] - owners[b].p[0], owners[a].p[2] - owners[b].p[2]);
      if (d < 1.2) problems.push(`${owners[a].who}@${owners[a].node} and ${owners[b].who}@${owners[b].node} are only ${d.toFixed(2)}m apart`);
    }
  }

  return { ok: problems.length === 0, problems, table };
}

export function attachAutopilot(FN) {
  FN.audit = audit;
  FN.autoplay = (night, opts = {}) => new Promise((resolve) => {
    G.qa = true; // keep simulating while the tab is hidden; no auto-pause
    G.speed = opts.speed || 6;
    if (opts.custom) FN.custom(opts.custom);
    else FN.start(night);
    const iv = setInterval(() => {
      if (G.phase === 'play') strategyTick(FN);
      else if (G.phase === 'death') {
        clearInterval(iv); G.speed = 1; G.qa = false;
        resolve({ result: 'death', killer: G.killer?.name, food: G.food, timeLeft: Math.round(G.timeLeft) });
      } else if (['nightdone', 'cutscene', 'end'].includes(G.phase)) {
        clearInterval(iv); G.speed = 1; G.qa = false;
        resolve({ result: 'win', food: G.food, shocksLeft: G.shockCharges });
      }
    }, 120);
  });
}
