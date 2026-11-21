/**
 * Prism3 engine — CLI adapter (the authoring on-ramp; docs/07 §6 + §11).
 *
 *   npx tsx packages/engine/cli.ts <design.md> [--out <dir>] [--fidelity] [--component-specs]
 *
 * A thin ENTRY POINT over the portable core — not a second pipeline. It accepts
 * BOTH `design.md` dialects and auto-detects which:
 *
 *   • ENGINE-NATIVE — frontmatter compiles 1:1 to BrandInput (`primary: {l,c,h}`,
 *     `neutral: {hue,chroma}`, …); see examples/*.design.md. Read by `parseDesignMd`.
 *   • STANDARD (brand-skills / google-labs) — a flat `colors:` hex map + structured
 *     type/dimension maps + an optional `x-prism3` levers block. Read by
 *     `parseStandardDesignMd`, then the colour-role classifier turns the flat map
 *     into anchors (`standardToBrandInput`). This is what makes a real brand-skills
 *     extraction a production input path, not a spike.
 *
 * Detection: a top-level `colors:` map is the standard dialect (engine-native never
 * has one); otherwise native. Both then run the same core:
 *   … → BrandInput → validate (theme-schema.json) → brandTheme → emitTheme → gate.
 *
 * `--fidelity` (standard dialect only) additionally writes `<id>-fidelity-report.md`
 * — the Decision-A regression artefact diffing every observed value against the
 * generated system (§11.3). No token logic lives here; the parser, classifier, core,
 * and report builder are all imported. This is the I/O shell: file read + argv + exit.
 *
 * `--component-specs` (#3425) also writes the brand's component contracts: `<id>.component-contracts.json` (every
 * component definition with the brand's component settings resolved, #1325), its compatibility copy
 * `<id>.component-defs.json` (the same bytes, for one release), and `<id>.component-defs.specs.json` (the same as a
 * Specs components set). The brand-neutral export is written under `out/components/` by `regen` (the same three files,
 * without the `<id>.` prefix, plus the catalog-wide `specs.json`), and not committed (#3698 R3).
 *
 * Exit codes: 0 = clean; 1 = schema violation, a broken alias, or a failed mode
 * contrast contract (so it fails CI). Errors print a readable diagnosis.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { Theme, brandTheme } from './theme';
import { parseDesignMd } from './design-md';
import { parseStandardDesignMd, standardToBrandInput, isStandardDesignMd } from './standard-design-md';
import { buildFidelityReport } from './fidelity';
import { emitTheme, validateBrandInput } from './emit-dtcg';
import type { BrandInput } from './theme';
import { componentDefsFileNames, exportComponentDefs, toSpecsComponents } from './component-defs-export';
import { componentDefs } from './components/index';
import { BUILD_IDENTITY } from './build-identity';
import { overlayModes } from './emit-dtcg-overlay';
import { contrast, hexToRgb } from './color';
import type { ModeResult } from './modes';

// #3698 R1: the build identity a live run stamps beside the engine version (`build-identity.ts`). `--committed` drops it:
// regen passes that flag for the one committed artifact it writes through this CLI (wendys), whose stamp is the fold's.
let build: string | undefined = BUILD_IDENTITY;

/** `--component-specs` (#3425): the brand's component contracts and their Specs projection, beside its tokens. The export
 *  is written under its contract name and, for one release, under its old name too (#1325, Q-CC1 A). */
const writeComponentSpecs = (input: BrandInput, resolvedOut: string) => {
  const doc = exportComponentDefs(componentDefs, { brand: input, build });
  const names = componentDefsFileNames(doc.brand!.id);
  const text = JSON.stringify(doc, null, 2) + '\n';
  writeFileSync(resolve(resolvedOut, names.contracts), text);
  writeFileSync(resolve(resolvedOut, names.defs), text);
  writeFileSync(resolve(resolvedOut, names.specs), JSON.stringify(toSpecsComponents(doc), null, 2) + '\n');
  console.log(`  [written] ${resolve(resolvedOut, names.contracts)}  (${Object.keys(doc.components).length} components)`);
  console.log(`  [written] ${resolve(resolvedOut, names.defs)}  (the same file under its old name, for one release)`);
  console.log(`  [written] ${resolve(resolvedOut, names.specs)}`);
};

const fail = (msg: string): never => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const validateOrExit = (input: unknown, designPath: string) => {
  const errs = validateBrandInput(input);
  if (errs.length) {
    console.error(`\n✖ ${designPath} violates the BrandInput contract (schema/theme-schema.json):`);
    errs.forEach((x) => console.error(`   · ${x}`));
    process.exit(1);
  }
};

/** #4170: every failed contrast contract, one line each: mode, pair, ratio, floor. The same three kinds `tree.ts` counts
 *  into `modeChecks` (a role against its ground, a role against its second tier, a role's `alsoAgainst` pair), so the
 *  listing accounts for the whole count it sits under. Wording is DRAFT, held for the owner's voice pass (#4200 A). */
const failedContracts = (modes: ModeResult[]): string[] => {
  const line = (mode: string, role: string, ratio: number, against: string, min: number) =>
    `${mode}: ${role} is ${Math.floor(ratio * 100) / 100}:1 against ${against}, below its ${min}:1 floor`;
  const out: string[] = [];
  for (const mr of modes) {
    for (const [k, r] of Object.entries(mr.roles)) if (r.min > 0 && r.ratio < r.min) out.push(line(mr.mode, k, r.ratio, r.against, r.min));
    for (const c of mr.tierChecks ?? []) if (c.ratio < c.min) out.push(line(mr.mode, c.role, c.ratio, c.against, c.min));
    for (const [k, r] of Object.entries(mr.roles)) if (r.alsoAgainst) {
      const partner = mr.roles[r.alsoAgainst.against];
      const ratio = partner ? contrast(hexToRgb(r.hex), hexToRgb(partner.hex)) : 0;
      if (!partner || ratio < r.alsoAgainst.min) out.push(line(mr.mode, k, ratio, r.alsoAgainst.against, r.alsoAgainst.min));
    }
  }
  return out;
};
const LISTED_FAILURES = 10;

// Shared emit + gate + report. Returns nothing; exits non-zero on a failed gate.
const emitAndGate = (theme: Theme, resolvedOut: string, designPath: string, source: string) => {
  // #3875: a write that fails (the backstop above, or the file system) is a readable failure, not a stack trace.
  let emitted: ReturnType<typeof emitTheme>;
  try { emitted = emitTheme(theme, resolvedOut, { build }); }
  catch (e) { return fail(`could not write '${theme.id}' to ${resolvedOut}: ${(e as Error).message}`); }
  const { stats } = emitted;
  console.log(`\n[${theme.id}] ${theme.root}.* / ${theme.colorFormat}  ←  ${designPath} (${source})`);
  for (const n of theme.notes) console.log(`   · ${n}`);
  console.log(`  palettes: ${theme.palettes.map((p) => p.palette).join(', ')} (danger ← ${theme.roleToPalette.danger})`);
  console.log(`  aliases: ${stats.resolved}/${stats.aliases} resolve | mode contracts: ${stats.modePass}/${stats.modeChecks} pass`);
  // #4153: every file `emitTheme` writes, not two of them: the full tree, the sidecar, and the base + per-mode overlay
  // set that a multi-mode build reads (skills/prism3-build-ui rule 3), the web base beside it (#4155), and the CSS-only
  // source the ship build reads (#3510).
  for (const name of [`${theme.id}.tokens.json`, `${theme.id}.ai.json`, `${theme.id}.base.tokens.json`, `${theme.id}.web.base.tokens.json`,
    `${theme.id}.css-only.json`,
    ...overlayModes(emitted.tree).map((m) => `${theme.id}.${m}.overlay.tokens.json`)]) console.log(`  [written] ${resolve(resolvedOut, name)}`);
  const broken = stats.broken.length > 0;
  const contractsFail = stats.modePass < stats.modeChecks;
  if (broken) stats.broken.forEach((b) => console.error(`   ❌ ${b.reason === 'dangling' ? 'unresolved alias' : b.reason === 'cycle' ? 'alias cycle' : 'alias chain too deep'}: ${b.path} -> {${b.ref}}${b.mode ? ` (${b.mode})` : ''}${b.chain ? ` — ${b.chain.join(' -> ')}` : ''}`));
  if (contractsFail) {
    const failed = failedContracts(emitted.modes);
    for (const f of failed.slice(0, LISTED_FAILURES)) console.error(`   ❌ ${f}`);
    if (failed.length > LISTED_FAILURES) console.error(`   … and ${failed.length - LISTED_FAILURES} more`);
    console.error(`   ❌ ${stats.modeChecks - stats.modePass} mode contrast contract(s) failed`);
  }
  if (broken || contractsFail) process.exit(1);
  console.log(`  ✓ ${theme.id} generated cleanly — all aliases resolve, all contrast contracts hold`);
  return stats;
};

const main = () => {
  // ---- parse argv: <design.md> [--out <dir>] [--fidelity] ----
  const argv = process.argv.slice(2);
  let designPath: string | undefined;
  let outDir: string | undefined;
  let fidelity = false;
  let componentSpecs = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' || a === '-o') {
      // L-09: consume the NEXT token as the directory — but not if it looks like a flag
      // (`--out --fidelity` would otherwise create a directory literally named `--fidelity`
      // and silently swallow the flag). A path beginning with `-` must be given as `./-name`.
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) fail(`--out needs a directory argument${next ? ` (got the flag '${next}')` : ''}`);
      outDir = argv[++i];
    }
    else if (a === '--fidelity') fidelity = true;
    else if (a === '--component-specs') componentSpecs = true;
    else if (a === '--committed') build = undefined;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: tsx cli.ts <design.md> [--out <dir>] [--fidelity] [--component-specs] [--committed]\n\n  <design.md>   a brand brief with YAML frontmatter — engine-native (examples/*.design.md)\n                OR a standard brand-skills / google-labs design.md (flat colors + x-prism3)\n  --out <dir>   output directory (default: engine/out) for <id>.tokens.json + <id>.ai.json, and the same tokens as\n                <id>.base.tokens.json + one <id>.<mode>.overlay.tokens.json per mode beyond the base\n  --fidelity    (standard dialect) also write <id>-fidelity-report.md — the observed-vs-generated diff\n  --component-specs  also write <id>.component-contracts.json + <id>.component-defs.specs.json — every component\n                contract with this brand\'s component settings resolved, and the same as a Specs components set\n                (and <id>.component-defs.json, the same contracts under their old name, for one release)\n  --committed   stamp the engine version only, never the build identity: for an artifact the repo commits (regen)');
      process.exit(0);
    }
    else if (a.startsWith('-')) fail(`unknown flag: ${a}`);
    else if (!designPath) designPath = a;
    else fail(`unexpected extra argument: ${a}`);
  }
  if (!designPath) fail('missing <design.md> argument (try --help)');

  const here = dirname(fileURLToPath(import.meta.url));
  const resolvedOut = outDir ? resolve(process.cwd(), outDir) : resolve(here, 'out');

  // ---- read ----
  let text: string;
  try { text = readFileSync(resolve(process.cwd(), designPath!), 'utf8'); }
  // #4200 A (DRAFT): the cause, not just the path. A missing file is the common case and gets the next step.
  catch (e) {
    return fail((e as NodeJS.ErrnoException).code === 'ENOENT'
      ? `cannot read ${designPath}: no such file. Pass the path to a design.md, such as packages/engine/examples/harbor.design.md`
      : `cannot read ${designPath}: ${(e as Error).message}`);
  }

  // ---- detect dialect: a top-level flat `colors:` map is the standard dialect ----
  let std;
  try { std = parseStandardDesignMd(text); }
  catch (e) { return fail(`parse error in ${designPath}: ${(e as Error).message}`); }
  const isStandard = isStandardDesignMd(std);

  if (isStandard) {
    // ---- STANDARD dialect: classify the flat colours into anchors ----
    // Wrapped (M-13): classifyColors can throw ("no primary" / an invalid hex), so route it
    // through fail() for a readable diagnosis + exit 1 rather than a raw stack trace.
    let classified;
    try { classified = standardToBrandInput(std); }
    catch (e) { return fail(`could not classify '${std.name}' (standard dialect): ${(e as Error).message}`); }
    const { input, classification, xApplied, xWarnings } = classified;
    console.log(`[standard] '${std.name}' → id '${input.id}' — ${Object.keys(std.colors).length} colours, ${Object.keys(std.typography).length} type tokens; x-prism3: ${xApplied.length ? xApplied.join(', ') : 'none (defaults)'}`);
    // #2678 (Q-XP1 A): an x-prism3 key the dialect does not read is named here, and so is a typography face no category
    // reads (#4137); the file keeps compiling.
    for (const w of xWarnings) console.log(`  ⚠ ${w}`);
    validateOrExit(input, designPath!);
    let theme: Theme;
    try { theme = brandTheme(input); }
    catch (e) { return fail(`the engine refused '${input.id}': ${(e as Error).message}`); }   // #4200 B: no internal function name (DRAFT)
    const stats = emitAndGate(theme, resolvedOut, designPath!, 'standard');
    if (fidelity) {
      const { md, anchorDe } = buildFidelityReport(std, classification, input, theme, stats, xApplied);
      const reportPath = resolve(resolvedOut, `${theme.id}-fidelity-report.md`);
      writeFileSync(reportPath, md);
      console.log(`  [written] ${reportPath}  (anchor ΔE00 ${anchorDe.toFixed(2)})`);
    }
    if (componentSpecs) writeComponentSpecs(input, resolvedOut);
    return;
  }

  // ---- ENGINE-NATIVE dialect ----
  // #4200 E (DRAFT): voice standard §2 bans "note"; say what happened and why.
  if (fidelity) console.error('  --fidelity ignored — it diffs a standard-dialect brief, and this one is engine-native');
  let input;
  try { input = parseDesignMd(text).input; }
  catch (e) { return fail(`parse error in ${designPath}: ${(e as Error).message}`); }
  validateOrExit(input, designPath!);
  let theme: Theme;
  try { theme = brandTheme(input); }
  catch (e) { return fail(`the engine refused '${(input as any).id}': ${(e as Error).message}`); }   // #4200 B (DRAFT)
  emitAndGate(theme, resolvedOut, designPath!, 'engine-native');
  if (componentSpecs) writeComponentSpecs(input as BrandInput, resolvedOut);
};

main();
