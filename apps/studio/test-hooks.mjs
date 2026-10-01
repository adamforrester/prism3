/**
 * The guard on the browser suites' `data-p3` hooks (F1).
 *
 * `test-smoke.mjs` and `mode-audit.mjs` here, and `apps/plugin/test-build-verdict.mjs` and
 * `apps/plugin/test-start-screen.mjs`, LOCATE every element by a `data-p3="<role>"` attribute that
 * `src/main.ts` mints through `hook()`. Class names and section titles are free to change in a redesign;
 * the hooks are the contract that does not. A contract nobody checks rots quietly, and a hook that stops
 * rendering fails in the worst possible way for a browser suite — as a 30-second timeout that names a
 * selector, or as a `querySelector` that returns null and turns an assertion vacuous. So each suite runs
 * this guard, and a hook NAME it uses that never rendered anywhere in the run fails BY NAME.
 *
 * ── what the guard proves, and what it does not (#1831) ──────────────────────────────────────
 *
 * It proves a NAME, once per run. It keeps one "seen" set for the whole run, so a hook minted at several
 * render sites (`status-pill` has nine) passes the guard while ANY one of them still renders. Dropping the
 * hook at one site is therefore caught only by the suite's own checks at that site — and a check that
 * something is ABSENT cannot catch it, because an empty lookup is exactly what it passes on. So the guard
 * does not make every lookup non-vacuous; two rules carry the rest, and neither is the name count:
 *   · ABSENCE CHECKS GO THROUGH `absent()`, which takes a proof, from the same test, that the probe is
 *     looking at the state it tests (it saw the pill during the build; the error surface is mounted). A
 *     false proof fails the check by its own name as NOT MEASURED instead of letting it pass on nothing.
 *     This one is a convention: nothing here can recognize an absence check in a suite's source, so
 *     review is its guard.
 *   · EVERY `.click(` GOES THROUGH `click()`, which waits through `need()` first. A plain Playwright click
 *     on a missing hook dies as a TimeoutError that takes the run down before `report()`; through `need()`
 *     it fails naming the hook. This one IS enforced: `checkClicks` refuses, by line, any `.click(` in a
 *     suite's code that is not `hooks.click(`. Other actions (`fill`, `selectOption`, `setInputFiles`) and
 *     unbounded hooked waits are not routed yet and still fail as a TimeoutError naming their selector (#1888).
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
 * than a role. A suite that relies on one must also name at least one member literally; `checkSpellings`
 * refuses it otherwise, and refuses any spelling of `data-p3` that EXPECTED cannot read.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HOOK_LITERAL = /data-p3="([a-z0-9]+(?:-[a-z0-9]+)*)"/g;

/** Every spelling of `data-p3` a suite may use. EXPECTED is read from the first one only, so any other
 *  spelling — `[data-p3=role]`, `[data-p3='role']`, a selector built by concatenation — would name a hook
 *  the guard never learns about: drop that hook and the suite's lookup goes vacuous while the guard stays
 *  green. So an unrecognized spelling is refused outright, by line, rather than silently uncounted. */
const SPELLINGS = [
  /^data-p3="[a-z0-9]+(?:-[a-z0-9]+)*"/, // a literal hook: the only spelling EXPECTED is read from
  /^data-p3\^="[a-z0-9]+(?:-[a-z0-9]+)*-"/, // a family prefix; must also name one member literally (below)
  /^data-p3="\$\{/, // a template whose value was read off the rendered DOM at run time
  /^data-p3'\)/, // getAttribute('data-p3'): reads a hook, names none
  /^data-p3`/, // the attribute's name in prose
];
const FAMILY = /data-p3\^="([a-z0-9-]+)"/g;

/** Refuse a suite source that spells a hook any way EXPECTED cannot see, and a family prefix with no
 *  member named literally (a prefix alone names no role, so the guard would check nothing for it). */
const checkSpellings = (src, file) => {
  const bad = [];
  for (const m of src.matchAll(/data-p3/g)) {
    const rest = src.slice(m.index, m.index + 80);
    if (!SPELLINGS.some((re) => re.test(rest))) {
      const line = src.slice(0, m.index).split('\n').length;
      bad.push(`${file}:${line}: ${rest.split('\n')[0]}`);
    }
  }
  if (bad.length) {
    throw new Error(`data-p3 spelled in a form the hook guard cannot read — write it as data-p3="<role>":\n  ${bad.join('\n  ')}`);
  }
  const literals = [...src.matchAll(HOOK_LITERAL)].map((m) => m[1]);
  for (const [, prefix] of src.matchAll(FAMILY)) {
    if (!literals.some((r) => r.startsWith(prefix))) {
      throw new Error(`${file}: the hook family data-p3^="${prefix}" is used, but no member of it is named literally, `
        + 'so the guard checks nothing for it. Name at least one member as data-p3="<role>".');
    }
  }
};

/** Refuse any Playwright click that does not go through `hooks.click` (#1831). A plain `.click(` on a
 *  hook that stopped rendering throws a TimeoutError, which ends the run before `report()` prints, and
 *  every check after it never runs. Scanned over CODE only: a line that is wholly a comment is skipped,
 *  and so is a trailing `// …`, so prose may still say `.click()`. Counted per call, not per hook, so a
 *  click on a locator held in a variable is caught too. */
const checkClicks = (src, file) => {
  const bad = [];
  src.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
    const code = line.replace(/(^|\s)\/\/.*$/, '');
    if (/(?<!\bhooks)\.click\(/.test(code)) bad.push(`${file}:${i + 1}: ${t}`);
  });
  if (bad.length) {
    throw new Error('a click that bypasses the hook guard — write it as hooks.click(<locator>), which waits through '
      + `need() and fails naming the hook instead of crashing the run as a TimeoutError:\n  ${bad.join('\n  ')}`);
  }
};

/** The guard for one suite. `suiteUrl` is the suite's own `import.meta.url`. */
export const hookGuard = (suiteUrl) => {
  const file = fileURLToPath(suiteUrl);
  const src = readFileSync(file, 'utf8');
  checkSpellings(src, file);
  checkClicks(src, file);
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

  /** Wait for a hooked element, and fail naming the hook rather than as a bare timeout. `target` is a
   *  selector string, or a Playwright Locator (its description carries the hook literals it was built from,
   *  filters and scoping included), so a filtered or scoped lookup is named the same way. */
  const need = async (page, target, opts = {}) => {
    const isSelector = typeof target === 'string';
    try {
      if (isSelector) return await page.waitForSelector(target, { timeout: 30000, ...opts });
      return await target.first().waitFor({ timeout: 30000, ...opts });
    } catch {
      const desc = isSelector ? target : String(target);
      const roles = [...desc.matchAll(HOOK_LITERAL)].map((m) => `"${m[1]}"`).join(', ') || desc;
      throw new Error(`data-p3 hook ${roles} did not appear in the rendered DOM (waited for ${desc}). `
        + 'A hook removed or renamed in apps/studio/src/main.ts fails here; restore it, or move the suite to the new name.');
    }
  };

  /** Click a hooked element through `need()` (#1831): wait for it first, so a hook that never renders fails
   *  naming the hook, then click with Playwright's own semantics (strict unless the locator says `.first()`).
   *  `opts.timeout` bounds both the wait and the click. `checkClicks` refuses any other spelling of a click. */
  const click = async (locator, opts = {}) => {
    await need(locator.page(), locator, opts.timeout === undefined ? {} : { timeout: opts.timeout });
    return locator.click(opts);
  };

  /** An ABSENCE check (#1831). `proof.seen` is whether this same test has shown that the probe can see the
   *  thing, in the state the check is about; `proof.state` says what that was, in words. Without it an
   *  empty lookup is not a measurement — a hook dropped at this one render site reads as "absent" and
   *  passes — so an unproven absence fails, under its own label, as NOT MEASURED. */
  const absent = (ok, proof, isAbsent, label) => {
    ok(proof.seen && isAbsent, proof.seen ? label : `${label} — NOT MEASURED: this test never saw ${proof.state}`);
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

  return { used, watch, need, click, absent, report, role };
};
