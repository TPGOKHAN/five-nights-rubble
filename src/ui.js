import { G } from './state.js';
import { t, lang, setLang, clockLabel } from './i18n.js';
import { settings, saveSettings } from './settings.js';
import { save, ACH_IDS } from './save.js';
import * as SFX from './audio.js';

const $ = (id) => document.getElementById(id);
let subTimer = null;
let btnHandler = null;
let toastTimer = null;

// ---------------- subtitles / fx ----------------
export function subtitle(text, dur = 4) {
  if (!settings.subtitles) return;
  const el = $('subtitle');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(subTimer);
  subTimer = setTimeout(() => el.classList.remove('show'), dur * 1000);
}

export function flashFx(color = '#fff', ms = 120) {
  if (!settings.screenFlash) return;
  const el = $('flashfx');
  el.style.background = color;
  el.style.opacity = 0.85;
  setTimeout(() => { el.style.opacity = 0; }, ms);
}

export function toast(achId) {
  const el = $('toast');
  el.innerHTML = '🏆 <b>' + t('achName_' + achId) + '</b><span>' + t('achDesc_' + achId) + '</span>';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
  SFX.ding();
}

// ---------------- narrative screens ----------------
export function showScreen(html, btnText, onBtn) {
  const s = $('screen');
  $('screen-content').innerHTML = html;
  $('screen-menu').innerHTML = '';
  const b = $('screen-btn');
  if (btnText) {
    b.textContent = btnText;
    b.style.display = 'inline-block';
    btnHandler = onBtn;
  } else {
    b.style.display = 'none';
    btnHandler = null;
  }
  s.classList.add('show');
}

export function hideScreen() {
  $('screen').classList.remove('show');
  btnHandler = null;
}

// what Enter does on the current screen (e.g. "back" on a confirm prompt)
export function setEnterHandler(fn) { btnHandler = fn; }

export function panelOpen() { return $('panel').classList.contains('show'); }

export function pressScreenBtn() {
  if (btnHandler) {
    const h = btnHandler;
    btnHandler = null;
    h();
  }
}

export function briefHtml(n) { return t('brief' + Math.min(5, n)); }

// Title screen with the full menu
export function showTitleMenu(handlers) {
  const s = $('screen');
  $('screen-content').innerHTML = `
    <h1>${t('title')}</h1>
    <p class="sub">${t('tagline')}</p>
    <p>${t('story1')}</p>
    <p><em>${t('story2')}</em></p>
    <p>${t('story3')}</p>
    <p class="tip">${t('titleTip')}</p>`;
  $('screen-btn').style.display = 'none';
  btnHandler = null;

  const menu = $('screen-menu');
  menu.innerHTML = '';
  const mkBtn = (label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'menubtn ' + cls;
    b.innerHTML = label;
    b.onclick = fn;
    menu.appendChild(b);
    return b;
  };

  if (save.unlockedNight > 1) {
    const cont = mkBtn(t('btnContinue', save.unlockedNight), handlers.onContinue, 'primary');
    btnHandler = handlers.onContinue; // Enter continues
    cont.focus?.();
    mkBtn(t('btnNew'), handlers.onNew);
  } else {
    mkBtn(t('btnNew'), handlers.onNew, 'primary');
    btnHandler = handlers.onNew;
  }
  if (save.beaten) mkBtn(t('btnCustom'), handlers.onCustom);
  else mkBtn(t('btnCustomLocked'), () => {}, 'locked');
  mkBtn(t('btnAchievements'), handlers.onAchievements);
  mkBtn(t('btnSettings'), handlers.onSettings);

  // language quick-toggle
  const langRow = document.createElement('div');
  langRow.className = 'langrow';
  ['en', 'tr'].forEach((l) => {
    const b = document.createElement('button');
    b.className = 'langbtn' + (lang === l ? ' active' : '');
    b.textContent = l.toUpperCase();
    b.onclick = () => { if (lang !== l) { applyLang(l); handlers.onLangChange(); } };
    langRow.appendChild(b);
  });
  menu.appendChild(langRow);

  s.classList.add('show');
}

function applyLang(l) {
  setLang(l);
  settings.lang = l;
  saveSettings();
}

// ---------------- pause menu ----------------
export function showPause(handlers) {
  const p = $('pausemenu');
  p.innerHTML = `<h2>${t('pause_title')}</h2>`;
  const mk = (label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'menubtn ' + cls;
    b.textContent = label;
    b.onclick = fn;
    p.appendChild(b);
  };
  mk(t('btnResume'), handlers.onResume, 'primary');
  mk(t('btnSettings'), handlers.onSettings);
  mk(t('btnRestartNight'), handlers.onRestart);
  mk(t('btnQuitTitle'), handlers.onQuit);
  p.classList.add('show');
}

export function hidePause() { $('pausemenu').classList.remove('show'); }

// ---------------- panels (settings / achievements / custom night) ----------------
export function hidePanel() { $('panel').classList.remove('show'); }

// Escape closes whichever panel is open, via its own Back button
export function closePanel() {
  const b = $('panel-close');
  if (panelOpen() && b) b.click();
}

export function showSettingsPanel(onClose, onLangChange) {
  const p = $('panel');
  p.innerHTML = `
    <div class="panel-inner">
      <h2>${t('set_title')}</h2>
      <div class="setrow"><label>${t('set_volume')}</label>
        <input type="range" id="set-vol" min="0" max="100" value="${Math.round(settings.volume * 100)}">
        <span id="set-vol-v">${Math.round(settings.volume * 100)}%</span></div>
      <div class="setrow"><label>${t('set_sens')}</label>
        <input type="range" id="set-sens" min="40" max="200" value="${Math.round(settings.sensitivity * 100)}">
        <span id="set-sens-v">${Math.round(settings.sensitivity * 100)}%</span></div>
      <div class="setrow"><label>${t('set_static')}</label>
        <input type="range" id="set-static" min="0" max="100" value="${Math.round(settings.staticFx * 100)}">
        <span id="set-static-v">${Math.round(settings.staticFx * 100)}%</span></div>
      <div class="setrow"><label>${t('set_subs')}</label>
        <button class="togglebtn" id="set-subs">${settings.subtitles ? t('set_on') : t('set_off')}</button></div>
      <div class="setrow"><label>${t('set_fxflash')}</label>
        <button class="togglebtn" id="set-flash">${settings.screenFlash ? t('set_on') : t('set_off')}</button></div>
      <div class="setrow"><label>${t('set_lang')}</label>
        <span>
          <button class="langbtn ${lang === 'en' ? 'active' : ''}" id="set-lang-en">EN</button>
          <button class="langbtn ${lang === 'tr' ? 'active' : ''}" id="set-lang-tr">TR</button>
        </span></div>
      <button class="menubtn primary" id="panel-close">${t('btnBack')}</button>
    </div>`;
  p.classList.add('show');

  $('set-vol').oninput = (e) => {
    settings.volume = e.target.value / 100;
    $('set-vol-v').textContent = e.target.value + '%';
    SFX.setVolume(settings.volume);
    saveSettings();
  };
  $('set-sens').oninput = (e) => {
    settings.sensitivity = e.target.value / 100;
    $('set-sens-v').textContent = e.target.value + '%';
    saveSettings();
  };
  $('set-static').oninput = (e) => {
    settings.staticFx = e.target.value / 100;
    $('set-static-v').textContent = e.target.value + '%';
    saveSettings();
  };
  $('set-subs').onclick = () => {
    settings.subtitles = !settings.subtitles;
    $('set-subs').textContent = settings.subtitles ? t('set_on') : t('set_off');
    saveSettings();
  };
  $('set-flash').onclick = () => {
    settings.screenFlash = !settings.screenFlash;
    $('set-flash').textContent = settings.screenFlash ? t('set_on') : t('set_off');
    saveSettings();
  };
  $('set-lang-en').onclick = () => { applyLang('en'); showSettingsPanel(onClose, onLangChange); onLangChange?.(); };
  $('set-lang-tr').onclick = () => { applyLang('tr'); showSettingsPanel(onClose, onLangChange); onLangChange?.(); };
  $('panel-close').onclick = () => { hidePanel(); onClose(); };
}

export function showAchievementsPanel(onClose) {
  const p = $('panel');
  const rows = ACH_IDS.map((id) => {
    const got = !!save.achievements[id];
    return `<div class="achrow ${got ? 'got' : ''}">
      <span class="achicon">${got ? '🏆' : '🔒'}</span>
      <span class="achtext"><b>${t('achName_' + id)}</b><br>${t('achDesc_' + id)}</span>
    </div>`;
  }).join('');
  const s = save.stats;
  p.innerHTML = `
    <div class="panel-inner">
      <h2>${t('ach_title')} (${Object.keys(save.achievements).length}/${ACH_IDS.length})</h2>
      <div class="achlist">${rows}</div>
      <p class="sub">☠ ${s.deaths} · 🌙 ${s.nightsSurvived} · 🏁 ${s.wins}</p>
      <button class="menubtn primary" id="panel-close">${t('btnBack')}</button>
    </div>`;
  p.classList.add('show');
  $('panel-close').onclick = () => { hidePanel(); onClose(); };
}

export function showCustomPanel(onStart, onClose) {
  const p = $('panel');
  const chars = [
    ['bonnie', 'Bonnie'], ['chica', 'Chica'], ['foxy', 'Foxy'],
    ['freddy', 'Freddy'], ['endo', 'ENDO-01']
  ];
  const sliders = chars.map(([key, name]) => `
    <div class="setrow"><label>${name}</label>
      <input type="range" class="cn-slider" data-key="${key}" min="0" max="10" value="${G.customLevels[key]}">
      <span id="cn-v-${key}">${G.customLevels[key]}</span></div>`).join('');
  p.innerHTML = `
    <div class="panel-inner">
      <h2>${t('cn_title')}</h2>
      <p>${t('cn_desc')}</p>
      ${sliders}
      <p class="sub">${t('cn_max_hint')}</p>
      <button class="menubtn primary" id="cn-start">${t('cn_start')}</button>
      <button class="menubtn" id="panel-close">${t('btnBack')}</button>
    </div>`;
  p.classList.add('show');
  p.querySelectorAll('.cn-slider').forEach((sl) => {
    sl.oninput = (e) => {
      G.customLevels[sl.dataset.key] = Number(e.target.value);
      $('cn-v-' + sl.dataset.key).textContent = e.target.value;
    };
  });
  $('cn-start').onclick = () => { hidePanel(); onStart(); };
  $('panel-close').onclick = () => { hidePanel(); onClose(); };
}

// ---------------- HUD ----------------
let touchMode = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
export function usingTouch() { return touchMode; }

// "⚡ FLASH [F]" -> "⚡ FLASH" on touch screens, where key hints mean nothing
export function keyHint(label) {
  return touchMode ? label.replace(/\s*\[[^\]]+\]/g, '') : label;
}
export function setTouchMode(v) { touchMode = !!v; }

const LEGEND_SECONDS = 22;
const HINT_MS = 9000;
let hintSince = 0;

function controlsLegend() {
  const parts = [t('ctl_look'), t('ctl_torch')];
  if (G.isCustom || G.night >= 2) parts.push(t('ctl_feed'));
  if (G.monitorUnlocked) parts.push(t('ctl_cams'));
  if (G.shockUnlocked) parts.push(t('ctl_shock'));
  parts.push(t('ctl_pause'));
  return parts.join('  ·  ');
}

function shockLabel() {
  return G.shockCharges > 0 ? keyHint(t('hud_shock', G.shockCharges)) : t('hud_shock_empty');
}

export function updateHUD() {
  const inPlay = G.phase === 'play';
  const playing = inPlay && !G.monitorUp;
  const touch = touchMode;
  $('hud').style.display = playing ? 'block' : 'none';
  $('touchui').style.display = (playing && touch) ? 'block' : 'none';
  $('mon-pause').style.display = G.monitorUp ? 'block' : 'none';
  document.body.classList.toggle('mon', G.monitorUp && inPlay); // lifts subtitles above the cam controls

  if (G.monitorUp && inPlay) {
    const parts = [clockLabel((G.duration - G.timeLeft) / G.duration)];
    if (G.isCustom || G.night >= 2) parts.push(t('hud_food', G.food));
    if (G.shockUnlocked) parts.push(shockLabel());
    $('mon-info').textContent = parts.join('   ');
  }
  if (!playing) return;

  $('nightlabel').textContent = G.isCustom ? t('hud_custom') : t('hud_night', G.night);
  $('clock').textContent = clockLabel((G.duration - G.timeLeft) / G.duration);
  const showFood = G.isCustom || G.night >= 2;
  const food = $('food');
  food.style.display = showFood ? 'block' : 'none';
  if (showFood) food.textContent = t('hud_food', G.food);
  const shock = $('shock');
  shock.style.display = G.shockUnlocked ? 'block' : 'none';
  if (G.shockUnlocked) {
    shock.textContent = shockLabel();
    shock.classList.toggle('ready', G.shockCharges > 0 && G.stunTimer <= 0);
  }
  $('torch').textContent = G.flashlight ? t('hud_torch_on') : t('hud_torch_off');
  $('torch').classList.toggle('on', G.flashlight);
  $('cambar').textContent = t('hud_cams');
  $('cambar').style.display = G.monitorUnlocked ? 'block' : 'none';
  $('stun').style.display = G.stunTimer > 0 ? 'block' : 'none';
  if (G.stunTimer > 0) $('stun').textContent = t('hud_stun', Math.ceil(G.stunTimer));

  // mouse players: say how to get the view back whenever the lock is off
  // (shown for a few seconds each time the lock goes away, so drag-look
  // players aren't left with a permanent label over the view)
  const hint = $('lockhint');
  const needLock = !touch && !document.pointerLockElement;
  if (needLock && !hintSince) hintSince = performance.now();
  if (!needLock) hintSince = 0;
  const showHint = needLock && performance.now() - hintSince < HINT_MS;
  hint.style.display = showHint ? 'block' : 'none';
  if (showHint) hint.textContent = t('hint_lock');

  // controls reminder for the first seconds of every night (desktop)
  const legend = $('controls');
  const age = (performance.now() - (G.nightStartedAt || 0)) / 1000;
  legend.style.display = touch ? 'none' : 'block';
  legend.classList.toggle('show', age < LEGEND_SECONDS);
  if (age < LEGEND_SECONDS) legend.textContent = controlsLegend();

  // touch buttons only for tools this night actually has
  if (touch) {
    $('tch-feed').style.display = (G.isCustom || G.night >= 2) ? 'block' : 'none';
    $('tch-cams').style.display = G.monitorUnlocked ? 'block' : 'none';
    const sh = $('tch-shock');
    sh.style.display = G.shockUnlocked ? 'block' : 'none';
    sh.classList.toggle('spent', G.shockCharges <= 0);
    sh.dataset.count = G.shockCharges;
    $('tch-torch').classList.toggle('on', G.flashlight);
  }
}
