// Tiny static server for Neon Tide — Cover Studio.
// Serves app/ on :8080 so the editor runs locally with no build step.
// Plain JavaScript on purpose: no type annotations, so node --check passes.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "app");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:8080");
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end("not found");
  }
});

const port = Number(process.env.PORT || 8080);
server.listen(port, () => {
  console.log(`Neon Tide cover studio at http://localhost:${port}/`);
});
