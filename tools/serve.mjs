// A static file server for the tools in this folder: it serves the repository on a free port chosen by the operating
// system, under a strict Content-Security-Policy, default-src 'self'. Node.js built-ins only.
//   import { serve } from './serve.mjs';  const { url, close } = await serve();
//   node tools/serve.mjs                  serves until interrupted, and prints the address of the site
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CSP = "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.png': 'image/png', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

/**
 * Starts the server. `pages` maps a path such as "/__probe" to HTML served from memory, and `rewrite` may change the
 * text of a file before it is served (tools/browser-check.mjs serves tokens.css as an older browser reads it).
 */
export function serve({ root = ROOT, pages = {}, rewrite = null } = {}) {
  return new Promise((resolve) => {
    const server = createServer(async (request, response) => {
      const headers = { 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
      let pathname;
      let file;
      try {
        ({ pathname } = new URL(request.url, 'http://localhost'));
        file = path.normalize(path.join(root, decodeURIComponent(pathname === '/' ? '/index.html' : pathname)));
      } catch {
        // A request target that is no address, such as "//", or that holds a malformed percent-escape, such as
        // "/%E0%A4%A", names no file: it is answered, so the server keeps serving.
        response.writeHead(400, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
        return response.end('bad request');
      }
      if (pathname in pages) {
        response.writeHead(200, { ...headers, 'Content-Type': TYPES['.html'] });
        return response.end(pages[pathname]);
      }
      // Inside the served folder only: a sibling whose name starts with the folder's is outside it.
      if (!file.startsWith(path.join(root, path.sep))) {
        response.writeHead(403, headers);
        return response.end();
      }
      try {
        const data = await readFile(file);
        response.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
        response.end(rewrite ? rewrite(pathname, data) ?? data : data);
      } catch {
        response.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${server.address().port}`;
      resolve({ url, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await serve();
  console.log(`Serving ${ROOT} at ${url}/ (Ctrl+C stops it)`);
}
