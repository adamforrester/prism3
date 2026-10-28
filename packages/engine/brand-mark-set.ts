/**
 * Prism3 engine — THE BRAND-MARK VOCABULARY (#2316, #2343 proposal §1).
 *
 * **AUTHORED, never generated.** The second icon type: provider marks (sign-in glyphs, payment tiles, standalone
 * payment logos, social marks), which the core icon set cannot carry. `emit-icons.ts` takes one `currentColor`
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
 * Nothing in code counts the marks: every gate reads the
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
 * `<kind>/<provider>[-<style>]`, lowercase kebab-case after the slash (owner decision Q778 A): `payment/visa`,
 * `logo/apple-pay`, `provider/google`, `social/instagram-mono`. The kind is the name's first segment, and it decides the
 * artboard. The Figma component is `brand-mark/<name>`, so the slash folds into an assets-panel folder per
 * kind, the way `icon/<glyph>` does.
 *
 * Styles (owner decision Q-B2 A): a one-color form is its OWN file, drawn by the provider, and only where the
 * provider publishes one (`-mono` for social marks). A mark is never recolored to make one.
 *
 * ── THE KINDS (owner decisions on #2343, 2026-10-27) ─────────────────────────────────────────────────────
 *
 * `payment/` (Q780 A, renamed from `card/`): one full-bleed 32×20 tile for every logo in an "accepted payments" row,
 * card networks, wallets and buy-now-pay-later alike. `logo/` (Q783 A, renamed from `wallet/`): one 24-high logo per
 * provider, hugging its artwork, so its side spacing is the component's. `social/` (Q782): the full set, each in full
 * color and as `-mono`. `provider/`: the 24×24 sign-in glyphs.
 *
 * ── WHAT IS HERE TODAY ───────────────────────────────────────────────────────────────────────────────
 *
 * The owner's artwork (PR 3 of #2343), assembled from several public sources and hand-edited, each file with its
 * record. `payment/generic` is the owner's own "no card type yet" card.
 */

/** The three artboards (proposal §1.1; owner decisions Q780 A, Q781 A). A logo's width is its artwork's, declared
 *  per mark in `provenance.json` (`width`) and checked against the file. */
export const BRAND_MARK_ARTBOARDS = {
  /** Social and sign-in glyphs. */
  square: { width: 24, height: 24 },
  /** Payment tiles, 8:5, drawn full-bleed: the component draws the tile's corners and edge (Q720 A). */
  tile: { width: 32, height: 20 },
  /** Standalone logos: 24 high, hugging the artwork left and right, so the width is per mark. */
  logo: { width: 'per-mark', height: 24 },
} as const;

export type BrandMarkArtboard = keyof typeof BRAND_MARK_ARTBOARDS;

/** Each kind (a folder under `marks/`, and a name's first segment) and the artboard it is drawn on. */
export const BRAND_MARK_KINDS: Record<string, BrandMarkArtboard> = {
  social: 'square',
  provider: 'square',
  logo: 'logo',
  payment: 'tile',
};

/** Our mark name → its file under `marks/`, without `.svg`. */
export const BRAND_MARK_SOURCES: Record<string, string> = {
  // Payment tiles: every logo in an "accepted payments" row, card networks, wallets and buy-now-pay-later, on one
  // full-bleed 32×20 tile (Q780 A). `payment/generic` is the owner's card a field shows before it can tell the brand.
  'payment/affirm': 'payment/affirm',
  'payment/amazon-pay': 'payment/amazon-pay',
  'payment/amex': 'payment/amex',
  'payment/apple-pay': 'payment/apple-pay',
  'payment/diners-club': 'payment/diners-club',
  'payment/discover': 'payment/discover',
  'payment/generic': 'payment/generic',
  'payment/google-pay': 'payment/google-pay',
  'payment/klarna': 'payment/klarna',
  'payment/maestro': 'payment/maestro',
  'payment/mastercard': 'payment/mastercard',
  'payment/paypal': 'payment/paypal',
  'payment/shop-pay': 'payment/shop-pay',
  'payment/venmo': 'payment/venmo',
  'payment/visa': 'payment/visa',
  // Standalone payment logos, 24 high, hugging the artwork (Q781 A, Q783 A): the Figma stand-ins for a wallet button.
  'logo/affirm': 'logo/affirm',
  'logo/amazon-pay': 'logo/amazon-pay',
  'logo/amex': 'logo/amex',
  'logo/apple-pay': 'logo/apple-pay',
  'logo/diners-club': 'logo/diners-club',
  'logo/discover': 'logo/discover',
  'logo/google-pay': 'logo/google-pay',
  'logo/klarna': 'logo/klarna',
  'logo/mastercard': 'logo/mastercard',
  'logo/paypal': 'logo/paypal',
  'logo/paypal-wordmark': 'logo/paypal-wordmark',
  'logo/shop-pay': 'logo/shop-pay',
  'logo/venmo': 'logo/venmo',
  'logo/visa': 'logo/visa',
  // The glyph a sign-in button carries.
  'provider/apple': 'provider/apple',
  'provider/apple-black': 'provider/apple-black',
  'provider/facebook': 'provider/facebook',
  'provider/facebook-blue': 'provider/facebook-blue',
  'provider/google': 'provider/google',
  // Footer follow links and other social uses: the full set, each in full color and as a one-color `-mono` (Q782).
  'social/apple': 'social/apple',
  'social/apple-mono': 'social/apple-mono',
  'social/discord': 'social/discord',
  'social/discord-mono': 'social/discord-mono',
  'social/dribbble': 'social/dribbble',
  'social/dribbble-mono': 'social/dribbble-mono',
  'social/facebook': 'social/facebook',
  'social/facebook-mono': 'social/facebook-mono',
  'social/figma': 'social/figma',
  'social/figma-mono': 'social/figma-mono',
  'social/github': 'social/github',
  'social/github-mono': 'social/github-mono',
  'social/google': 'social/google',
  'social/google-mono': 'social/google-mono',
  'social/instagram': 'social/instagram',
  'social/instagram-mono': 'social/instagram-mono',
  'social/linkedin': 'social/linkedin',
  'social/linkedin-mono': 'social/linkedin-mono',
  'social/medium': 'social/medium',
  'social/medium-mono': 'social/medium-mono',
  'social/messenger': 'social/messenger',
  'social/messenger-mono': 'social/messenger-mono',
  'social/pinterest': 'social/pinterest',
  'social/pinterest-mono': 'social/pinterest-mono',
  'social/reddit': 'social/reddit',
  'social/reddit-mono': 'social/reddit-mono',
  'social/snapchat': 'social/snapchat',
  'social/snapchat-mono': 'social/snapchat-mono',
  'social/spotify': 'social/spotify',
  'social/spotify-mono': 'social/spotify-mono',
  'social/tiktok': 'social/tiktok',
  'social/tiktok-mono': 'social/tiktok-mono',
  'social/tumblr': 'social/tumblr',
  'social/tumblr-mono': 'social/tumblr-mono',
  'social/twitch': 'social/twitch',
  'social/twitch-mono': 'social/twitch-mono',
  'social/whatsapp': 'social/whatsapp',
  'social/whatsapp-mono': 'social/whatsapp-mono',
  'social/x': 'social/x',
  'social/x-mono': 'social/x-mono',
  'social/youtube': 'social/youtube',
  'social/youtube-mono': 'social/youtube-mono',
};
