import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.PORT ?? 8081);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.db': 'application/octet-stream',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
};

function getFilePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const withoutBase = pathname.startsWith('/JLPT5') ? pathname.slice('/JLPT5'.length) || '/' : pathname;
  const target = normalize(join(root, withoutBase));
  if (!target.startsWith(root)) return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return join(root, 'index.html');
}

createServer((request, response) => {
  const filePath = getFilePath(request.url ?? '/');
  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': types[extname(filePath)] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Local web preview: http://localhost:${port}/JLPT5`);
});
