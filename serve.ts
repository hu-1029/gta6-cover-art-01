// Neon Shore — a tiny static server for the studio, port 8080.
// Serves only the files under app/, nothing else on the machine.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./app", import.meta.url)));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost:8080");
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = resolve(join(root, normalize(path).replace(/^(\.\.[/\\])+/, "")));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(8080, () => {
  console.log("Neon Shore studio at http://localhost:8080");
});
