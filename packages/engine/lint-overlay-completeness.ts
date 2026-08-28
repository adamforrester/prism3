/**
 * OVERLAY COMPLETENESS GATE (#708) — every leaf that varies in a mode reaches that mode's overlay,
 * and nothing else does. Across every projected AXIS: `theme` and, since #1129, `surface`.
 *
 *   npx tsx packages/engine/lint-overlay-completeness.ts
 *
 * THE DEFECT THIS WOULD HAVE CAUGHT. `$extensions.prism3.modes` was written in two shapes: color
 * entries wrapped their value (`{ $value, contrast, … }`), shadow entries were the bare layer array.
 * `emit-dtcg-overlay.ts` tested `'$value' in m` — correct about its own condition, wrong about its
 * assumption that every entry wraps — so every mode-varying shadow failed the test and was dropped
 * from every overlay. **All four brands shipped light-mode shadows in dark mode.** `nb` had 7
 * mode-varying shadows with genuinely different values (`shadow.inset` alpha 0.08 → 0.3, nearly 4×)
 * and 0 of them reached `nb.dark.overlay.tokens.json`.
 *
 * WHY EVERY EXISTING GATE PASSED IT, which is the part worth internalizing: a consumer reads
 * `base + overlay`, so base supplies every token and each one *is* present in every mode. The
 * projection was complete, consistent, and wrong. `check-consumability.mjs` asserts coverage and
 * presence; both were true. Nothing anywhere held an independent answer to **which** tokens ought to
 * differ per mode — that was the gap, not any single assertion.
 *
 * ── INDEPENDENCE (docs/34) — READ THIS BEFORE "SIMPLIFYING" ANYTHING BELOW ──────────────────────
 *
 * The objection to this gate is that it looks circular: overlays are BUILT from the canonical modes
 * extension, so comparing overlay-to-extension compares the projector against its own input. That
 * objection is wrong, and precisely why is the whole design:
 *
 *   EXPECTED — derived HERE, from the projector's INPUT (the canonical tree's modes extension),
 *              by this file's own independent traversal and its own value comparison.
 *   ACTUAL   — read from the projector's OUTPUT (the emitted overlay artifacts).
 *
 * A function's input and its output are two different things; asserting a relation between them is
 * the ordinary shape of a test, not a tautology. What would make it circular — and what must NEVER
 * be done here — is deriving EXPECTED by either:
 *
 *   ✗ calling `buildOverlay()` (or any part of it) to compute what the overlay should contain, or
 *   ✗ reading the overlay artifacts to decide which leaves ought to be in them.
 *
 * Either turns this into the gate agreeing with itself: the #708 bug would be reproduced identically
 * on both sides and reported as a pass. **This file therefore re-implements the "does this leaf vary
 * in this mode?" question rather than importing it.** That duplication IS the gate. It is not
 * redundancy to be DRY'd away — deleting it deletes the only independent opinion in the comparison
 * (CLAUDE.md principle 4; `docs/34-gate-independence.md`).
 *
 * Two imports here are deliberately of the SUBJECT rather than of the expected value, which is the
 * same posture `lint-payload-manifest.ts` and `lint-us-english.ts` take:
 *
 *   `isConformingLeaf` — the conformance FILTER (#642). A leaf typed outside the spec is absent from
 *   the projection by design, so a gate using its own copy of that list would report every `spring`
 *   token as a missing overlay leaf. This is scoping, not the expected value.
 *
 *   `overlayModes` — WHICH modes exist. Same reason: a hand-maintained mode list here would fail on
 *   the next brand that adds one. WHICH LEAVES belong in each mode — the actual claim — is computed
 *   below and imported from nowhere.
 *
 *   `AXES` / `overlayTag` — WHICH axes exist and what their artifacts are called. Scoping again, and
 *   deliberately cross-checked rather than trusted: `REQUIRED_AXES` below is this file's own list, and
 *   the two must agree in BOTH directions. An axis removed from `AXES` fails here by name instead of
 *   quietly emptying the loop, and an axis added there fails until someone has decided this gate covers
 *   it. That is the cheap version of the hole `overlayModes` cannot see — a walk over an extension map
 *   nobody writes any more returns `[]`, and a gate whose loop body never runs prints "clean".
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  MISSING   — a leaf that varies in mode M and is absent from M's overlay.  ← the #708 defect
 *   B  EXTRANEOUS— a leaf present in M's overlay that does NOT vary in M.        ← the reverse
 *                  defect, equally wrong and equally unchecked before this.
 *   C  VALUE     — a leaf in both, where the overlay's `$value` is not the mode's value. A leaf can
 *                  be present with the wrong content; membership alone would not notice.
 *   D  SHAPE     — a canonical modes entry that is not the wrapped `{ $value: … }` form. This is the
 *                  #708 CAUSE rather than its symptom, caught one step upstream of arms A–C, and it
 *                  fires even in the world where some other projector happens to read both shapes.
 *   E  AXIS      — an axis that produced no overlay at all for a brand. Arms A–D are all statements
 *                  about the CONTENTS of an overlay and every one of them is vacuously satisfied by a
 *                  brand that has none, so without this the surface axis could stop being emitted and
 *                  the only visible change would be a shorter passing summary (#1129).
 *
 * Arm B matters more than it looks. A too-eager projector inflates every overlay with values a
 * consumer then applies for no reason, and because the extra values are real values, nothing
 * downstream can tell they were not supposed to be there — the same silence that hid #708.
 *
 * ── SCOPE: BY RULE, NOT BY TYPE LIST ────────────────────────────────────────────────────────────
 *
 * `shadow` is the only composite carrying per-mode values today, and this gate does not know that.
 * It walks every conforming leaf of every `$type` and asks whether its modes entry differs from
 * base. `typography`, `border`, `transition` and `gradient` hit the identical projector guard the day
 * they gain a mode entry, so a shadow-shaped gate would leave the trap armed for the next composite.
 * There is deliberately no `$type` check and no shadow special case anywhere below.
 *
 * PURE-ADJACENT — reads the committed artifacts, like `regen --check`. Runs over every brand
 * discovered in `out/`, so a new brand is covered without editing this file.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AXES, isConformingLeaf, overlayModes, overlayTag, type OverlayAxis } from './emit-dtcg-overlay.ts';

const OUT = join(import.meta.dirname, 'out');

/**
 * The axes this gate claims to cover — spelled out here, and reconciled with `AXES` in both directions
 * before anything else runs. See the header: this is the arm-E guard's own independent side.
 */
const REQUIRED_AXES: readonly OverlayAxis[] = ['theme', 'surface'];

type Node = Record<string, unknown>;

const isLeaf = (n: unknown): n is Node => !!n && typeof n === 'object' && '$value' in (n as Node);

/**
 * EXPECTED, computed from the projector's input by this file's own traversal.
 *
 * Deliberately NOT `buildOverlay` and deliberately not a call into anything in `emit-dtcg-overlay.ts`
 * beyond the conformance filter — see the independence note in the header. The three conditions a
 * leaf must meet to belong in mode M's overlay, each re-stated here rather than imported:
 *
 *   1. its `$type` is a DTCG type (the #642 conformance filter — scoping, imported);
 *   2. its map for this axis has an entry for M;
 *   3. that entry's value DIFFERS from the leaf's base `$value`.
 *
 * Condition 3 is the one that makes this a real second opinion: an entry equal to base is emitted by
 * the engine (a mode can re-derive a value and land on the same one) and is correctly absent from the
 * overlay, so a gate that only checked for an entry's PRESENCE would report false missing leaves.
 *
 * On the SURFACE axis it does more than avoid a false positive — it is the whole count. All 128 pointer
 * leaves declare `surfaces.inverse`; the 16 that `inverse-coverage.ts` registers as `self` declare
 * their own token as the inverse one, so 112 differ. This gate reaches 112 by comparing values, having
 * never heard of the register or of `inverseCounterpart` — which is what makes it an opinion about the
 * pairing rule rather than a restatement of it.
 *
 * WHY THIS READS AN UNWRAPPED ENTRY INSTEAD OF REFUSING IT, which looks like exactly the tolerance
 * #708 was about and is the opposite: an entry that is not `{ $value: … }` is recorded as arm-D
 * failure **and then read anyway**, as its own value. Refusing — throwing, or skipping the leaf —
 * would make the gate blind precisely in the world it exists to describe. In the #708 tree every
 * shadow entry is a bare array, so a gate that died on the first one would report "unreadable shape"
 * and never reach the finding that matters: *28 shadows are missing from their overlays and consumers
 * are rendering the wrong ones.* Reading on costs nothing (the shape is still reported, by path) and
 * buys the full blast radius in one run. Tolerating a shape in a REPORT is not the same as tolerating
 * it in a PRODUCER; `tree.ts` normalizes and `emit-dtcg-overlay.ts` throws, and neither should be
 * relaxed to match this.
 */
const expectedLeaves = (tree: unknown, mode: string, axis: OverlayAxis): { leaves: Map<string, unknown>; unwrapped: string[] } => {
  const leaves = new Map<string, unknown>();
  const unwrapped: string[] = [];
  const walk = (n: unknown, path: string): void => {
    if (!n || typeof n !== 'object') return;
    if (isLeaf(n)) {
      if (!isConformingLeaf(n)) return;
      const modes = ((n.$extensions as Node | undefined)?.prism3 as Node | undefined)?.[AXES[axis]] as Node | undefined;
      if (!modes || !(mode in modes)) return;
      const entry = modes[mode];
      const wrapped = !!entry && typeof entry === 'object' && !Array.isArray(entry) && '$value' in (entry as Node);
      if (!wrapped) unwrapped.push(path);
      const modeValue = wrapped ? (entry as Node).$value : entry;
      if (JSON.stringify(modeValue) !== JSON.stringify(n.$value)) leaves.set(path, modeValue);
      return;
    }
    for (const [k, v] of Object.entries(n as Node)) if (!k.startsWith('$')) walk(v, path ? `${path}.${k}` : k);
  };
  walk(tree, '');
  return { leaves, unwrapped };
};

/** ACTUAL: every leaf in an emitted overlay artifact, path → its `$value`. */
const actualLeaves = (overlay: unknown): Map<string, unknown> => {
  const out = new Map<string, unknown>();
  const walk = (n: unknown, path: string): void => {
    if (!n || typeof n !== 'object') return;
    if (isLeaf(n)) { out.set(path, (n as Node).$value); return; }
    for (const [k, v] of Object.entries(n as Node)) if (!k.startsWith('$')) walk(v, path ? `${path}.${k}` : k);
  };
  walk(overlay, '');
  return out;
};

const read = (f: string): unknown => JSON.parse(readFileSync(join(OUT, f), 'utf8'));

/**
 * Two values rendered as a windowed pair around their FIRST divergence.
 *
 * Not cosmetic. A shadow is ~300 characters of which one alpha channel differs, so truncating both
 * sides from the start prints two identical prefixes and names no difference at all — a failure
 * message that proves only that the gate is unhappy. Windowing on the divergence point is what makes
 * the report actionable for composites, which are exactly the types #708 was about.
 */
const divergence = (a: unknown, b: unknown): string => {
  const [x, y] = [JSON.stringify(a) ?? 'undefined', JSON.stringify(b) ?? 'undefined'];
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const from = Math.max(0, i - 24);
  const win = (s: string): string => `${from ? '…' : ''}${s.slice(from, i + 40)}${i + 40 < s.length ? '…' : ''}`;
  return `differ at char ${i}:\n      overlay:   ${win(x)}\n      canonical: ${win(y)}`;
};

const brands = readdirSync(OUT)
  .map((f) => /^([a-z0-9-]+)\.tokens\.json$/.exec(f)?.[1])
  .filter((b): b is string => !!b)
  .sort();

if (!brands.length) {
  console.error('✗ no brand token trees found in out/ — nothing to check (did regen run?)');
  process.exit(1);
}

const failures: string[] = [];
let modesChecked = 0;
let leavesAsserted = 0;
const perBrand: string[] = [];

// The axis reconciliation, before any brand is read — arm E's independent side (see the header). Both
// directions, because they fail differently: an axis gone from `AXES` means this gate silently stopped
// checking one, and an axis added there means it never started.
for (const axis of REQUIRED_AXES) {
  if (!(axis in AXES)) failures.push(`axis '${axis}' is required by this gate but absent from AXES in emit-dtcg-overlay.ts — the projection stopped covering an axis the gate promises`);
}
for (const axis of Object.keys(AXES)) {
  if (!REQUIRED_AXES.includes(axis as OverlayAxis)) failures.push(`axis '${axis}' is projected by emit-dtcg-overlay.ts but not listed in REQUIRED_AXES here — add it once you have decided this gate covers it, rather than letting it go unchecked`);
}

for (const brand of brands) {
  const canonical = read(`${brand}.tokens.json`);
  const notes: string[] = [];

  for (const axis of REQUIRED_AXES.filter((a) => a in AXES)) {
    const modes = overlayModes(canonical, axis);

    // ARM E — the axis produced nothing. Every other arm is a statement about an overlay's contents and
    // so is satisfied for free when there is no overlay.
    if (!modes.length) {
      failures.push(
        `${brand}/${axis}: NO OVERLAY on this axis — no leaf in the canonical tree carries a ` +
        `'${AXES[axis]}' entry, so the projector emitted nothing and arms A–D had nothing to check. ` +
        `Either the producer stopped writing that map (see tree.ts) or the axis should not be in AXES.`,
      );
    }

    for (const mode of modes) {
      // The overlay is addressed by its TAG, so the theme axis's `dark` and a later axis's own `dark`
      // could never be read from the same file. Reported by tag too, for the same reason.
      const tag = overlayTag(axis, mode);
      const file = `${brand}.${tag}.overlay.tokens.json`;
      let overlay: unknown;
      try {
        overlay = read(file);
      } catch {
        failures.push(`${brand}/${tag}: ${file} is missing, but the canonical tree declares ${axis} mode '${mode}'`);
        continue;
      }
      modesChecked++;

      const { leaves: expected, unwrapped } = expectedLeaves(canonical, mode, axis);
      const actual = actualLeaves(overlay);
      leavesAsserted += expected.size;

      // ARM D — the cause, not the symptom. Reported before A–C because a shape divergence explains
      // whatever those arms are about to say.
      for (const path of unwrapped) {
        failures.push(
          `${brand}/${tag}: UNWRAPPED ${AXES[axis]} entry — '${path}' carries its value bare instead of ` +
          `as { $value: … }. This is the #708 shape: two shapes for one concept, which is what let a ` +
          `projector guard read one and silently drop the other. Normalize the producer (tree.ts).`,
        );
      }

      // ARM A — varies in the canonical tree, absent from the overlay. This is #708.
      for (const [path, want] of expected) {
        if (!actual.has(path)) {
          failures.push(
            `${brand}/${tag}: MISSING from the overlay — '${path}' varies in this mode ` +
            `(mode value ${JSON.stringify(want).slice(0, 72)}) but the overlay has no such leaf. ` +
            `A consumer reading base + ${tag}.overlay gets the BASE value here.`,
          );
        }
      }

      // ARM B — present in the overlay, does not vary in the canonical tree. The reverse defect.
      for (const path of actual.keys()) {
        if (!expected.has(path)) {
          failures.push(
            `${brand}/${tag}: EXTRANEOUS in the overlay — '${path}' is present but does not vary in ` +
            `this mode's canonical ${AXES[axis]} entry. Either the projector emitted a leaf it should ` +
            `not, or the canonical entry lost a value it should carry.`,
          );
        }
      }

      // ARM C — in both, but the overlay does not carry the mode's value.
      for (const [path, want] of expected) {
        if (!actual.has(path)) continue;
        const got = actual.get(path);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          failures.push(`${brand}/${tag}: WRONG VALUE for '${path}' — ${divergence(got, want)}`);
        }
      }

      // Composites are the #708 blast radius — a bare structured value is the shape the old guard could
      // not read — so report them per mode, making a regression to zero visible in the passing output
      // rather than only in a failure. Detected BY RULE: a composite is a leaf whose value is structured
      // rather than scalar. No list of type names, deliberately; `shadow` is the only composite carrying
      // modes today and this line must not be the place that remembers that.
      const composites = [...expected.values()].filter((v) => !!v && typeof v === 'object').length;
      notes.push(`${tag}=${expected.size}${composites ? ` (${composites} composite)` : ''}`);
    }
  }
  perBrand.push(`  ${brand.padEnd(8)} ${notes.join('  ')}`);
}

console.log('overlay completeness — expected leaves per mode, derived from the canonical tree:');
for (const line of perBrand) console.log(line);

if (failures.length) {
  console.error(`\n✗ ${failures.length} overlay completeness failure(s):\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error(
    `\nEach is a mismatch between a canonical axis extension (the projector's INPUT) and an emitted ` +
    `overlay (its OUTPUT). If the overlays look right and this gate is wrong, do not relax the ` +
    `comparison — the two sides are independent on purpose (#708, docs/34).`,
  );
  process.exit(1);
}

console.log(
  `\n  ✓ clean — ${leavesAsserted} varying leaves across ${modesChecked} overlays on ${REQUIRED_AXES.length} axes ` +
  `(${REQUIRED_AXES.join(', ')}) in ${brands.length} brands: every leaf that varies is in its overlay, with the ` +
  `mode's value, and nothing else is.`,
);
