# gta6-cover-art-01

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/hu-1029/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

**Neon Shore** — a cover art studio that turns any photo into a poster-style cover, in the spirit of GTA 6's multi-panel posters: bold condensed lettering, a sunset or neon colour grade, film grain and a star badge. It runs fully offline in a desktop browser; photos are read locally with FileReader and never uploaded anywhere.

## What it does

- **4 layouts**: Hero Four (big hero photo + three panels), Full Frame (one photo edge to edge), Nine Grid (3×3 mosaic), Polaroids (three tilted instant prints).
- **3 colour grades**: Sunset (warm orange to pink), Neon Night (teal shadows, magenta highlights), Golden Hour (warm gold). Each grade remaps the photo's luminance through its own palette on canvas.
- **Any photo**: upload one or many photos, or play with the two built-in samples. Click a panel to select it, drag to move the photo inside it, scroll to zoom, click a thumbnail to swap the photo in the selected panel.
- **Caption**: big Anton lettering with a gradient fill and outline, plus a Pacifico handwritten sub-caption. Size is adjustable; text auto-fits and wraps.
- **Finish**: film grain, vignette, halftone dots, and an "EST. 2026 / ORIGINAL" star badge — all toggleable.

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

- `?shot=cover&photo=pier&caption=Sunset%20Heist` — renders one full cover, chrome hidden.
- `?shot=editor&photo=boulevard&caption=Boulevard%20Queen` — opens the editor with that sample photo and caption loaded.

`photo` is a sample name (`boulevard` or `pier`).

## Notes

- All artwork, lettering and names in this app are original inventions (Neon Shore, Sunset Heist, Boulevard Queen). No Rockstar Games logos, artwork or fonts are used.
- Fonts are Anton and Pacifico under the SIL Open Font License — see `app/fonts/OFL.txt`.
- The two sample photos ship with the competition kit and are free to use.
