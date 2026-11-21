// A tiny static server for app/ (Node 22, standard library only), so the
// Neon Tide cover studio can be tried locally without a build step:
// `node serve.ts` serves app/ on http://localhost:8080. It sends the MIME
// types an offline web app needs, refuses any path outside app/, and
// otherwise does nothing clever. Pure JavaScript, no type annotations.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) || 8080 : Number(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

const server = createServer(function (req, res) {
  var urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  var filePath = resolve(join(root, normalize(urlPath)));
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  var st;
  try {
    st = statSync(filePath);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  if (!st.isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  var type = TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type });
  createReadStream(filePath).pipe(res);
});

server.listen(port, function () {
  console.log('Neon Tide Cover Studio on http://localhost:' + port + '/');
});
