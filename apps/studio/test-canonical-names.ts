/**
 * One name per feature on screen (#4184, owner decision 2026-11-19: as recommended).
 *
 *   npx tsx apps/studio/test-canonical-names.ts
 *
 * The overnight copy audit (#4104) found six features carrying two to six names across the Studio and the plugin, and
 * hints naming buttons that don't exist ("Update components", "Apply theme saves one"). The owner fixed one name per
 * feature: "Clean up", "Update file" (never the short "Update"), "Studio", "Component specs", "Agent link", "Import",
 * "variant" in designer-facing lines, and no "plan" on screen. `docs/voice-standard.md` §7 lists them.
 *
 * WHAT IT ASSERTS, two halves:
 *   1. RETIRED: no string or template literal in `apps/studio/src` or `apps/plugin/src` carries a retired name. Comments
 *      are not scanned (code comments are exempt from the voice standard, §2), so the lexer below drops them.
 *   2. CANONICAL: the tables and builders that draw the names say the canonical one (the Activity titles, the busy
 *      message, the field and tag style notes, the agent command words).
 *
 * INDEPENDENCE (docs/34). The retired and canonical names are literals written here, from the owner's decision; the
 * subject is the source as it stands, read from disk (half 1) or imported (half 2). Neither is derived from the other.
 * The scan's scope is asserted REPRESENTED: each of the two trees must contribute files and literals, or the run fails
 * as SCANNED BLIND, so a glob that stopped matching cannot pass over nothing.
 *
 * Mutations this fails by name: `OP_TITLE.prune` back to 'Prune stale' → `#4184 retired "Prune stale"` and
 * `#4184 the Activity row for removing stale items is "Clean up"`; `fieldStyleNote` back to "Update components" →
 * `#4184 retired "Update components"`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OP_TITLE } from './src/shell/activity';
import { TITLE, busyMessage } from '../plugin/src/run-guard';
import { AGENT_RUN_WORDS } from '../plugin/src/agent-run-notice';
import { leverManifest, type BrandInput } from '@prism3/engine';
import { fieldStyleNote } from '../plugin/src/field-style-note';
import { tagStyleNote } from '../plugin/src/tag-style-note';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

/** The text of every string and template literal in a TypeScript source, comments dropped. A small lexer, not a parser:
 *  it tracks line and block comments, the three quote kinds and `${…}` nesting inside templates. A `/` that starts a
 *  regex literal is read as code, which only matters if a regex holds a quote; the scanned trees' do not unbalance it
 *  (a literal that ran on would join two strings, and the representation counts below would still hold). */
export const literals = (src: string): string[] => {
  const out: string[] = [];
  const stack: number[] = []; // brace depth at each open `${`, so the matching `}` resumes the template
  let depth = 0;
  let i = 0;
  const readQuoted = (q: string): void => {
    let s = '';
    i++;
    while (i < src.length && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') { s += src[i + 1] ?? ''; i += 2; } else s += src[i++]; }
    i++;
    out.push(s);
  };
  const readTemplate = (): void => {
    let s = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { s += src[i + 1] ?? ''; i += 2; continue; }
      if (c === '`') { i++; out.push(s); return; }
      if (c === '$' && src[i + 1] === '{') { out.push(s); s = ''; i += 2; stack.push(depth); depth++; return; }
      s += c; i++;
    }
    out.push(s);
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'") { readQuoted(c); continue; }
    if (c === '`') { i++; readTemplate(); continue; }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth--; i++; if (stack.length && depth === stack[stack.length - 1]) { stack.pop(); readTemplate(); } continue; }
    i++;
  }
  return out;
};

const tsFiles = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? tsFiles(p) : /\.ts$/.test(f) && !/\.d\.ts$/.test(f) ? [p] : [];
});

/** The retired names, each with why. A pattern matches inside one literal (a template's pieces are separate). */
const RETIRED: readonly [pattern: RegExp, name: string][] = [
  [/Prune stale/, 'Prune stale'],
  [/\bPrune stopped\b/, 'Prune stopped'],
  [/^prune failed: /, 'prune failed:'],
  [/\bCleanup failed\b/, 'Cleanup failed'],
  [/Apply, Build and Prune/, 'Apply, Build and Prune'],
  [/Update components\b/, 'Update components'],
  [/Apply theme saves/, 'Apply theme saves one'],
  [/Write a theme first/, 'Write a theme first'],
  [/[Aa]pply the theme\b/, 'apply the theme'],
  [/\b(?:Run|then|next) Update\b(?! file)/, 'the short form "Update"'],
  [/^By Update\.$/, 'By Update.'],
  [/^Update sets$/, 'Update sets'],
  [/\bknobs\b/, 'knobs'],
  [/[Cc]omponent contracts?\b/, 'component contracts'],
  [/accepted as built/, 'accepted as built'],
  [/^ About frame\.$/, 'About frame'],
  [/\bthe plan says\b|\bnot in the plan\b|\bthe plan['’]s values\b|\bfrom the plan that\b|\bchanges the plan makes\b/, 'plan'],
  [/\b[Ww]eb studio\b|\bthe studio\b/, 'studio, lowercase'],
  [/\bthe generator\b/, "the generator"],
];

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TREES = ['studio/src', 'plugin/src'];
const hits = new Map<string, string[]>(RETIRED.map(([, n]) => [n, []]));
for (const tree of TREES) {
  const files = tsFiles(join(ROOT, tree));
  let count = 0;
  for (const f of files) {
    const lits = literals(readFileSync(f, 'utf8'));
    count += lits.length;
    for (const l of lits) for (const [re, n] of RETIRED) if (re.test(l)) hits.get(n)!.push(`${f.slice(ROOT.length)}: ${JSON.stringify(l.slice(0, 100))}`);
  }
  // SCANNED BLIND guard: a tree that contributes no file or no literal would make every RETIRED arm pass over nothing.
  ok(files.length > 20 && count > 1000, `#4184 scope: apps/${tree} is represented (${files.length} files, ${count} literals)`);
}
for (const [, n] of RETIRED) {
  const h = hits.get(n)!;
  ok(h.length === 0, `#4184 retired "${n}" is in no shipped string`, h.slice(0, 6).join('\n      '));
}

// The lexer itself, on a known input: a comment is dropped, a template's pieces and a nested literal are read.
const probe = literals("// 'Prune stale'\nconst a = `x ${f('Clean up')} y`; /* \"Update components\" */ const b = \"ok\";");
ok(JSON.stringify(probe) === JSON.stringify(['x ', 'Clean up', ' y', 'ok']), `#4184 the literal lexer drops comments and reads template pieces (${JSON.stringify(probe)})`);

// CANONICAL: the tables that draw the names.
ok(OP_TITLE.prune === 'Clean up', `#4184 the Activity row for removing stale items is "Clean up" (${OP_TITLE.prune})`);
ok(OP_TITLE['apply'] === 'Apply theme', `#4184 the Activity row for writing the theme is "Apply theme" (${OP_TITLE['apply']})`);
ok(TITLE.prune === OP_TITLE.prune && TITLE['apply-theme'] === OP_TITLE['apply'], '#4184 the plugin\'s busy titles match the Activity rows');
ok(busyMessage('prune') === 'Clean up is already running. Try again when it finishes.', `#4184 the busy message names Clean up (${busyMessage('prune')})`);
ok(AGENT_RUN_WORDS.prune === 'Clean up' && AGENT_RUN_WORDS['update-components'] === 'Update file', `#4184 the agent's run words say Clean up and Update file (${AGENT_RUN_WORDS.prune}, ${AGENT_RUN_WORDS['update-components']})`);
// Each note, called with a style other than the default so it speaks (the option is the manifest's own, not a literal).
const other = (key: string, def: string): string => leverManifest.find((l) => l.key === key)?.options?.map((o) => String(o.value)).find((v) => v !== def) ?? '';
const field = fieldStyleNote(null, { fieldStyle: other('fieldStyle', 'outline') } as unknown as BrandInput);
const tag = tagStyleNote(null, { tagStyle: other('tagStyle', 'pill') } as unknown as BrandInput);
ok(/^Field style is now .+\. Run Update file to redraw the field sets\.$/.test(field), `#4184 the field style note names Update file (${field})`);
ok(/^Tag style is now .+\. Run Update file to redraw the tag set\.$/.test(tag), `#4184 the tag style note names Update file (${tag})`);

console.log(failed ? `\n${failed} of ${executed} failed` : `\ncanonical names: ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
