# Five Nights in the Rubble / Enkazda Beş Gece

Unofficial FNaF-inspired 3D survival horror for the web. You are trapped under
debris in a collapsed pizzeria; survive five nights (5 real minutes each) until
the police arrive. Three.js + Vite, **zero assets** — every model is built from
primitives and every sound is synthesized with WebAudio.

## Run

```bash
npm install
npm run dev        # http://localhost:8452
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Nights & mechanics

| Night | Active | Counter |
|-------|--------|---------|
| 1 | Bonnie | Hold your flashlight on his eyes (~1s) when he gets close |
| 2 | +Chica | Light OFF, press **F** to throw food (10 for the whole run, +3 found night 4) |
| 3 | +Foxy, monitor unlocks | Find him on cam, **FLASH** = 30s stun |
| 4 | +Freddy | **AUDIO** on his camera lures him back (only buys time) |
| 5 | +Endo-01 | **PROGRAM** on his camera, or **Controlled Shock [X]** (60s stun, 90s recharge) |

Beat night 5 → rescue cutscene → **Custom Night** unlocks (per-character
aggression 0–10; all tools + 10 food; all-10s survival = "Golden Rubble").

## Controls

- Mouse / drag (touch): look · **Space / LMB**: flashlight · **F**: feed
- **Tab / C / RMB**: cameras · **1–8**: switch cam · in monitor: **F** flash, **Q** audio, **P** program
- **X**: controlled shock (night 5) · **P** (outside monitor) or Esc: pause
- Full touch UI appears automatically on mobile.

## Features

- EN + TR localization (auto-detects Turkish browsers; toggle on title/settings)
- localStorage save: campaign progress + food carried per night, settings,
  13 achievements, lifetime stats
- Pause menu, settings (volume, sensitivity, static intensity, subtitles,
  photosensitivity-safe mode)
- Danger-driven heartbeat, kitchen-clatter audio cues, per-character jumpscares

## Debug / QA

- URL params: `?night=N` jump to night, `?t=60` short nights, `?speed=4` time multiplier
- Console: `FN.start(n)`, `FN.custom({bonnie:10,...})`, `FN.win()`, `FN.CH`,
  `FN.save`, `FN.cutscene()`
- **Autopilot balance bot**: `await FN.autoplay(3, {speed: 8})` plays a night
  optimally and resolves `{result, food, ...}` — used to sim-verify balance.

## Architecture

```
src/i18n.js         EN+TR string tables (t(), setLang, clockLabel)
src/state.js        global G state + URL params
src/settings.js     persisted settings
src/save.js         progress, achievements, lifetime stats
src/audio.js        all WebAudio synthesis (ambience, heartbeat, screeches…)
src/world.js        ruined pizzeria scene + flicker/dust
src/animatronics.js Walker base + Bonnie/Chica/Freddy/Foxy/Endo AI, night configs
src/monitor.js      8 CCTV cams, static, FLASH/AUDIO/PROGRAM actions
src/ui.js           HUD, screens, menus, panels, toasts
src/autopilot.js    QA bot (FN.autoplay)
src/main.js         game loop, input (mouse+touch), pause, cutscene, saves
```
