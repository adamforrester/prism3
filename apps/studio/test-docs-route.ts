/**
 * The studio serves `docs/public/` at `/docs` (#2637, owner Q300 A).
 *
 *   npx tsx apps/studio/test-docs-route.ts
 *
 * WHAT THIS RUNS. The dev server's own `/docs` handler (`serveDocs` from `docs-route.mjs`, the function
 * `build.mjs --dev` calls before passing a request on) behind a real `node:http` server on an ephemeral port,
 * fetched over HTTP. The deployed copy is checked by `test-prod-bundle.ts`, which runs the real `build-site.mjs`.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the route. The oracle is the two URLs an agent
 * is pointed at, typed here as literals, and the bytes of the files on disk, read here with `readFileSync`: the
 * route's own file list (`docsFiles`, `REQUIRED_DOCS`) is never used to decide what to ask for.
 *
 * Mutations this fails by name: `DOCS_ROUTE` changed to `/doc/` → `GET /docs/llms.txt answers 200`; `DOCS_DIR`
 * pointed at another directory → the same two lines; the traversal guard removed from `docsPath` →
 * `GET /docs/%2e%2e/%2e%2e/package.json is refused`; the redirect dropped from `serveDocs` →
 * `GET /docs/reference redirects 301 to /docs/reference/`.
 */
import { createServer, request } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDocs } from './docs-route.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

const server = createServer((req, res) => {
  if (!serveDocs(req, res)) { res.writeHead(418); res.end('not a docs path'); }
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const { port } = server.address() as { port: number };
/** A raw GET: `fetch` would normalize `%2e%2e` away before sending, and the traversal case needs it sent as typed. */
const get = (path: string) => new Promise<{ status: number; type: string; body: Buffer }>((done, fail) => {
  const req = request({ host: '127.0.0.1', port, path, method: 'GET' }, (r) => {
    const chunks: Buffer[] = [];
    r.on('data', (c: Buffer) => chunks.push(c));
    r.on('end', () => done({ status: r.statusCode ?? 0, type: String(r.headers['content-type'] ?? ''), body: Buffer.concat(chunks) }));
  });
  req.on('error', fail);
  req.end();
});

try {
  const cases: Array<[string, string, string]> = [
    ['/docs/llms.txt', 'docs/public/llms.txt', 'text/plain'],
    ['/docs/reference/commands.json', 'docs/public/reference/commands.json', 'application/json'],
  ];
  for (const [url, file, type] of cases) {
    const r = await get(url);
    ok(r.status === 200, `GET ${url} answers 200`, `got ${r.status}`);
    ok(r.type.startsWith(type), `GET ${url} is ${type}`, `got ${r.type}`);
    ok(r.body.equals(readFileSync(join(REPO, file))), `GET ${url} is ${file}, byte for byte`);
  }
  const json = await get('/docs/reference/commands.json');
  let parsed: { mcp?: unknown[]; agentLink?: { commands?: unknown[] } } = {};
  try { parsed = JSON.parse(json.body.toString('utf8')); } catch { /* reported below */ }
  ok(Array.isArray(parsed.mcp) && Array.isArray(parsed.agentLink?.commands), 'commands.json parses and carries mcp and agentLink.commands');

  // A directory asked for without its trailing slash moves to the slash path, so a page in it resolves its
  // relative URLs inside the directory. `docs/public/reference/` is a directory on disk today; `/docs` is the root.
  for (const [path, to] of [['/docs/reference', '/docs/reference/'], ['/docs/reference?x=1', '/docs/reference/?x=1'], ['/docs', '/docs/']]) {
    const r = await new Promise<{ status: number; location: string }>((done, fail) => {
      const q = request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => { res.resume(); res.on('end', () => done({ status: res.statusCode ?? 0, location: String(res.headers.location ?? '') })); });
      q.on('error', fail);
      q.end();
    });
    ok(r.status === 301 && r.location === to, `GET ${path} redirects 301 to ${to}`, `got ${r.status} ${r.location}`);
  }
  const file = await get('/docs/llms.txt');
  ok(file.status === 200, 'a file is not redirected: GET /docs/llms.txt still answers 200', `got ${file.status}`);

  const miss = await get('/docs/no-such-file.txt');
  ok(miss.status === 404, 'GET /docs/no-such-file.txt answers 404', `got ${miss.status}`);
  for (const path of ['/docs/%2e%2e/%2e%2e/package.json', '/docs/../../package.json']) {
    const escape = await get(path);
    ok(escape.status === 404, `GET ${path} is refused`, `got ${escape.status}`);
  }
  const other = await get('/index.html');
  ok(other.status === 418, 'a path outside /docs is passed on, not answered', `got ${other.status}`);
} finally {
  server.close();
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed || executed < 15) process.exit(1);
