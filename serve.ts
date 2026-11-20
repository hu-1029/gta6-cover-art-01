// serve.ts — tiny static server for local testing.
// Serves the app/ directory on http://localhost:8080 using only the
// Node standard library. Run: node serve.ts
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = join(here, "app");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer((req, res) => {
  const raw = decodeURIComponent((req.url || "/").split("?")[0]);
  const safe = normalize(join(root, raw === "/" ? "index.html" : raw));
  if (!safe.startsWith(root) || !existsSync(safe) || !statSync(safe).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found\n");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(safe).toLowerCase()] || "application/octet-stream",
  });
  createReadStream(safe).pipe(res);
});

server.listen(8080, () => {
  console.log("Neon Shore cover studio at http://localhost:8080");
});
