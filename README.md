# Five Nights in the Rubble / Enkazda Beş Gece

**Play: https://tpgokhan.github.io/five-nights-rubble/**

Unofficial FNaF-inspired 3D survival horror for the web. You are trapped under
debris in a collapsed pizzeria; survive five nights (5 real minutes each) until
the police arrive. Three.js + Vite, **zero assets** — every model is built from
primitives and every sound is synthesized with WebAudio.

## Run

```bash
npm install
npm run dev        # http://localhost:8452
npm test           # string tables, save/progress rules, storage failures
npm run deploy     # tests → build → publish to GitHub Pages (gh-pages branch)
```

## Nights & mechanics

| Night | Active | Counter |
|-------|--------|---------|
| 1 | Bonnie | Hold your flashlight on his eyes (~1s) when he reaches the debris |
| 2 | +Chica | Light OFF, press **F** to throw food (10 for the whole run, +3 found on night 4) |
| 3 | +Foxy, monitor unlocks | Find him on a camera and **FLASH** = 30s stun |
| 4 | +Freddy | **AUDIO** on a camera that shows him lures him back (only buys time) |
| 5 | +Endo-01 | **PROGRAM** on a camera that shows him, or **Controlled Shock [X]** (stuns everything 60s, **2 charges** per night) |

Beat night 5 → rescue cutscene → **Custom Night** unlocks (per-character
aggression 0–10; all tools + 10 food; all-10s survival = "Golden Rubble").

**One rule for every camera action:** if the character is visible on the feed
you're watching, FLASH / AUDIO / PROGRAM work on it. The game decides this with
real line-of-sight raycasts (`src/vision.js`), the same way it decides whether
your flashlight is actually on Bonnie's eyes — so what you see and what the
game decides can never disagree.

## Controls

- Mouse (pointer lock, or drag if the browser refuses the lock) / touch drag: look
- **Space / click**: flashlight · **F**: feed · **Tab / C / right-click**: cameras
- In the monitor: **1–8** switch feed, **F** flash, **Q** audio, **P** program
- **X**: controlled shock (night 5) · **Esc / P**: pause (also auto-pauses when the tab or window loses focus)
- Touch devices get on-screen buttons; the mode follows the last input, so touchscreen laptops work with both.

## Features

- EN + TR localization (auto-detects Turkish browsers; toggle on title/settings)
- localStorage save (fails safe in private browsing): campaign progress + food
  carried per night, settings, 13 achievements, lifetime stats
- Pause menu, settings (volume, sensitivity, static intensity, subtitles,
  photosensitivity-safe mode), controls reminder, death screens with a tip
- Danger-driven heartbeat, kitchen-clatter cues, per-character jumpscares that
  turn your view to the attacker

## Debug / QA

Debug tools are only in the dev server or with **`?debug`** on the live URL.

- URL params (debug only): `?night=N`, `?t=60` short nights, `?speed=4`
- Console: `FN.start(n)`, `FN.custom({bonnie:10,...})`, `FN.win()`, `FN.CH`, `FN.save`
- **`FN.audit()`** — layout fairness check: every waypoint visible on ≥1 camera,
  the player can see the eyes of every attacker at the debris, Foxy's whole
  sprint is on camera, no two characters share a spot. Must return `ok: true`.
- **`await FN.autoplay(3, {speed: 10})`** — bot plays a night with sound
  strategy and resolves `{result, food, shocksLeft}`; used to sim-verify balance.

## Architecture

```
src/i18n.js         EN+TR string tables (t, setLang, clockLabel)
src/state.js        global G state, DEBUG gate, URL params
src/settings.js     persisted settings
src/save.js         progress, achievements, lifetime stats
src/audio.js        all WebAudio synthesis (ambience, heartbeat, screeches…)
src/world.js        ruined pizzeria scene (one group = the occluders)
src/vision.js       line-of-sight: canSee(camera, ch), eye checks
src/animatronics.js Walker base + Bonnie/Chica/Freddy/Foxy/Endo AI, waypoints, night configs
src/monitor.js      8 CCTV cams, static, FLASH/AUDIO/PROGRAM actions
src/ui.js           HUD, screens, menus, panels, toasts, input mode
src/autopilot.js    QA: FN.autoplay + FN.audit (loaded only in debug)
src/main.js         game loop, input, pause, jumpscare, cutscene, saves
tests/run.mjs       node test suite (npm test)
```
