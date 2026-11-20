# gta6-cover-art-01

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Neon Shore** — a cover art studio that turns any photo into a movie-poster cover, in the spirit of GTA 6's multi-panel posters. It runs fully offline in a desktop browser; photos are read locally with FileReader and never uploaded anywhere.

## What it does

- **5 layouts**: Cast Grid (big hero photo + four cast panels, the hero breaking over the title), Hero Four, Full Frame, Nine Grid, and Polaroids (tilted instant prints).
- **Movie-poster language**: a quote bar with stars on top, a full-width chrome-yellow striped title in Anton with a handwritten Pacifico subtitle, a slogan, a place-and-time strip, a VOL. 1 ticket stub, and a billing block that builds itself from the cast names — plus COMING SOON, a canvas-drawn barcode, an NS mark and an EST. 2026 / ORIGINAL star badge.
- **Face-safe crop**: every panel starts framed on the upper third of its photo, where a face usually sits. Click a panel to select it, drag to move the photo inside it, scroll to zoom.
- **Cast tags**: every panel carries an editable character tag (THE CAPTAIN, THE DRIVER, …) on a black chip; renaming a character renames the billing line with them. Each cover keeps its own title, subtitle, slogan and quote — nothing is shared between covers.
- **3 colour grades**: Sunset (warm orange to pink), Neon Night (teal shadows, magenta highlights), Golden Hour (warm gold). Each grade remaps the photo's light through its own palette on canvas.
- **Any photo**: upload one or many photos, or play with the two built-in samples. Every panel can hold a different photo, a different crop of one photo, or a mirrored crop.
- **Finish**: film grain and a vignette over the whole cover.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests: scripts, styles, fonts and samples all live under `app/`.

## Export

One click downloads a PNG in any of three sizes:

- 1080 × 1080 (square post)
- 1080 × 1350 (portrait post)
- 1920 × 1080 (wide post)

## Screenshot scenes

- `?shot=cover&photo=pier` — renders one full cover, chrome hidden. Cover 1: NEON TIDE, “chasing the last light”.
- `?shot=cover&photo=boulevard` — the second cover: MIDNIGHT MILE, “the city never blinks”.
- `?shot=editor&photo=boulevard` — opens the editor with that sample photo and cover loaded.

`photo` is a sample name (`pier` or `boulevard`). `&title=` and `&subtitle=` override the cover's lettering.

## Notes

- All artwork, lettering and names in this app are original inventions (Neon Shore, Neon Tide, Midnight Mile, The Captain, The Driver). No Rockstar Games logos, artwork or fonts are used.
- Fonts are Anton and Pacifico under the SIL Open Font License — see `app/fonts/OFL.txt`.
- The two sample photos ship with the competition kit and are free to use.
