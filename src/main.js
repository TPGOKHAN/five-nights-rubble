import * as THREE from 'three';
import { G, qs } from './state.js';
import * as SFX from './audio.js';
import { buildWorld, worldTick } from './world.js';
import { PLAYER_POS, initChars, setupNight, updateChars, freezeEyes, CH, hooks } from './animatronics.js';
import * as MON from './monitor.js';
import * as UI from './ui.js';

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

// flashlight
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
  if (G.phase === 'play' && !G.monitorUp && canvas.requestPointerLock) canvas.requestPointerLock();
}

canvas.addEventListener('click', () => {
  if (G.phase !== 'play') return;
  if (!document.pointerLockElement) { lockPointer(); return; }
  toggleTorch();
});

document.addEventListener('mousemove', (e) => {
  if (G.phase !== 'play' || G.monitorUp) return;
  if (!document.pointerLockElement) return;
  G.yaw -= e.movementX * 0.0021;
  G.pitch -= e.movementY * 0.0021;
  clampLook();
});

function clampLook() {
  G.yaw = Math.max(-2.1, Math.min(2.1, G.yaw));
  G.pitch = Math.max(-0.9, Math.min(0.9, G.pitch));
}

function toggleTorch() {
  if (G.monitorUp) return;
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
  // a shock mid-sprint knocks the fox down completely
  if (CH.foxy && CH.foxy.running) {
    CH.foxy.running = false;
    CH.foxy.runT = 0;
    CH.foxy.stage = 0;
    CH.foxy.stageTimer = 20;
    CH.foxy.place();
    SFX.runSteps(false);
  }
  UI.subtitle('CONTROLLED SHOCK DISCHARGED. Every machine in the building locks up. (60s)', 5);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') e.preventDefault();

  if (G.phase === 'brief' || G.phase === 'death' || G.phase === 'nightdone' || G.phase === 'title' || G.phase === 'end') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.pressScreenBtn(); }
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
    case 'p': if (G.monitorUp) MON.programAction(); break;
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

// ---------- game flow ----------
function showTitle() {
  G.phase = 'title';
  UI.showScreen(`
    <h1>FIVE NIGHTS<br>IN THE RUBBLE</h1>
    <p class="sub">an unofficial FNaF-inspired fan game</p>
    <p>The ceiling came down during the evening show. You woke up pinned under debris,
    tasting plaster and blood. Your phone got one call out.</p>
    <p><em>&ldquo;Half the county is buried, sir. We will reach you in <b>five days</b>.
    Stay where you are. Stay quiet.&rdquo;</em></p>
    <p>Somewhere in the dark, the animatronics are still on stage.<br>And at night… they walk.</p>
    <p class="tip">Survive 5 nights. Each night lasts 5 minutes (12 AM &ndash; 6 AM).<br>Headphones strongly recommended.</p>
  `, 'BEGIN NIGHT 1', () => briefNight(G.night));
}

function briefNight(n) {
  G.phase = 'brief';
  G.night = n;
  UI.showScreen(UI.setBriefText(n), 'START NIGHT ' + n, () => beginNight(n));
}

function beginNight(n) {
  SFX.initAudio();
  G.night = n;
  G.timeLeft = G.duration;
  G.monitorUnlocked = n >= 3;
  G.audioUnlocked = n >= 4;
  G.shockUnlocked = n >= 5;
  G.shockCd = 0;
  G.stunTimer = 0;
  G.flashlight = false;
  G.monitorUp = false;
  G.cam = 0;
  G.yaw = 0; G.pitch = 0;
  G.foodAtNightStart = G.food;
  setupNight(n);
  MON.closeMonitor();
  UI.hideScreen();
  G.phase = 'play';
  UI.subtitle('12 AM. The building settles. Something on the stage just turned its head.', 5);
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
  SFX.screech();
  SFX.runSteps(false);
  document.exitPointerLock && document.exitPointerLock();
}

function updateJumpscare(dt) {
  G.jumpT += dt;
  const ch = G.killer;
  const t = Math.min(1, G.jumpT / 0.3);
  // lunge into the player's face
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const target = camera.position.clone().add(fwd.multiplyScalar(1.1));
  target.y = 0;
  ch.mesh.position.lerp(target, t);
  ch.mesh.lookAt(camera.position.x, 0, camera.position.z);
  ch.setEyes(4, 0xff0000);
  // violent shake
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
  G.food = G.foodAtNightStart; // retry with the food you started the night with
  UI.showScreen(`
    <h2 class="death">${ch.name.toUpperCase()} FOUND YOU</h2>
    <p>Cold hands close around you, and the rubble goes quiet again.</p>
    <p class="sub">Night ${G.night} &mdash; failed</p>
  `, 'TRY NIGHT ' + G.night + ' AGAIN', () => briefNight(G.night));
}

function nightComplete() {
  SFX.ding();
  SFX.runSteps(false);
  if (G.night >= 5) { startCutscene(); return; }
  G.phase = 'nightdone';
  const next = G.night + 1;
  UI.showScreen(`
    <h2 class="dawn">6 AM</h2>
    <p>Grey light leaks through the broken roof. One by one, the machines freeze mid-step,
    heads drooping, and power down where they stand.</p>
    <p class="sub">Night ${G.night} survived. ${5 - G.night} to go.</p>
  `, 'NIGHT ' + next, () => briefNight(next));
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

  // line the animatronics up in the dining area, facing the west hall
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
  G.yaw = 0.8; G.pitch = 0; // look toward the west hall
}

const CUT_EVENTS = [
  [0.5, (c) => UI.subtitle('6 AM. Real flashlight beams cut through the dust.', 4)],
  [3.0, (c) => UI.subtitle('OFFICER: "Sweet mother of— they\'re ACTIVE. Get behind me."', 4)],
  [5.0, (c) => { UI.subtitle('The man with him says nothing. He just smiles at the machines.', 4); }],
  [7.0, (c) => topple(c, 0)],
  [8.2, (c) => topple(c, 1)],
  [9.4, (c) => topple(c, 2)],
  [10.6, (c) => topple(c, 3)],
  [11.8, (c) => topple(c, 4)],
  [13.2, (c) => UI.subtitle('OFFICER: "All units — they\'re down. We\'ve got a live one in the rubble!"', 4)],
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
  // the two men walk in from the west hall
  const walkT = Math.min(1, cut.t / 6);
  cut.officer.position.lerpVectors(new THREE.Vector3(-15, 0, 7), new THREE.Vector3(-5, 0, 5), walkT);
  cut.afton.position.lerpVectors(new THREE.Vector3(-16, 0, 8.5), new THREE.Vector3(-7, 0, 7), walkT);
  cut.officer.position.y = Math.abs(Math.sin(cut.t * 6)) * 0.05;
  cut.beam.position.copy(cut.officer.position).add(new THREE.Vector3(0, 1.6, 0));

  CUT_EVENTS.forEach(([t, fn], i) => {
    if (cut.t >= t && !cut.fired.has(i)) { cut.fired.add(i); fn(cut); }
  });

  cut.toppling.forEach((tp) => {
    tp.t = Math.min(1, tp.t + dt * 1.4);
    tp.mesh.rotation.z = tp.dir * tp.t * 1.45;
    tp.mesh.position.y = -tp.t * 0.4;
  });

  // slow camera drift toward the scene
  G.yaw = 0.8 - cut.t * 0.02;
}

function showEnd() {
  G.phase = 'end';
  UI.showScreen(`
    <h1 class="dawn">YOU SURVIVED</h1>
    <p>Five nights under the rubble. Five nights of servo whine and dragging feet.
    The paramedics pull you out into daylight that feels unreal.</p>
    <p>Behind you, sparks still spit from five broken machines.</p>
    <p class="sub">As they carry you out, the man in purple is writing something on a clipboard.<br>He doesn't look at you. He looks at the parts.</p>
    <p class="tip">THE END &mdash; thanks for playing</p>
  `, 'PLAY AGAIN', () => {
    G.food = 10;
    G.night = 1;
    location.reload();
  });
}

// ---------- per-frame update ----------
function updatePlay(dt) {
  G.timeLeft -= dt;
  if (G.timeLeft <= 0) { nightComplete(); return; }

  G.shockCd = Math.max(0, G.shockCd - dt);

  if (G.stunTimer > 0) {
    G.stunTimer -= dt;
    if (G.stunTimer <= 0) {
      UI.subtitle('The machines shudder back to life.', 3);
      Object.values(CH).forEach((ch) => { if (ch.active && ch.state !== 'attack') ch.setEyes(0.35, 0xffffff); });
    }
  } else {
    updateChars(dt, api);
  }

  MON.monitorTick(dt);
}

const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05) * G.speed;

  worldTick(dt);

  if (G.phase === 'play') updatePlay(dt);
  else if (G.phase === 'jumpscare') updateJumpscare(dt);
  else if (G.phase === 'cutscene') updateCutscene(dt);

  // player camera
  camera.rotation.set(G.pitch, G.yaw, 0);
  // subtle breathing sway
  if (G.phase === 'play') {
    camera.position.y = PLAYER_POS.y + Math.sin(performance.now() * 0.0012) * 0.02;
  }

  // flashlight follows view
  torch.position.copy(camera.position);
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  torchTarget.position.copy(camera.position).add(fwd.multiplyScalar(10));
  torch.intensity = (G.flashlight && !G.monitorUp && (G.phase === 'play' || G.phase === 'jumpscare')) ? 320 : 0;

  // render: player view or security camera
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
  G, CH,
  start: (n) => { G.night = n; beginNight(n); },
  brief: briefNight,
  look: (yaw, pitch) => { G.yaw = yaw; G.pitch = pitch ?? 0; },
  torch: toggleTorch,
  monitor: toggleMonitor,
  cam: MON.switchCam,
  win: () => { G.timeLeft = 0.01; },
  cutscene: startCutscene,
  shock: doShock
};

showTitle();
if (qs.get('night')) briefNight(Number(qs.get('night')));
tick();
