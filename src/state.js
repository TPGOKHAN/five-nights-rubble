// Global game state shared by all modules.
export const qs = new URLSearchParams(location.search);

// Debug tools (URL overrides, window.FN console API, QA bot) exist in the dev
// server and behind ?debug in production — never for ordinary players, so a
// shared link can't skip nights or shorten them.
export const DEBUG = import.meta.env.DEV || qs.has('debug');
const dbg = (key) => (DEBUG ? Number(qs.get(key)) || 0 : 0);

export const G = {
  phase: 'title',        // title | brief | play | paused | jumpscare | death | nightdone | cutscene | end
  night: 1,
  duration: dbg('t') || 300, // seconds per night (5 minutes)
  speed: dbg('speed') || 1,  // time multiplier (debug / QA)
  timeLeft: 300,
  qa: false,             // QA bot running: keep simulating in background tabs

  food: 10,              // shared across nights 2-5
  foodAtNightStart: 10,
  n4bonusGiven: false,   // +3 food found on night 4, once per campaign run

  isCustom: false,
  customLevels: { bonnie: 5, chica: 5, foxy: 5, freddy: 5, endo: 5 },

  monitorUnlocked: false, // night >= 3 (always in custom)
  audioUnlocked: false,   // night >= 4 (always in custom)
  programUnlocked: false, // night >= 5 (always in custom)
  shockUnlocked: false,   // night == 5 (always in custom)
  shockCharges: 0,        // controlled shock: limited charges per night
  stunTimer: 0,           // controlled shock: everything frozen while > 0

  flashlight: false,
  monitorUp: false,
  cam: 0,

  yaw: 0,
  pitch: 0,

  killer: null,
  jumpT: 0
};

export const SHOCK_CHARGES = 2;
export const debugNight = () => dbg('night');
