/**
 * The studio's `/docs` route (#2637, owner Q300 A): `docs/public/` at the repo root, served at `/docs/` by the
 * dev server (`build.mjs --dev`) and copied to `public/docs/` by the site build (`build-site.mjs`), so the
 * same files are readable on GitHub, in dev and on the deployed site.
 *
 * One module for both, so the dev server and the deploy cannot disagree about which files `/docs` holds:
 * `docsFiles()` is the list the site build copies and checks, and `serveDocs` is what the dev server answers.
 * `REQUIRED_DOCS` names the two files an agent is pointed at and the guides' index the studio's Docs item opens
 * (#2662); the site build fails without any of them.
 */
import { createReadStream, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export const DOCS_DIR = resolve(root, '../../docs/public');
export const DOCS_ROUTE = '/docs/';
export const REQUIRED_DOCS = ['llms.txt', 'reference/commands.json', 'guides/index.md'];

const TYPES = {
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};
export const contentType = (file) => TYPES[extname(file)] ?? 'application/octet-stream';

/** Every file under `docs/public/`, as paths relative to it with `/` separators, sorted. */
export const docsFiles = () => readdirSync(DOCS_DIR, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => relative(DOCS_DIR, join(e.parentPath, e.name)).split(sep).join('/'))
  .sort();

/** What a request path names under `docs/public/`, or null when it is outside the route or outside the directory. */
const docsTarget = (urlPath) => {
  const path = decodeURIComponent(urlPath.split('?')[0]);
  if (path !== '/docs' && !path.startsWith(DOCS_ROUTE)) return null;
  const file = normalize(join(DOCS_DIR, path.slice('/docs'.length)));
  if (file !== DOCS_DIR && !file.startsWith(DOCS_DIR + sep)) return null;
  return file;
};

/** Where a directory requested without its trailing slash moves to, or null. A page served at `/docs/ecosystem`
 *  would resolve its relative `./ecosystem.json` against `/docs/`, so the slashless path redirects instead. */
export const docsRedirect = (urlPath) => {
  const [path, query] = urlPath.split(/\?(.*)/s);
  if (path.endsWith('/')) return null;
  const file = docsTarget(urlPath);
  if (!file) return null;
  try { if (statSync(file).isDirectory()) return `${path}/${query ? `?${query}` : ''}`; } catch { /* absent */ }
  return null;
};

/** The file a request path names under `docs/public/`, or null: outside the route, outside the directory, or absent.
 *  A directory answers with its `index.html` when it has one. */
export const docsPath = (urlPath) => {
  const file = docsTarget(urlPath);
  if (!file) return null;
  try {
    const st = statSync(file);
    if (st.isFile()) return file;
    if (st.isDirectory()) { const index = join(file, 'index.html'); if (statSync(index).isFile()) return index; }
  } catch { /* absent */ }
  return null;
};

/** Answer a `/docs` request and return true, or return false for a path outside the route. */
export const serveDocs = (req, res) => {
  const path = req.url.split('?')[0];
  if (path !== '/docs' && !path.startsWith(DOCS_ROUTE)) return false;
  const moved = docsRedirect(req.url);
  if (moved) { res.writeHead(301, { location: moved }); res.end(); return true; }
  const file = docsPath(req.url);
  if (!file) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end(`not found: ${path}\n`); return true; }
  res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
  return true;
};
