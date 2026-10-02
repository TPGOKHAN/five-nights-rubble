// All sound is synthesized with WebAudio — zero audio assets.
let ctx = null;
let master = null;
let runInterval = null;
let volume = 0.7;
let danger = 0;          // 0..1 — drives the heartbeat
let heartbeatTimer = null;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // no Web Audio: the game runs silent rather than not at all
  try { ctx = new AC(); } catch (e) { ctx = null; return; }
  master = ctx.createGain();
  master.gain.value = volume * 0.8;
  master.connect(ctx.destination);
  ambience();
  heartbeatLoop();
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume * 0.8;
}

export function suspendAudio() { if (ctx) ctx.suspend().catch(() => {}); }
export function resumeAudio() { if (ctx) ctx.resume().catch(() => {}); }

// danger level 0..1: heart beats faster and louder as threats close in
export function setDanger(level) { danger = Math.max(0, Math.min(1, level)); }

function heartbeatLoop() {
  const schedule = () => {
    const delay = danger > 0 ? 950 - danger * 500 : 400;
    heartbeatTimer = setTimeout(() => {
      if (danger > 0 && ctx && ctx.state === 'running') {
        const vol = 0.10 + danger * 0.22;
        thump(vol, 48);
        setTimeout(() => thump(vol * 0.7, 40), 140);
      }
      schedule();
    }, delay);
  };
  schedule();
}

function thump(vol, pitch) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.exponentialRampToValueAtTime(25, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.16);
}

function noiseBuffer(dur = 1) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    // brown-ish noise
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function ambience() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(4);
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 220;
  const g = ctx.createGain();
  g.gain.value = 0.10;
  // slow swell LFO
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.04;
  lfo.connect(lfoG).connect(g.gain);
  src.connect(lp).connect(g).connect(master);
  src.start();
  lfo.start();
  // occasional building creaks
  setInterval(() => { if (Math.random() < 0.4) creak(); }, 9000);
}

function creak() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  const g = ctx.createGain();
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(90 + Math.random() * 60, t);
  o.frequency.linearRampToValueAtTime(60 + Math.random() * 40, t + 1.2);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.03, t + 0.3);
  g.gain.linearRampToValueAtTime(0, t + 1.4);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 1.5);
}

// heavy metal footstep; vol scaled by distance
export function step(vol = 0.3, pitch = 55) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.25);
  // clatter of debris
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.15);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.35, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  n.connect(hp).connect(ng).connect(master);
  n.start(t);
}

export function growl(base = 62, dur = 1.3) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, t);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11;
  const lfoG = ctx.createGain();
  lfoG.gain.value = 14;
  lfo.connect(lfoG).connect(o.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 380;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.15);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(lp).connect(g).connect(master);
  o.start(t); lfo.start(t);
  o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
}

// Chica cue: wet, clicking cluck
export function cluck() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const t = t0 + i * 0.16;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(340 - i * 40, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.12);
  }
}

// Freddy laugh: slow descending "ho ho ho"
export function laugh() {
  if (!ctx) return;
  const notes = [196, 175, 156];
  const t0 = ctx.currentTime;
  notes.forEach((f, i) => {
    const t = t0 + i * 0.42;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.4);
  });
}

// Music-box lure melody (Audio button)
export function lure() {
  if (!ctx) return;
  const notes = [523, 659, 784, 659, 523, 392, 523];
  const t0 = ctx.currentTime;
  notes.forEach((f, i) => {
    const t = t0 + i * 0.22;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.4);
  });
}

// pitch: 1 = base. Bonnie 0.8 (deep), Chica 1.15 (shrill), Foxy 1.35 (ragged),
// Freddy 0.6 (bassy), Endo 1.6 (metallic)
export function screech(pitch = 1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(1.1);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1600 * pitch, t);
  bp.frequency.linearRampToValueAtTime(2600 * pitch, t + 0.5);
  bp.Q.value = 1.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, t);
  g.gain.linearRampToValueAtTime(0, t + 1.05);
  n.connect(bp).connect(g).connect(master);
  n.start(t);
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime((700 + i * 230) * pitch, t);
    o.frequency.linearRampToValueAtTime((1100 + i * 260) * pitch, t + 0.6);
    o.detune.value = (i - 1) * 35;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.22, t);
    og.gain.linearRampToValueAtTime(0, t + 0.9);
    o.connect(og).connect(master);
    o.start(t); o.stop(t + 1);
  }
}

// kitchen clatter: metallic pot impacts, heard when something prowls the kitchen
export function pots() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const hits = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < hits; i++) {
    const t = t0 + i * (0.12 + Math.random() * 0.2);
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 2200;
    bp.Q.value = 8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12 + Math.random() * 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    n.connect(bp).connect(g).connect(master);
    n.start(t);
  }
}

export function ding() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  [1047, 1319].forEach((f, i) => {
    const t = t0 + i * 0.5;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 1.3);
  });
}

export function buzz(dur = 0.7, vol = 0.25) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 55;
  const o2 = ctx.createOscillator();
  o2.type = 'square';
  o2.frequency.value = 120;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g); o2.connect(g); g.connect(master);
  o.start(t); o2.start(t);
  o.stop(t + dur); o2.stop(t + dur);
}

export function beep(ok = true) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = ok ? 880 : 220;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.2);
}

export function clank() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.4);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  n.connect(bp).connect(g).connect(master);
  n.start(t);
  step(0.4, 45);
}

export function staticBurst() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.12);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 1500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.06, t);
  g.gain.linearRampToValueAtTime(0.001, t + 0.12);
  n.connect(hp).connect(g).connect(master);
  n.start(t);
}

// fast footsteps while Foxy sprints
export function runSteps(on) {
  if (on && !runInterval) {
    runInterval = setInterval(() => step(0.35, 75), 240);
  } else if (!on && runInterval) {
    clearInterval(runInterval);
    runInterval = null;
  }
}

export function throwFood() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = ctx.createBufferSource();
  n.buffer = noiseBuffer(0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  n.connect(g).connect(master);
  n.start(t);
}
