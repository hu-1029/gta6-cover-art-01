// Neon Tide — Cover Studio: entrypoint (Node 22, standard library only).
// Copies app/ and screenshots/ beside this file into the output directory
// and writes dossier.json with the vendored make.fun library. The scorer
// runs this file byte for byte on the submitted commit and requires the
// dossier to match what buildDossier writes from app/ and screenshots/.
//
// Run locally with MAKEFUN_OUTPUT_DIR set, e.g.:
//   MAKEFUN_OUTPUT_DIR=/tmp/gta6-verify-v4 node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(out, { recursive: true });
cpSync(join(here, "app"), join(out, "app"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(join(here, "screenshots"))) {
  cpSync(join(here, "screenshots"), join(out, "screenshots"), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the other caps refuse an entry the scorer would refuse (more
// than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
// 48 MiB of app files in all; a path under app/ over 1000 bytes).
// buildDossier returns raw Uint8Array bytes: write them as-is, never
// JSON.stringify them.
writeFileSync(
  join(out, "dossier.json"),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
