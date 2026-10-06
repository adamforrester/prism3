/**
 * live-css-sweep — the preload `lint-live-css.mjs --accept` runs each browser suite under (#2201).
 *
 *   node --import apps/studio/live-css-sweep.mjs <suite>.mjs   (env: LIVE_CSS_KEYS, LIVE_CSS_OUT, LIVE_CSS_SUITE)
 *
 * It wraps `chromium.launch` so every context the suite opens gets an init script, in every frame, that
 * reports which `styles.css` rule keys match an element of the document. That is the oracle the gate's
 * baseline is made of, and it is independent of the stylesheet: the DOM is drawn by the app's TypeScript,
 * and a selector is tested against it whether or not its rule is still in the sheet. The suite runs
 * unchanged. The preload adds no page, no click and no assertion, so it vouches for exactly the states
 * the suites already reach and nothing more.
 *
 * WHAT COUNTS AS LIVE. A key is live when, in a frame that installed `styles.css` (recognized by the
 * sheet's own fingerprint, so a fixture page carrying another sheet does not count), its selector
 * matches an element while every enclosing `@media` and `@supports` condition holds. Hidden elements
 * count: a `display:none` rule is live by hiding. Dynamic pseudo-classes and pseudo-elements are
 * stripped before matching (`.x:hover` and `.x::after` are live when `.x` is drawn), because no suite
 * holds a pointer over every element and the rule is reachable the moment one does. A `@container`
 * condition cannot be evaluated from outside its container, so it counts as holding; that errs toward
 * protecting a rule, never toward dropping one. A selector the browser cannot evaluate even stripped is
 * reported as untestable and also counts as live, for the same reason.
 *
 * WHEN IT LOOKS: on load, after every batch of DOM mutations, every 400ms, on resize, and once more
 * just before any page, context or browser closes, so the last state of every page is read too.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = await import(join(REPO, 'node_modules/playwright/index.mjs'));
const { keys, fingerprint } = JSON.parse(readFileSync(process.env.LIVE_CSS_KEYS, 'utf8'));
const SUITE = process.env.LIVE_CSS_SUITE, FORCED_HOST = process.env.LIVE_CSS_HOST || null;
const seen = {}, coverage = {}, untestable = new Set();
let framesWithSheet = 0;

const init = ({ keys, fingerprint, forcedHost }) => {
  const DYNAMIC = /::?(?:hover|focus-visible|focus-within|focus|active|visited|target|before|after|placeholder|selection|marker|first-line|first-letter|backdrop|-webkit-[a-z-]+|-moz-[a-z-]+)(?![a-z-])/g;
  const pending = new Set(keys.map((_, i) => i));
  let installed = null, counted = false;
  const sheetHere = () => {
    if (installed) return true;
    for (const s of document.styleSheets) {
      let r; try { r = s.cssRules; } catch { continue; }
      // A PREFIX, not the whole sheet: the build installs ONE <style> holding styles.css followed by
      // chrome.css (1083 rules, of which styles.css's are the first n). Matching the whole sheet saw no
      // frame at all on the first accept, and the accept refused by name rather than writing a baseline.
      if (r.length >= fingerprint.n && r[0]?.cssText === fingerprint.first && r[fingerprint.n - 1]?.cssText === fingerprint.last) { installed = s; return true; }
    }
    return false;
  };
  const holds = ([kind, cond]) => kind === 'media' ? matchMedia(cond).matches : kind === 'supports' ? CSS.supports(cond) : true;
  const check = () => {
    if (!document.documentElement || !sheetHere()) return;
    const host = forcedHost ?? (location.pathname.startsWith('/plugin') || location.pathname.endsWith('ui.html') ? 'figma' : 'web');
    const cs = getComputedStyle(document.documentElement).colorScheme;
    const scheme = /dark/.test(cs) || document.documentElement.classList.contains('figma-dark') ? 'dark' : 'light';
    if (!counted) { counted = true; window.__liveCssFrame?.(host, scheme); }
    const hits = [], bad = [];
    for (const i of pending) {
      const k = keys[i];
      if (!k.conds.every(holds)) continue;
      let m;
      const stripped = k.sel.replace(DYNAMIC, '').replace(/(^|[\s>+~(,])(?=$|[\s>+~),])/g, '$1*');
      try { m = document.querySelector(stripped); }
      catch { try { m = document.querySelector(k.sel); } catch { bad.push(k.key); m = true; } }
      if (m) { hits.push(k.key); pending.delete(i); }
    }
    if (hits.length) window.__liveCssHit?.(hits, host, scheme, bad);
  };
  window.__liveCssCheck = check;
  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(check, 60); }).observe(document, { subtree: true, childList: true, attributes: true });
  addEventListener('DOMContentLoaded', check);
  addEventListener('load', check);
  addEventListener('resize', check);
  setInterval(check, 400);
};

const finalCheck = async (p) => { if (p.isClosed()) return; for (const f of p.frames()) { try { await f.evaluate(() => window.__liveCssCheck?.()); } catch { /* a detached frame has nothing left to read */ } } };

const instrument = async (ctx) => {
  await ctx.exposeBinding('__liveCssHit', (src, hits, host, scheme, bad) => {
    for (const k of hits) seen[k] ??= { suite: SUITE, host, scheme, url: (src.frame?.url() ?? '').replace(/^https?:\/\/[^/]+/, '').slice(0, 80) };
    for (const k of bad) untestable.add(k);
  });
  await ctx.exposeBinding('__liveCssFrame', (_src, host, scheme) => { framesWithSheet++; coverage[`${host}|${scheme}`] = (coverage[`${host}|${scheme}`] ?? 0) + 1; });
  await ctx.addInitScript(init, { keys, fingerprint, forcedHost: FORCED_HOST });
  ctx.on('page', (p) => { const close = p.close.bind(p); p.close = async (...a) => { await finalCheck(p); return close(...a); }; });
  const cclose = ctx.close.bind(ctx);
  ctx.close = async (...a) => { for (const p of ctx.pages()) await finalCheck(p); return cclose(...a); };
  return ctx;
};

const launch = chromium.launch.bind(chromium);
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...a) => instrument(await newContext(...a));
  browser.newPage = async (...a) => (await browser.newContext(...a)).newPage();
  const bclose = browser.close.bind(browser);
  browser.close = async (...a) => { for (const c of browser.contexts()) for (const p of c.pages()) await finalCheck(p); return bclose(...a); };
  return browser;
};

process.on('exit', () => {
  writeFileSync(process.env.LIVE_CSS_OUT, JSON.stringify({ suite: SUITE, seen, coverage, framesWithSheet, untestable: [...untestable] }));
});
