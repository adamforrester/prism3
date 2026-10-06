/**
 * test-live-css — what `lint-live-css.mjs` must and must not report, on the real stylesheet (#2234).
 *
 *   node apps/studio/test-live-css.mjs     # run by `npm run -w @prism3/studio lint:live-css`, after the gate
 *
 * Each case edits the TEXT of `apps/studio/src/styles.css` in memory, parses it with the gate's own Chromium
 * `parse()`, and compares it with the committed baseline through the gate's `compare()`. Nothing is written.
 * EXPECTED is literal: the keys, and the property names, typed here.
 *
 *   - Two edits that remove nothing, and that keying rules by ordinal reported as "lost …": a same-selector
 *     rule inserted above `.sg-g3{grid-template-columns:…}`, and the two live `.tpill` rules swapped.
 *   - The removal #2201 exists for: `.sg-g3` losing `grid-template-columns`. Still a failure, named by its key.
 *     Also with an insert and with a swap in the same edit, because those are the cases matching could, if it
 *     were wrong, use to hide a loss.
 *   - A dead rule removed (`.faint`, drawn by no page at the last accept): still not flagged.
 *
 * Each target is found by its literal text, and a case fails by name if its text is not there exactly as
 * expected, so a moved or reworded rule fails here rather than quietly testing nothing (docs/34 shape 9).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compare } from './lint-live-css.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(HERE, 'src/styles.css'), 'utf8');
const baseline = JSON.parse(readFileSync(join(HERE, 'live-css.json'), 'utf8'));

let failed = 0, run = 0;
const ok = (cond, label) => { run++; if (cond) return; failed++; console.error(`  ✗ ${label}`); };

/** The one top-level rule whose whole text is `text`, starting a line. Fails the case by name otherwise. */
const at = (src, text, label) => {
  const hits = [...src.matchAll(new RegExp(`(^|\\n)${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'))];
  ok(hits.length === 1, `${label}: the stylesheet holds \`${text.slice(0, 60)}\` exactly once at the start of a line (found ${hits.length})`);
  return hits.length === 1 ? hits[0].index + hits[0][1].length : -1;
};
const ruleText = (sel) => { const m = new RegExp(`(^|\\n)(${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^{}]*\\})`, 'g'); return [...css.matchAll(m)].map((x) => x[2]); };

const SG = '.sg-g3{grid-template-columns:repeat(3,1fr)}';
const [TP1, TP2] = ruleText('.tpill');
const DEAD = ruleText('.faint')[0];

// Preconditions, so every case below is about what it says it is about.
ok(baseline.live['.sg-g3 #1']?.props?.includes('grid-template-columns'), 'precondition: the baseline holds .sg-g3 #1, live, declaring grid-template-columns');
ok(!!TP1 && !!TP2 && ruleText('.tpill').length === 2, `precondition: two top-level .tpill rules (found ${ruleText('.tpill').length})`);
ok(TP1 && TP2 && baseline.live['.tpill #1'] && baseline.live['.tpill #2']
  && !baseline.live['.tpill #1'].props.some((p) => baseline.live['.tpill #2'].props.includes(p)),
  'precondition: .tpill #1 and #2 are live and share no property (the issue\'s swap)');
ok(!!DEAD && baseline.dead.includes('.faint #1') && !baseline.live['.faint #1'], 'precondition: .faint #1 is a dead rule in the baseline, written once in the stylesheet');

const report = async (src) => compare(baseline, await parse(src));
const clean = (r) => r.removed.length === 0 && r.shrunk.length === 0;
const said = (r) => JSON.stringify({ removed: r.removed.map((x) => x.key), shrunk: r.shrunk.map((x) => `${x.key} lost ${x.lost.join('+')}`) });

{ // 0. unedited: nothing to report (the gate's own run says the same; this pins the test's baseline)
  const r = await report(css);
  ok(clean(r) && r.unprotected.length === 0, `unedited: no live rule removed or shrunk, none unprotected — ${said(r)}, unprotected ${r.unprotected.length}`);
}
{ // 1. insert a same-selector rule above .sg-g3's
  const i = at(css, SG, 'insert');
  if (i >= 0) {
    const r = await report(`${css.slice(0, i)}.sg-g3{align-items:start}\n${css.slice(i)}`);
    ok(clean(r), `insert: a new .sg-g3 rule above the existing one removes nothing and is not reported — ${said(r)}`);
    ok(r.unprotected.length === 1 && r.unprotected[0].startsWith('.sg-g3 #'), `insert: the inserted rule, and only it, is counted unprotected (${JSON.stringify(r.unprotected)})`);
  }
}
{ // 2. swap the two .tpill rules
  if (TP1 && TP2) {
    const swapped = css.replace(TP1, '\u0000').replace(TP2, TP1).replace('\u0000', TP2);
    ok(swapped !== css && ruleText.call(null, '.tpill') && swapped.indexOf(TP2) < swapped.indexOf(TP1), 'swap: the edit landed (the second .tpill rule now comes first)');
    const r = await report(swapped);
    ok(clean(r) && r.unprotected.length === 0, `swap: two .tpill rules that share no property, swapped, report nothing — ${said(r)}, unprotected ${r.unprotected.length}`);
  }
}
{ // 3. the removal #2201 exists for, alone and inside the two edits matching handles
  const i = at(css, SG, 'deletion');
  if (i >= 0) {
    const emptied = css.replace(SG, '.sg-g3{}');
    const r1 = await report(emptied);
    ok(r1.shrunk.some((x) => x.key === '.sg-g3 #1' && x.lost.includes('grid-template-columns')) && r1.removed.length === 0,
      `deletion: .sg-g3 losing grid-template-columns fails, named ".sg-g3 #1 lost grid-template-columns" — ${said(r1)}`);
    const r2 = await report(css.replace(SG, ''));
    ok(r2.removed.some((x) => x.key === '.sg-g3 #1'), `deletion: the whole .sg-g3 rule removed fails, named ".sg-g3 #1" — ${said(r2)}`);
    const r3 = await report(`${emptied.slice(0, i)}.sg-g3{align-items:start}\n${emptied.slice(i)}`);
    ok(r3.shrunk.some((x) => x.key === '.sg-g3 #1' && x.lost.includes('grid-template-columns')),
      `deletion + insert: an inserted .sg-g3 rule does not hide the lost grid-template-columns — ${said(r3)}`);
  }
  if (TP1 && TP2) {
    const lessColor = TP1.replace(/;color:var\(--faint\)/, '');
    ok(lessColor !== TP1, 'deletion + swap: the first .tpill rule declares color, so the edit landed');
    const r4 = await report(css.replace(TP1, '\u0000').replace(TP2, lessColor).replace('\u0000', TP2));
    ok(r4.shrunk.some((x) => x.key === '.tpill #1' && x.lost.includes('color')),
      `deletion + swap: swapping the .tpill rules does not hide the first one's lost color — ${said(r4)}`);
  }
}
{ // 4. a dead rule removed
  if (DEAD) {
    const r = await report(css.replace(DEAD, ''));
    ok(clean(r), `dead removal: deleting .faint, drawn by no page, is not flagged — ${said(r)}`);
  }
}

console.log(`test-live-css: ${run - failed}/${run} assertions passed.`);
process.exit(failed ? 1 : 0);
