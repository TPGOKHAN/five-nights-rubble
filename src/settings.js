// Persistent player settings (localStorage).
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
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch (e) { /* corrupted or unavailable storage — keep defaults */ }
  // auto-detect Turkish on first run
  if (!localStorage.getItem(KEY) && (navigator.language || '').toLowerCase().startsWith('tr')) {
    settings.lang = 'tr';
  }
  return settings;
}

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
