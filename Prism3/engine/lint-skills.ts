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

/** How many times each scan actually RAN. See the wiring floor at the bottom of this file — the
 *  self-check can prove a scan works without proving anything still calls it. */
const ran = { text: 0, coverage: 0 };

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
  ran.text++;
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

/**
 * 4. COVERAGE — the check that fires on the real class, opt-in per skill so a skill declares what it
 * documents rather than the gate guessing from prose.
 *
 * A SEPARATE exported function for the same reason `scanText` is one, and it took a second review to
 * finish the job: the first fix routed the self-check through three of the four scans and left this
 * one inside `scanSkill`, unreachable from any assertion. Silencing its `findings.push` and stripping
 * `personality` from the skill whose job is teaching it still reported clean, exit 0 — the very
 * defect the previous round fixed, surviving in the one scan the extraction did not reach.
 *
 * **A self-check that covers three of four scans reports the same confident silence for the fourth.**
 * Partial coverage of a self-check is the same failure as no self-check, restricted to a smaller
 * surface — and the untested scan is disproportionately likely to be the interesting one, because the
 * interesting one is usually the one shaped differently enough to sit outside the common path.
 */
export const scanCoverage = (text: string, rel: string, findings: Finding[]): void => {
  if (/^documents:\s*brandInput\s*$/m.test(text)) {
    ran.coverage++;
    const schema = JSON.parse(readFileSync(resolve(repo, 'Prism3/schema/theme-schema.json'), 'utf8'));
    const declaredOmit = new Set(
      // `/gm`, not `/m` — `matchAll` THROWS on a non-global regex. It did, and the crash was hidden
      // because the run was piped through `grep -c`, which reported `0` and read as "clean".
      //
      // The `(?:\r?\n[ \t]+.*)*` tail reads YAML's line continuation: a long `omits:` list wraps onto
      // indented following lines, and `(.+)$` under `/m` stops at the first newline — so 7 of
      // `prism3-theme`'s 14 declared omissions were silently never parsed. Nothing surfaced it,
      // because those 7 were then "covered" by the prose scan reading the frontmatter that declared
      // them. **Two bugs that cancel read as one working feature**; fixing the scope of the prose
      // test is what made this one visible at all.
      [...text.matchAll(/^omits:[ \t]*(.*(?:\r?\n[ \t]+.*)*)/gm)].flatMap((m) =>
        m[1].split(',').map((s) => s.trim()).filter(Boolean),
      ),
    );
    // The prose test reads the BODY only, and that boundary is the whole mechanism — not tidiness.
    // Scanning the full text let `omits: personality` count as prose about `personality`, so every
    // declared omission was suppressed twice and `declaredOmit` was never the reason. Dead code that
    // looks live: replacing the `continue` below with `if (false)` still exited 0, because the prose
    // path caught everything the omit path was supposed to. **A declaration that also satisfies the
    // check it exempts you from makes the exemption unfalsifiable.** Keep the two inputs disjoint —
    // frontmatter DECLARES, body DOCUMENTS — and each one is testable on its own.
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    for (const prop of Object.keys(schema.properties)) {
      if (declaredOmit.has(prop)) continue;
      // Word-boundary match so `surfaces` does not satisfy `surface`.
      if (!new RegExp(`\\b${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(body)) {
        findings.push({ file: rel, kind: 'uncovered input surface', detail: `\`${prop}\` is a BrandInput property this skill never mentions — document it, or add it to the frontmatter \`omits:\` list` });
      }
    }
  }
};

/** Read one skill and run every check over it. Thin on purpose: both scans are exported functions so
 *  the self-check exercises exactly what CI does. */
const scanSkill = (dir: string, findings: Finding[]): void => {
  const path = join(skillsDir, dir, 'SKILL.md');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  const rel = relative(repo, path);
  scanText(text, rel, findings);
  scanCoverage(text, rel, findings);
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

  // Scan 4, driven through the shipping `scanCoverage`. Left out of the first fix, which is exactly
  // why it is here: the scan the self-check does not reach is the one that goes quiet.
  const sampleCoverage = (body: string): Finding[] => { const f: Finding[] = []; scanCoverage(body, 'self-check', f); return f; };
  const everyProp = Object.keys(
    JSON.parse(readFileSync(resolve(repo, 'Prism3/schema/theme-schema.json'), 'utf8')).properties,
  ).join(', ');
  if (!sampleCoverage('---\ndocuments: brandInput\n---\n\nthis skill documents nothing at all').length) {
    bad.push('an uncovered input surface is no longer detected (the scan that catches the class this gate exists for)');
  }
  if (sampleCoverage(`---\ndocuments: brandInput\nomits: ${everyProp}\n---\n\nall declared`).length) {
    bad.push('a fully declared `omits:` list is now falsely flagged');
  }
  // `omits:` asserted on ONE property, in both directions, against a body that mentions nothing. The
  // all-props sample above cannot tell "the omit list works" from "the omit list is ignored and the
  // body happened to cover everything" — with the frontmatter in scope it could not tell them apart
  // at all, since the list WAS the body. Here the omitted prop must vanish and its neighbours must
  // remain, so neither dropping the exemption nor widening it into an amnesty can pass.
  const someProp = Object.keys(
    JSON.parse(readFileSync(resolve(repo, 'Prism3/schema/theme-schema.json'), 'utf8')).properties,
  )[0];
  const oneOmitted = sampleCoverage(`---\ndocuments: brandInput\nomits: ${someProp}\n---\n\nnothing documented`);
  if (oneOmitted.some((f) => f.detail.includes(`\`${someProp}\``))) {
    bad.push(`a property declared in \`omits:\` (${someProp}) is still flagged — the omit list is not being consulted`);
  }
  if (!oneOmitted.length) {
    bad.push('declaring ONE property in `omits:` now exempts the whole skill — the omit list became a blanket amnesty');
  }
  // SCOPE, asserted directly: a property named only in the FRONTMATTER — and not declared in
  // `omits:` — is not documented, and must still be flagged. This is the assertion that fails if the
  // prose test is ever widened back to the whole file, and it needs to exist separately because
  // widening it is silent from every other direction: the two `omits:` assertions above still pass
  // under that change, since their props are exempt by declaration either way. Widening the scope is
  // precisely what made the omit list unfalsifiable, so the scope gets its own tripwire.
  if (
    !sampleCoverage(`---\ndocuments: brandInput\nsummary: this skill is all about ${someProp}\n---\n\nnothing documented`)
      .some((f) => f.detail.includes(`\`${someProp}\``))
  ) {
    bad.push(`a property mentioned ONLY in frontmatter (${someProp}) now counts as documented — the prose scan is reading the frontmatter again, which is what made \`omits:\` unfalsifiable`);
  }
  // The word boundary the scan's own comment claims, asserted rather than trusted. One sample covers
  // both edges: with either `\b` dropped, one of the two glued forms below starts matching and the
  // prop reads as documented. Cheap, and the failure it prevents is the quiet kind — a prop counted
  // as covered because some unrelated longer word happens to contain it.
  if (
    !sampleCoverage(`---\ndocuments: brandInput\n---\n\nzzz${someProp} and ${someProp}zzz\n`)
      .some((f) => f.detail.includes(`\`${someProp}\``))
  ) {
    bad.push(`\`${someProp}\` glued inside a longer word now counts as documenting it — the coverage match lost a word boundary`);
  }
  // The frontmatter strip must be LAZY — stop at the closing `---`, not at the last one in the file.
  // Neither shipped skill uses a `---` rule in its body today, so greedy and lazy agree on every real
  // input and nothing would surface the difference until a skill grew one and quietly lost every
  // paragraph above it. A gate whose correctness depends on no skill using a horizontal rule is one
  // markdown convention away from going silent, so the sample below documents a prop ABOVE a body
  // rule: lazy keeps it, greedy eats it.
  const allButSome = Object.keys(
    JSON.parse(readFileSync(resolve(repo, 'Prism3/schema/theme-schema.json'), 'utf8')).properties,
  ).filter((p) => p !== someProp).join(', ');
  if (
    sampleCoverage(`---\ndocuments: brandInput\nomits: ${allButSome}\n---\n\ncovers ${someProp} in full\n\n---\n\nclosing\n`).length
  ) {
    bad.push('a property documented ABOVE a body `---` rule is flagged as uncovered — the frontmatter strip went greedy and ate the body');
  }
  // A WRAPPED `omits:` list, because the real skill's is wrapped and half of it was being dropped.
  // The prop under test sits on the continuation line, where `(.+)$` cannot reach it.
  const lastProp = Object.keys(
    JSON.parse(readFileSync(resolve(repo, 'Prism3/schema/theme-schema.json'), 'utf8')).properties,
  ).at(-1)!;
  if (
    sampleCoverage(`---\ndocuments: brandInput\nomits: ${someProp},\n  ${lastProp}\n---\n\nnothing documented`)
      .some((f) => f.detail.includes(`\`${lastProp}\``))
  ) {
    bad.push(`a property on a WRAPPED \`omits:\` continuation line (${lastProp}) is still flagged — the parser stops at the first line`);
  }
  // The opt-in must stay opt-in: a skill that does NOT declare `documents:` is not held to coverage.
  if (sampleCoverage('---\nname: something\n---\n\nno documents declaration here').length) {
    bad.push('coverage now fires on a skill that never opted in');
  }
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
// Snapshot AFTER the self-check, which drives both scans with samples — the floor below asks what the
// real skills exercised, not what the samples did.
const before = { ...ran };
for (const d of dirs) scanSkill(d, findings);

console.log(`Skills gate — ${dirs.length} skill(s) scanned (${dirs.join(', ')}).`);
// A scan that goes dark reports success forever. Zero skills means the layout moved, not that the
// skills are clean.
if (dirs.length === 0) {
  console.error('\n❌ no skills found under Prism3/skills — the layout moved, or the scan is pointed at nothing.');
  process.exit(1);
}

// ---- WIRING FLOOR: did the scans the self-check validated actually run on the real skills? --------
// The self-check proves each scan WORKS. Nothing above proves anything still CALLS it. Deleting
// either call in `scanSkill` leaves every assertion passing — the self-check invokes the functions
// directly — and the gate prints "clean" over skills it never opened. That is #511's finding one
// layer along: there the self-check validated a copy instead of the shipping function; here it
// validates the shipping function while the shipping PATH no longer reaches it. **Proving a scan
// works and proving it runs are different claims, and only the second one is what CI buys.**
//
// Both expectations are derived from the skill files themselves rather than hard-coded, so adding a
// skill does not need a number updated here — the floor tracks the corpus.
const optedIn = dirs.filter((d) => /^documents:\s*brandInput\s*$/m.test(readFileSync(join(skillsDir, d, 'SKILL.md'), 'utf8')));
const wiring: string[] = [];
if (ran.text - before.text !== dirs.length) {
  wiring.push(`the reference scan ran ${ran.text - before.text}× over ${dirs.length} skill(s) — it is no longer called for every skill`);
}
if (ran.coverage - before.coverage !== optedIn.length) {
  wiring.push(`the coverage scan engaged ${ran.coverage - before.coverage}× but ${optedIn.length} skill(s) declare \`documents: brandInput\` (${optedIn.join(', ') || 'none'})`);
}
if (wiring.length) {
  console.error('\n❌ the skills gate is no longer wired to the skills it scanned:\n');
  for (const w of wiring) console.error(`    ${w}`);
  console.error('\n  A self-check proves a scan works; it cannot prove anything still calls it.');
  process.exit(1);
}
if (findings.length) {
  console.error(`\n❌ ${findings.length} stale claim(s) in shipped skills:\n`);
  for (const f of findings) console.error(`  ${f.file}\n    [${f.kind}] ${f.detail}`);
  console.error('\n  A skill describing a stale API is worse than no skill — an agent trusts it.');
  process.exit(1);
}
console.log('  ✓ clean — every name a skill quotes resolves, and every documented surface is covered.');
