// Zero-dependency test suite: `npm test`. Runs in Node, no browser needed.
// Covers the invariants that a playthrough would only catch by luck:
// string tables, save/progress rules, and storage failure handling.
// Layout fairness (visibility of every waypoint) is checked in the browser
// by FN.audit() — see README.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0, passed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; return; }
  failed++;
  console.log('  ✗ ' + name + (detail ? '\n      ' + detail : ''));
}
function section(name) { console.log('• ' + name); }

// ---------- environment shims ----------
let storage = new Map();
let storageBroken = false;
globalThis.localStorage = {
  getItem(k) { if (storageBroken) throw new Error('SecurityError'); return storage.has(k) ? storage.get(k) : null; },
  setItem(k, v) { if (storageBroken) throw new Error('SecurityError'); storage.set(k, String(v)); },
  removeItem(k) { storage.delete(k); }
};
globalThis.document = { documentElement: {}, title: '' };
const setLanguage = (l) => Object.defineProperty(globalThis, 'navigator', { value: { language: l }, configurable: true, writable: true });
setLanguage('en-US');
let fresh = 0;
const load = (rel) => import(join(root, rel) + '?v=' + (++fresh));

// ---------- i18n ----------
section('i18n tables');
{
  const i18n = await load('src/i18n.js');
  const src = readFileSync(join(root, 'src/i18n.js'), 'utf8');
  const table = (name) => {
    const start = src.indexOf(`  ${name}: {`);
    const end = src.indexOf('\n  }', start);
    const body = src.slice(start, end);
    // keys start a line or follow ", " (two short keys can share a line)
    return new Set([...body.matchAll(/(?:^\s{4}|,\s+)([A-Za-z][A-Za-z0-9_]*):\s/gm)].map((m) => m[1]));
  };
  const en = table('en'), tr = table('tr');
  check('EN table parsed', en.size > 100, 'only ' + en.size + ' keys');
  const onlyEn = [...en].filter((k) => !tr.has(k));
  const onlyTr = [...tr].filter((k) => !en.has(k));
  check('every EN key exists in TR', onlyEn.length === 0, onlyEn.join(', '));
  check('every TR key exists in EN', onlyTr.length === 0, onlyTr.join(', '));

  // keys used by code: literal t('x') calls plus the dynamic families
  const code = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js') && f !== 'i18n.js')
    .map((f) => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
  // complete literal keys only: t('key') / t('key', …) — not t('prefix_' + x)
  const used = new Set([...code.matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'\s*[,)]/g)].map((m) => m[1]));
  const save = await load('src/save.js');
  for (let n = 1; n <= 5; n++) used.add('brief' + n);
  save.ACH_IDS.forEach((id) => { used.add('achName_' + id); used.add('achDesc_' + id); });
  ['bonnie', 'chica', 'foxy', 'freddy', 'endo'].forEach((k) => used.add('deathTip_' + k));
  used.add('doc_title'); // used inside i18n.js itself
  ['dirLeft', 'dirRight', 'dirFront'].forEach((k) => used.add(k)); // WP[...].dir
  const missing = [...used].filter((k) => !en.has(k));
  const dead = [...en].filter((k) => !used.has(k));
  check('every key the code uses is defined', missing.length === 0, missing.join(', '));
  check('no dead strings in the table', dead.length === 0, dead.join(', '));

  // function-valued entries must be functions in both languages
  i18n.setLang('tr');
  const trBrief = i18n.t('brief5');
  check('TR brief 5 is Turkish', /GECE/.test(trBrief));
  check('TR dynamic string works', i18n.t('btnStartNight', 3) === '3. GECEYİ BAŞLAT');
  check('document title follows language', document.title === 'Enkazda Beş Gece');
  i18n.setLang('en');
  check('EN dynamic string works', i18n.t('btnStartNight', 3) === 'START NIGHT 3');
  check('clock 12 AM at start', i18n.clockLabel(0) === '12 AM');
  check('clock 5 AM near the end', i18n.clockLabel(0.99) === '5 AM');
  i18n.setLang('tr');
  check('TR clock uses 24h', i18n.clockLabel(0.5) === '03:00');
}

// ---------- save / progress ----------
section('save & progress rules');
{
  storage = new Map();
  const S = await load('src/save.js');
  S.loadSave();
  const unlocked = [];
  S.onAchievement((id) => unlocked.push(id));

  S.recordNightSurvived(1, 10, false, false);
  check('night 1 unlocks night 2', S.save.unlockedNight === 2);
  check('night 1 achievement', unlocked.includes('night1'));
  S.recordNightSurvived(2, 7, false, false);
  check('food carried into night 3', S.save.foodAtNight[3] === 7);

  S.recordDeath('Chica', true);
  check('custom-night death does not spoil the no-death run', S.save.runDeaths === 0);
  check('custom-night death still counts in lifetime stats', S.save.stats.deaths === 1);

  S.recordNightSurvived(3, 6, false, false);
  S.recordNightSurvived(4, 8, false, false);
  S.recordNightSurvived(5, 5, false, false);
  check('campaign win marks beaten', S.save.beaten === true);
  check('win + no-death + frugal achievements', ['win', 'nodeath', 'frugal'].every((a) => unlocked.includes(a)), unlocked.join(','));
  check('campaign resets for the next run', S.save.unlockedNight === 1 && S.save.foodAtNight[1] === 10);

  S.recordAbandon(false);
  check('abandoning a campaign night counts against no-death', S.save.runDeaths === 1);
  S.recordAbandon(true);
  check('abandoning a custom night does not', S.save.runDeaths === 1);

  for (let i = 0; i < 10; i++) S.bump('chicaFeeds');
  check('counter achievement at its threshold', unlocked.includes('chica'));

  const persisted = JSON.parse(storage.get('fnr.save'));
  check('progress is persisted', persisted.beaten === true && persisted.stats.chicaFeeds === 10);

  S.recordNightSurvived(0, 3, true, true);
  check('all-10 custom night unlocks Golden Rubble', unlocked.includes('custom'));
}
{
  // a corrupted or hand-edited save must not break the game
  storage = new Map([['fnr.save', '{"unlockedNight": 99, "stats": {"deaths": 4}}']]);
  const S = await load('src/save.js');
  S.loadSave();
  check('unlockedNight is clamped to 1..5', S.save.unlockedNight === 5);
  check('partial stats keep their defaults', S.save.stats.deaths === 4 && S.save.stats.wins === 0 && typeof S.save.stats.deathsBy === 'object');
  check('missing food table gets night 1', S.save.foodAtNight[1] === 10);

  storage = new Map([['fnr.save', 'not json{']]);
  const S2 = await load('src/save.js');
  S2.loadSave();
  check('garbage save falls back to defaults', S2.save.unlockedNight === 1);
}
{
  // private browsing / blocked storage: every access throws
  storageBroken = true;
  let threw = false;
  try {
    const S = await load('src/save.js');
    S.loadSave(); S.persist(); S.recordDeath('Bonnie'); S.unlock('night1');
    const ST = await load('src/settings.js');
    ST.loadSettings(); ST.saveSettings();
  } catch (e) { threw = e; }
  check('blocked storage never throws', !threw, threw && threw.message);
  storageBroken = false;
}

// ---------- settings ----------
section('settings');
{
  storage = new Map();
  setLanguage('tr-TR');
  const ST = await load('src/settings.js');
  ST.loadSettings();
  check('Turkish browser defaults to TR on first run', ST.settings.lang === 'tr');
  storage.set('fnr.settings', JSON.stringify({ lang: 'en', volume: 0.3 }));
  const ST2 = await load('src/settings.js');
  ST2.loadSettings();
  check('saved language wins over browser language', ST2.settings.lang === 'en' && ST2.settings.volume === 0.3);
  setLanguage('en-US');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
