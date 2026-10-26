/**
 * Prism3 engine — THE BRAND-MARK VOCABULARY (#2316, #2343 proposal §1).
 *
 * **AUTHORED, never generated.** The second icon type: provider marks (sign-in glyphs, wallet lockups, card
 * networks, social marks), which the core icon set cannot carry. `emit-icons.ts` takes one `currentColor`
 * path on a 24×24 artboard and every host pushes its ink into an icon; a mark needs several paths, literal
 * fills, its own artboard, and no host ink at all. So marks have their own folder (`marks/`), their own
 * vocabulary (this file), their own provenance record (`marks/provenance.json`) and their own emitter
 * (`emit-marks.ts`, which writes `brand-mark-glyphs.ts`).
 *
 * This file maps OUR mark names to the files in `marks/`, for the reason `icon-set.ts` maps glyph names: a
 * name is part of the versioned component surface (#823), so a swap of the artwork changes files, never
 * names. It is deliberately not derived from the directory — `emit-marks.ts` compares the two in both
 * directions, and a mapping generated from the folder would agree with it by construction (`docs/34`
 * shape 1).
 *
 * ── THE PROVIDER LIST IS DATA (owner decision on #2343, Q-B7 amended) ─────────────────────────────────
 *
 * The owner will supply marks for about a dozen providers. Nothing in code counts them: every gate reads the
 * folder, this file and `provenance.json`. What the gates assert is the one thing that holds at any size:
 * every listed mark has a file and a provenance record, and every file has a name and a record.
 *
 * Adding a provider is three data edits and the steps any new member owes the versioned surface:
 *   1. the SVG in its kind's folder;
 *   2. its entry here;
 *   3. its record in `provenance.json`;
 *   4. its name in `lint-axis-values.ts`'s hand-typed register (`AXIS_VALUE_SETS`, the `brand-mark` row);
 *   5. `--accept` on `lint-component-surface.ts` and `lint-component-renames.ts` (`component-axes.json`),
 *      after `regen.ts`;
 *   6. a change note for the surface drift (`packages/engine/changes/`).
 * Steps 4 to 6 are the same for a new core icon. Replacing a placeholder's artwork under its name is steps 1 and
 * 3, then `regen.ts`, `--accept` on `lint-component-surface.ts` alone (the member count holds and its plans move;
 * `component-axes.json` does not), and a change note (`engine: minor`).
 *
 * ── NAMES ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * `<kind>/<provider>[-<style>]`, lowercase kebab-case after the slash: `card/visa`, `social/instagram-mono`,
 * `provider/apple-white`, `wallet/apple-pay-black`. The kind is the name's first segment, and it decides the
 * artboard. The Figma component is `brand-mark/<name>`, so the slash folds into an assets-panel folder per
 * kind, the way `icon/<glyph>` does.
 *
 * Styles (owner decision Q-B2 A): a one-color form is its OWN file, drawn by the provider, and only where the
 * provider publishes one (`-mono` for social marks, `-black` / `-white` for sign-in and wallet artwork). A
 * mark is never recolored to make one, so there is no one-color Google G.
 *
 * ── WHAT IS HERE TODAY ───────────────────────────────────────────────────────────────────────────────
 *
 * NEUTRAL PLACEHOLDERS ONLY, named for the providers of the proposal's first set, so the owner's files are a
 * data drop (PR 3 of #2343): the SVGs and their provenance records change, and nothing here moves unless a
 * provider is added. Each placeholder is a gray shape on its kind's artboard, card-shaped or square, and its
 * record says `placeholder: true`.
 */

/** The three artboards (proposal §1.1). A wallet lockup's width is the provider's, declared per mark in
 *  `provenance.json` (`width`) and checked against the file. */
export const BRAND_MARK_ARTBOARDS = {
  /** Social and sign-in glyphs. */
  square: { width: 24, height: 24 },
  /** Card networks, 8:5. */
  card: { width: 32, height: 20 },
  /** Wallet logo lockups: 24 high, width per mark. Figma stand-ins for a provider-drawn button only. */
  wallet: { width: 'per-mark', height: 24 },
} as const;

export type BrandMarkArtboard = keyof typeof BRAND_MARK_ARTBOARDS;

/** Each kind (a folder under `marks/`, and a name's first segment) and the artboard it is drawn on. */
export const BRAND_MARK_KINDS: Record<string, BrandMarkArtboard> = {
  social: 'square',
  provider: 'square',
  wallet: 'wallet',
  card: 'card',
};

/** Our mark name → its file under `marks/`, without `.svg`. */
export const BRAND_MARK_SOURCES: Record<string, string> = {
  // Card networks. `card/generic` is the neutral card a field shows before it can tell the brand; it stays.
  'card/amex': 'card/amex',
  'card/generic': 'card/generic',
  'card/mastercard': 'card/mastercard',
  'card/visa': 'card/visa',
  // The glyph a sign-in or wallet button carries. Google publishes no one-color G, so it has one file.
  'provider/apple': 'provider/apple',
  'provider/apple-white': 'provider/apple-white',
  'provider/facebook': 'provider/facebook',
  'provider/google': 'provider/google',
  // Footer follow links and other social uses.
  'social/facebook': 'social/facebook',
  'social/facebook-mono': 'social/facebook-mono',
  'social/instagram': 'social/instagram',
  'social/instagram-mono': 'social/instagram-mono',
  'social/x-mono': 'social/x-mono',
  // Wallet lockups, one file per ink.
  'wallet/apple-pay-black': 'wallet/apple-pay-black',
  'wallet/apple-pay-white': 'wallet/apple-pay-white',
  'wallet/google-pay-black': 'wallet/google-pay-black',
  'wallet/google-pay-white': 'wallet/google-pay-white',
  'wallet/paypal': 'wallet/paypal',
  'wallet/shop-pay': 'wallet/shop-pay',
};
