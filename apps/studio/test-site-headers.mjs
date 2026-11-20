/**
 * `test:site-headers` — THE DEPLOYED SITE'S SECURITY HEADERS, AND A STUDIO THAT STILL WORKS UNDER THEM (#4132).
 *
 *   npm run -w @prism3/studio test:site-headers
 *
 * `vercel.json` is the deploy's whole server config: Vercel publishes `apps/studio/public/` (written by
 * `build-site.mjs`) and adds the response headers its `headers` entries name. Until #4132 the only one was
 * `Cache-Control`, so the public page sent no Content-Security-Policy, no `nosniff` and no frame protection.
 *
 * WHAT THIS RUNS. The real `build-site.mjs`, as a child process, then a local static server over the `public/` it wrote
 * that answers each path with the headers `vercel.json` gives it: every `headers` entry whose `source` matches, applied
 * in order. `source` is read as Vercel reads a regex source, anchored (`^…$`); a source with a named `:param` is refused
 * by name rather than guessed at. No header value is restated here, so a policy edited in `vercel.json` is the policy
 * this serves.
 *
 * WHAT IT HOLDS, each by name:
 *   1. THE HEADERS, against literals typed here (the oracle is this file, not `vercel.json`): every path sends
 *      `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and a CSP with `frame-ancestors 'none'`,
 *      `object-src 'none'` and a `base-uri`; the Studio's paths send a CSP whose `script-src` is `'self'` alone, with no
 *      `'unsafe-inline'`, `'unsafe-eval'`, `data:` or wildcard; and no path gets two different values for one header
 *      from two entries, so the order Vercel merges them in cannot matter.
 *   2. THE STUDIO UNDER THAT POLICY, in Chromium, the browser enforcing it: the page boots and draws its shell, the
 *      Type page asks Google Fonts for a brand face and draws it (a fixture serves both hosts, after the CSP has let the
 *      request out), and Export downloads the component specs, which loads the `component-specs.js` chunk by
 *      `import()`. Through all of it the page reports no `securitypolicyviolation` and logs no console error.
 *   3. THE DOCS UNDER THEIR POLICY: `/docs/` and one guide page load with no violation (their inline script and style
 *      are why they carry a policy of their own).
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is `vercel.json` and the built site. The oracles are the
 * directive literals in (1), and Chromium's own CSP enforcement in (2) and (3): a policy too strict for the bundle is a
 * violation the browser raises, not one this file infers. (2) asserts the policy was really in force first — a probe
 * inline script must be refused — so a CSP that never reached the page cannot pass as "no violations".
 *
 * Mutations this fails by name: `'unsafe-inline'` dropped from the Studio's `style-src` → `/: the Studio reports no CSP
 * violation`; `https://fonts.gstatic.com` dropped from `font-src` → the same, naming font-src; the `nosniff` header
 * removed → `/dist/main.js: sends X-Content-Type-Options: nosniff`; `frame-ancestors 'none'` removed → `<path>: the CSP
 * has frame-ancestors 'none'`.
 *
 * Needs Chromium. CI runs it as the second half of `test:smoke`, in the `studio` job after the Chromium install: every
 * test file must run in a script CI runs (`lint-doc-gates.ts`, #3727), and `test:smoke` is the browser script that job
 * already has. `test:site-headers` runs it alone.
 */
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const PUB = join(HERE, 'public');

let failed = 0;
let executed = 0;
const ok = (cond, label, detail = '') => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

// ── the headers vercel.json gives a path ──────────────────────────────────────────────────────────────────────────
const vercel = JSON.parse(readFileSync(join(REPO, 'vercel.json'), 'utf8'));
const entries = (vercel.headers ?? []).map((e) => {
  if (/:[A-Za-z]/.test(e.source)) throw new Error(`vercel.json: source ${e.source} uses a named parameter, which this test does not read`);
  return { source: e.source, re: new RegExp(`^${e.source}$`), headers: e.headers };
});
/** `{ name → [values] }` for a path: every matching entry's headers, in order. Two values for one name is a finding. */
const headersFor = (path) => {
  const out = {};
  for (const e of entries) if (e.re.test(path)) for (const { key, value } of e.headers) (out[key.toLowerCase()] ??= []).push(value);
  return out;
};
const one = (h, name) => (h[name] && new Set(h[name]).size === 1 ? h[name][0] : null);
const directives = (csp) => Object.fromEntries((csp ?? '').split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
  const [name, ...values] = d.split(/\s+/);
  return [name.toLowerCase(), values];
}));

// ── 1. the headers ────────────────────────────────────────────────────────────────────────────────────────────────
const STUDIO_PATHS = ['/', '/index.html', '/dist/main.js', '/dist/component-specs.js'];
const DOCS_PATHS = ['/docs', '/docs/', '/docs/index.html', '/docs/llms.txt', '/docs/guides/theme-a-brand.html'];
for (const path of [...STUDIO_PATHS, ...DOCS_PATHS]) {
  const h = headersFor(path);
  const dup = Object.entries(h).filter(([, v]) => new Set(v).size > 1).map(([k]) => k);
  ok(dup.length === 0, `${path}: no header gets two different values from two vercel.json entries`, dup.join(', '));
  ok(one(h, 'x-content-type-options') === 'nosniff', `${path}: sends X-Content-Type-Options: nosniff`, JSON.stringify(h['x-content-type-options']));
  ok(one(h, 'x-frame-options') === 'DENY', `${path}: sends X-Frame-Options: DENY`, JSON.stringify(h['x-frame-options']));
  const csp = directives(one(h, 'content-security-policy'));
  ok(JSON.stringify(csp['frame-ancestors']) === `["'none'"]`, `${path}: the CSP has frame-ancestors 'none'`, JSON.stringify(csp['frame-ancestors']));
  ok(JSON.stringify(csp['object-src']) === `["'none'"]`, `${path}: the CSP has object-src 'none'`, JSON.stringify(csp['object-src']));
  ok(Array.isArray(csp['base-uri']) && csp['base-uri'].every((v) => v === "'none'" || v === "'self'"), `${path}: the CSP limits base-uri to 'self' or 'none'`, JSON.stringify(csp['base-uri']));
  if (STUDIO_PATHS.includes(path)) {
    ok(JSON.stringify(csp['script-src']) === `["'self'"]`, `${path}: the Studio's script-src is 'self' alone`, JSON.stringify(csp['script-src']));
    ok(Array.isArray(csp['default-src']), `${path}: the Studio's CSP has a default-src`, JSON.stringify(csp['default-src']));
  }
}

// ── the real deploy build, served with those headers ──────────────────────────────────────────────────────────────
const run = spawnSync(process.execPath, [join(HERE, 'build-site.mjs')], { cwd: HERE, encoding: 'utf8', env: { ...process.env, VERCEL_GIT_COMMIT_SHA: '' } });
ok(run.status === 0, 'build-site.mjs exits 0', `exit ${run.status}\n${(run.stderr || run.stdout || '').slice(-800)}`);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const served = [];
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(PUB, path));
  if (!file.startsWith(PUB)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  served.push(path);
  const h = headersFor(path);
  const out = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' };
  for (const [k, v] of Object.entries(h)) out[k] = v[v.length - 1];
  res.writeHead(200, out).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const woff2 = readFileSync(join(HERE, 'chrome/fonts/inter-latin-wght-normal.woff2'));
const browser = await chromium.launch();

/** A page that records every CSP violation and console error, with Google Fonts served by a fixture. */
const openPage = async () => {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const fontAsks = { css: [], files: [] };
  await ctx.route(/^https:\/\/fonts\.googleapis\.com\//, (r) => {
    fontAsks.css.push(r.request().url());
    const m = /family=([^:&]+)/.exec(r.request().url());
    const family = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : 'x';
    return r.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' },
      body: `@font-face{font-family:'${family}';font-style:normal;font-weight:400;src:url(https://fonts.gstatic.com/p3-fixture.woff2) format('woff2');}` });
  });
  await ctx.route(/^https:\/\/fonts\.gstatic\.com\//, (r) => { fontAsks.files.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: woff2 }); });
  await ctx.route((u) => !u.href.startsWith(ORIGIN) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'} at ${e.sourceFile || '?'}:${e.lineNumber}`));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, errors, fontAsks };
};
const violations = (page) => page.evaluate(() => window.__csp.slice());

// ── 2. the Studio ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errors, fontAsks } = await openPage();
  let step = 'open /';
  try {
    const res = await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    ok(!!res?.headers()['content-security-policy'], '/: the page was served with a Content-Security-Policy');
    // The policy is in force: an inline script, which a 'self'-only script-src refuses, must not run.
    step = 'the inline probe';
    const ran = await page.evaluate(() => {
      window.__inlineRan = false;
      const s = document.createElement('script');
      s.textContent = 'window.__inlineRan = true';
      document.head.append(s);
      return window.__inlineRan;
    });
    ok(ran === false, '/: the CSP is in force (an inline script is refused)');
    await page.evaluate(() => { window.__csp = window.__csp.filter((v) => !/^script-src(-elem)? blocked inline/.test(v)); });
    // The probe's own refusal is the one expected report: Chromium logs it to the console and fires one violation.
    const probeLogged = errors.filter((m) => /inline script violates/.test(m)).length;
    ok(probeLogged === 1, `/: the refused probe is reported once (${probeLogged} console report(s))`);
    errors.splice(0, errors.length, ...errors.filter((m) => !/inline script violates/.test(m)));

    step = 'the shell draws';
    await page.locator('[data-p3="frame"]').waitFor({ timeout: 30000 });
    await page.locator('[data-p3="rail-export"]').waitFor({ timeout: 30000 });
    ok(true, '/: the Studio boots and draws its shell under the CSP');
    step = 'the start screen opens an example';
    await page.locator('[data-p3="start-example"]').first().click({ timeout: 30000 });
    await page.locator('[data-p3="start-screen"]').waitFor({ state: 'detached', timeout: 15000 });

    step = 'the Type page asks Google Fonts';
    await page.locator('[data-p3="tab-type"]').click();
    await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'type', null, { timeout: 15000 });
    await page.waitForFunction(() => [...document.querySelectorAll('style')].some((s) => s.dataset.p3WebFont), null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    const webFaces = await page.evaluate(() => [...document.querySelectorAll('style')].filter((s) => s.dataset.p3WebFont).map((s) => s.dataset.p3WebFont));
    ok(fontAsks.css.length > 0 && webFaces.length > 0, `/: the Type page's web font stylesheet is fetched and installed (${fontAsks.css.length} request(s), installed ${JSON.stringify(webFaces)})`);
    ok(fontAsks.files.length > 0, `/: the web face file is fetched from fonts.gstatic.com (${fontAsks.files.length} request(s))`);

    step = 'Export downloads the component specs';
    await page.locator('[data-p3="rail-export"]').click();
    await page.locator('[data-p3="export-page"]').waitFor({ timeout: 15000 });
    await page.locator('#p3-export-tab-component-specs').click();
    const chunk = page.waitForResponse((r) => new URL(r.url()).pathname === '/dist/component-specs.js', { timeout: 30000 });
    const download = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('[data-p3="export-page"] [data-p3="dialog-confirm"]').click();
    ok((await chunk).ok(), '/: Download loads the component specs chunk by import()');
    ok(!!(await download).suggestedFilename(), '/: the component specs download');

    const v = await violations(page);
    ok(v.length === 0, '/: the Studio reports no CSP violation', v.slice(0, 4).join(' | '));
    ok(errors.length === 0, '/: 0 console errors', errors.slice(0, 3).join(' | '));
  } catch (e) {
    ok(false, `/: the run stopped at "${step}"`, String(e?.message ?? e).split("\n").slice(0, 12).join("\n      "));
  } finally { await ctx.close(); }
}

// ── 3. the docs ───────────────────────────────────────────────────────────────────────────────────────────────────
for (const path of ['/docs/', '/docs/guides/theme-a-brand.html']) {
  const { ctx, page, errors } = await openPage();
  try {
    const res = await page.goto(`${ORIGIN}${path}`, { waitUntil: 'load' });
    ok(res?.status() === 200 && !!res.headers()['content-security-policy'], `${path}: served with a Content-Security-Policy`);
    await page.waitForTimeout(300);
    const v = await violations(page);
    ok(v.length === 0, `${path}: the page reports no CSP violation`, v.slice(0, 4).join(' | '));
    ok(errors.length === 0, `${path}: 0 console errors`, errors.slice(0, 3).join(' | '));
  } catch (e) {
    ok(false, `${path}: the page did not load`, String(e?.message ?? e).split('\n')[0]);
  } finally { await ctx.close(); }
}

await browser.close();
server.close();

// Represented, not counted: every path the header arm names was really served, or is a file the build writes.
for (const p of [...STUDIO_PATHS, ...DOCS_PATHS].filter((p) => extname(p))) {
  ok(existsSync(join(PUB, p)), `${p} is a file the site build writes (so its headers arm reads a real path)`);
}
console.log(failed ? `\n${failed} of ${executed} failed` : `\nsite headers: ${executed}/${executed} pass`);
process.exit(failed ? 1 : 0);
