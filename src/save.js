// Persistent progress: unlocked night, food carried into each night,
// achievements, and lifetime stats. All in localStorage.
const KEY = 'fnr.save';

export const save = {
  unlockedNight: 1,          // highest night the player can start
  foodAtNight: { 1: 10 },    // food carried into each unlocked night
  beaten: false,             // finished the 5-night campaign at least once
  runDeaths: 0,              // deaths in the current campaign run
  achievements: {},          // id -> unlock timestamp
  stats: {
    deaths: 0,
    deathsBy: {},            // killer name -> count
    nightsSurvived: 0,
    wins: 0,
    bonnieRepels: 0,
    chicaFeeds: 0,
    foxyFlashes: 0,
    freddyLures: 0,
    endoPrograms: 0,
    shocks: 0
  }
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const defaults = JSON.parse(JSON.stringify(save));
      Object.assign(save, data);
      save.stats = Object.assign(defaults.stats, data.stats || {});
      save.foodAtNight = Object.assign({ 1: 10 }, data.foodAtNight || {});
      save.achievements = data.achievements || {};
      save.unlockedNight = Math.min(5, Math.max(1, Number(save.unlockedNight) || 1));
    }
  } catch (e) { /* keep defaults */ }
  return save;
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}

export function wipeProgress() {
  // new game: reset campaign progress, keep achievements + lifetime stats
  save.unlockedNight = 1;
  save.foodAtNight = { 1: 10 };
  save.runDeaths = 0;
  persist();
}

// ---- achievements ----
export const ACH_IDS = [
  'night1', 'night3', 'win', 'nodeath', 'frugal',
  'bonnie', 'chica', 'foxy', 'freddy', 'endo', 'shock', 'deaths', 'custom'
];

let toastFn = null;
export function onAchievement(fn) { toastFn = fn; }

export function unlock(id) {
  if (save.achievements[id]) return false;
  save.achievements[id] = Date.now();
  persist();
  if (toastFn) toastFn(id);
  return true;
}

// bump a lifetime counter and check its threshold achievement
const COUNTER_ACH = {
  bonnieRepels: ['bonnie', 10],
  chicaFeeds: ['chica', 8],
  foxyFlashes: ['foxy', 6],
  freddyLures: ['freddy', 8],
  endoPrograms: ['endo', 3],
  shocks: ['shock', 3]
};

export function bump(stat) {
  save.stats[stat] = (save.stats[stat] || 0) + 1;
  const rule = COUNTER_ACH[stat];
  if (rule && save.stats[stat] >= rule[1]) unlock(rule[0]);
  persist();
}

export function recordDeath(killerName, isCustom = false) {
  save.stats.deaths++;
  save.stats.deathsBy[killerName] = (save.stats.deathsBy[killerName] || 0) + 1;
  // only campaign deaths spoil the "Untouchable" (no-death) run
  if (!isCustom) save.runDeaths++;
  if (save.stats.deaths >= 10) unlock('deaths');
  persist();
}

// restarting or quitting mid-night dodges a death; for the no-death
// achievement it counts as one
export function recordAbandon(isCustom) {
  if (isCustom) return;
  save.runDeaths++;
  persist();
}

export function recordNightSurvived(night, food, isCustom, customAll10) {
  save.stats.nightsSurvived++;
  if (isCustom) {
    if (customAll10) unlock('custom');
    persist();
    return;
  }
  if (night === 1) unlock('night1');
  if (night === 3) unlock('night3');
  if (night < 5) {
    save.unlockedNight = Math.max(save.unlockedNight, night + 1);
    save.foodAtNight[night + 1] = food;
  } else {
    save.stats.wins++;
    save.beaten = true;
    unlock('win');
    if (save.runDeaths === 0) unlock('nodeath');
    if (food >= 4) unlock('frugal');
    // campaign done — next run starts fresh
    save.unlockedNight = 1;
    save.foodAtNight = { 1: 10 };
    save.runDeaths = 0;
  }
  persist();
}
