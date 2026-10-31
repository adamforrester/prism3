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
 *
 * GUIDE PAGES (#3176, Q3176.3 A). `guides/<name>.html` is drawn from `guides/<name>.md` (`docs-markdown.mjs`). The
 * oracle is the `.md` files on disk, listed and parsed here with this file's own patterns, never the renderer's:
 *   · every guide renders: 200, HTML, its `<h1>` is the `.md`'s `#` line, and its text has no markdown left in it;
 *   · every link on every guide page resolves over HTTP, and a `#fragment` names an id on the page it points at;
 *   · the guide list in each page's nav is `index.md`'s numbered list, in its order;
 *   · each screenshot placeholder is a captioned frame, and each `>` line a labeled plugin message;
 *   · the site build (`build-site.mjs`, run here as a child process) writes the same bytes the dev server answers,
 *     and neither serves the `_page.html` template.
 * Mutations this fails by name: the table branch removed from `renderMarkdown` → `guides/<name>.html has no markdown
 * left in its text` for every guide with a table; `.md` links no longer rewritten → `every link on guides/<name>.html
 * resolves`; the nav reversed → `nav lists the guides in index.md's order`; the site build writing its own render →
 * `public/docs/guides/<name>.html is what GET … answers, byte for byte`. Also read off the `.md` and `index.md`:
 * single-`*` italics left as stars → `converts every *italic* span`; numbered lists drawn as `<ul>` → `draws its N
 * numbered step(s) in an <ol>`; "On this page" not drawn → `draws "On this page" from its N ## heading(s)`;
 * Previous and Next swapped → `Previous and Next follow index.md's order`; the bold pass closing inside `***` →
 * `article tags nest well formed` (build-components).
 */
import { createServer, request } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
    // The landing page the studio's and the plugin's Docs links open (#2637 Q384): the route's root answers it.
    ['/docs/', 'docs/public/index.html', 'text/html'],
    // The landing page's Guides entry (#2662).
    ['/docs/guides/index.md', 'docs/public/guides/index.md', 'text/markdown'],
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
  // ── Guide pages (#3176) ──────────────────────────────────────────────────────────────────────────
  const GUIDES = join(REPO, 'docs/public/guides');
  const names = readdirSync(GUIDES).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => f.slice(0, -3)).sort();
  ok(names.length >= 10, `docs/public/guides holds ${names.length} guides (floor 10)`);
  const order = [...readFileSync(join(GUIDES, 'index.md'), 'utf8').matchAll(/^\d+\. \[[^\]]+\]\(([\w-]+)\.md\)/gm)].map((m) => `${m[1]}.html`);
  ok(order.length === 8, `index.md lists ${order.length} guides in its numbered list (expected 8)`);
  const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<(\/?)(p|li|h\d|td|th|tr|figcaption|blockquote|div)\b[^>]*>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const MARKDOWN = /\*\*|`|\]\(|^\s*#{1,6} |\|\s*:?-{3}|^\s*\|.*\|\s*$|^\s*> |\*\[|^\s*- |<!--/m;
  const pages = new Map<string, string>();
  for (const n of names) {
    const r = await get(`/docs/guides/${n}.html`);
    const html = r.body.toString('utf8');
    pages.set(n, html);
    ok(r.status === 200 && r.type.startsWith('text/html'), `GET /docs/guides/${n}.html answers 200 text/html`, `got ${r.status} ${r.type}`);
    const md = readFileSync(join(GUIDES, `${n}.md`), 'utf8');
    const h1 = /^# (.+)$/m.exec(md)?.[1].replace(/[`*]/g, '') ?? '';
    const got = /<h1>([\s\S]*?)<\/h1>/.exec(html)?.[1].replace(/<[^>]+>/g, '') ?? '';
    ok(h1.length > 0 && got === h1, `guides/${n}.html's heading is the .md's "# ${h1}"`, `got "${got}"`);
    const left = MARKDOWN.exec(text(html));
    ok(!left && !html.includes('<!--'), `guides/${n}.html has no markdown left in its text`, left ? `found "${left[0].trim()}" in …${text(html).slice(Math.max(0, (left.index ?? 0) - 60), (left.index ?? 0) + 60).replace(/\s+/g, ' ')}…` : 'an HTML comment reached the page');
    const crumb = /<span class="crumb">([\s\S]*?)<\/span>/.exec(html)?.[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() ?? '';
    ok(crumb === (n === 'index' ? '/ Guides' : `/ Guides / ${h1}`), `guides/${n}.html's breadcrumb names the page`, `got "${crumb}"`);
    const shots = [...md.matchAll(/^\*\[Screenshot placeholder: (.+)\]\*$/gm)].map((m) => m[1]);
    const frames = [...html.matchAll(/<figure class="shot">[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption><\/figure>/g)].map((m) => m[1].toLowerCase());
    ok(frames.length === shots.length && shots.every((c, i) => frames[i] === c.toLowerCase()), `guides/${n}.html draws its ${shots.length} screenshot placeholder(s) as captioned frames`, `captions ${JSON.stringify(frames)}`);
    const items = (md.replace(/<!--[\s\S]*?-->/g, '').match(/^(?:-|\d+\.) /gm) ?? []).length;
    const lis = ((/<main[\s\S]*?<\/main>/.exec(html)?.[0] ?? '').match(/<li>/g) ?? []).length;
    ok(lis === items, `guides/${n}.html draws its ${items} list item(s) as list items`, `got ${lis} <li>`);
    const quotes = (md.match(/^> /gm) ?? []).length;
    const msgs = (html.match(/<figcaption>Plugin message<\/figcaption><blockquote>/g) ?? []).length;
    ok(msgs === quotes, `guides/${n}.html labels its ${quotes} quoted line(s) as plugin messages`, `got ${msgs}`);
    const nav = /<nav class="gnav"[\s\S]*?<ol>([\s\S]*?)<\/ol>/.exec(html)?.[1] ?? '';
    const navOrder = [...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    ok(JSON.stringify(navOrder) === JSON.stringify(order), `guides/${n}.html's nav lists the guides in index.md's order`, `got ${navOrder.join(', ')}`);
    const main = /<main[\s\S]*?<\/main>/.exec(html)?.[0] ?? '';
    const prose = text(main.replace(/<code>[\s\S]*?<\/code>/g, ''));
    const star = /\*/.exec(prose);
    ok(!star, `guides/${n}.html converts every *italic* span: no * left in its text`, star ? `found "*" in …${prose.slice(Math.max(0, (star.index ?? 0) - 60), (star.index ?? 0) + 60).replace(/\s+/g, ' ')}…` : '');
    const stack: string[] = [];
    const misnested: string[] = [];
    for (const [, close, tag] of main.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/g)) {
      if (/^(br|hr|img|meta|link|input|wbr)$/.test(tag)) continue;
      if (!close) { stack.push(tag); continue; }
      const top = stack.pop();
      if (top !== tag) { misnested.push(`</${tag}> closes <${top}>`); break; }
    }
    if (!misnested.length && stack.length) misnested.push(`<${stack.join('>, <')}> never closed`);
    ok(misnested.length === 0, `guides/${n}.html's article tags nest well formed`, misnested.join('; '));
    const bare = md.replace(/<!--[\s\S]*?-->/g, '');
    const spans = (bare.match(/`[^`\n]+`/g) ?? []).length;
    const codes = (main.match(/<code>/g) ?? []).length;
    ok(codes === spans, `guides/${n}.html draws its ${spans} inline code span(s) as <code>`, `got ${codes} <code>${main.includes('&lt;code&gt;') ? ', and <code> escaped as text' : ''}`);
    const steps = (bare.match(/^\d+\. /gm) ?? []).length;
    const olItems = [...main.matchAll(/<ol>([\s\S]*?)<\/ol>/g)].reduce((t, m) => t + (m[1].match(/<li>/g) ?? []).length, 0);
    ok(olItems === steps, `guides/${n}.html draws its ${steps} numbered step(s) in an <ol>`, `got ${olItems} <li> in <ol>`);
    const h2s = [...bare.matchAll(/^## (.+)$/gm)].map((m) => m[1].replace(/[`*]/g, '').trim());
    const tocAside = /<aside class="toc"[\s\S]*?<\/aside>/.exec(html)?.[0] ?? '';
    const toc = [...tocAside.matchAll(/<a href="#[^"]+">([\s\S]*?)<\/a>/g)].map((m) => text(m[1]).trim());
    const wantToc = h2s.length > 1 ? h2s : [];
    ok(/On this page/.test(tocAside) === wantToc.length > 0 && JSON.stringify(toc) === JSON.stringify(wantToc), `guides/${n}.html draws "On this page" from its ${h2s.length} ## heading(s)`, `got ${JSON.stringify(toc)}`);
    const at = order.indexOf(`${n}.html`);
    const pager = /<nav class="pager"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
    const prevHref = /<a class="prev" href="([^"]+)"><small>Previous<\/small>/.exec(pager)?.[1] ?? null;
    const nextHref = /<a class="next" href="([^"]+)"><small>Next<\/small>/.exec(pager)?.[1] ?? null;
    const wantPrev = at > 0 ? order[at - 1] : null, wantNext = at >= 0 && at < order.length - 1 ? order[at + 1] : null;
    ok(prevHref === wantPrev && nextHref === wantNext, `guides/${n}.html's Previous and Next follow index.md's order`, `got Previous ${prevHref}, Next ${nextHref}; expected ${wantPrev}, ${wantNext}`);
  }
  for (const n of names) {
    const html = pages.get(n) ?? '';
    const broken: string[] = [];
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^[a-z]+:/.test(href)) continue;
      const url = new URL(href.replace(/&amp;/g, '&'), `http://docs.test/docs/guides/${n}.html`);
      let target = url.pathname === `/docs/guides/${n}.html` ? html : null;
      if (target === null) {
        const r = await get(url.pathname);
        if (r.status !== 200) { broken.push(`${href} → ${r.status}`); continue; }
        target = r.body.toString('utf8');
      }
      if (url.hash && !target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) broken.push(`${href} → no id "${url.hash.slice(1)}"`);
    }
    ok(broken.length === 0, `every link on guides/${n}.html resolves`, broken.join('; '));
  }
  const tpl = await get('/docs/guides/_page.html');
  ok(tpl.status === 404, 'GET /docs/guides/_page.html is refused: the template is not a page', `got ${tpl.status}`);
  const landing = (await get('/docs/')).body.toString('utf8');
  const landingGuides = [...landing.matchAll(/<ul class="glist"[\s\S]*?<\/ul>/g)].flatMap((m) => [...m[0].matchAll(/href="guides\/([^"]+)"/g)].map((x) => x[1]));
  ok(JSON.stringify(landingGuides) === JSON.stringify(order), "the landing page lists the guide pages in index.md's order", `got ${landingGuides.join(', ')}`);

  // The deploy: the real site build, as a child process, writes the bytes the dev server answers.
  const build = spawnSync(process.execPath, [join(HERE, 'build-site.mjs')], { cwd: HERE, encoding: 'utf8', env: { ...process.env, VERCEL_GIT_COMMIT_SHA: '' } });
  ok(build.status === 0, 'build-site.mjs exits 0', `exit ${build.status}\n${(build.stderr || build.stdout || '').slice(-800)}`);
  for (const n of names) {
    const built = join(HERE, 'public/docs/guides', `${n}.html`);
    const served = (await get(`/docs/guides/${n}.html`)).body;
    ok(existsSync(built) && readFileSync(built).equals(served), `public/docs/guides/${n}.html is what GET /docs/guides/${n}.html answers, byte for byte`);
  }
  ok(!existsSync(join(HERE, 'public/docs/guides/_page.html')), 'the site build does not publish the _page.html template');

  const other = await get('/index.html');
  ok(other.status === 418, 'a path outside /docs is passed on, not answered', `got ${other.status}`);
} finally {
  server.close();
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed || executed < 100) process.exit(1);
