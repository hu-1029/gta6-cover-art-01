# Neon Tide Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and caption into a GTA 6 poster-style cover, right in the
browser. No uploads, no account, no network: the photos never leave the
device and the app loads zero external resources.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a preset (Neon Tide or Midnight Mile), or load your own photo, drag it
to place the face, scroll to zoom, edit every line of copy, then export a
PNG in 1080 &times; 1080, 1080 &times; 1350 or 1920 &times; 1080.

## What it makes

A multi-panel poster in the style of the GTA 6 key art: a big hero photo
with a role tag, a quote bar with stars and a press source, a full-width
striped chrome title with a handwritten subtitle, a tagline, a row of cast
panels, a billing block (A NEON SHORE PICTURE, STARRING …) and a COMING SOON
footer with a barcode and an EST. 2026 ORIGINAL starburst.

- **5 layouts**: Cast Grid (hero + 4 cast panels), Hero Four, Full Frame,
  Nine Grid and Polaroids.
- **3 colour grades**: Sunset, Neon Night and Golden Hour.
- **Face-safe crops**: each panel keeps its face centred (the focus sits
  30% down the panel by default); drag any photo to reposition it, scroll
  to zoom, and edit every role label.
- **Two built-in presets** with their own copy: NEON TIDE (pier fisherman,
  "chasing the last light") and MIDNIGHT MILE (boulevard driver,
  "the city never blinks").

## Files

| File | What it does |
|---|---|
| `app/index.html` | The editor page: preview canvas, layout/grade/copy panels |
| `app/style.css` | Dark neon editor styling, Anton + Pacifico `@font-face` |
| `app/src/cover.js` | The cover renderer: layouts, crops, title, billing, export |
| `app/src/grades.js` | The three colour grades |
| `app/src/main.js` | Editor wiring: presets, inputs, drag/zoom, upload, `?shot=` scenes |
| `app/fonts/` | Anton + Pacifico (SIL Open Font License, see `OFL.txt`) |
| `app/samples/` | The two kit sample photos |
| `main.ts` | Hands the app in: copies `app/` + `screenshots/`, writes `dossier.json` |
| `serve.ts` | Tiny static server for local tries (`:8080`) |

Everything is original work: no Rockstar Games logo, artwork or font is
used anywhere. The two fonts are SIL OFL licensed and ship under `app/fonts/`.
