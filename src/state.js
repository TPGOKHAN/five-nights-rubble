// Global game state shared by all modules.
export const qs = new URLSearchParams(location.search);

export const G = {
  phase: 'title',        // title | brief | play | paused | jumpscare | death | nightdone | cutscene | end
  night: Number(qs.get('night')) || 1,
  duration: Number(qs.get('t')) || 300, // seconds per night (5 minutes)
  speed: Number(qs.get('speed')) || 1,  // debug time multiplier
  timeLeft: 300,

  food: 10,              // shared across nights 2-5
  foodAtNightStart: 10,
  n4bonusGiven: false,   // +3 food found on night 4, once per campaign run

  isCustom: false,
  customLevels: { bonnie: 5, chica: 5, foxy: 5, freddy: 5, endo: 5 },

  monitorUnlocked: false, // night >= 3 (always in custom)
  audioUnlocked: false,   // night >= 4 (always in custom)
  programUnlocked: false, // night >= 5 (always in custom)
  shockUnlocked: false,   // night == 5 (always in custom)
  shockCd: 0,
  stunTimer: 0,           // controlled shock: everything frozen while > 0

  flashlight: false,
  monitorUp: false,
  cam: 0,

  yaw: 0,
  pitch: 0,

  killer: null,
  jumpT: 0
};
