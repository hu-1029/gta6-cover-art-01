# Neon Tide Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo and a caption into a GTA 6 style cover poster, fully offline.
Pick a preset, choose one of five layouts and four colour grades, drag each
photo to reframe it, scroll to zoom, then export a PNG.

## What it does

- **Two presets** — Neon Tide and Midnight Mile, each with its own title,
  subtitle, tagline, quote, source line, location strip and six-photo cast.
- **Five layouts** — Mosaic (a 2×3 cast grid with the big title pressed
  over the hero photo), Hero Four, Full Frame, Nine Grid and Polaroids.
- **Four colour grades** — Vice Pink (default), Sunset, Neon Night and
  Golden Hour. Every grade re-skins the background, the chrome title
  gradient and the gold accents.
- **Face-safe cropping** — every cell defaults to a focal point 30% down
  from the top of the photo, so faces stay in frame. Drag to move, scroll
  to zoom, or upload your own photo to replace a cell.
- **Three exports** — 1080×1080, 1080×1350 and 1920×1080 PNG, rendered
  from the same canvas the editor shows.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080/ in a browser. Everything runs on your
own machine: the photos, fonts and app files never leave it, and the app
makes zero network requests.

Screenshot scenes (used for the dossier screenshots):

- `http://localhost:8080/?shot=cover` — the Neon Tide cover, full-bleed
- `http://localhost:8080/?shot=cover2` — the Midnight Mile cover, full-bleed

## Photos

`app/samples/` holds the two kit sample photos (boulevard, pier) and four
AI-generated cast portraits (a red-haired woman, a curly-haired woman in
sunglasses, an older man on a pier, a young man at a cafe). All six were
made for this entry and are free to use.

## Fonts

Anton and Pacifico are bundled under `app/fonts/` under the SIL Open Font
License 1.1 (see `app/fonts/OFL.txt`). No Rockstar logos, artwork or
typefaces are used anywhere in this project.
