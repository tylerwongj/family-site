// Local preview of the site folder (the live site is plain files on GitHub Pages; this server is never published).
//   node server.mjs            -> http://localhost:6790
//   PORT=6791 node server.mjs  -> a spare copy (block 6791-6799, see shared-ai-context/PORTS.md)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('./site/', import.meta.url));
const PORT = Number(process.env.PORT) || 6790;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

async function resolve(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);
  if (!(file + sep).startsWith(ROOT)) return null; // stays inside site/
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) return (await stat(join(file, 'index.html')).catch(() => null)) ? join(file, 'index.html') : null;
  return info?.isFile() ? file : null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  // Folder links without a trailing slash break relative paths; GitHub Pages redirects them too.
  if (!extname(pathname) && !pathname.endsWith('/') && await resolve(pathname)) {
    res.writeHead(301, { Location: pathname + '/' }).end();
    return;
  }
  const file = await resolve(pathname).catch(() => null);
  const target = file || join(ROOT, '404.html');
  res.writeHead(file ? 200 : 404, { 'Content-Type': TYPES[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(await readFile(target));
}).listen(PORT, '::', () => console.log(`Family Site preview: http://localhost:${PORT}`));
