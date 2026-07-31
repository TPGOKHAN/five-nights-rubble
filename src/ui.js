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
export function updateHUD() {
  const playing = G.phase === 'play' && !G.monitorUp;
  $('hud').style.display = playing ? 'block' : 'none';
  $('touchui').style.display = (G.phase === 'play' && isTouch()) ? 'block' : 'none';
  if (!playing) return;
  $('nightlabel').textContent = G.isCustom ? t('hud_custom') : t('hud_night', G.night);
  $('clock').textContent = clockLabel((G.duration - G.timeLeft) / G.duration);
  const food = $('food');
  const showFood = G.isCustom || G.night >= 2;
  food.style.display = showFood ? 'block' : 'none';
  if (showFood) food.textContent = t('hud_food', G.food);
  const shock = $('shock');
  shock.style.display = G.shockUnlocked ? 'block' : 'none';
  if (G.shockUnlocked) {
    shock.textContent = G.shockCd > 0 ? t('hud_shock_cd', Math.ceil(G.shockCd)) : t('hud_shock_ready');
    shock.classList.toggle('ready', G.shockCd <= 0);
  }
  $('torch').textContent = G.flashlight ? t('hud_torch_on') : t('hud_torch_off');
  $('torch').classList.toggle('on', G.flashlight);
  $('cambar').textContent = t('hud_cams');
  $('cambar').style.display = G.monitorUnlocked ? 'block' : 'none';
  $('stun').style.display = G.stunTimer > 0 ? 'block' : 'none';
  if (G.stunTimer > 0) $('stun').textContent = t('hud_stun', Math.ceil(G.stunTimer));
}

export function isTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
