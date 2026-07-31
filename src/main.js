import * as THREE from 'three';
import { G, qs } from './state.js';
import * as SFX from './audio.js';
import { buildWorld, worldTick } from './world.js';
import {
  PLAYER_POS, initChars, setupNight, setupCustomNight, updateChars,
  freezeEyes, dangerLevel, CH, hooks
} from './animatronics.js';
import * as MON from './monitor.js';
import * as UI from './ui.js';
import { t, setLang } from './i18n.js';
import { settings, loadSettings, saveSettings } from './settings.js';
import {
  save, loadSave, persist, wipeProgress, onAchievement,
  recordDeath, recordNightSurvived, bump
} from './save.js';
import { attachAutopilot } from './autopilot.js';

// ---------- boot: settings + save ----------
loadSettings();
setLang(settings.lang);
SFX.setVolume(settings.volume);
loadSave();
onAchievement((id) => UI.toast(id));

// ---------- three.js setup ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 60);
camera.position.copy(PLAYER_POS);
camera.rotation.order = 'YXZ';

buildWorld(scene);
initChars(scene);
MON.initMonitor(scene);

const torch = new THREE.SpotLight(0xfff2cc, 0, 34, 0.36, 0.45, 1.4);
const torchTarget = new THREE.Object3D();
scene.add(torch); scene.add(torchTarget);
torch.target = torchTarget;

hooks.jumpscare = startJumpscare;
hooks.blip = MON.blip;

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  MON.resizeCams(innerWidth / innerHeight);
});

// ---------- input ----------
const canvas = renderer.domElement;

function lockPointer() {
  if (G.phase === 'play' && !G.monitorUp && !UI.isTouch() && canvas.requestPointerLock) {
    canvas.requestPointerLock();
  }
}

canvas.addEventListener('click', () => {
  if (G.phase !== 'play') return;
  if (!UI.isTouch() && !document.pointerLockElement) { lockPointer(); return; }
  if (!UI.isTouch()) toggleTorch();
});

document.addEventListener('mousemove', (e) => {
  if (G.phase !== 'play' || G.monitorUp) return;
  if (!document.pointerLockElement) return;
  G.yaw -= e.movementX * 0.0021 * settings.sensitivity;
  G.pitch -= e.movementY * 0.0021 * settings.sensitivity;
  clampLook();
});

// pause when pointer lock is lost unexpectedly (Esc) during play
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && G.phase === 'play' && !G.monitorUp && !UI.isTouch()) {
    pauseGame();
  }
});

// touch look: drag anywhere on the canvas
let lastTouch = null;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) lastTouch = [e.touches[0].clientX, e.touches[0].clientY];
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (G.phase !== 'play' || G.monitorUp || !lastTouch || e.touches.length !== 1) return;
  const tx = e.touches[0].clientX, ty = e.touches[0].clientY;
  G.yaw -= (tx - lastTouch[0]) * 0.004 * settings.sensitivity;
  G.pitch -= (ty - lastTouch[1]) * 0.004 * settings.sensitivity;
  lastTouch = [tx, ty];
  clampLook();
}, { passive: true });
canvas.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });

function clampLook() {
  G.yaw = Math.max(-2.1, Math.min(2.1, G.yaw));
  G.pitch = Math.max(-0.9, Math.min(0.9, G.pitch));
}

function toggleTorch() {
  if (G.monitorUp || G.phase !== 'play') return;
  G.flashlight = !G.flashlight;
  SFX.beep(G.flashlight);
}

function toggleMonitor() {
  if (!G.monitorUnlocked || G.phase !== 'play') return;
  if (G.monitorUp) { MON.closeMonitor(); lockPointer(); }
  else MON.openMonitor();
}

function doShock() {
  if (!G.shockUnlocked || G.shockCd > 0 || G.phase !== 'play') return;
  G.stunTimer = 60;
  G.shockCd = 90;
  SFX.buzz(1.4, 0.4);
  UI.flashFx('#88bbff', 260);
  freezeEyes();
  bump('shocks');
  if (CH.foxy && CH.foxy.running) {
    CH.foxy.running = false;
    CH.foxy.runT = 0;
    CH.foxy.stage = 0;
    CH.foxy.stageTimer = 20;
    CH.foxy.place();
    SFX.runSteps(false);
  }
  UI.subtitle(t('sub_shock'), 5);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') e.preventDefault();

  const screenPhases = ['brief', 'death', 'nightdone', 'title', 'end'];
  if (screenPhases.includes(G.phase)) {
    if (e.key === 'Enter') { e.preventDefault(); UI.pressScreenBtn(); }
    return;
  }
  if (G.phase === 'paused') {
    if (e.key === 'Enter') resumeGame();
    return;
  }
  if (G.phase !== 'play') return;

  switch (e.key.toLowerCase()) {
    case ' ': e.preventDefault(); toggleTorch(); break;
    case 'tab': case 'c': toggleMonitor(); break;
    case 'f':
      if (G.monitorUp) MON.flashAction();
      else if (CH.chica) CH.chica.feed();
      break;
    case 'q': if (G.monitorUp) MON.audioAction(); break;
    case 'p':
      if (G.monitorUp) MON.programAction();
      else pauseGame();
      break;
    case 'x': doShock(); break;
    case 'arrowleft': G.yaw += 0.09; clampLook(); break;
    case 'arrowright': G.yaw -= 0.09; clampLook(); break;
    case 'arrowup': G.pitch += 0.07; clampLook(); break;
    case 'arrowdown': G.pitch -= 0.07; clampLook(); break;
    default:
      if (G.monitorUp && /^[1-8]$/.test(e.key)) MON.switchCam(Number(e.key) - 1);
  }
});

canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleMonitor(); });
document.getElementById('cambar').addEventListener('click', toggleMonitor);
document.getElementById('mon-close').addEventListener('click', toggleMonitor);
document.getElementById('screen-btn').addEventListener('click', () => UI.pressScreenBtn());

// touch action buttons
const tbind = (id, fn) => document.getElementById(id).addEventListener('click', fn);
tbind('tch-torch', toggleTorch);
tbind('tch-feed', () => { if (!G.monitorUp && CH.chica) CH.chica.feed(); });
tbind('tch-cams', toggleMonitor);
tbind('tch-shock', doShock);
tbind('tch-pause', () => { if (G.phase === 'play') pauseGame(); });

// ---------- pause ----------
function pauseGame() {
  if (G.phase !== 'play') return;
  G.phase = 'paused';
  SFX.runSteps(false);
  SFX.setDanger(0);
  SFX.suspendAudio();
  document.exitPointerLock && document.exitPointerLock();
  UI.showPause({
    onResume: resumeGame,
    onSettings: () => { UI.hidePause(); UI.showSettingsPanel(() => UI.showPause(pauseHandlers()), null); },
    onRestart: () => {
      UI.hidePause(); SFX.resumeAudio(); MON.closeMonitor();
      if (G.isCustom) beginCustomNight();
      else briefNight(G.night);
    },
    onQuit: () => {
      UI.hidePause(); SFX.resumeAudio(); MON.closeMonitor();
      showTitle();
    }
  });
}
function pauseHandlers() {
  return {
    onResume: resumeGame,
    onSettings: () => { UI.hidePause(); UI.showSettingsPanel(() => UI.showPause(pauseHandlers()), null); },
    onRestart: () => {
      UI.hidePause(); SFX.resumeAudio(); MON.closeMonitor();
      if (G.isCustom) beginCustomNight();
      else briefNight(G.night);
    },
    onQuit: () => { UI.hidePause(); SFX.resumeAudio(); MON.closeMonitor(); showTitle(); }
  };
}

function resumeGame() {
  if (G.phase !== 'paused') return;
  UI.hidePause();
  SFX.resumeAudio();
  G.phase = 'play';
  if (CH.foxy && CH.foxy.running) SFX.runSteps(true);
  lockPointer();
}

// ---------- game flow ----------
function showTitle() {
  G.phase = 'title';
  G.isCustom = false;
  SFX.runSteps(false);
  SFX.setDanger(0);
  UI.hidePause(); UI.hidePanel();
  UI.showTitleMenu({
    onContinue: () => {
      G.food = save.foodAtNight[save.unlockedNight] ?? 10;
      G.n4bonusGiven = false;
      briefNight(save.unlockedNight);
    },
    onNew: () => {
      if (save.unlockedNight > 1) {
        confirmScreen(
          t('newGameConfirm').replace('%N', save.unlockedNight),
          t('btnNew'),
          () => { startFresh(); },
          () => showTitle()
        );
      } else startFresh();
    },
    onCustom: () => UI.showCustomPanel(() => beginCustomNight(), () => showTitle()),
    onAchievements: () => UI.showAchievementsPanel(() => showTitle()),
    onSettings: () => UI.showSettingsPanel(() => showTitle(), () => showTitle()),
    onLangChange: () => showTitle()
  });
}

function startFresh() {
  wipeProgress();
  G.food = 10;
  G.n4bonusGiven = false;
  briefNight(1);
}

function confirmScreen(msg, yesLabel, onYes, onNo) {
  UI.showScreen('<p>' + msg + '</p>', yesLabel, onYes);
  const menu = document.getElementById('screen-menu');
  const b = document.createElement('button');
  b.className = 'menubtn';
  b.textContent = t('btnBack');
  b.onclick = onNo;
  menu.appendChild(b);
}

function briefNight(n) {
  G.phase = 'brief';
  G.night = n;
  G.isCustom = false;
  UI.showScreen(UI.briefHtml(n), t('btnStartNight', n), () => beginNight(n));
}

function beginNight(n) {
  SFX.initAudio();
  G.night = n;
  G.isCustom = false;
  G.timeLeft = G.duration;
  G.monitorUnlocked = n >= 3;
  G.audioUnlocked = n >= 4;
  G.programUnlocked = n >= 5;
  G.shockUnlocked = n >= 5;
  G.shockCd = 0;
  G.stunTimer = 0;
  G.flashlight = false;
  G.monitorUp = false;
  G.cam = 0;
  G.yaw = 0; G.pitch = 0;
  if (n === 4 && !G.n4bonusGiven) { G.food += 3; G.n4bonusGiven = true; }
  G.foodAtNightStart = G.food;
  setupNight(n);
  MON.closeMonitor();
  UI.hideScreen();
  G.phase = 'play';
  UI.subtitle(t('sub_nightStart'), 5);
  lockPointer();
}

function beginCustomNight() {
  SFX.initAudio();
  G.isCustom = true;
  G.timeLeft = G.duration;
  G.monitorUnlocked = true;
  G.audioUnlocked = true;
  G.programUnlocked = true;
  G.shockUnlocked = true;
  G.shockCd = 0;
  G.stunTimer = 0;
  G.flashlight = false;
  G.monitorUp = false;
  G.cam = 0;
  G.yaw = 0; G.pitch = 0;
  G.food = 10;
  G.foodAtNightStart = 10;
  setupCustomNight(G.customLevels);
  MON.closeMonitor();
  UI.hideScreen();
  G.phase = 'play';
  UI.subtitle(t('sub_nightStart'), 5);
  lockPointer();
}

const api = {
  jumpscare: startJumpscare,
  aimedAt(ch) {
    const head = new THREE.Vector3();
    ch.mesh.getWorldPosition(head);
    head.y += ch.mesh.userData.headY || 2.6;
    const dir = head.sub(camera.position).normalize();
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    return fwd.angleTo(dir) < 0.3;
  }
};

function startJumpscare(ch) {
  if (G.phase !== 'play') return;
  G.phase = 'jumpscare';
  G.killer = ch;
  G.jumpT = 0;
  MON.closeMonitor();
  SFX.screech(ch.screechPitch || 1);
  SFX.runSteps(false);
  SFX.setDanger(0);
  document.exitPointerLock && document.exitPointerLock();
}

function updateJumpscare(dt) {
  G.jumpT += dt;
  const ch = G.killer;
  const tt = Math.min(1, G.jumpT / 0.3);
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const target = camera.position.clone().add(fwd.multiplyScalar(1.1));
  target.y = 0;
  ch.mesh.position.lerp(target, tt);
  ch.mesh.lookAt(camera.position.x, 0, camera.position.z);
  ch.setEyes(4, 0xff0000);
  // arms fly up, jaw snaps
  const u = ch.mesh.userData;
  if (u.arms) {
    u.arms[0].rotation.x = -1.6 * tt;
    u.arms[1].rotation.x = -1.6 * tt;
  }
  if (u.jaw) u.jaw.rotation.x = 0.55 * Math.abs(Math.sin(G.jumpT * 26)) * tt;
  camera.position.set(
    PLAYER_POS.x + (Math.random() - 0.5) * 0.14,
    PLAYER_POS.y + (Math.random() - 0.5) * 0.14,
    PLAYER_POS.z
  );
  if (G.jumpT > 1.3) {
    camera.position.copy(PLAYER_POS);
    showDeath(ch);
  }
}

function showDeath(ch) {
  G.phase = 'death';
  G.food = G.foodAtNightStart;
  recordDeath(ch.name);
  const retry = G.isCustom
    ? () => beginCustomNight()
    : () => briefNight(G.night);
  UI.showScreen(`
    <h2 class="death">${t('death_title', ch.name)}</h2>
    <p>${t('death_body')}</p>
    <p class="sub">${G.isCustom ? t('cn_title') : t('death_sub', G.night)}</p>
  `, G.isCustom ? t('cn_start') : t('btnRetry', G.night), retry);
}

function nightComplete() {
  SFX.ding();
  SFX.runSteps(false);
  SFX.setDanger(0);
  if (G.isCustom) {
    const all10 = Object.values(G.customLevels).every((v) => v === 10);
    recordNightSurvived(0, G.food, true, all10);
    G.phase = 'nightdone';
    UI.showScreen(`
      <h2 class="dawn">${t('cn_result_win')}</h2>
      <p>${t('cn_result_body')}</p>
    `, t('btnBack'), () => showTitle());
    return;
  }
  recordNightSurvived(G.night, G.food, false, false);
  if (G.night >= 5) { startCutscene(); return; }
  G.phase = 'nightdone';
  const next = G.night + 1;
  UI.showScreen(`
    <h2 class="dawn">${t('dawn_title')}</h2>
    <p>${t('dawn_body')}</p>
    <p class="sub">${t('dawn_sub', G.night, 5 - G.night)}</p>
  `, t('btnNight', next), () => briefNight(next));
}

// ---------- rescue cutscene ----------
let cut = null;

function makeHuman(color, hatColor) {
  const g = new THREE.Group();
  const mt = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.3), mt); legs.position.y = 0.42;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.34), mt); body.position.y = 1.25;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xc9a58a, roughness: 0.9 })); head.position.y = 1.85;
  g.add(legs, body, head);
  if (hatColor !== undefined) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: hatColor }));
    hat.position.y = 2.06;
    g.add(hat);
  }
  return g;
}

function startCutscene() {
  G.phase = 'cutscene';
  G.flashlight = false;
  MON.closeMonitor();
  document.exitPointerLock && document.exitPointerLock();

  const lineup = [CH.bonnie, CH.chica, CH.freddy, CH.foxy, CH.endo];
  lineup.forEach((ch, i) => {
    ch.active = false;
    ch.mesh.position.set(-4 + i * 2.2, 0, 2);
    ch.mesh.rotation.set(0, -Math.PI / 2, 0);
    ch.setEyes(1.5, 0xff2222);
  });

  const officer = makeHuman(0x24345e, 0x16203c);
  const afton = makeHuman(0x5a1a6e);
  officer.position.set(-15, 0, 7);
  afton.position.set(-16, 0, 8.5);
  scene.add(officer, afton);

  const beam = new THREE.SpotLight(0xffffff, 380, 40, 0.3, 0.4, 1.4);
  beam.position.set(-14, 1.6, 7);
  const beamTarget = new THREE.Object3D();
  beamTarget.position.set(0, 1.5, 2);
  scene.add(beam, beamTarget);
  beam.target = beamTarget;

  cut = { t: 0, officer, afton, beam, lineup, fired: new Set(), toppling: [] };
  G.yaw = 0.8; G.pitch = 0;
}

const CUT_EVENTS = [
  [0.5, () => UI.subtitle(t('cut1'), 4)],
  [3.0, () => UI.subtitle(t('cut2'), 4)],
  [5.0, () => UI.subtitle(t('cut3'), 4)],
  [7.0, (c) => topple(c, 0)],
  [8.2, (c) => topple(c, 1)],
  [9.4, (c) => topple(c, 2)],
  [10.6, (c) => topple(c, 3)],
  [11.8, (c) => topple(c, 4)],
  [13.2, () => UI.subtitle(t('cut4'), 4)],
  [16.0, () => showEnd()]
];

function topple(c, i) {
  const ch = c.lineup[i];
  SFX.buzz(0.5, 0.35);
  SFX.clank();
  UI.flashFx('#ffffff', 90);
  ch.setEyes(0, 0xffffff);
  c.toppling.push({ mesh: ch.mesh, t: 0, dir: Math.random() < 0.5 ? 1 : -1 });
}

function updateCutscene(dt) {
  cut.t += dt;
  const walkT = Math.min(1, cut.t / 6);
  cut.officer.position.lerpVectors(new THREE.Vector3(-15, 0, 7), new THREE.Vector3(-5, 0, 5), walkT);
  cut.afton.position.lerpVectors(new THREE.Vector3(-16, 0, 8.5), new THREE.Vector3(-7, 0, 7), walkT);
  cut.officer.position.y = Math.abs(Math.sin(cut.t * 6)) * 0.05;
  cut.beam.position.copy(cut.officer.position).add(new THREE.Vector3(0, 1.6, 0));

  CUT_EVENTS.forEach(([tt, fn], i) => {
    if (cut.t >= tt && !cut.fired.has(i)) { cut.fired.add(i); fn(cut); }
  });

  cut.toppling.forEach((tp) => {
    tp.t = Math.min(1, tp.t + dt * 1.4);
    tp.mesh.rotation.z = tp.dir * tp.t * 1.45;
    tp.mesh.position.y = -tp.t * 0.4;
  });

  G.yaw = 0.8 - cut.t * 0.02;
}

function showEnd() {
  G.phase = 'end';
  const customHint = save.beaten ? '<p class="tip">' + t('end_custom_hint') + '</p>' : '';
  UI.showScreen(`
    <h1 class="dawn">${t('end_title')}</h1>
    <p>${t('end_body1')}</p>
    <p>${t('end_body2')}</p>
    <p class="sub">${t('end_sub')}</p>
    ${customHint}
    <p class="tip">${t('end_tip')}</p>
  `, t('btnBack'), () => {
    G.food = 10;
    G.night = 1;
    G.n4bonusGiven = false;
    // clean up cutscene props
    if (cut) {
      scene.remove(cut.officer, cut.afton, cut.beam);
      cut = null;
    }
    Object.values(CH).forEach((ch) => { ch.active = false; ch.reset(); });
    showTitle();
  });
}

// ---------- per-frame update ----------
function updatePlay(dt) {
  G.timeLeft -= dt;
  if (G.timeLeft <= 0) { nightComplete(); return; }

  G.shockCd = Math.max(0, G.shockCd - dt);

  if (G.stunTimer > 0) {
    G.stunTimer -= dt;
    SFX.setDanger(0);
    if (G.stunTimer <= 0) {
      UI.subtitle(t('sub_shockEnd'), 3);
      Object.values(CH).forEach((ch) => { if (ch.active && ch.state !== 'attack') ch.setEyes(0.35, 0xffffff); });
    }
  } else {
    updateChars(dt, api);
    SFX.setDanger(dangerLevel());
  }

  MON.monitorTick(dt);
}

const clock = new THREE.Clock();
let lastFrame = 0;

function tick() {
  requestAnimationFrame(tick);
  frame();
}

// keep simulating (at reduced rate) when the tab is hidden and RAF stalls —
// also what lets the headless QA autopilot run
setInterval(() => { if (performance.now() - lastFrame > 90) frame(); }, 50);

function frame() {
  lastFrame = performance.now();
  const dt = Math.min(clock.getDelta(), 0.05) * G.speed;

  worldTick(dt);

  if (G.phase === 'play') updatePlay(dt);
  else if (G.phase === 'jumpscare') updateJumpscare(dt);
  else if (G.phase === 'cutscene') updateCutscene(dt);

  camera.rotation.set(G.pitch, G.yaw, 0);
  if (G.phase === 'play') {
    camera.position.y = PLAYER_POS.y + Math.sin(performance.now() * 0.0012) * 0.02;
  }

  torch.position.copy(camera.position);
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  torchTarget.position.copy(camera.position).add(fwd.multiplyScalar(10));
  torch.intensity = (G.flashlight && !G.monitorUp && (G.phase === 'play' || G.phase === 'jumpscare')) ? 320 : 0;

  let renderCam = camera;
  if (G.monitorUp && G.phase === 'play') {
    renderCam = MON.activeCamera();
    scene.fog.density = 0.012;
    MON.setCamLight(true);
  } else {
    scene.fog.density = 0.042;
    MON.setCamLight(false);
  }
  renderer.render(scene, renderCam);

  UI.updateHUD();
}

// ---------- debug hooks ----------
window.FN = {
  G, CH, save, settings,
  start: (n) => { G.night = n; beginNight(n); },
  custom: (levels) => { if (levels) Object.assign(G.customLevels, levels); beginCustomNight(); },
  brief: briefNight,
  look: (yaw, pitch) => { G.yaw = yaw; G.pitch = pitch ?? 0; },
  torch: toggleTorch,
  monitor: toggleMonitor,
  cam: MON.switchCam,
  win: () => { G.timeLeft = 0.01; },
  cutscene: startCutscene,
  shock: doShock,
  pause: pauseGame,
  resume: resumeGame,
  title: showTitle,
  camera
};
attachAutopilot(window.FN, api);

showTitle();
if (qs.get('night')) briefNight(Number(qs.get('night')));
tick();
