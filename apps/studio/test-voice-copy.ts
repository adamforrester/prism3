/**
 * Studio copy against the voice standard (#4190, #4189, #4191 T3/T4, #4193; owner decisions 2026-11-19, as recommended).
 *
 *   npx tsx apps/studio/test-voice-copy.ts
 *
 * The overnight UI audit (#4104) found Studio lines the voice gates can't see: Title Case on the Interactive cards,
 * "a11y", "minimum" beside "floor" for one threshold, "Show 4 advanced" with no noun, "Auto:" in some pickers and
 * "Auto ·" in others, "1440 px" beside "1440px", jargon in labels ("verdict", "stateless inert set", "Interpolation"),
 * idiom ("rides", "is out", "regrows"), and destructive buttons that hide the outcome ("Pair icons", "Release").
 *
 * WHAT IT ASSERTS, two halves:
 *   1. BUILDERS: the functions that draw these lines, imported and called, against literals typed here.
 *   2. RETIRED: no string or template literal in `apps/studio/src` carries a retired form. Comments are not scanned
 *      (code comments are exempt from the voice standard, §2).
 *
 * INDEPENDENCE (docs/34). The expected words are literals written here from the owner's decisions; the subject is the
 * source as it stands. The scan's scope is asserted REPRESENTED (files and literals counted), so a glob that stopped
 * matching fails rather than passing over nothing.
 *
 * Mutations this fails by name: `advancedLabel` without its noun → `#4190 V4 the advanced fold names its settings`;
 * `sliderReadout` back to " px" → `#4189 a px readout has no space`; `SET_CARD_TITLE` back to Title Case →
 * `#4190 V1 the set card title is sentence case`; the import refusals without their next step (`refusal`'s `step` empty)
 * → `#4193 D an import refusal ends on its next step`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lever } from '@prism3/engine';
import { advancedLabel, sliderReadout } from './src/ui/lever-kit';
import { SET_CARD_TITLE, PRIMARY_ACTION_PALETTE } from './src/domains/color-interactive';
import { healthLine } from './src/state/verdict';
import { PAIR_ICONS_CONFIRM } from './src/state/fills-input';
import { S63 } from './src/domains/type';
import { listNameOf } from './src/state/component-groups';
import { validateDesignMd, importErrorText } from './src/state/start-input';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

/** The text of every string and template literal in a TypeScript source, comments dropped (the lexer
 *  `test-canonical-names.ts` uses, #4184; a copy, so each suite stands alone). */
const literals = (src: string): string[] => {
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

// ── 1. BUILDERS ──────────────────────────────────────────────────────────────────────────────────
ok(advancedLabel(false, 4) === 'Show 4 advanced settings' && advancedLabel(true, 1) === 'Hide 1 advanced setting',
  `#4190 V4 the advanced fold names its settings (${advancedLabel(false, 4)} / ${advancedLabel(true, 1)})`);
ok(SET_CARD_TITLE('Primary') === 'Primary interactive colors' && PRIMARY_ACTION_PALETTE === 'Primary action palette',
  `#4190 V1 the set card title is sentence case (${SET_CARD_TITLE('Primary')}, ${PRIMARY_ACTION_PALETTE})`);
const v = (fail: number) => ({ total: 956, fail, modesFailing: fail ? 2 : 0 }) as unknown as Parameters<typeof healthLine>[0];
ok(healthLine(v(0)) === 'All 956 pairs at or above their floor.' && healthLine(v(3)) === '3 of 956 pairs below their floor in 2 modes.',
  `#4190 V3 Health says "floor", the setting's word (${healthLine(v(0))} / ${healthLine(v(3))})`);
const L = (unit: string, stops?: Record<string, number>): Lever => ({ key: 'x', label: 'x', unit, step: 1, stops } as unknown as Lever);
ok(sliderReadout(L('px', { standard: 1440 }), 1440) === '1440px · standard', `#4189 a px readout has no space (${sliderReadout(L('px', { standard: 1440 }), 1440)})`);
ok(sliderReadout(L('ms'), 200) === '200 ms' && sliderReadout(L('°'), 40) === '40°', `#4189 other units keep their own form (${sliderReadout(L('ms'), 200)}, ${sliderReadout(L('°'), 40)})`);
ok(PAIR_ICONS_CONFIRM.action(3) === 'Remove 3 icon colors' && PAIR_ICONS_CONFIRM.action(1) === 'Remove 1 icon color',
  `#4193 E the re-pair button names what it removes (${PAIR_ICONS_CONFIRM.action(3)})`);
ok(S63.release(2) === 'Reset 2 sizes to the scale' && S63.release(1) === 'Reset 1 size to the scale', `#4193 E the release button names the loss (${S63.release(2)})`);
ok(listNameOf('CodeInput.Cell') === 'Code input cell' && listNameOf('PageNav') === 'Page nav' && listNameOf('Radio.Row') === 'Radio row',
  `#4191 T4 a set's list name is words, not its code name (${listNameOf('CodeInput.Cell')}, ${listNameOf('PageNav')})`);

// ── 2. RETIRED ───────────────────────────────────────────────────────────────────────────────────
const RETIRED: readonly [pattern: RegExp, name: string][] = [
  [/^Auto: /, '#4189 "Auto:" (the form is "Auto · …")'],
  [/Interactive Colors|Action Palette/, '#4190 V1 Title Case on the Interactive cards'],
  [/\ba11y\b/, '#4190 V2 "a11y"'],
  [/below their minimum|above their minimum/, '#4190 V3 "minimum" for the floor'],
  [/^You get /, '#4190 V5 "You get"'],
  [/fully-built/, '#4190 V5 "fully-built"'],
  [/--- YAML frontmatter ---/, '#4190 V5 the dashed paste placeholder'],
  [/the verdict\b/, '#4193 B "the verdict"'],
  [/stateless inert set/, '#4193 B "stateless inert set"'],
  [/Recording the sets as built|Adopting members|Retrying property links|Wiring references|Building members/, '#4193 B executor terms in progress lines'],
  [/recorded before Prism3 noted/, '#4193 B the engine-update record line'],
  [/rides Update file|step is out\b|regrows the rest|grows a full|you can steer|No color yet\?|Already have a design\.md\?/, '#4193 C idiom and marketing register'],
  [/standard-dialect|couldn't classify|the engine rejected it/, '#4193 D parser terms in an error'],
  [/Studio can.t do this yet/, '#4193 D a next step that is no step'],
  [/^Release pinned sizes$|Release them to switch/, '#4193 E "Release"'],
  [/token prefix/, '#4193 A "token prefix" beside "Token namespace"'],
  [/accent column is removed|interactive color column is removed/, '#4193 A "column" for a button set'],
  [/^See Components$/, '#4191 T5 "See Components" (the form is "Set it in …")'],
  [/^Set in Theme/, '#4191 T5 "Set in" (the form is "Set it in …")'],
  [/The overlay that dims/, '#4193 A "overlay" for the scrim'],
];
const SRC = fileURLToPath(new URL('./src', import.meta.url));
const tsFiles = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? tsFiles(p) : /\.ts$/.test(f) && !/\.d\.ts$/.test(f) ? [p] : [];
});
const files = tsFiles(SRC);
const hits = new Map<string, string[]>(RETIRED.map(([, n]) => [n, []]));
let count = 0;
for (const f of files) {
  const lits = literals(readFileSync(f, 'utf8'));
  count += lits.length;
  for (const l of lits) for (const [re, n] of RETIRED) if (re.test(l)) hits.get(n)!.push(`${f.slice(SRC.length + 1)}: ${JSON.stringify(l.slice(0, 100))}`);
}
ok(files.length > 100 && count > 5000, `#4190 scope: apps/studio/src is represented (${files.length} files, ${count} literals)`);
for (const [, n] of RETIRED) { const h = hits.get(n)!; ok(h.length === 0, `${n} is in no shipped string`, h.slice(0, 6).join('\n      ')); }

// #4193 D: an import that loaded but could not be used ends on what to do next. The expected sentence is typed here,
// not read from `IMPORT_NEXT_STEP`, so a step that changed or went missing fails by name.
const NEXT = 'Fix it in the design.md, then import it again.';
for (const [what, text] of [
  ['a standard-dialect design.md with a color it cannot read', '---\nname: Acme\ncolors:\n  primary: "#zzzzzz"\n---\n'],
  ['an engine-native design.md the engine refuses', '---\nid: x\nsurfaces:\n  light:\n    base: 12345\n---\n'],
] as const) {
  const r = validateDesignMd(text);
  const shown = 'error' in r ? importErrorText(r.error) : '';
  ok(/loaded, but/.test(shown) && shown.endsWith(` ${NEXT}`) && shown.split(NEXT).length === 2,
    `#4193 D an import refusal ends on its next step: ${what}`, JSON.stringify(shown));
}

// The two CSS decisions (#4189), read from the chrome's stylesheet: a face this device lacks is a warning, never the
// error ink, and displayed hex keeps its own (lowercase) case.
const css = readFileSync(join(SRC, 'chrome.css'), 'utf8');
ok(/\.p3-face-stat\[data-kind="warn"\]/.test(css) && !/\.p3-face-stat\[data-bad[^\]]*\][^}]*--p3-bad-text/.test(css),
  '#4189 a missing face is drawn as a warning, not in the error ink');
ok(!/\.p3-hex-input[^{]*\{[^}]*text-transform:\s*uppercase/.test(css), '#4189 the hex field does not upper-case its value');

console.log(failed ? `\n${failed} of ${executed} failed` : `\nvoice copy: ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
