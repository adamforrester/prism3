/**
 * Brand mark — a provider's own mark, drawn as the provider supplies it (#2316, #2343 proposal §1).
 *
 * No KB brief. Category `foundations`, beside Icon: it is the second icon type, a glyph other components
 * carry (a sign-in button's provider glyph, a card field's network mark, a footer's social links), never a
 * control of its own. The proposal on #2343 (2026-10-25) and the owner's calls on it (2026-10-26) are the
 * source; its open points are in `notes`.
 *
 * WHY NOT THE CORE `icon`. An icon is one `currentColor` path on a 24×24 artboard, and every host pushes its
 * ink into it (`descendantFills`). A mark is several paths in the provider's colors, on an artboard the kind
 * decides, and nothing may retint it: the provider's guidelines forbid it, and Remix's license forbids its
 * glyphs as logos (`icons/NOTICE.md`). So the artwork comes from `marks/` through `brand-mark-set.ts` and
 * `emit-marks.ts`, and this component paints nothing: it has no `paintKeys`, no ink token and no `tone`.
 *
 * THE SHAPE IS ICON'S, MATERIALIZED THE SAME WAY. One `vector` part, its glyph templated on `name`, and
 * `emitAsComponents`, so each mark is its own top-level `brand-mark/<kind>/<name>` component and the kind
 * folds into an assets-panel folder. The projector resolves this def's glyph against the mark vocabulary
 * (`BRAND_MARK_DOCUMENTS`) rather than the icon set, and writes the document with its literal fills.
 *
 * A CARD MARK IS A TILE, AND THE COMPONENT DRAWS ITS EDGE (owner decision Q720 A, 2026-10-26). The card files are
 * full-bleed: square corners, no border, the tile's ground kept, because a colored ground is part of the provider's
 * mark. The glyph's own frame rounds the corners and draws the 1px edge from the theme (`tileEdge`), and clips the
 * artwork to the rounded corners. Bound, not baked, so the corner and the edge are the same at every height a host
 * binds and in every mode; baked into the file, they would scale with the artwork. Square and wallet marks have no
 * edge. `lint-mark-colors.ts` holds both halves: the edge bound on every card member, and no card file baking one.
 *
 * NO COUNT IN THE PROSE. The owner will supply about a dozen providers (Q-B7 amended); the list is data, so
 * nothing here states how many marks there are. `lint-icon-count.ts` holds this def's prose to that.
 */
import { ComponentDef } from '../component-schema';
// The vocabulary, imported rather than restated: `emit-marks.ts` proves it matches the authored mapping and
// the folder in both directions, and that every file has a provenance record.
import { BRAND_MARK_NAMES } from '../brand-mark-glyphs';
import { BRAND_MARK_KINDS } from '../brand-mark-set';

/** The marks drawn on the card artboard, read from the vocabulary by kind, so a card network added to the set is a
 *  tile the day it lands: the tile edge below names these members and no other. */
const CARD_MARKS = BRAND_MARK_NAMES.filter((n) => BRAND_MARK_KINDS[n.split('/')[0]] === 'card');

export const brandMark: ComponentDef = {
  id: 'brand-mark',
  name: 'BrandMark',
  aliases: ['logo-mark', 'provider-logo', 'payment-mark', 'social-mark'],
  category: 'foundations',
  status: 'draft',
  summary: 'A provider\'s own mark, in its own colors: sign-in, wallet, card and social. Never retinted.',
  description:
    'A provider\'s mark, drawn as the provider supplies it: the glyph a sign-in or wallet button carries, a card network\'s mark in a payment field, a social network\'s mark in a footer link. The colors are the provider\'s and never change with the theme. A one-color form is its own mark, drawn by the provider, and exists only where the provider publishes one. Square marks are 24 by 24, card marks 32 by 20, and wallet lockups 24 high at the provider\'s width. A card mark is a tile: its corners and its edge come from the theme, the same at every size.',

  props: [
    { name: 'name', type: 'enum: BrandMarkName', values: [...BRAND_MARK_NAMES], required: true, description: 'Which mark, as kind and provider: card/visa, provider/google, social/instagram-mono. The list is generated from the mark set, so an unknown name fails at compile time, and a provider added to the set reaches the list the day it lands.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The height: 20, 24 or 32px, from the icon size tokens. The width follows from the mark\'s own proportion, so a card mark stays 8 by 5 and a wallet lockup keeps its width.' },
    { name: 'label', type: 'string', required: false, description: 'The accessible name, when the mark carries information the page states nowhere else, as in a row of accepted cards: the mark then has role="img" and aria-label. Without a label it is decorative and hidden from assistive tech, which is right inside a button or link whose own text or label names the provider.' },
  ],

  states: [],

  variants: {
    name: [...BRAND_MARK_NAMES],
  },
  axisKinds: { name: 'runtime' },

  // The height rungs a host binds when it carries a mark (proposal §1.3). A mark's main component is drawn at
  // its artboard; the host binds the height and the width follows from the mark's proportion.
  tokens: {
    'size.small': 'icon.size.sm',
    'size.medium': 'icon.size.md',
    'size.large': 'icon.size.lg',
    // A card tile's edge (Q720 A), existing roles only: the brand's small corner, the hairline, and the default
    // decorative border, so a white tile still reads as a card on a white page.
    'tile.radius': 'radius.sm',
    'tile.border-width': 'border-width.hairline',
    'tile.border': 'color.border.primary',
  },
  // The one paint this def binds is the tile's edge. The artwork takes none: the projector skips this def's glyph ink.
  paintKeys: ['tile.{slot}'],

  anatomy: {
    root: 'glyph',
    parts: {
      glyph: {
        kind: 'vector',
        role: 'target',
        // Resolved against the mark vocabulary, by the member's own name.
        glyph: '{name}',
        tileEdge: { when: { name: CARD_MARKS }, radius: 'tile.radius', strokeWidth: 'tile.border-width' },
        note: 'The mark itself, on its kind\'s artboard, in the provider\'s colors. It takes no ink from the component around it. On a card mark the frame rounds the corners and draws a 1px edge from the theme, over artwork drawn full-bleed.',
      },
    },
    codeOnly: [
      'label routing — the accessibility contract is a DOM shape: with a label, role="img" and aria-label; without one, aria-hidden="true". Figma has no accessibility tree, and the two are pixel-identical, so the Figma leg cannot carry it.',
      'forced colors — under forced-colors mode the browser would repaint the mark in system colors, which is the retint the provider forbids. The mark sets forced-color-adjust: none on itself only, so the text and focus ring around it still follow the user\'s colors.',
      'swapping the artwork in code — the package exports the marks as a name-to-SVG map, and an app may pass its own map with the same names to a BrandMarkProvider, so a brand\'s licensed artwork replaces the placeholders without forking a component (proposal §1.3, owner decision Q-B3 A).',
      'gradient ids — a mark with a gradient names it by id inside its own SVG. Two copies inline on one page share the id, and the second resolves to the first, so the code projection makes each instance\'s ids unique. Figma imports each mark once, where the collision cannot happen.',
      'width from the proportion — the host binds the height; the width is the height times the mark\'s artboard ratio. In code the SVG keeps its viewBox and width: auto. In Figma the host\'s slot is locked to the ratio (#2343 PR 2).',
    ],
  },

  // `name` alone, as on Icon: one standalone component per mark, `brand-mark/<kind>/<name>`. `size` is a height
  // a host binds, not a member. No swaps, booleans or state axis: a mark is what fills someone else's slot.
  figmaProperties: {
    variantAxes: ['name'],
    booleans: {},
    emitAsComponents: true,
  },

  accessibility: {
    role: 'img when it carries information on its own (with aria-label); none when decorative (aria-hidden="true")',
    wcag: [
      '1.1.1 Non-text Content (a mark that informs gets a text alternative; a decorative one is hidden)',
      '1.4.1 Use of Color (the brand a mark shows is also stated in text, as in a field\'s detected card type)',
    ],
    focus: 'None of its own. A mark takes no focus; the button or link around it does, with its own focus ring.',
    aria:
      'Decorative inside a control or link whose text names the provider ("Continue with Google", or a link labeled "Instagram"): leave label empty, which sets aria-hidden="true". Informative on its own, as in a row of accepted cards: set label to the provider\'s name ("Visa"), which sets role="img" and aria-label. Never name both the mark and the control around it. The provider\'s name is a proper noun and is not translated.',
  },

  content: {
    labelPattern: 'When it informs: the provider\'s own name, as the provider writes it ("Visa", "Apple Pay"). When decorative: no name.',
  },

  docs: {
    usage:
      'Use a mark only to identify that provider\'s own service: the provider glyph on a sign-in button, the network mark in a card field, a social link in a footer. Pick the style for the ground it sits on (black on light grounds, white on dark), and never recolor, stretch or redraw it. A brand swaps the artwork by name, without changing the components that carry it.',
    do: [
      'Use the full-color mark wherever the provider allows it',
      'Use a one-color mark only where the provider publishes one, in the provider\'s black or white',
      'Keep the mark\'s proportion: set the height, and let the width follow',
      'Hide a mark from assistive tech when the text beside it names the provider',
    ],
    dont: [
      'Recolor a mark to match the brand palette or the theme',
      'Make a one-color mark by filling the full-color one with a single color',
      'Use a mark as the only way to say which provider, card or network is meant',
      'Use a mark for any purpose other than identifying that provider\'s service',
    ],
    contentGuidelines:
      'Name an informative mark with the provider\'s own name, spelled the way the provider spells it. A decorative mark takes no name.',
  },

  ai: {
    primaryPurpose: 'Show a provider\'s mark, in the provider\'s colors and proportion, decorative or named.',
    whenToUse: 'Wherever a provider\'s service is named: in a sign-in or wallet button, a card field or a social link, and on its own, named by label, in a row of accepted cards.',
    avoidWhen:
      'For a generic concept glyph, use Icon: a mark identifies one provider and is never retinted. Never as a button on its own: a sign-in or social action is a button or link whose label names the provider, with the mark inside it, decorative. Never for a provider whose artwork is not in the set.',
    commonPartners: ['icon', 'link', 'button'],
    triggerKeywords: ['brand mark', 'logo', 'provider logo', 'payment logo', 'card network logo', 'social icon', 'sign in with', 'wallet logo'],
    generationPriority: 3,
  },

  composition: {
    composesWith: [],
    alternativeTo: ['icon'],
    replacesPatterns: ['provider logos pasted into a design as images', 'a provider logo recolored to match the palette'],
    planned: ['sign-in-button', 'wallet-button', 'payment-field', 'card-number-field'],
  },

  motion: {
    enter: 'none',
    exit: 'none',
    reduceMotion: 'Static. A mark has no motion of its own.',
  },

  notes: {
    contested: [
      'Which providers ship: the owner will supply about a dozen (Q-B7 amended), and the list is data. Today every mark but card/generic is a neutral placeholder named for the proposal\'s first set.',
      'Where the artwork lives if the repository goes public: committed today (Q-B1 B); refactored to placeholders plus recorded terms (Q-B1 A) before any publication. Recorded in marks/NOTICE.md and marks/provenance.json.',
    ],
    unverified: [
      'The social networks\' brand-resource terms have not been read; the gates check only what provenance.json records, so the terms arrive with the provider files (PR 3 of #2343).',
    ],
    evolution: [
      'Proposed on #2343 (2026-10-25) as a second icon type, after #2316 asked for provider marks the core set could not carry. The owner chose two swap routes, by name (Q-B3 A), separate one-color files only where the provider publishes them (Q-B2 A), and committed artwork for internal use (Q-B1 B).',
      'Card tiles (Q720 A, 2026-10-26): the card files are full-bleed, square corners and no border, and the component draws the corner radius and the edge from tokens, so every tile has the same edge at every size and mode. The placeholders were re-exported full-bleed before the provider files arrive.',
    ],
    projection: [
      'In Figma each mark is a standalone brand-mark/<kind>/<name> component, built from its SVG document by the importer, with every fill literal: no variable, no style and no host ink. A card mark\'s frame is the one exception, and it is the frame, not the artwork: its corner radii and stroke weight are bound variables, its stroke the border color, and it clips the artwork to its corners.',
    ],
  },
};
