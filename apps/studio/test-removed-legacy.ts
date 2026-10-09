/**
 * What H12 removed stays removed (#2289, owner PG1 A and Q107 A).
 *
 *   npx tsx apps/studio/test-removed-legacy.ts
 *
 * H12 deleted the plugin's Pages menu, the old Style guide page it opened, and the legacy page path that page was the
 * last user of: the legacy frame, the legacy workspace and its mode strip, the rail data (`NAV`) and the legacy page
 * keys. Nothing else stops one of them coming back: a page renderer copied from an old branch would compile against the
 * types that are left, and the browser suites would only notice it if it drew. So three surfaces are scanned for the
 * names below, and a reference fails here, naming the file, the line and the name:
 *   · every `.ts` file under `apps/studio/src` and `apps/plugin/src`: identifiers and string literals, including a
 *     `data-p3="<role>"` inside a string (a selector the source queries by, as `agent-link-ui.ts` does);
 *   · every `.css` file in `apps/studio/src` (`chrome.css`, `styles.css`): the SELECTORS only, for a removed hook
 *     (`[data-p3="legacy-frame"]`), a removed class (`.p3-legacy`) or a removed attribute value
 *     (`[data-layout="legacy"]`). `lint:live-css` does not cover `chrome.css`, and a dead selector draws nothing, so
 *     no browser suite would see one come back (#2333);
 *   · every `test-*.mjs` browser suite in `apps/studio` and `apps/plugin`: the `data-p3` hooks in its string
 *     literals, which is where every hook a suite locates or clicks is spelled (`test-hooks.mjs` refuses any other
 *     spelling).
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the source on disk. The oracle is the literal
 * lists below, written here from what H12 deleted, never read from the source, so a name re-added under the same
 * spelling cannot shrink them. The match is on parsed source, not on text: IDENTIFIERS and STRING LITERALS (the
 * TypeScript scanner, for `.ts` and `.mjs` alike) and CSS rule PRELUDES (a tokenizer of its own that skips comments,
 * strings and declaration blocks). So a comment recording the history (most of the files above carry one) is not a
 * reference, and a hook minted as a string, a selector, or a function or type spelled as code, is.
 *
 * NON-VACUOUS, and REPRESENTED rather than counted (docs/34 "In practice", question 3). Each detector runs first on a
 * fixture that holds every name and must report every one. Then each SURFACE is held separately: the list in step 4
 * names every surface literally, apart from the walks that decide what is read, and each must have been read and must
 * have held at least one hook (for `styles.css`, which has no hook selector, at least one class selector). So a walk
 * that stops reading `chrome.css`, or a parser that stops seeing its selectors, fails by the surface's name; a total
 * file count would not move enough to notice. `chrome.css` holds ONE hook selector today (`[data-p3="sg-group"]`); if a
 * real edit removes it, move that row to `class` and say why in it, never drop the row.
 *
 * EXEMPTIONS: none today. A reference that must stay (an absence check that names a removed hook, say) goes in
 * `EXEMPT` below with its file, its name and its reason, and an exemption that no longer matches anything fails, so the
 * list cannot outlive what it excuses. The guard's own lists live in this file, which no surface reads.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
let executed = 0, failed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) { console.log(`  ✓ ${label}`); return; }
  failed++;
  console.error(`  ✗ ${label}`);
};

/** Code names H12 deleted: the Pages menu, the old page, the rail data and the legacy page path. */
const REMOVED_IDENTIFIERS = [
  'renderPagesMenu', 'renderNavMenu', 'pagesOutsideBound', 'navMenuOpen', 'railNav', 'isFirstView', 'NAV',
  'renderStyleGuidePage', 'syncStyleGuideRow', 'styleGuideOptions', 'STYLE_GUIDE_LABEL', 'PAGE_RENDERERS', 'PAGE_COPY',
  'renderApplyStatus', 'MENU_LEGACY', 'LegacyPageKey', 'legacyOf', 'legacyPage',
  'renderWorkspace', 'renderModeStrip', 'renderModeContext', 'modeStripHost', 'setVolatile', 'paintVolatile',
  'chromedWorkspace', 'attachModeBadges', 'reconcileRegions',
];
/** Hooks H12 deleted, as the strings that minted them. `rail-page-` is the rail rows' family prefix. */
const REMOVED_HOOKS = ['pages-menu', 'pages-menu-list', 'rail-item-label', 'legacy-frame', 'legacy-page', 'style-guide-row', 'style-guide-customize', 'style-guide-draw', 'mode-strip'];
const REMOVED_PREFIXES = ['rail-page-'];

/** Class names H12 deleted with the legacy frame, the Pages menu and the mode strip (#2333). Only the names that
 *  belonged to those structures: the generic ones the same sweep removed as dead (`.hero`, `.lede`, `.shell`, …) are
 *  words a new rule may fairly reuse, and `lint:live-css` holds `styles.css`'s live rules. */
const REMOVED_CLASSES = [
  'p3-legacy', 'brandmenu', 'navmenu', 'nav-item', 'bm-cap', 'bm-div', 'stage-t', 'rail-note',
  'modebar', 'modectx', 'mctx-modes', 'mctx-cap', 'mctx-b', 'mctx-vo', 'applystat', 'barmenu-wrap',
];
/** Attribute values H12 deleted: the frame never sets `data-layout="legacy"` any more. */
const REMOVED_ATTRIBUTES: [string, string][] = [['data-layout', 'legacy']];

/** References allowed to stay, each by file, name and reason. Empty today; see the header. */
const EXEMPT: { file: string; name: string; reason: string }[] = [];

type Hit = { file: string; line: number; name: string };
const removedHook = (v: string): boolean => REMOVED_HOOKS.includes(v) || REMOVED_PREFIXES.some((p) => v.startsWith(p));

/** `.ts` and `.mjs`: identifiers and string literals, through the TypeScript scanner. `hooks` counts what the file
 *  mints or names as a hook (a `hook(el, '<role>')` call, a `data-p3="<role>"` in a string), for step 4. */
const scan = (file: string, src: string, kind = ts.ScriptKind.TS): { hits: Hit[]; hooks: number } => {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
  const hits: Hit[] = [];
  let hooks = 0;
  const at = (n: ts.Node, name: string) => hits.push({ file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, name });
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && REMOVED_IDENTIFIERS.includes(n.text)) at(n, n.text);
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'hook' && n.arguments[1]
      && (ts.isStringLiteral(n.arguments[1]) || ts.isNoSubstitutionTemplateLiteral(n.arguments[1]) || ts.isTemplateExpression(n.arguments[1]))) hooks++;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (REMOVED_HOOKS.includes(n.text)) at(n, `'${n.text}'`);
      for (const p of REMOVED_PREFIXES) if (n.text.startsWith(p)) at(n, `'${n.text}'`);
    }
    // A template's head and spans (`rail-page-${key}`) carry the prefix too.
    if (ts.isTemplateExpression(n)) for (const p of REMOVED_PREFIXES) if (n.head.text.startsWith(p)) at(n, `\`${n.head.text}…\``);
    // A hook inside a string: a selector a suite locates by, `[data-p3="legacy-frame"]`, or markup minting one.
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      for (const m of n.text.matchAll(/data-p3\s*[~|^$*]?=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        const v = m[1] ?? m[2];
        hooks++;
        if (removedHook(v)) at(n, `data-p3="${v}"`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { hits, hooks };
};

/** CSS: the rule preludes (selectors), with comments, strings outside a prelude and declaration blocks skipped. A
 *  prelude is the text before a `{`, back to the previous `{`, `}` or `;`, so a rule inside `@media` and a nested rule
 *  are read the same way; an at-rule's own prelude (`@media (…)`) is not a selector and is skipped. */
const selectors = (src: string): { line: number; text: string }[] => {
  const out: { line: number; text: string }[] = [];
  let pre = '', preAt = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 1; pre += ' '; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      if (preAt < 0) preAt = i;
      pre += src.slice(i, j + 1); i = j; continue;
    }
    if (c === '{') {
      const text = pre.trim();
      if (text && !text.startsWith('@')) out.push({ line: src.slice(0, preAt).split('\n').length, text });
      pre = ''; preAt = -1; continue;
    }
    if (c === '}' || c === ';') { pre = ''; preAt = -1; continue; }
    if (preAt < 0 && !/\s/.test(c)) preAt = i;
    pre += c;
  }
  return out;
};
const ATTR = /\[\s*([\w-]+)\s*([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+))\s*(?:[iIsS]\s*)?\]/g;
const scanCss = (file: string, src: string): { hits: Hit[]; hooks: number; classes: number } => {
  const hits: Hit[] = [];
  let hooks = 0, classes = 0;
  for (const { line, text } of selectors(src)) {
    for (const m of text.matchAll(ATTR)) {
      const [name, v] = [m[1], m[3] ?? m[4] ?? m[5]];
      if (name === 'data-p3') { hooks++; if (removedHook(v)) hits.push({ file, line, name: `[data-p3="${v}"]` }); }
      if (REMOVED_ATTRIBUTES.some(([a, val]) => a === name && val === v)) hits.push({ file, line, name: `[${name}="${v}"]` });
    }
    for (const m of text.replace(/\[[^\]]*\]/g, ' ').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      classes++;
      if (REMOVED_CLASSES.includes(m[1])) hits.push({ file, line, name: `.${m[1]}` });
    }
  }
  return { hits, hooks, classes };
};

const bare = (name: string) => name.replace(/^data-p3="|^\[data-p3="|^\[|^['`.]|"\]$|"$|\]$|['`…]+$/g, '');

console.log('\n0. The detectors see every name (planted fixtures)');
{
  const fixture = [
    ...REMOVED_IDENTIFIERS.map((n) => `const ${n} = 0;`),
    ...REMOVED_HOOKS.map((h) => `hook(el, '${h}');`),
    ...REMOVED_PREFIXES.map((p) => 'hook(el, `' + p + '${key}`);'),
    '// renderPagesMenu, in a comment, is history and not a reference',
  ].join('\n');
  const found = new Set(scan('fixture.ts', fixture).hits.map((h) => bare(h.name)));
  const missed = [...REMOVED_IDENTIFIERS, ...REMOVED_HOOKS].filter((n) => !found.has(n));
  ok(missed.length === 0, `the fixture's ${REMOVED_IDENTIFIERS.length} names and ${REMOVED_HOOKS.length} hooks are all reported${missed.length ? ` — missed ${missed.join(', ')}` : ''}`);
  ok(REMOVED_PREFIXES.every((p) => [...found].some((f) => f.startsWith(p))), `a template hook with a removed prefix is reported (${REMOVED_PREFIXES.join(', ')})`);
  ok(scan('comment.ts', '// renderPagesMenu, pages-menu\n/* legacyOf */').hits.length === 0, 'a comment naming them is not a reference');

  // CSS: every removed hook, prefix, class and attribute as a selector, inside @media and in a selector list too; and
  // the same names in a comment, a declaration (quoted, and unquoted before a nested rule) and an at-rule prelude,
  // none of which is a selector.
  const css = [
    ...REMOVED_HOOKS.map((h, i) => (i % 2 ? `.p3-x [data-p3='${h}'] > b { color: red; }` : `[data-p3="${h}"]{color:red}`)),
    ...REMOVED_PREFIXES.map((p) => `@media (max-width: 600px) { .a, [data-p3^="${p}"] { display: none; } }`),
    ...REMOVED_CLASSES.map((c, i) => (i % 2 ? `.p3-frame:has(> .${c}) { display: none; }` : `.x,\n.${c}.on { gap: 0; }`)),
    ...REMOVED_ATTRIBUTES.map(([a, v]) => `.p3-frame[${a}="${v}"]:not([data-inspect=""]) { inset: 0; }`),
    `/* [data-p3="legacy-frame"] .p3-legacy, a comment */ .live::after { content: '} .brandmenu [data-p3="mode-strip"] {'; }`,
    `@supports selector(.navmenu) { .live { background: url(icons.modebar.svg); & .ok { color: red; } } }`,
  ].join('\n');
  const cssHits = scanCss('fixture.css', css).hits;
  const cssFound = new Set(cssHits.map((h) => bare(h.name)));
  const cssWant = [...REMOVED_HOOKS, ...REMOVED_CLASSES, ...REMOVED_ATTRIBUTES.map(([a, v]) => `${a}="${v}`)];
  const cssMissed = cssWant.filter((n) => !cssFound.has(n));
  ok(cssMissed.length === 0, `the CSS fixture's ${REMOVED_HOOKS.length} hooks, ${REMOVED_CLASSES.length} classes and ${REMOVED_ATTRIBUTES.length} attribute value are all reported as selectors${cssMissed.length ? ` — missed ${cssMissed.join(', ')}` : ''}`);
  ok(REMOVED_PREFIXES.every((p) => [...cssFound].some((f) => f.startsWith(p))), `a CSS hook selector with a removed prefix is reported (${REMOVED_PREFIXES.join(', ')})`);
  const notSel = cssHits.filter((h) => h.line >= css.split('\n').length - 1);
  ok(notSel.length === 0, `a comment, a declaration and an at-rule prelude naming them are not selectors${notSel.length ? ` — reported ${notSel.map((h) => h.name).join(', ')}` : ''}`);

  // A browser suite: a hook it locates, one it clicks, a family prefix and one built in a template, and the same in a
  // comment, which is not a reference.
  const mjs = [
    ...REMOVED_HOOKS.map((h, i) => (i % 2 ? `await hooks.click(page.locator('[data-p3="${h}"]'));` : `await hooks.need(page, "[data-p3='${h}']");`)),
    ...REMOVED_PREFIXES.map((p) => 'const rows = page.locator(`[data-p3^="' + p + '"] ${sel}`);'),
    '// await hooks.click(page.locator(\'[data-p3="legacy-frame"]\'));',
  ].join('\n');
  const mjsFound = new Set(scan('fixture.mjs', mjs, ts.ScriptKind.JS).hits.map((h) => bare(h.name)));
  const mjsMissed = REMOVED_HOOKS.filter((n) => !mjsFound.has(n));
  ok(mjsMissed.length === 0, `the suite fixture's ${REMOVED_HOOKS.length} hooks are all reported, located or clicked${mjsMissed.length ? ` — missed ${mjsMissed.join(', ')}` : ''}`);
  ok(REMOVED_PREFIXES.every((p) => [...mjsFound].some((f) => f.startsWith(p))), `a suite's family selector with a removed prefix is reported (${REMOVED_PREFIXES.join(', ')})`);
  ok(scan('comment.mjs', '// [data-p3="legacy-frame"]\n/* hooks.click(\'[data-p3="pages-menu"]\') */', ts.ScriptKind.JS).hits.length === 0, "a suite's comment naming a hook is not a reference");
}

/** What each surface's walk actually read, keyed by surface. Step 4 reads this, never the walks' own inputs. */
const read = new Map<string, { files: string[]; hooks: number; classes: number }>();
const record = (surface: string, file: string, hooks: number, classes = 0) => {
  const r = read.get(surface) ?? { files: [], hooks: 0, classes: 0 };
  r.files.push(file); r.hooks += hooks; r.classes += classes;
  read.set(surface, r);
};
const hits: Hit[] = [];
const exempt = (h: Hit) => EXEMPT.some((e) => e.file === h.file && e.name === h.name);
const verdict = (found: Hit[], label: string) => {
  hits.push(...found);
  const mine = found.filter((h) => !exempt(h));
  ok(mine.length === 0, `${label}${mine.length ? ` — ${mine.slice(0, 8).map((h) => `${h.file}:${h.line} ${h.name}`).join(' | ')}` : ''}`);
};

console.log('\n1. No source names what H12 removed');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && !p.endsWith('.d.ts') ? [p] : [];
});
const files = [join(REPO, 'apps/studio/src'), join(REPO, 'apps/plugin/src')].flatMap(walk);
const rel = files.map((f) => relative(REPO, f));
const MUST_READ = ['apps/studio/src/main.ts', 'apps/studio/src/shell/frame.ts', 'apps/studio/src/shell/bar.ts', 'apps/studio/src/shell/pages.ts'];
ok(MUST_READ.every((f) => rel.includes(f)) && files.length >= 100, `the scan reads the files that held them, and ${files.length} files in all (floor 100)`);
const tsHits: Hit[] = [];
for (const f of files) {
  const r = relative(REPO, f);
  const s = scan(r, readFileSync(f, 'utf8'));
  tsHits.push(...s.hits);
  record(r.startsWith('apps/plugin/') ? 'apps/plugin/src (.ts)' : 'apps/studio/src (.ts)', r, s.hooks);
}
verdict(tsHits, 'no file names a removed name or hook');

console.log('\n2. No stylesheet selects what H12 removed');
const cssFiles = readdirSync(join(REPO, 'apps/studio/src')).filter((f) => f.endsWith('.css')).map((f) => `apps/studio/src/${f}`);
const cssHits: Hit[] = [];
for (const r of cssFiles) {
  const s = scanCss(r, readFileSync(join(REPO, r), 'utf8'));
  cssHits.push(...s.hits);
  record(r, r, s.hooks, s.classes);
}
verdict(cssHits, `no selector in ${cssFiles.join(', ')} names a removed hook, class or attribute value`);

console.log('\n3. No browser suite locates or clicks a removed hook');
const suites = ['apps/studio', 'apps/plugin'].flatMap((d) => readdirSync(join(REPO, d)).filter((f) => /^test-.*\.mjs$/.test(f)).map((f) => `${d}/${f}`));
const mjsHits: Hit[] = [];
for (const r of suites) {
  const s = scan(r, readFileSync(join(REPO, r), 'utf8'), ts.ScriptKind.JS);
  mjsHits.push(...s.hits);
  record(`${r.split('/').slice(0, 2).join('/')}/test-*.mjs`, r, s.hooks);
}
verdict(mjsHits, `no browser suite (${suites.length} read) names a removed hook or name`);
const stale = EXEMPT.filter((e) => !hits.some((h) => h.file === e.file && h.name === e.name));
ok(stale.length === 0, `every exemption still excuses a reference (${EXEMPT.length} listed)${stale.length ? ` — stale: ${stale.map((e) => `${e.file} ${e.name}`).join(', ')}` : ''}`);

console.log('\n4. Every surface was read and held what the scan looks for (represented, not counted: docs/34)');
/** Written here, not derived from the walks above: dropping a surface from a walk leaves it in this list. */
const SURFACES: { surface: string; holds: 'hook' | 'class' }[] = [
  { surface: 'apps/studio/src (.ts)', holds: 'hook' },
  { surface: 'apps/plugin/src (.ts)', holds: 'hook' },
  { surface: 'apps/studio/src/chrome.css', holds: 'hook' },
  // styles.css draws by class and carries no `data-p3` selector today, so a class is what proves it was parsed.
  { surface: 'apps/studio/src/styles.css', holds: 'class' },
  { surface: 'apps/studio/test-*.mjs', holds: 'hook' },
  { surface: 'apps/plugin/test-*.mjs', holds: 'hook' },
];
for (const { surface, holds } of SURFACES) {
  const r = read.get(surface);
  const n = r ? (holds === 'hook' ? r.hooks : r.classes) : 0;
  ok(!!r && n > 0, `${surface} was scanned and held at least one ${holds === 'hook' ? 'hook' : 'class selector'}${r ? ` (${n} in ${r.files.length} file${r.files.length === 1 ? '' : 's'})` : ' — NOT SCANNED'}`);
}
const unlisted = [...read.keys()].filter((k) => !SURFACES.some((s) => s.surface === k));
ok(unlisted.length === 0, `every surface the walks read is one step 4 holds${unlisted.length ? ` — unlisted: ${unlisted.join(', ')}` : ''}`);

console.log(`\n${executed - failed}/${executed} removed-legacy assertions passed.`);
if (failed) process.exit(1);
