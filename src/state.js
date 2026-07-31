// Global game state shared by all modules.
export const qs = new URLSearchParams(location.search);

export const G = {
  phase: 'title',        // title | brief | play | jumpscare | death | nightdone | cutscene | end
  night: Number(qs.get('night')) || 1,
  duration: Number(qs.get('t')) || 300, // seconds per night (5 minutes)
  speed: Number(qs.get('speed')) || 1,  // debug time multiplier
  timeLeft: 300,

  food: 10,              // shared across nights 2-5
  foodAtNightStart: 10,

  monitorUnlocked: false, // night >= 3
  audioUnlocked: false,   // night >= 4
  shockUnlocked: false,   // night == 5
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

export function hourLabel() {
  const elapsed = G.duration - G.timeLeft;
  const h = Math.min(5, Math.floor(elapsed / (G.duration / 6)));
  return (h === 0 ? 12 : h) + ' AM';
}
