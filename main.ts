import { buildDossier } from './vendor/makefun-app.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// buildDossier's first argument is the repository directory: it reads
// app/ and screenshots/ from beside this file and returns the dossier.
const repoDir = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || 'out';
mkdirSync(out, { recursive: true });
const dossierBytes = buildDossier(repoDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000
});
writeFileSync(join(out, 'dossier.json'), dossierBytes);
console.log('dossier written: ' + join(out, 'dossier.json') + ' (' + dossierBytes.length + ' bytes)');
