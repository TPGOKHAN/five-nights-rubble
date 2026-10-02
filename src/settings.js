// Persistent player settings (localStorage). Every storage access is guarded:
// private browsing and blocked site data make localStorage throw, and the
// game must still boot with defaults.
const KEY = 'fnr.settings';

export const settings = {
  lang: 'en',
  volume: 0.7,        // 0..1
  sensitivity: 1.0,   // 0.4..2.0 multiplier
  staticFx: 1.0,      // 0..1 camera static intensity
  subtitles: true,
  screenFlash: true   // photosensitivity: white/blue full-screen flashes
};

export function loadSettings() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  if (raw) {
    try { Object.assign(settings, JSON.parse(raw)); } catch (e) { /* corrupted — keep defaults */ }
  } else if ((navigator.language || '').toLowerCase().startsWith('tr')) {
    settings.lang = 'tr'; // first run on a Turkish browser
  }
  return settings;
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
