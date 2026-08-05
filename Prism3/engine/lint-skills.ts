/**
 * Prism3 engine — SKILLS GATE (#492).
 *
 *   npx tsx Prism3/engine/lint-skills.ts
 *
 * A `SKILL.md` is a **shipped artifact that makes factual claims about the engine**, and until now it
 * was the only shipped surface with no gate — `out/**`, the emitted schema contracts and `web/dist`
 * are all scanned, `Prism3/skills/**` was not. That is #281's shape on a surface we had not covered:
 * committed, consumed, and unread by any check.
 *
 * The live proof this exists for: `prism3-theme` still teaches "map adjectives → levers, this is the
 * judgment the brief pays for" — a workflow #471 replaced with a controlled vocabulary the engine
 * resolves *and logs*. An agent following it hand-picks numbers and loses the audit trail the issue
 * existed to create. **A skill describing a stale API is worse than no skill, because an agent trusts
 * it.**
 *
 * WHAT THIS CATCHES, and the design note that matters: the obvious check — "every name a skill
 * quotes must resolve" — would NOT have caught that defect. `radiusScale` resolves fine; what rotted
 * was the prose around it, plus the total absence of `personality`. Measured before building, which
 * is the only reason the coverage check below exists at all. So there are two different scans:
 *
 *   1-3. REFERENCE checks — a name the skill quotes must still exist (dead references).
 *   4.   COVERAGE check   — a surface the engine grew must appear in the skill that documents it.
 *
 * Check 4 is the one that fires on the real defect, and it is deliberately opt-in per skill
 * (`documents: brandInput` in the frontmatter) rather than inferred — the same "declare it, don't
 * parse prose for it" rule `figmaProperties` follows.
 *
 * WHAT IT CANNOT SEE, stated because a gate that hides its ceiling gets trusted past it: prose that
 * is merely out of date while every name in it still resolves and every surface is mentioned. No
 * mechanical check reads advice for correctness. This gate keeps the *names* honest; a human or a
 * review keeps the *judgment* honest.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brandTheme } from './theme';
import { buildTree } from './tree';
import { buildAiMetadata } from './ai-metadata';
import { toolDefs } from './mcp';
import { leverManifest } from './levers';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const skillsDir = resolve(repo, 'Prism3/skills');

// ---- the reference sets, derived from the ENGINE rather than restated ---------------------------
const probe = brandTheme({ id: 'lint', primary: { l: 0.55, c: 0.15, h: 262 }, neutral: { hue: 262, chroma: 0.008 } } as never);
const { tree } = buildTree(probe);
const root = Object.keys(tree).find((k) => !k.startsWith('$'))!;

/** Every root-relative token path AND every proper suffix of one.
 *
 *  Suffixes matter because skills speak in ROLE terms — a skill writes `border.primary`, the tree
 *  holds `color.border.primary`. Requiring the full path would fail every skill for being readable. */
const tokenPathSet = (): Set<string> => {
  const out = new Set<string>();
  const walk = (node: unknown, prefix: string): void => {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith('$')) continue;
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && '$value' in (v as object)) {
        const segs = path.split('.');
        for (let i = 0; i < segs.length; i++) out.add(segs.slice(i).join('.'));
      } else if (v && typeof v === 'object') {
        const segs = path.split('.');
        for (let i = 0; i < segs.length; i++) out.add(segs.slice(i).join('.')); // families too, for `type.*`
        walk(v, path);
      }
    }
  };
  walk((tree as Record<string, unknown>)[root], '');
  return out;
};
const TOKEN_PATHS = tokenPathSet();

/** Lever KEYS are dotted too (`neutral.hue`, `typography.typeScale`) and are a legitimate thing for
 *  an authoring skill to quote — they are just not token paths. Accepted alongside them, because the
 *  first run flagged `neutral.hue` as dead when it is a required input field. A dotted name is a
 *  claim about *some* engine surface; the gate's job is that it resolves against one of them. */
const LEVER_KEYS = new Set(leverManifest.map((l) => l.key));

const TOOL_NAMES = new Set(toolDefs({}).map((d) => d.name));
/** `.ai.json` field names — the metadata vocabulary a consume-side skill legitimately quotes. */
const AI_FIELDS = (() => {
  const ai = buildAiMetadata(probe, tree) as Record<string, unknown>;
  const out = new Set(Object.keys(ai));
  for (const key of ['color_fields', 'typography_fields', 'primitive_fields', 'gradient_fields']) {
    const v = ai[key];
    if (Array.isArray(v)) v.forEach((n) => out.add(String(n)));
    else if (v && typeof v === 'object') Object.keys(v).forEach((n) => out.add(n));
  }
  // Frontmatter keys a skill file declares about itself.
  ['when_to_use', 'disable_model_invocation'].forEach((n) => out.add(n));
  return out;
})();

// ---- the scans ---------------------------------------------------------------------------------
/** A dotted, lowercase identifier that is unambiguously a token-path claim. Excludes filenames
 *  (`design.md`), leading-dot names (`.ai.json`), paths, and anything carrying punctuation. */
const DOTTED = /^[a-z][a-z0-9-]*(?:\.[a-z0-9*-]+)+$/;
const FILE_EXT = /\.(md|json|ts|js|html|css|png|svg)$/;
/** snake_case identifiers are either an MCP tool or an `.ai.json` field — nothing else in this repo
 *  uses that casing, which is what makes it a safe shape to require resolution for. */
const SNAKE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

type Finding = { file: string; kind: string; detail: string };

/**
 * Scan one skill's TEXT. Split out from `scanSkill` so the self-check can drive **this** function
 * rather than a copy of it.
 *
 * That split is the fix for a real defect, and the defect is worth stating: the first cut's
 * self-check called a private `fakeScan` — a reimplementation of this loop, 40 lines below it. The
 * shared regexes and sets were real, so it verified that *those* were intact, and could not verify
 * that anything still CALLED them. Neutering the `findings.push` here left `fakeScan` untouched, all
 * assertions passed, and the gate reported clean while the exact `action.*` regression this file was
 * written to catch walked straight through.
 *
 * **A self-check written against a reimplementation validates the copy, not the shipping code.** It
 * is #281 one layer along — there, no gate read the committed artifact; here, the self-check did not
 * read the live code path.
 *
 * Worth recording alongside it, because it is why the original mutation test missed this: the
 * mutation targeted `DOTTED`, a constant BOTH paths share, so both broke together and the pass read
 * as proof. **A mutation on a shared dependency cannot distinguish two code paths that depend on it.**
 * Mutate the call site, not the constant.
 */
export const scanText = (text: string, rel: string, findings: Finding[]): void => {
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const raw = m[1].trim();
    if (!raw || FILE_EXT.test(raw) || raw.startsWith('.') || /[\s/:<>{}|[\]()]/.test(raw)) continue;
    // A COUNTER-EXAMPLE is exempt, and this class was not anticipated: a skill teaching "do not guess
    // this name" has to QUOTE a name that by definition does not resolve. `prism3-consume` says
    // "it's `color.foreground.success-subtle` …, not `color.feedback.success.surface`" — flagging
    // that would punish the file for doing the most useful thing in it. Found on the first run
    // against real skills, which is the argument for running a new gate before trusting its design.
    if (/\b(?:not|never|rather than|instead of)\s+$/i.test(text.slice(Math.max(0, m.index - 16), m.index))) continue;

    // 1. token-path claims must still resolve (wildcards resolve as a family prefix)
    if (DOTTED.test(raw)) {
      const hit = raw.endsWith('.*')
        ? [...TOKEN_PATHS].some((p) => p.startsWith(raw.slice(0, -1)))
        : raw.includes('*')
          ? [...TOKEN_PATHS].some((p) => new RegExp(`^${raw.replace(/[.]/g, '\\.').replace(/\*/g, '[a-z0-9-]+')}$`).test(p))
          : TOKEN_PATHS.has(raw) || LEVER_KEYS.has(raw);
      if (!hit) findings.push({ file: rel, kind: 'dead token path', detail: `\`${raw}\` does not resolve in the generated tree` });
      continue;
    }

    // 2. snake_case must be a real MCP tool or a real .ai.json field
    if (SNAKE.test(raw) && !TOOL_NAMES.has(raw) && !AI_FIELDS.has(raw)) {
      findings.push({ file: rel, kind: 'unknown identifier', detail: `\`${raw}\` is neither an MCP tool (${[...TOOL_NAMES].join(', ')}) nor an .ai.json field` });
    }
  }

  // 3. every engine file a skill points at must exist — catches a renamed entry point
  for (const m of text.matchAll(/Prism3\/[A-Za-z0-9/_.-]+\.ts/g)) {
    if (!existsSync(resolve(repo, m[0]))) findings.push({ file: rel, kind: 'missing file', detail: `${m[0]} does not exist` });
  }

};

/** Read one skill and run every check over it. Thin on purpose: the per-text scanning lives in
 *  `scanText` so the self-check exercises the same function CI does, and check 4 is here because it
 *  needs the file to declare `documents:` in its own frontmatter. */
const scanSkill = (dir: string, findings: Finding[]): void => {
  const path = join(skillsDir, dir, 'SKILL.md');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  const rel = relative(repo, path);
  scanText(text, rel, findings);

  // 4. COVERAGE — the check that catches the real class. Opt-in per skill, so a new skill declares
  //    what it documents rather than the gate guessing from prose.
  if (/^documents:\s*brandInput\s*$/m.test(text)) {
    const schema = JSON.parse(readFileSync(resolve(repo, 'Prism3/schema/theme-schema.json'), 'utf8'));
    const declaredOmit = new Set(
      // `/gm`, not `/m` — `matchAll` THROWS on a non-global regex. It did, and the crash was hidden
      // because the run was piped through `grep -c`, which reported `0` and read as "clean".
      [...text.matchAll(/^omits:\s*(.+)$/gm)].flatMap((m) => m[1].split(',').map((s) => s.trim())),
    );
    for (const prop of Object.keys(schema.properties)) {
      if (declaredOmit.has(prop)) continue;
      // Word-boundary match so `surfaces` does not satisfy `surface`.
      if (!new RegExp(`\\b${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) {
        findings.push({ file: rel, kind: 'uncovered input surface', detail: `\`${prop}\` is a BrandInput property this skill never mentions — document it, or add it to the frontmatter \`omits:\` list` });
      }
    }
  }
};

// ---- SELF-CHECK: can the gate still see what it claims to? ---------------------------------------
// Drives `scanText` — the SHIPPING function — not a copy of it. The first cut called a private
// reimplementation, so neutering the real scan left every assertion passing and the gate reported
// clean with the `action.*` regression it exists to catch walking straight through. A self-check
// written against a reimplementation validates the copy, not the shipping code.
//
// Samples are phrased deliberately unlike the scans' own vocabulary, and each scan is exercised in
// BOTH directions — a true positive and a false positive — so neither widening nor narrowing can
// pass unnoticed.
const sampleScan = (body: string): Finding[] => { const f: Finding[] = []; scanText(body, 'self-check', f); return f; };

const selfCheck = (): string[] => {
  const bad: string[] = [];
  if (!sampleScan('use `color.text.nonexistent` here').length) bad.push('a dead token path is no longer detected');
  if (sampleScan('use `color.text.primary` here').length) bad.push('a VALID token path is now falsely flagged');
  if (sampleScan('set `neutral.hue` in the brief').length) bad.push('a VALID LEVER KEY is now falsely flagged (dotted, but an input field not a token)');
  if (!sampleScan('call `theme_bland` first').length) bad.push('an unknown snake_case identifier is no longer detected');
  if (sampleScan('call `theme_brand` first').length) bad.push('a VALID MCP tool name is now falsely flagged');
  if (sampleScan('see `design.md` and `.ai.json`').length) bad.push('a filename is now falsely flagged');
  // The counter-example exemption must NOT become a blanket amnesty: a dead name still fails when it
  // is presented positively, and passes only when the prose explicitly warns against it. Both
  // directions asserted through the real scan, so the exemption cannot quietly widen.
  if (sampleScan('reach for that, not `color.feedback.success.surface`').length) bad.push('a counter-example is no longer exempted');
  if (!sampleScan('reach for `color.feedback.success.surface`').length) bad.push('the counter-example exemption became a blanket amnesty (a dead name passes when stated POSITIVELY)');
  // A missing engine file is check 3, and it runs over the same text — sampled so deleting that loop
  // is not silent either.
  if (!sampleScan('run Prism3/engine/does-not-exist.ts now').length) bad.push('a missing engine-file reference is no longer detected');
  if (sampleScan('run Prism3/engine/cli.ts now').length) bad.push('a REAL engine file is now falsely flagged');
  return bad;
};

const selfFails = selfCheck();
if (selfFails.length) {
  console.error("\n❌ the skills gate's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

const dirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, 'SKILL.md'))) : [];
const findings: Finding[] = [];
for (const d of dirs) scanSkill(d, findings);

console.log(`Skills gate — ${dirs.length} skill(s) scanned (${dirs.join(', ')}).`);
// A scan that goes dark reports success forever. Zero skills means the layout moved, not that the
// skills are clean.
if (dirs.length === 0) {
  console.error('\n❌ no skills found under Prism3/skills — the layout moved, or the scan is pointed at nothing.');
  process.exit(1);
}
if (findings.length) {
  console.error(`\n❌ ${findings.length} stale claim(s) in shipped skills:\n`);
  for (const f of findings) console.error(`  ${f.file}\n    [${f.kind}] ${f.detail}`);
  console.error('\n  A skill describing a stale API is worse than no skill — an agent trusts it.');
  process.exit(1);
}
console.log('  ✓ clean — every name a skill quotes resolves, and every documented surface is covered.');
