// Neon Shore — the entrypoint (Node 22).
// Copies app/ and screenshots/ into the output directory and writes
// dossier.json with the kit's buildDossier, so the judge can read the app.
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repo = resolve(fileURLToPath(new URL("./", import.meta.url)));
const out = process.env.MAKEFUN_OUTPUT_DIR || "/output";

mkdirSync(out, { recursive: true });
cpSync(join(repo, "app"), join(out, "app"), { recursive: true });
cpSync(join(repo, "screenshots"), join(out, "screenshots"), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

// buildDossier hands back the dossier's raw bytes: write them as they are,
// never through JSON.stringify.
writeFileSync(join(out, "dossier.json"), dossier);
console.log("dossier written to " + join(out, "dossier.json"));
