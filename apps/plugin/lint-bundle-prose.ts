/**
 * lint-bundle-prose — WHAT THE BUILT PLUGIN SHIPS OF A COMPONENT DEF (#1623 sign-off).
 *
 * The owner ruled three things about component text in `apps/plugin/dist`, and each arm here reads the
 * built bundle itself — the thing a designer imports into Figma — rather than the source that produced it:
 *
 *   A. MAINTAINER PROSE IS ABSENT. Every `notes.*` string and every `anatomy.codeOnly` entry of every
 *      registered def is maintainer-only. The tail half of each (the whole string when it is short) must
 *      not appear in `dist/main.js` or `dist/ui.html`. `codeOnly` entries may keep their leading term — the
 *      runtime admission check reads it — which is why the TAIL is what is searched for.
 *   B. NO "PRISM 2" IN COMPONENT TEXT. Inside each component module of each bundle (esbuild's own
 *      `// …/packages/engine/components/<file>.ts` region headers), no `Prism 2` / `Prism2`, any case.
 *   C. THE SUMMARY IS PRESENT. Every def's `summary` — the Figma description the plugin writes — is in
 *      both bundles.
 *
 * INDEPENDENCE (docs/34). The oracle for A and C is the real def objects, imported here; the subject is
 * the bundle esbuild wrote. The strip itself (`strip-maintainer-prose.mjs`) is NOT imported, so a strip
 * that silently did nothing, or a build that stopped using it, fails arm A by name. B's region list is
 * `git ls-files`, not the registry, so a def file dropped from `componentDefs` is still scanned.
 *
 * REPRESENTATION. Each bundle must hold exactly one region per def file, arm A must have scanned at least
 * one `notes` string and one `codeOnly` entry, and arm C must find every summary — so a bundle that no
 * longer contains the defs cannot pass by containing nothing.
 *
 * Bundle strings are JS-escaped (`—` is `—`), so each bundle is decoded before any comparison, and a
 * self-check proves both detectors fire on a planted case before the real scan runs.
 *
 * Runs AFTER the plugin build: `npm run -w @prism3/plugin build`, then `npx tsx apps/plugin/lint-bundle-prose.ts`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from '../../packages/engine/components/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const BUNDLES = ['main.js', 'ui.html'].map((f) => ({ name: f, path: resolve(HERE, 'dist', f) }));
const PRISM = /prism\s*2/i;
const TAG = 'lint-bundle-prose';

/** Undo esbuild's string escaping so a def's text can be compared as authored. */
export const decode = (s: string): string => s
  .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\(["'`\\])/g, '$1');

/** What must be absent for a maintainer string to count as stripped: its tail half, or all of it if short. */
export const probeOf = (s: string): string => (s.length < 40 ? s : s.slice(Math.floor(s.length / 2)));

/** A maintainer string can repeat a sentence a SHIPPED field also carries (a note restating a prop), and
 *  that sentence in the bundle is not a leak. So the probe is narrowed to the last 40-character window
 *  that no shipped field contains; a string with no such window is reported as `shared` and not probed. */
const probeAgainst = (s: string, shipped: string): string | undefined => {
  const p = probeOf(s);
  if (!shipped.includes(p)) return p;
  for (let end = s.length; end >= 40; end--) { const w = s.slice(end - 40, end); if (!shipped.includes(w)) return w; }
  return undefined;
};

/** Every string a def SHIPS — the def with its maintainer channels removed, walked to its leaves. */
const shippedText = (): string => {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'notes' && k !== 'codeOnly') walk(x);
  };
  componentDefs.forEach(walk);
  return out.join('\n');
};

/** The component module regions of a decoded bundle, keyed by file name, from esbuild's region headers. */
export const regionsOf = (text: string): Map<string, string> => {
  const header = /^\s*\/\/ (\S+\.[cm]?[jt]sx?)$/gm;
  const marks: { file: string; at: number }[] = [];
  for (const m of text.matchAll(header)) marks.push({ file: m[1], at: m.index! });
  const out = new Map<string, string>();
  marks.forEach((mk, i) => {
    const hit = /packages\/engine\/components\/([^/]+\.ts)$/.exec(mk.file);
    if (hit && hit[1] !== 'index.ts') out.set(hit[1], text.slice(mk.at, marks[i + 1]?.at ?? text.length));
  });
  return out;
};

type Maint = { where: string; text: string };
const maintainerStrings = (): { notes: Maint[]; codeOnly: Maint[] } => {
  const notes: Maint[] = []; const codeOnly: Maint[] = [];
  for (const d of componentDefs) {
    for (const [k, list] of Object.entries(d.notes ?? {})) (list ?? []).forEach((t, i) => notes.push({ where: `${d.id}.notes.${k}[${i}]`, text: t }));
    (d.anatomy?.codeOnly ?? []).forEach((t, i) => codeOnly.push({ where: `${d.id}.anatomy.codeOnly[${i}]`, text: t }));
  }
  return { notes, codeOnly };
};

const selfCheck = (): string[] => {
  const f: string[] = [];
  const planted = 'var x = { notes: { contested: ["a maintainer sentence that must never ship \\u2014 held"] } };';
  if (!decode(planted).includes(probeOf('a maintainer sentence that must never ship — held')))
    f.push('arm A self-check: a planted, escaped maintainer string was NOT found after decoding — the absence check would pass vacuously');
  const bundle = '  // ../../packages/engine/components/demo.ts\n  var d = { description: "Adopts the Prism 2 visual" };\n  // src/main.ts\n  var y = "Prism 2 outside";\n';
  const r = regionsOf(bundle);
  if (!PRISM.test(r.get('demo.ts') ?? '')) f.push('arm B self-check: "Prism 2" inside a planted component region was NOT detected');
  if ([...r.values()].some((t) => t.includes('outside'))) f.push('arm B self-check: a region ran past the next module header into non-component code');
  return f;
};

const main = (): void => {
  const self = selfCheck();
  if (self.length) { console.error(`✗ ${TAG} — the gate's own detectors are unsound:`); self.forEach((s) => console.error(`    ${s}`)); process.exit(1); }

  const defFiles = execFileSync('git', ['ls-files', 'packages/engine/components/*.ts'], { cwd: REPO, encoding: 'utf8' })
    .split('\n').filter(Boolean).map((p) => basename(p)).filter((f) => f !== 'index.ts');
  const { notes, codeOnly } = maintainerStrings();
  const shipped = shippedText();
  let shared = 0;
  const probes = [...notes, ...codeOnly].flatMap((m) => { const p = probeAgainst(m.text, shipped); if (p === undefined) { shared++; return []; } return [{ ...m, probe: p }]; });
  const problems: string[] = [];
  if (notes.length === 0 || codeOnly.length === 0)
    problems.push(`representation: the registry yielded ${notes.length} notes string(s) and ${codeOnly.length} codeOnly entr(ies) — arm A would scan nothing`);

  for (const b of BUNDLES) {
    if (!existsSync(b.path)) { console.error(`✗ ${TAG} — apps/plugin/dist/${b.name} is missing. Run the plugin build first (npm run -w @prism3/plugin build).`); process.exit(1); }
    const text = decode(readFileSync(b.path, 'utf8'));

    // A — maintainer prose absent.
    for (const m of probes) {
      if (text.includes(m.probe)) problems.push(`A ${b.name}: maintainer text from ${m.where} shipped — "…${m.probe.slice(0, 80)}…"`);
    }

    // B — no Prism 2 in component text, with one region per def file.
    const regions = regionsOf(text);
    const missing = defFiles.filter((f) => !regions.has(f));
    if (missing.length) problems.push(`B ${b.name}: no component region for ${missing.join(', ')} — the bundle does not represent every def file, so the scan below cannot speak for it`);
    for (const [file, body] of regions) {
      const m = PRISM.exec(body);
      if (m) problems.push(`B ${b.name}: "${m[0]}" in the ${file} region — "…${body.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ')}…"`);
    }

    // C — every summary present.
    for (const d of componentDefs) if (!d.summary || !text.includes(d.summary)) problems.push(`C ${b.name}: ${d.id}'s summary is not in the bundle, so the plugin cannot write it as the Figma description`);
  }

  if (problems.length) {
    console.error(`✗ ${TAG} — ${problems.length} problem(s) in apps/plugin/dist:`);
    problems.slice(0, 40).forEach((p) => console.error(`    ${p}`));
    if (problems.length > 40) console.error(`    … and ${problems.length - 40} more`);
    console.error('  Maintainer-only `notes` / `codeOnly` prose is stripped by apps/plugin/strip-maintainer-prose.mjs; shipped component text states behavior and names no Prism 2 (#1623 sign-off).');
    process.exit(1);
  }
  console.log(`✓ ${TAG} — ${notes.length} notes strings and ${codeOnly.length} codeOnly entries absent (${shared} wholly shared with a shipped field, not probed), 0 "Prism 2" in ${defFiles.length} component regions, ${componentDefs.length} summaries present — in both main.js and ui.html (self-check ok).`);
};

main();
