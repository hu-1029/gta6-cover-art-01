// main.ts — entry point for the gta6-cover-art-01 submission.
// Copies the app and screenshots into the output directory and writes
// the submission dossier (dossier.json) with buildDossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || "/output";

mkdirSync(out, { recursive: true });
cpSync(join(here, "app"), join(out, "app"), { recursive: true });

mkdirSync(join(out, "screenshots"), { recursive: true });
if (existsSync(join(here, "screenshots"))) {
  cpSync(join(here, "screenshots"), join(out, "screenshots"), {
    recursive: true,
  });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

// buildDossier returns the dossier as UTF-8 JSON bytes (a Uint8Array),
// so write those bytes out directly — stringifying them would turn the
// byte array into an object of numeric keys.
writeFileSync(join(out, "dossier.json"), dossier);

// Tell the runner where the artefacts landed.
console.log(`dossier written to ${join(out, "dossier.json")}`);
