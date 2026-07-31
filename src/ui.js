import { G, hourLabel } from './state.js';

const $ = (id) => document.getElementById(id);
let subTimer = null;
let btnHandler = null;

export function subtitle(text, dur = 4) {
  const el = $('subtitle');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(subTimer);
  subTimer = setTimeout(() => el.classList.remove('show'), dur * 1000);
}

export function showScreen(html, btnText, onBtn) {
  const s = $('screen');
  $('screen-content').innerHTML = html;
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

export function updateHUD() {
  const playing = G.phase === 'play' && !G.monitorUp;
  $('hud').style.display = playing ? 'block' : 'none';
  if (!playing) return;
  $('nightlabel').textContent = 'NIGHT ' + G.night;
  $('clock').textContent = hourLabel();
  const food = $('food');
  food.style.display = G.night >= 2 ? 'block' : 'none';
  food.textContent = '\u{1F355} FOOD × ' + G.food;
  const shock = $('shock');
  shock.style.display = G.shockUnlocked ? 'block' : 'none';
  if (G.shockUnlocked) {
    shock.textContent = G.shockCd > 0
      ? '⚡ SHOCK RECHARGING ' + Math.ceil(G.shockCd) + 's'
      : '⚡ SHOCK READY [X]';
    shock.classList.toggle('ready', G.shockCd <= 0);
  }
  $('torch').textContent = G.flashlight ? '\u{1F526} ON' : '\u{1F526} OFF';
  $('torch').classList.toggle('on', G.flashlight);
  $('cambar').style.display = (G.monitorUnlocked && !G.monitorUp) ? 'block' : 'none';
  $('stun').style.display = G.stunTimer > 0 ? 'block' : 'none';
  if (G.stunTimer > 0) $('stun').textContent = 'SYSTEMS STUNNED ' + Math.ceil(G.stunTimer) + 's';
}

export function flashFx(color = '#fff', ms = 120) {
  const el = $('flashfx');
  el.style.background = color;
  el.style.opacity = 0.85;
  setTimeout(() => { el.style.opacity = 0; }, ms);
}

export function setBriefText(night) {
  const briefs = {
    1: `<h2>NIGHT 1 &mdash; THE RABBIT</h2>
      <p>Your phone is at 4%. The dispatcher's voice was flat: <em>&ldquo;Everyone's buried tonight, sir.
      Hold on. Five days, maybe less.&rdquo;</em></p>
      <p>Something big just moved backstage. The rabbit. Its servos still work &mdash; and it's looking for warm things in the rubble.</p>
      <p class="tip">&#9656; When you hear it close, <b>SHINE YOUR LIGHT INTO ITS EYES</b> and hold it there until it recoils.<br>
      &#9656; SPACE or LEFT CLICK toggles the flashlight. Move the mouse to look around.</p>`,
    2: `<h2>NIGHT 2 &mdash; THE CHICK</h2>
      <p>Digging through the debris you found a torn bag of kitchen stock &mdash; <b>10 pieces</b> of rotten, reeking food. That's all there is. It has to last.</p>
      <p>The chick is awake now, and it is <em>hungry</em>.</p>
      <p class="tip">&#9656; When she comes close, <b>KILL YOUR LIGHT</b>, then press <b>F</b> to toss food. Feed her without her noticing you &mdash; if your beam is on her, she snaps.<br>
      &#9656; The rabbit still hates light in its eyes. Juggle both.</p>`,
    3: `<h2>NIGHT 3 &mdash; THE FOX</h2>
      <p>You pried a cracked <b>security monitor</b> out of the wreck. The camera grid still answers.</p>
      <p>The fox doesn't creep like the others. It waits behind its curtain, and then it <em>runs</em>.</p>
      <p class="tip">&#9656; <b>TAB / C / right-click</b> opens the cameras. Keys 1&ndash;8 switch feeds.<br>
      &#9656; Watch Pirate Cove. Find the fox on camera and hit <b>FLASH</b> (or F, in the monitor) to burn its eyes &mdash; stuns it for 30 seconds.<br>
      &#9656; If you hear sprinting, it's already too late to be slow.</p>`,
    4: `<h2>NIGHT 4 &mdash; THE BEAR</h2>
      <p>The big one is moving now. Light doesn't stop him. Food doesn't interest him. Nothing stops him.</p>
      <p>But his ears still work.</p>
      <p class="tip">&#9656; Find the bear on the cameras and press <b>AUDIO</b> (or Q) on <em>his</em> camera to lure him backwards.<br>
      &#9656; It only buys time. Keep buying it until 6 AM.</p>`,
    5: `<h2>NIGHT 5 &mdash; THE SKELETON</h2>
      <p>Last night. They are all faster, all angrier. And something else woke up in Parts &amp; Service &mdash; a bare <b>endoskeleton</b>. No suit. No eyes that need light. <em>It sees in the dark.</em></p>
      <p class="tip">&#9656; Find ENDO-01 on the cameras and press <b>PROGRAM</b> (or P) to order it back to Parts &amp; Service.<br>
      &#9656; You've wired a <b>CONTROLLED SHOCK [X]</b>: stuns every animatronic for 60 seconds. Long recharge.<br>
      &#9656; Survive until dawn. They're coming at first light.</p>`
  };
  return briefs[night];
}
