/**
 * Prism3 engine — THE INVERSE-COVERAGE REGISTER (#892 step 5, and #893's open decision).
 *
 * Every semantic colour role either has an inverse counterpart or is named here with the reason it
 * does not. That is the whole point: **a deliberate gap and an oversight must not look identical.**
 *
 * `test.ts` checks it BOTH directions — an uncovered role missing from this register fails, and an
 * entry whose role has since GAINED a counterpart fails as stale. Neither direction alone is enough:
 * the first stops a gap appearing silently, the second stops the register admitting one nobody
 * re-argued after the gap closed.
 *
 * ── WHY THIS IS DATA AND NOT A COMMENT ──────────────────────────────────────────────────────────
 *
 * #893 emits a `surface` Figma collection whose every row is an alias, `default` → the page token and
 * `inverse` → its counterpart. For a role with no counterpart it has to do something, and the two
 * options are not interchangeable:
 *
 *   - **OMIT** the row. The collection stays smaller and "no inverse behaviour" is the readable
 *     default — but a consumer binding `surface.*` uniformly hits a name that does not resolve.
 *   - **SELF-ALIAS** — point `inverse` at the same token as `default`. Every name resolves in both
 *     modes, at the cost of making a deliberate gap indistinguishable from a filled one.
 *
 * The second cost is only real if nothing else records which is which. **This register is that
 * something**, which is why the decision is per-entry rather than global: the right answer depends on
 * WHY the gap exists, and that is exactly what an entry carries.
 *
 * `alias: 'self'` means the value genuinely does not change on an inverse ground — the row is
 * correct, not a placeholder. `alias: 'omit'` means nobody has decided yet, so the name must not
 * resolve; a consumer who binds it should get an error rather than a plausible wrong colour.
 */

/** One class of role with no inverse counterpart, and why. */
export type InverseGap = {
  /** Roles below the configurable root, exactly as `modes.ts` emits them. */
  paths: string[];
  /** What #893's `surface` collection does with these rows. See the header. */
  alias: 'self' | 'omit';
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
    alias: 'self',
    reason:
      'STRUCTURAL, not undecided. These are ink on a solid semantic FILL, and the fill is the ground — '
      + 'a brand-filled badge inside a dark hero is still brand-filled, so the ink that sits on it does '
      + 'not change. Self-aliasing is CORRECT here rather than a placeholder: the same token really is '
      + 'the right answer in both modes. The case where a fill DOES change on an inverse ground is a '
      + 'different family and is already covered — interactive.<palette>.inverse.on-fill. Excluded on '
      + 'principle in #892 step 4, and it is the same principle that makes the self-alias sound.',
  },
  {
    paths: ['color.scrim.default'],
    alias: 'omit',
    reason:
      'UNDECIDED, deliberately, and omitted so it cannot be bound by accident. docs/20 §8 classifies a '
      + 'scrim as a VIEWPORT-level backdrop triggered by a modal opening — one veil over the whole page, '
      + 'including any inverse band — which is a different shape from every other role here and may mean '
      + 'it has no per-surface variant at all. The hero/image dim named in the same paragraph used to be '
      + 'the alternative reading; since #1030 it is `color.veil.*`, its own family below, which removes '
      + 'the ambiguity without deciding this row. Emitting a value either way would still be inventing '
      + 'the answer; omitting the row makes a consumer who wants one ask.',
  },
  {
    paths: [
      'color.veil.dark.large', 'color.veil.dark.body', 'color.veil.dark.enhanced',
      'color.veil.light.large', 'color.veil.light.body', 'color.veil.light.enhanced',
    ],
    alias: 'self',
    reason:
      'STRUCTURAL, not undecided. A veil composites over a PHOTOGRAPH, and an inverse band does not '
      + 'change the photograph — so the same token really is the right answer on both grounds, which is '
      + 'what makes self-aliasing correct here rather than a placeholder. The choice a designer is making '
      + 'is already carried by the path: `dark` and `light` are both live in every mode because an image '
      + 'has no polarity the theme can read, so the polarity a surface-context alias would supply is the '
      + 'one thing the veil must not take from the surface. (#1030)',
  },
];

/** Flattened, for the both-directions check in `test.ts` and for #893's emitter. */
export const INVERSE_GAP_PATHS = new Set(INVERSE_GAPS.flatMap((g) => g.paths));

/** How #893's `surface` collection should treat a role with no counterpart. */
export const gapDisposition = (path: string): 'self' | 'omit' | undefined =>
  INVERSE_GAPS.find((g) => g.paths.includes(path))?.alias;
