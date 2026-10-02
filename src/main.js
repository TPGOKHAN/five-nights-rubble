import * as THREE from 'three';
import { G, DEBUG, SHOCK_CHARGES, debugNight } from './state.js';
import * as SFX from './audio.js';
import { buildWorld, worldTick } from './world.js';
import {
  PLAYER_POS, initChars, setupNight, setupCustomNight, updateChars,
  freezeEyes, dangerLevel, CH, hooks
} from './animatronics.js';
import * as MON from './monitor.js';
import * as UI from './ui.js';
import { t, setLang } from './i18n.js';
import { settings, loadSettings } from './settings.js';
import {
  save, loadSave, wipeProgress, onAchievement,
  recordDeath, recordNightSurvived, recordAbandon, bump
} from './save.js';
import * as VISION from './vision.js';
import * as CUT from './cutscene.js';

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

VISION.initVision(buildWorld(scene));
initChars(scene);
MON.initMonitor(scene);
CUT.initCutscene(scene);

// warm work-light over the stage, only for the title backdrop
const stageLight = new THREE.SpotLight(0xffd9a0, 0, 22, 0.55, 0.6, 1.3);
stageLight.position.set(0, 7, -7.5);
stageLight.target.position.set(0, 1.5, -12.8);
scene.add(stageLight, stageLight.target);

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
// Mouse players get pointer lock (with drag-to-look as a fallback when the
// browser refuses the lock); touch players get drag-to-look plus on-screen
// buttons. The mode follows whatever the player last touched, so touchscreen
// laptops work with both.
const canvas = renderer.domElement;
let hadLock = false;

addEventListener('pointerdown', (e) => {
  UI.setTouchMode(e.pointerType === 'touch');
}, true);

function lockPointer() {
  if (G.phase !== 'play' || G.monitorUp || UI.usingTouch() || !canvas.requestPointerLock) return;
  try {
    const p = canvas.requestPointerLock();
    // modern browsers return a promise that rejects e.g. right after the user
    // pressed Esc; the on-screen hint and drag-look cover that case
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* not available (embedded frame etc.) */ }
}

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) { hadLock = true; return; }
  // lock lost while playing in mouse mode (Esc, alt-tab): pause
  if (hadLock && G.phase === 'play' && !G.monitorUp && !UI.usingTouch()) pauseGame();
  hadLock = false;
});

// mouse: click locks (or toggles the light once locked); drag looks around
// when there is no lock
let drag = null;
canvas.addEventListener('mousedown', (e) => {
  if (G.phase !== 'play' || UI.usingTouch()) return;
  if (e.button === 2) { toggleMonitor(); return; }
  if (e.button === 0) drag = { moved: 0 };
});
addEventListener('mouseup', () => {
  if (drag && drag.moved < 6 && G.phase === 'play' && !G.monitorUp) {
    if (document.pointerLockElement) toggleTorch();
    else lockPointer();
  }
  drag = null;
});
document.addEventListener('mousemove', (e) => {
  if (G.phase !== 'play' || G.monitorUp || UI.usingTouch()) return;
  if (document.pointerLockElement) {
    look(e.movementX * 0.0021, e.movementY * 0.0021);
  } else if (drag) {
    drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    look(e.movementX * 0.0042, e.movementY * 0.0042);
  }
});
addEventListener('contextmenu', (e) => { if (G.phase === 'play' || G.phase === 'paused') e.preventDefault(); });
document.getElementById('monitor').addEventListener('mousedown', (e) => {
  if (e.button === 2) toggleMonitor();
});

// touch: drag anywhere on the canvas
let lastTouch = null;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) lastTouch = [e.touches[0].clientX, e.touches[0].clientY];
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (G.phase !== 'play' || G.monitorUp || !lastTouch || e.touches.length !== 1) return;
  const tx = e.touches[0].clientX, ty = e.touches[0].clientY;
  look((tx - lastTouch[0]) * 0.004, (ty - lastTouch[1]) * 0.004);
  lastTouch = [tx, ty];
}, { passive: true });
canvas.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });

function look(dx, dy) {
  G.yaw -= dx * settings.sensitivity;
  G.pitch -= dy * settings.sensitivity;
  clampLook();
}

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

function feed() {
  if (G.phase === 'play' && !G.monitorUp && CH.chica) CH.chica.feed();
}

function doShock() {
  if (!G.shockUnlocked || G.phase !== 'play' || G.stunTimer > 0) return;
  if (G.shockCharges <= 0) { SFX.beep(false); UI.subtitle(t('sub_shockEmpty'), 3); return; }
  G.shockCharges--;
  G.stunTimer = 60;
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
  // panels (settings, achievements, custom night) own the keyboard: Escape
  // backs out, everything else goes to the focused control
  if (UI.panelOpen()) {
    if (e.key === 'Escape') UI.closePanel();
    return;
  }
  if (e.key === 'Tab' && (G.phase === 'play' || G.phase === 'jumpscare')) e.preventDefault();
  if (e.repeat && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

  const screenPhases = ['brief', 'death', 'nightdone', 'title', 'end'];
  if (screenPhases.includes(G.phase)) {
    // Enter = the screen's main button. Ignore it when a menu button has
    // focus: the browser already clicks that one.
    if (e.key === 'Enter' && !(document.activeElement && document.activeElement.tagName === 'BUTTON')) {
      e.preventDefault();
      UI.pressScreenBtn();
    }
    return;
  }
  if (G.phase === 'paused') {
    if (e.key === 'Escape' || (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON')) resumeGame();
    return;
  }
  if (G.phase !== 'play') return;

  // keep Space/Enter from also activating whatever button last had focus
  if (e.key === ' ' || e.key === 'Enter') e.preventDefault();

  switch (e.key.toLowerCase()) {
    case ' ': toggleTorch(); break;
    case 'tab': case 'c': toggleMonitor(); break;
    case 'f':
      if (G.monitorUp) MON.flashAction();
      else feed();
      break;
    case 'q': if (G.monitorUp) MON.audioAction(); break;
    case 'p':
      if (G.monitorUp) MON.programAction();
      else pauseGame();
      break;
    case 'escape': pauseGame(); break; // only arrives when the pointer isn't locked
    case 'x': doShock(); break;
    case 'arrowleft': G.yaw += 0.09; clampLook(); break;
    case 'arrowright': G.yaw -= 0.09; clampLook(); break;
    case 'arrowup': G.pitch += 0.07; clampLook(); break;
    case 'arrowdown': G.pitch -= 0.07; clampLook(); break;
    default:
      if (G.monitorUp && /^[1-8]$/.test(e.key)) MON.switchCam(Number(e.key) - 1);
  }
});

// leaving the tab or the window always pauses — the night must not run on
// while nobody is watching
document.addEventListener('visibilitychange', () => { if (document.hidden && !G.qa) pauseGame(); });
addEventListener('blur', () => { if (!G.qa) pauseGame(); });

document.getElementById('cambar').addEventListener('click', toggleMonitor);
document.getElementById('mon-close').addEventListener('click', toggleMonitor);
document.getElementById('screen-btn').addEventListener('click', () => UI.pressScreenBtn());
document.getElementById('lockhint').addEventListener('click', lockPointer);
document.getElementById('mon-pause').addEventListener('click', () => pauseGame());

// touch action buttons
const tbind = (id, fn) => document.getElementById(id).addEventListener('click', fn);
tbind('tch-torch', toggleTorch);
tbind('tch-feed', feed);
tbind('tch-cams', toggleMonitor);
tbind('tch-shock', doShock);
tbind('tch-pause', () => pauseGame());

// ---------- pause ----------
function pauseHandlers() {
  return {
    onResume: resumeGame,
    onSettings: () => { UI.hidePause(); UI.showSettingsPanel(() => UI.showPause(pauseHandlers()), null); },
    onRestart: () => {
      UI.hidePause(); SFX.resumeAudio(); MON.closeMonitor();
      recordAbandon(G.isCustom);
      G.food = G.foodAtNightStart; // food spent in the abandoned attempt comes back
      if (G.isCustom) beginCustomNight();
      else briefNight(G.night);
    },
    onQuit: () => {
      UI.hidePause(); SFX.resumeAudio(); MON.closeMonitor();
      recordAbandon(G.isCustom);
      showTitle();
    }
  };
}

function pauseGame() {
  if (G.phase !== 'play') return;
  G.phase = 'paused';
  SFX.runSteps(false);
  SFX.setDanger(0);
  SFX.suspendAudio();
  if (document.pointerLockElement) { hadLock = false; document.exitPointerLock(); }
  UI.showPause(pauseHandlers());
}

function resumeGame() {
  if (G.phase !== 'paused') return;
  UI.hidePause();
  UI.hidePanel();
  SFX.resumeAudio();
  G.phase = 'play';
  if (CH.foxy && CH.foxy.running && CH.foxy.stunTimer <= 0 && G.stunTimer <= 0) SFX.runSteps(true);
  lockPointer();
}

// ---------- game flow ----------
function resetActors() {
  Object.values(CH).forEach((ch) => { ch.active = false; ch.reset(); });
}

function showTitle() {
  G.phase = 'title';
  G.isCustom = false;
  G.monitorUp = false;
  SFX.runSteps(false);
  SFX.setDanger(0);
  UI.hidePause(); UI.hidePanel();
  resetActors();
  UI.showTitleMenu(titleHandlers());
}

function titleHandlers() {
  return {
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
    onSettings: () => UI.showSettingsPanel(() => showTitle(), () => UI.showTitleMenu(titleHandlers())),
    onLangChange: () => showTitle()
  };
}

function startFresh() {
  wipeProgress();
  G.food = 10;
  G.n4bonusGiven = false;
  briefNight(1);
}

function confirmScreen(msg, yesLabel, onYes, onNo) {
  UI.showScreen('<p>' + msg + '</p>', yesLabel, onYes);
  UI.setEnterHandler(onNo); // Enter must never confirm a destructive choice
  const menu = document.getElementById('screen-menu');
  const b = document.createElement('button');
  b.className = 'menubtn';
  b.textContent = t('btnBack');
  b.onclick = onNo;
  menu.appendChild(b);
}

function briefNight(n) {
  if (title.lit) { title.lit.setEyes(0, 0xffffff); title.lit = null; }
  G.phase = 'brief';
  G.night = n;
  G.isCustom = false;
  UI.showScreen(UI.briefHtml(n), t('btnStartNight', n), () => beginNight(n));
  addMenuButton();
}

function addMenuButton() {
  const q = document.createElement('button');
  q.className = 'menubtn';
  q.textContent = t('btnQuitTitle');
  q.onclick = () => showTitle();
  document.getElementById('screen-menu').appendChild(q);
}

function resetNightState() {
  camera.position.copy(PLAYER_POS);
  G.timeLeft = G.duration;
  G.stunTimer = 0;
  G.flashlight = false;
  G.monitorUp = false;
  G.cam = 0;
  G.yaw = 0; G.pitch = 0;
  G.nightStartedAt = performance.now();
  MON.resetCooldowns();
  MON.closeMonitor();
  UI.hideScreen();
}

function beginNight(n) {
  SFX.initAudio();
  G.night = n;
  G.isCustom = false;
  G.monitorUnlocked = n >= 3;
  G.audioUnlocked = n >= 4;
  G.programUnlocked = n >= 5;
  G.shockUnlocked = n >= 5;
  G.shockCharges = G.shockUnlocked ? SHOCK_CHARGES : 0;
  if (n === 4 && !G.n4bonusGiven) { G.food += 3; G.n4bonusGiven = true; }
  G.foodAtNightStart = G.food;
  setupNight(n);
  resetNightState();
  G.phase = 'play';
  UI.subtitle(t('sub_nightStart'), 5);
  lockPointer();
}

function beginCustomNight() {
  if (title.lit) { title.lit.setEyes(0, 0xffffff); title.lit = null; }
  SFX.initAudio();
  G.isCustom = true;
  G.monitorUnlocked = true;
  G.audioUnlocked = true;
  G.programUnlocked = true;
  G.shockUnlocked = true;
  G.shockCharges = SHOCK_CHARGES;
  G.food = 10;
  G.foodAtNightStart = 10;
  setupCustomNight(G.customLevels);
  resetNightState();
  G.phase = 'play';
  UI.subtitle(t('sub_nightStart'), 5);
  lockPointer();
}

const fwdTmp = new THREE.Vector3();
const api = {
  jumpscare: startJumpscare,
  // the beam is on this character's face: pointed within ~17° of its head
  // AND nothing solid between the player and its eyes
  aimedAt(ch) {
    const head = new THREE.Vector3();
    ch.mesh.getWorldPosition(head);
    head.y += ch.mesh.userData.headY || 2.6;
    const dir = head.sub(camera.position).normalize();
    camera.getWorldDirection(fwdTmp);
    if (fwdTmp.angleTo(dir) >= 0.3) return false;
    return VISION.eyePoints(ch).some((p) => VISION.lineOfSight(camera.position, p));
  }
};

// ---------- jumpscare ----------
// The view snaps to the attacker and it lunges until its face fills the
// screen at eye level — wherever the player happened to be looking.
function startJumpscare(ch) {
  if (G.phase !== 'play') return;
  G.phase = 'jumpscare';
  G.killer = ch;
  G.jumpT = 0;
  MON.closeMonitor();
  G.flashlight = true; // you see it coming
  SFX.screech(ch.screechPitch || 1);
  SFX.runSteps(false);
  SFX.setDanger(0);
  if (document.pointerLockElement) { hadLock = false; document.exitPointerLock(); }

  const d = ch.mesh.position.clone().sub(PLAYER_POS);
  d.y = 0;
  if (d.lengthSq() < 0.01) d.set(0, 0, -1);
  d.normalize();
  G.jump = {
    dir: d,
    start: ch.mesh.position.clone(),
    yaw0: G.yaw,
    pitch0: G.pitch,
    yaw1: Math.atan2(-d.x, -d.z)
  };
}

function lerpAngle(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

function updateJumpscare(dt) {
  G.jumpT += dt;
  const ch = G.killer;
  const j = G.jump;
  const turn = Math.min(1, G.jumpT / 0.16);
  const ease = 1 - (1 - turn) * (1 - turn);
  G.yaw = lerpAngle(j.yaw0, j.yaw1, ease);
  G.pitch = j.pitch0 + (0.04 - j.pitch0) * ease;

  const lunge = Math.min(1, G.jumpT / 0.28);
  const target = PLAYER_POS.clone().add(j.dir.clone().multiplyScalar(1.15));
  target.y = PLAYER_POS.y - (ch.mesh.userData.headY || 2.6) + 0.12; // face at eye level
  ch.mesh.position.lerpVectors(j.start, target, 1 - (1 - lunge) * (1 - lunge));
  ch.mesh.lookAt(PLAYER_POS.x, ch.mesh.position.y, PLAYER_POS.z);
  ch.setEyes(4, 0xff0000);
  const u = ch.mesh.userData;
  if (u.arms) {
    u.arms[0].rotation.x = -1.6 * lunge;
    u.arms[1].rotation.x = -1.6 * lunge;
  }
  if (u.jaw) u.jaw.rotation.x = 0.55 * Math.abs(Math.sin(G.jumpT * 26)) * lunge;
  camera.position.set(
    PLAYER_POS.x + (Math.random() - 0.5) * 0.14,
    PLAYER_POS.y + (Math.random() - 0.5) * 0.14,
    PLAYER_POS.z
  );
  if (G.jumpT > 1.3) {
    camera.position.copy(PLAYER_POS);
    G.flashlight = false;
    showDeath(ch);
  }
}

function showDeath(ch) {
  G.phase = 'death';
  G.food = G.foodAtNightStart;
  recordDeath(ch.name, G.isCustom);
  const retry = G.isCustom ? () => beginCustomNight() : () => briefNight(G.night);
  UI.showScreen(`
    <h2 class="death">${t('death_title', ch.name)}</h2>
    <p>${t('death_body')}</p>
    <p class="tip">${t('deathTip_' + ch.kind)}</p>
    <p class="sub">${G.isCustom ? t('cn_title') : t('death_sub', G.night)}</p>
  `, G.isCustom ? t('cn_start') : t('btnRetry', G.night), retry);
  addMenuButton();
}

function nightComplete() {
  SFX.ding();
  SFX.runSteps(false);
  SFX.setDanger(0);
  if (G.monitorUp) MON.closeMonitor();
  if (document.pointerLockElement) { hadLock = false; document.exitPointerLock(); }
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
  if (G.night >= 5) { MON.closeMonitor(); CUT.startCutscene(showEnd); return; }
  G.phase = 'nightdone';
  const next = G.night + 1;
  UI.showScreen(`
    <h2 class="dawn">${t('dawn_title')}</h2>
    <p>${t('dawn_body')}</p>
    <p class="sub">${t('dawn_sub', G.night, 5 - G.night)}</p>
  `, t('btnNight', next), () => briefNight(next));
  addMenuButton();
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
    CUT.endCutscene();
    showTitle();
  });
}

// ---------- title backdrop ----------
// A slow dolly in the dining room toward the stage, where the three powered-
// down mascots stand. Every few seconds one of them opens its eyes.
const title = { t: 0, next: 3, lit: null, litFor: 0 };
const STAGE_FOCUS = new THREE.Vector3(0, 2.3, -12.8);

function updateTitleBackdrop(dt) {
  title.t += dt;
  camera.position.set(Math.sin(title.t * 0.05) * 1.6, 2.1 + Math.sin(title.t * 0.11) * 0.1, -3.2 + Math.sin(title.t * 0.035) * 0.8);
  const d = STAGE_FOCUS.clone().sub(camera.position);
  G.yaw = Math.atan2(-d.x, -d.z) + Math.sin(title.t * 0.07) * 0.04;
  G.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));

  title.next -= dt;
  if (title.lit) {
    title.litFor -= dt;
    if (title.litFor <= 0) { title.lit.setEyes(0, 0xffffff); title.lit = null; }
  } else if (title.next <= 0) {
    const pick = [CH.bonnie, CH.chica, CH.freddy][Math.floor(Math.random() * 3)];
    pick.setEyes(1.6, 0xff2a2a);
    title.lit = pick;
    title.litFor = 0.9 + Math.random() * 1.4;
    title.next = 4 + Math.random() * 6;
  }
}

// ---------- per-frame update ----------
function updatePlay(dt) {
  G.timeLeft -= dt;
  if (G.timeLeft <= 0) { nightComplete(); return; }

  if (G.stunTimer > 0) {
    G.stunTimer -= dt;
    SFX.setDanger(0);
    if (G.stunTimer <= 0) {
      UI.subtitle(t('sub_shockEnd'), 3);
      Object.values(CH).forEach((ch) => {
        if (!ch.active) return;
        if (ch.state === 'attack') ch.setEyes(2.2, 0xff2222);
        else ch.setEyes(0.35, 0xffffff);
      });
      if (CH.foxy && CH.foxy.active && CH.foxy.running) SFX.runSteps(true);
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

// the QA bot keeps simulating when the tab is hidden and RAF stalls
setInterval(() => { if (G.qa && performance.now() - lastFrame > 90) frame(); }, 50);

function frame() {
  lastFrame = performance.now();
  const dt = Math.min(clock.getDelta(), 0.05) * G.speed;

  worldTick(dt);

  if (G.phase === 'play') updatePlay(dt);
  else if (G.phase === 'jumpscare') updateJumpscare(dt);
  else if (G.phase === 'cutscene') CUT.updateCutscene(dt);
  stageLight.intensity = G.phase === 'title' ? 60 : 0;
  if (G.phase === 'title') updateTitleBackdrop(dt);

  camera.rotation.set(G.pitch, G.yaw, 0);
  if (G.phase === 'play') {
    camera.position.y = PLAYER_POS.y + Math.sin(performance.now() * 0.0012) * 0.02;
  }

  torch.position.copy(camera.position);
  camera.getWorldDirection(fwdTmp);
  torchTarget.position.copy(camera.position).add(fwdTmp.multiplyScalar(10));
  if (G.phase === 'jumpscare') {
    // point blank: a dying, strobing beam so the face reads instead of blowing out
    torch.intensity = Math.random() < 0.18 ? 0 : 14 + Math.random() * 22;
  } else {
    torch.intensity = (G.flashlight && !G.monitorUp && G.phase === 'play') ? 260 : 0;
  }

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

// ---------- debug / QA hooks (dev server or ?debug only) ----------
if (DEBUG) {
  import('./autopilot.js').then(({ attachAutopilot }) => {
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
      cutscene: () => { MON.closeMonitor(); CUT.startCutscene(showEnd); },
      cutSeek: CUT.seekCutscene,
      shock: doShock,
      pause: pauseGame,
      resume: resumeGame,
      title: showTitle,
      camera,
      renderer,
      vision: VISION,
      V: (x, y, z) => new THREE.Vector3(x, y, z)
    };
    attachAutopilot(window.FN);
  });
}

showTitle();
if (debugNight()) briefNight(Math.min(5, Math.max(1, debugNight())));
tick();
