/**
 * The guard on the browser suites' `data-p3` hooks (F1).
 *
 * `test-smoke.mjs` here, and `apps/plugin/test-build-verdict.mjs` and `apps/plugin/test-start-screen.mjs`,
 * LOCATE every element by a `data-p3="<role>"` attribute that `src/main.ts` mints through `hook()`. Class
 * names and section titles are free to change in a redesign; the hooks are the contract that does not.
 * A contract nobody checks rots quietly, and a hook that stops rendering fails in the worst possible way
 * for a browser suite — as a 30-second timeout that names a selector, or as a `querySelector` that
 * returns null and turns an assertion vacuous. So each suite runs this guard, and a hook it uses that
 * never rendered fails BY NAME.
 *
 * ── independence (docs/34) ───────────────────────────────────────────────────────────────────
 *
 * The two sides are:
 *   · EXPECTED — the hooks the SUITE uses, read from the suite's own source text: every literal
 *     `data-p3="<role>"` in the file. Never from `src/main.ts`: a list scanned out of the subject would
 *     shrink the moment a hook was deleted there, and agree with the deletion (shape 1).
 *   · ACTUAL — every `data-p3` value that reached the rendered DOM during the run, recorded in the page
 *     by a MutationObserver installed before the app boots, so a hook that renders only for a moment
 *     (a pending pill, a confirm) is still seen.
 * The comparison is one-way on purpose: the app may mint hooks no suite uses yet; a suite may not use a
 * hook the app does not render.
 *
 * Prefix selectors (`[data-p3^="rail-page-"]`) are not in EXPECTED, because they name a family rather
 * than a role. A suite that relies on one should also name at least one member literally.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HOOK_LITERAL = /data-p3="([a-z0-9]+(?:-[a-z0-9]+)*)"/g;

/** The guard for one suite. `suiteUrl` is the suite's own `import.meta.url`. */
export const hookGuard = (suiteUrl) => {
  const src = readFileSync(fileURLToPath(suiteUrl), 'utf8');
  const used = [...new Set([...src.matchAll(HOOK_LITERAL)].map((m) => m[1]))].sort();
  const seen = new Set();

  /** Record every hook this page renders. Call once per Page, before its first `goto`. */
  const watch = async (page) => {
    await page.exposeFunction('__p3Saw', (roles) => { for (const r of roles) seen.add(r); });
    await page.addInitScript(() => {
      const told = new Set();
      const tell = (node) => {
        if (node.nodeType !== 1) return;
        const fresh = [];
        const visit = (n) => {
          const r = n.getAttribute('data-p3');
          if (r && !told.has(r)) { told.add(r); fresh.push(r); }
        };
        visit(node);
        for (const n of node.querySelectorAll('[data-p3]')) visit(n);
        if (fresh.length) window.__p3Saw(fresh);
      };
      new MutationObserver((records) => {
        for (const rec of records) {
          if (rec.type === 'attributes') tell(rec.target);
          else for (const n of rec.addedNodes) tell(n);
        }
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-p3'] });
    });
  };

  /** Wait for a hooked element, and fail naming the hook rather than as a bare timeout. */
  const need = async (page, selector, opts = {}) => {
    try {
      return await page.waitForSelector(selector, { timeout: 10000, ...opts });
    } catch {
      const roles = [...selector.matchAll(HOOK_LITERAL)].map((m) => `"${m[1]}"`).join(', ') || selector;
      throw new Error(`data-p3 hook ${roles} did not appear in the rendered DOM (waited for ${selector}). `
        + 'A hook removed or renamed in apps/studio/src/main.ts fails here; restore it, or move the suite to the new name.');
    }
  };

  /** The end-of-run check: every hook this suite names was rendered at least once. */
  const report = (ok) => {
    ok(used.length > 0, `the hook guard read ${used.length} data-p3 hook(s) from the suite's own source`);
    ok(seen.size > 0, `the hook guard saw ${seen.size} data-p3 hook(s) rendered — it is watching the pages`);
    const missing = used.filter((r) => !seen.has(r));
    for (const r of missing) ok(false, `data-p3 hook "${r}" is used by this suite but never appeared in the rendered DOM`);
    console.log(`  data-p3 hooks: ${used.length - missing.length} of ${used.length} used by this suite were rendered.`);
  };

  /** The role a literal hook selector names — so a suite can compare a probe's reading against a hook it
   *  spells as a selector, which is the spelling EXPECTED is read from. */
  const role = (selector) => {
    const m = /^\[data-p3="([a-z0-9-]+)"\]$/.exec(selector);
    if (!m) throw new Error(`not a single data-p3 hook selector: ${selector}`);
    return m[1];
  };

  return { used, watch, need, report, role };
};
