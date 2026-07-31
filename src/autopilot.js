// Headless QA bot: plays a night optimally so balance can be verified
// automatically. Used from the console / test harness via FN.autoplay(night).
import * as THREE from 'three';
import { G } from './state.js';
import { CH } from './animatronics.js';
import * as MON from './monitor.js';

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

function strategyTick(FN) {
  const { bonnie, chica, foxy, freddy, endo } = CH;
  if (G.stunTimer > 0) { ensureMonitor(false); return; }

  const attacks = [bonnie, chica, freddy, endo].filter((c) => c && c.active && c.state === 'attack').length
    + (foxy && foxy.active && foxy.running ? 1 : 0);

  // panic button when overwhelmed
  if (attacks >= 2 && G.shockUnlocked && G.shockCd <= 0) { FN.shock(); return; }

  if (foxy && foxy.active && foxy.running) {
    ensureMonitor(true);
    MON.switchCam(foxy.locCam());
    MON.flashAction();
    return;
  }
  if (endo && endo.active && endo.state === 'attack') {
    ensureMonitor(true);
    MON.switchCam(endo.locCam());
    MON.programAction();
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
    MON.switchCam(freddy.locCam());
    MON.audioAction();
    return;
  }

  // pre-emptive maintenance
  if (endo && endo.active && endo.idx >= 2) {
    ensureMonitor(true);
    MON.switchCam(endo.locCam());
    MON.programAction();
    return;
  }
  if (freddy && freddy.active && freddy.idx >= 2) {
    ensureMonitor(true);
    MON.switchCam(freddy.locCam());
    MON.audioAction();
    return;
  }
  if (foxy && foxy.active && !foxy.running && foxy.stage >= 2 && foxy.stunTimer <= 0 && G.monitorUnlocked) {
    ensureMonitor(true);
    MON.switchCam(3);
    MON.flashAction();
    return;
  }

  ensureMonitor(false);
  G.flashlight = false;
}

export function attachAutopilot(FN) {
  FN.autoplay = (night, opts = {}) => new Promise((resolve) => {
    const speed = opts.speed || 6;
    G.speed = speed;
    if (opts.custom) FN.custom(opts.custom);
    else FN.start(night);
    const iv = setInterval(() => {
      if (G.phase === 'play') strategyTick(FN);
      else if (G.phase === 'death') {
        clearInterval(iv); G.speed = 1;
        resolve({ result: 'death', killer: G.killer?.name, food: G.food, timeLeft: Math.round(G.timeLeft) });
      } else if (['nightdone', 'cutscene', 'end'].includes(G.phase)) {
        clearInterval(iv); G.speed = 1;
        resolve({ result: 'win', food: G.food });
      }
    }, 120);
  });
}
