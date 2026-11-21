# Neon Tide Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun)
[![rank](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/gta6-cover-art-01/reward.svg)](https://make.fun)

Turn any photo and caption into a GTA 6 poster-style cover, right in the
browser. No uploads, no account, no network: the photos never leave the
device and the app loads zero external resources.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a preset (**Neon Tide** or **Midnight Mile**), drag a photo to reframe
it, scroll to zoom, edit the copy, then export a PNG.

## What it makes

- **Five layouts**: Cast Grid (big hero photo + four cast cells), Hero Four,
  Full Frame, Nine Grid and Polaroids.
- **Face-safe cropping**: the crop window defaults to the face (measured at
  30% from the top of each sample photo) so no one loses their head; drag to
  reframe, scroll to zoom.
- **Poster furniture**: quote bar with stars and source, striped chrome
  title, handwritten subtitle, tagline, location and time strip, VOL. 1
  ticket, billing block generated from the visible cast labels, barcode,
  NS mark and an EST. 2026 ORIGINAL seal.
- **Three colour grades**: Sunset, Neon Night and Golden Hour.
- **Three export sizes**: 1080×1080, 1080×1350 and 1920×1080 PNG.

## Files

- `app/index.html` — editor shell (header, preview canvas, controls).
- `app/style.css` — dark neon editor styling and the cover-only shot mode.
- `app/src/cover.js` — the cover render engine (layouts, cropping, title,
  billing, barcode, grain and vignette).
- `app/src/grades.js` — the three colour grades.
- `app/src/main.js` — editor wiring: presets, inputs, drag and wheel
  cropping, `?shot=` scenes and PNG export.
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License (see
  `app/fonts/OFL.txt`).
- `app/samples/` — the two bundled sample photos (pier, boulevard).
- `main.ts` — copies `app/` and `screenshots/` to the output directory and
  writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local use (`:8080`).

## Licence

MIT. Fonts are under the SIL Open Font License 1.1. This project is not
affiliated with Rockstar Games and uses no Rockstar logo, artwork or font.
