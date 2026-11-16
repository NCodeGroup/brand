// The specimen server the by-hand tools in tools/ use. It needs no Playwright, so the tests run it: it serves the files
// inside the repository under the strict Content-Security-Policy, and answers a request it cannot serve with an error
// instead of stopping.
import assert from 'node:assert/strict';
import { basename } from 'node:path';
import { after, before, test } from 'node:test';
import { CSP, ROOT, serve } from '../tools/serve.mjs';

let server;
// A request that gets no answer fails the test instead of holding it open.
const get = (path) => fetch(`${server.url}${path}`, { signal: AbortSignal.timeout(5000) });
before(async () => {
  server = await serve();
});
after(() => server.close());

test('a request target that names no file is answered 400, and the server keeps serving', async () => {
  assert.equal((await get('/%E0%A4%A')).status, 400);
  assert.equal((await get('//')).status, 400);
  const page = await get('/specimens/foundations.html');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('content-security-policy'), CSP);
});

test("a path outside the repository is refused, even a sibling whose name starts with the repository folder's", async () => {
  assert.equal((await get(`/..%2f${basename(ROOT)}-sibling/file.txt`)).status, 403);
});
