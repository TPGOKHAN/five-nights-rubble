import * as THREE from 'three';
import { G } from './state.js';
import * as SFX from './audio.js';
import { CH } from './animatronics.js';
import { subtitle, flashFx, keyHint } from './ui.js';
import { t } from './i18n.js';
import { settings } from './settings.js';
import { canSee } from './vision.js';

export const CAMS = [
  { id: 'CAM 1', name: 'SHOW STAGE', pos: [0, 3.9, -6.2], look: [0, 1.6, -13] },
  { id: 'CAM 2', name: 'DINING AREA', pos: [-5, 3.8, -5], look: [0, 0.8, 6] },
  { id: 'CAM 3', name: 'BACKSTAGE', pos: [-16.5, 3.2, -12], look: [-12, 1, -7] },
  { id: 'CAM 4', name: 'PIRATE COVE', pos: [-11.8, 3.4, 7], look: [-13.5, 1, 2] },
  { id: 'CAM 5', name: 'WEST HALL', pos: [-10, 3.4, 2.5], look: [-6, 0.8, 9] },
  { id: 'CAM 6', name: 'EAST HALL', pos: [10, 3.4, 2.5], look: [6, 0.8, 9] },
  { id: 'CAM 7', name: 'KITCHEN', pos: [16.5, 3.2, -10], look: [12, 1, -5] },
  { id: 'CAM 8', name: 'PARTS & SERVICE', pos: [16.5, 3.2, 7.5], look: [12, 1, 2] }
];

let camObjs = [];
let camLight = null;
let staticCtx = null;
let burstT = 0;
let flashCd = 0;
let audioCd = 0;
let programCd = 0;

const $ = (id) => document.getElementById(id);

export function initMonitor(scene) {
  camObjs = CAMS.map((c) => {
    const cam = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 60);
    cam.position.set(...c.pos);
    cam.lookAt(new THREE.Vector3(...c.look));
    return cam;
  });

  camLight = new THREE.AmbientLight(0x99ffbb, 1.4);
  camLight.visible = false;
  scene.add(camLight);

  const grid = $('cambtns');
  CAMS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cambtn';
    b.innerHTML = `<span>${c.id}</span>${c.name}`;
    b.onclick = () => switchCam(i);
    grid.appendChild(b);
  });

  const noise = $('staticnoise');
  noise.width = 160; noise.height = 96;
  staticCtx = noise.getContext('2d');

  $('act-flash').onclick = () => flashAction();
  $('act-audio').onclick = () => audioAction();
  $('act-program').onclick = () => programAction();
}

export function resizeCams(aspect) {
  camObjs.forEach((c) => { c.aspect = aspect; c.updateProjectionMatrix(); });
}

export function activeCamera() { return camObjs[G.cam]; }

// indices of every camera that currently shows this character
export function camsSeeing(ch) {
  return camObjs.map((c, i) => (canSee(c, ch) ? i : -1)).filter((i) => i >= 0);
}
export function camObject(i) { return camObjs[i]; }
export function setCamLight(on) { if (camLight) camLight.visible = on; }

export function openMonitor() {
  if (!G.monitorUnlocked || G.phase !== 'play') return;
  G.monitorUp = true;
  G.flashlight = false;
  $('monitor').classList.add('show');
  SFX.staticBurst();
  burstT = 0.25;
  refreshButtons();
  document.exitPointerLock && document.exitPointerLock();
}

export function closeMonitor() {
  G.monitorUp = false;
  $('monitor').classList.remove('show');
  SFX.staticBurst();
}

export function switchCam(i) {
  if (i < 0 || i >= CAMS.length) return;
  G.cam = i;
  SFX.staticBurst();
  burstT = 0.22;
  refreshButtons();
}

export function blip() {
  if (G.monitorUp) {
    burstT = Math.max(burstT, 0.3);
    SFX.staticBurst();
  }
}

export function refreshButtons() {
  $('camname').textContent = CAMS[G.cam].id + ' — ' + CAMS[G.cam].name;
  document.querySelectorAll('.cambtn').forEach((b, i) => b.classList.toggle('active', i === G.cam));
  $('act-flash').textContent = keyHint(t('mon_flash'));
  $('act-audio').textContent = keyHint(t('mon_audio'));
  $('act-program').textContent = keyHint(t('mon_program'));
  $('mon-close').textContent = t('mon_close');
  $('mon-pause').textContent = t('mon_pause');
  $('act-flash').style.display = G.monitorUnlocked ? 'inline-block' : 'none';
  $('act-audio').style.display = G.audioUnlocked ? 'inline-block' : 'none';
  $('act-program').style.display = G.programUnlocked ? 'inline-block' : 'none';
}

export function resetCooldowns() { flashCd = 0; audioCd = 0; programCd = 0; burstT = 0; }

export function flashAction() {
  if (!G.monitorUp || flashCd > 0) return;
  flashCd = 2.5;
  flashFx('#ffffff', 140);
  SFX.buzz(0.25, 0.12);
  const hit = CH.foxy && CH.foxy.flash(activeCamera());
  if (!hit) subtitle(t('sub_flashMiss'), 2.5);
}

export function audioAction() {
  if (!G.monitorUp || audioCd > 0 || !G.audioUnlocked) return;
  audioCd = 6;
  SFX.lure();
  const hit = CH.freddy && CH.freddy.audio(activeCamera());
  if (hit === 'home') subtitle(t('sub_freddyHome'), 3);
  else if (!hit) subtitle(t('sub_freddyWrong'), 3);
}

export function programAction() {
  if (!G.monitorUp || programCd > 0 || !G.programUnlocked) return;
  programCd = 3;
  const hit = CH.endo && CH.endo.program(activeCamera());
  if (hit === 'home') {
    SFX.beep(false);
    subtitle(t('sub_endoHome'), 3);
  } else if (!hit) {
    SFX.beep(false);
    subtitle(t('sub_progFail'), 3);
  }
}

export function monitorTick(dt) {
  flashCd = Math.max(0, flashCd - dt);
  audioCd = Math.max(0, audioCd - dt);
  programCd = Math.max(0, programCd - dt);
  burstT = Math.max(0, burstT - dt);
  if (!G.monitorUp || !staticCtx) return;

  // animated static; the kitchen feed (cam 6) is half-broken and much noisier
  const img = staticCtx.createImageData(160, 96);
  const strong = burstT > 0;
  const kitchenCam = G.cam === 6;
  const baseAlpha = Math.round((kitchenCam ? 110 : 38) * settings.staticFx);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = strong ? 200 : baseAlpha;
  }
  staticCtx.putImageData(img, 0, 0);
}
