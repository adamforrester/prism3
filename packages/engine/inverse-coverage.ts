/**
 * Prism3 engine — THE INVERSE-COVERAGE REGISTER (#892 step 5, #893, #1133, #1140).
 *
 * Every semantic colour role either has an inverse counterpart or is named here with the reason it
 * does not. That is the whole point: **a deliberate gap and an oversight must not look identical.**
 *
 * `test.ts` checks it BOTH directions — an uncovered role missing from this register fails, and an
 * entry whose role has since GAINED a counterpart fails as stale. Neither direction alone is enough:
 * the first stops a gap appearing silently, the second stops the register admitting one nobody
 * re-argued after the gap closed.
 *
 * ── WHAT THE REGISTER IS FOR NOW, AND WHY THAT SURVIVED #1133 ───────────────────────────────────
 *
 * It used to carry a third field, `alias: 'self' | 'omit'`, telling #893's two-mode Figma collection
 * what to do with a row whose role had no counterpart — self-alias it (every name resolves, at the cost
 * of making a deliberate gap look filled) or omit it (the gap stays legible, at the cost of a name that
 * does not resolve). **That field went with the surface MODE (#1133),** and the tier it steered went
 * with #1148. A single-mode pointer tier never asked "and in the inverse column?", so there was nothing
 * left for a disposition to steer; the pointer tier itself is now gone.
 *
 * The register was never about the pointer tier. It is a statement about the ROLE set — which of the
 * 243 semantic colour roles have an inverse counterpart — and under name-encoding that is the
 * load-bearing question rather than an incidental one: **an inverse component variant binds
 * `color.inverse.*` leaves, so a role listed below is a role no inverse variant can bind.** The
 * register is what bounds the bounded set. It is data and not a comment for the same reason it always
 * was — `test.ts` reads it, both directions, so a gap cannot appear silently and an entry cannot
 * outlive the gap it describes.
 *
 * Each `reason` must still distinguish STRUCTURAL ("the concept has no inverse form") from UNDECIDED
 * ("nobody has argued it yet"), because that is the distinction a reader is here for. The consequence
 * of `undecided` simply moved: it used to withhold a Figma row, and now it withholds an inverse
 * variant.
 *
 * ── #1140 MOVED NO DATA HERE, AND THAT IS WORTH STATING ─────────────────────────────────────────
 *
 * #1140 relocated all 113 inverse roles to a top-level `inverse.` group. Not one path below changed,
 * because every path below is a role that HAS NO inverse counterpart — the register stores the
 * uncovered role, never the counterpart it lacks. So the rename passes straight through the data and
 * touches only the prose that quotes a counterpart's SHAPE (`inverse.interactive.<palette>.on-fill`
 * below, `inverse.scrim.*`).
 *
 * What did get simpler is the CHECK: `test.ts` re-derives the counterpart locally, and the derivation
 * is now `inverse.` + the role for every family, where it needed three shapes before. It stays a LOCAL
 * derivation rather than an import from `modes.ts` or `inverse-roles.ts` — `docs/34` shape 1: a register
 * checked against the emitter's own expression of the same rule agrees with any bug in it.
 */

/** One class of role with no inverse counterpart, and why. */
export type InverseGap = {
  /** Roles below the configurable root, exactly as `modes.ts` emits them. */
  paths: string[];
  /** Why the gap exists. Must distinguish "the concept has no inverse form" from "not decided yet". */
  reason: string;
};

export const INVERSE_GAPS: InverseGap[] = [
  {
    paths: [
      'color.text.on-brand', 'color.text.on-danger', 'color.text.on-info',
      'color.text.on-success', 'color.text.on-warning',
      'color.icon.on-brand', 'color.icon.on-danger', 'color.icon.on-info',
      'color.icon.on-success', 'color.icon.on-warning',
    ],
    reason:
      'STRUCTURAL, not undecided. These are ink on a solid semantic FILL, and the fill is the ground — '
      + 'a brand-filled badge inside a dark hero is still brand-filled, so the ink that sits on it does '
      + 'not change. So there is nothing for an inverse counterpart to hold: the same token really is the '
      + 'right answer on either ground, which makes the absence correct rather than a placeholder. The '
      + 'case where a fill DOES change on an inverse ground is a different family and is already covered '
      + '— inverse.interactive.<palette>.on-fill. Excluded on principle in #892 step 4, and it is the '
      + 'same principle that makes the gap sound (#1133: an inverse variant of one of these components '
      + 'would bind the identical token, so there is no variant to declare).',
  },
  {
    paths: ['color.scrim.default'],
    reason:
      'UNDECIDED, deliberately. docs/20 §8 classifies a scrim as a VIEWPORT-level backdrop triggered by a '
      + 'modal opening — one veil over the whole page, including any inverse band — which is a different '
      + 'shape from every other role here and may mean it has no inverse form at all. The hero/image dim '
      + 'named in the same paragraph used to be the alternative reading; since #1030 it is `color.veil.*`, '
      + 'its own family below, which removes the ambiguity without deciding this one. '
      + '#1133 CHANGED WHAT THE UNDECIDEDNESS COSTS, AND IT WAS THE FIRST TIME IT COST A CONSUMER NOTHING. '
      + 'While the pointer tier had a second mode, an undecided role had to be OMITTED from it — a row '
      + 'would have had to answer "and on an inverse ground?" and inventing that answer is exactly what '
      + 'was being avoided. So this was the one non-inverse role with no plain `color.scrim.default` '
      + 'spelling, and a consumer had to reach into the value tier to say "I know there is no per-surface '
      + 'answer yet". With the mode reverted a pointer row asked nothing, and since #1148 there is one '
      + 'tier and therefore one spelling for every role, so the open question sits where it always '
      + 'belonged: whether an `inverse.scrim.*` role is ever added, and therefore whether a scrim can '
      + 'have an inverse variant. Still nobody\'s call to make silently — the register is the only thing '
      + 'holding it, which is the job it was built for.',
  },
  {
    paths: [
      'color.veil.dark.large', 'color.veil.dark.body', 'color.veil.dark.enhanced',
      'color.veil.light.large', 'color.veil.light.body', 'color.veil.light.enhanced',
    ],
    reason:
      'STRUCTURAL, not undecided. A veil composites over a PHOTOGRAPH, and an inverse band does not '
      + 'change the photograph — so the same token really is the right answer on both grounds, which is '
      + 'what makes the absence correct here rather than a placeholder. The choice a designer is making '
      + 'is already carried by the path: `dark` and `light` are both live in every mode because an image '
      + 'has no polarity the theme can read, so the polarity an inverse counterpart would supply is the '
      + 'one thing the veil must not take from its surroundings. (#1030)',
  },
];

/** Flattened, for the both-directions check in `test.ts`. */
export const INVERSE_GAP_PATHS = new Set(INVERSE_GAPS.flatMap((g) => g.paths));
