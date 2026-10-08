/**
 * What H12 removed stays removed (#2289, owner PG1 A and Q107 A).
 *
 *   npx tsx apps/studio/test-removed-legacy.ts
 *
 * H12 deleted the plugin's Pages menu, the old Style guide page it opened, and the legacy page path that page was the
 * last user of: the legacy frame, the legacy workspace and its mode strip, the rail data (`NAV`) and the legacy page
 * keys. Nothing else stops one of them coming back: a page renderer copied from an old branch would compile against the
 * types that are left, and the browser suites would only notice it if it drew. So every `.ts` file under
 * `apps/studio/src` and `apps/plugin/src` is scanned for the names below, and a file that names one fails here, naming
 * the file, the line and the name.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the source on disk. The oracle is the two literal
 * lists below, written here from what H12 deleted, never read from the source, so a name re-added under the same
 * spelling cannot shrink them. The match is on IDENTIFIERS and on STRING LITERALS in the parsed source (the TypeScript
 * scanner), not on text, so a comment recording the history (most of the files above carry one) is not a reference,
 * and a hook minted as a string, or a function or type spelled as code, is.
 *
 * NON-VACUOUS. The detector runs first on a fixture that holds every name and must report every one, and the scan must
 * read the files that held them (`main.ts`, `shell/frame.ts`, `shell/bar.ts`, `shell/pages.ts`) and a floor of files in
 * all. A scan that read nothing, or that cannot see a planted name, would pass on nothing.
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

type Hit = { file: string; line: number; name: string };
const scan = (file: string, src: string): Hit[] => {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const hits: Hit[] = [];
  const at = (n: ts.Node, name: string) => hits.push({ file, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, name });
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && REMOVED_IDENTIFIERS.includes(n.text)) at(n, n.text);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (REMOVED_HOOKS.includes(n.text)) at(n, `'${n.text}'`);
      for (const p of REMOVED_PREFIXES) if (n.text.startsWith(p)) at(n, `'${n.text}'`);
    }
    // A template's head and spans (`rail-page-${key}`) carry the prefix too.
    if (ts.isTemplateExpression(n)) for (const p of REMOVED_PREFIXES) if (n.head.text.startsWith(p)) at(n, `\`${n.head.text}…\``);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
};

console.log('\n0. The detector sees every name (a planted fixture)');
{
  const fixture = [
    ...REMOVED_IDENTIFIERS.map((n) => `const ${n} = 0;`),
    ...REMOVED_HOOKS.map((h) => `hook(el, '${h}');`),
    ...REMOVED_PREFIXES.map((p) => 'hook(el, `' + p + '${key}`);'),
    '// renderPagesMenu, in a comment, is history and not a reference',
  ].join('\n');
  const found = new Set(scan('fixture.ts', fixture).map((h) => h.name.replace(/^['`]|['`…]+$/g, '')));
  const missed = [...REMOVED_IDENTIFIERS, ...REMOVED_HOOKS].filter((n) => !found.has(n));
  ok(missed.length === 0, `the fixture's ${REMOVED_IDENTIFIERS.length} names and ${REMOVED_HOOKS.length} hooks are all reported${missed.length ? ` — missed ${missed.join(', ')}` : ''}`);
  ok(REMOVED_PREFIXES.every((p) => [...found].some((f) => f.startsWith(p))), `a template hook with a removed prefix is reported (${REMOVED_PREFIXES.join(', ')})`);
  ok(scan('comment.ts', '// renderPagesMenu, pages-menu\n/* legacyOf */').length === 0, 'a comment naming them is not a reference');
}

console.log('\n1. No source names what H12 removed');
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && !p.endsWith('.d.ts') ? [p] : [];
});
const files = [join(REPO, 'apps/studio/src'), join(REPO, 'apps/plugin/src')].flatMap(walk);
const rel = files.map((f) => relative(REPO, f));
const MUST_READ = ['apps/studio/src/main.ts', 'apps/studio/src/shell/frame.ts', 'apps/studio/src/shell/bar.ts', 'apps/studio/src/shell/pages.ts'];
ok(MUST_READ.every((f) => rel.includes(f)) && files.length >= 100, `the scan reads the files that held them, and ${files.length} files in all (floor 100)`);
const hits = files.flatMap((f) => scan(relative(REPO, f), readFileSync(f, 'utf8')));
ok(hits.length === 0, `no file names a removed name or hook${hits.length ? ` — ${hits.slice(0, 8).map((h) => `${h.file}:${h.line} ${h.name}`).join(' | ')}` : ''}`);

console.log(`\n${executed - failed}/${executed} removed-legacy assertions passed.`);
if (failed) process.exit(1);
