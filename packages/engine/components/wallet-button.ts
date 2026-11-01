/**
 * WalletButton — the express-checkout button a payment provider draws: Apple Pay, Google Pay, PayPal and Shop Pay
 * (#2343 PR 4).
 *
 * No KB brief. Category `form`, beside Button: it submits a payment the way Button submits a form, and it sits in the
 * checkout form beside the card fields. The proposal on #2343 (2026-10-25, §2) and the owner's calls on it are the
 * source: two components from one factory (Q-B4 A; SignInButton is PR 5), and in code a slot that mounts the
 * provider's own element (Q-B8 A). Q-B5 A decided valid provider × style pairs only: the style axis below carries it
 * (#3174), and provider × size carries the height rules the same way (the size exclusions below).
 *
 * THE PROVIDER DRAWS THE BUTTON. All four wallets forbid a hand-drawn copy of their button ("Don't create custom
 * Apple Pay button designs"; Google Pay's createButton(); PayPal's and Shopify's SDK elements). So in code this
 * component renders no button of its own: it is a sized, focus-ringed slot the provider's element mounts into, and
 * the provider fixes the mark, the colors, the wording and the font. Prism3 drives the height steps, the width, the
 * corner radius where the provider allows a range, and the focus ring.
 *
 * THE FIGMA MEMBER: THE PROVIDER'S OWN ARTWORK PER STYLE, OR A STAND-IN AT `any` (#3174, owner decisions Q3174.1–6, all
 * A; this is the route Q-W1 B left open). One `style` axis, in each SDK's own style names (Q3174.2 A), valid provider ×
 * style pairs only, with `any` first and the code default:
 *   - `any` is the stand-in Q-W1 A built: the provider's area at its size and corner, holding the provider's `logo/`
 *     mark, with no fill and no edge. Every member built before #3174 is an `any` member, at the same coordinate.
 *   - every other style is that style's button as the provider's SDK draws it: the `button/<provider>-<style>` mark (the
 *     logo exactly as the SDK draws it, captured unaltered from the SDK's own render, Q3174.3 A) on the ground and edge
 *     its provenance record carries. The record is the source of those two values, measured from the SDK's computed
 *     paint; this file types none of them. They reach the container through the literal record
 *     (`literal: 'surface'`), built from `PROVIDER_LOGO_BUTTON_PAINT`, the one literal paint `emit-marks.ts` emits, and
 *     only for `button/` marks. `lint-mark-colors.ts` (h) holds every member's ground and edge to the record.
 *   - the logo's height is the provider's ratio to the button height, as its SDK draws it at 44 (ink: Apple 21.5,
 *     Google 20.9, PayPal 16.6, Shop Pay 21.1), carried by the mark's own 44-high artboard, which places the logo
 *     where the SDK does. So the mark binds the button's own height and the ratio holds at every rung. An `any`
 *     member's `logo/` mark keeps the icon heights. Apple's and PayPal's SDKs scale the logo with the height; Google's
 *     keeps 22px of padding (its logo is the height minus 22) and draws nothing under 40, and Shop Pay's logo is 22 high
 *     at every height. At 36 and 56 the ratio is a reading of the 44 render, not those two SDKs' drawing (on the PR).
 *   - `plain` only (Q3174.5 A): the worded types stay a code setting, because each provider owns its wording and its
 *     translation.
 *   - Apple's HIG says not to replicate its button. Apple publishes its own design template of these buttons for design
 *     files, so a design-file stand-in drawn from Apple's own artwork matches what Apple gives designers; the code
 *     still mounts Apple's element (Q-B8 A). The owner went ahead on that reading (Q3174.6 A), recorded in `unverified`.
 *
 * THE PROVIDER RULES, AS DATA THE GATE HOLDS (`test.ts`, `#2343 PR 4 provider rules`, which types each rule again
 * from the providers' guidelines and never reads this file's numbers):
 *   - height: the shared `size.*` rungs, 36 / 44 / 56. Shop Pay's floor is 40, so it has no small member; Google Pay's
 *     SDK draws nothing under 40, so it has none either (Q3195.3 A); PayPal's ceiling is 55, so it has no large member
 *     (Q-W2 A, kept by Q3174.4 A). Apple Pay's 30 and PayPal's 25 floors sit under every rung.
 *   - width: a 120px floor, Shop Pay's logo-button minimum and the largest any of the four states (Apple Pay plain:
 *     100). The button fills its column in use. PayPal's script holds its frame at 150 or wider; that is a code-only
 *     note in `codeOnly` (Q3175 A), and the Figma floor stays 120.
 *   - radius: the brand's `radius.md`. Apple Pay, PayPal and Shop Pay allow any radius; Google Pay at most half the
 *     height. Harbor's `radius.md` is inside that at every density, and the gate measures it there; a soft brand's
 *     can pass it (`baseMd` 12 × `radiusScale` 2 is 24px against a 28px compact small), so the code clamps Google
 *     Pay's radius to half the height, and the gate holds that clamp at the levers' softest corner. The Figma
 *     member draws the brand radius, which Figma caps at half the height when it renders.
 *   - no shape axis: the proposal's §2.3 gave `shape: rectangle | pill`; the build binds `radius.md` only (Q-W5 on
 *     the PR, built as A).
 *   - the mark: `provider-logo/logo/<provider>` at `any`, `provider-logo/button/<provider>-<style>` at every other style,
 *     nested whole, height bound and width from its own proportion, keeping its own paint.
 */
import { ComponentDef, type LiteralEntry } from '../component-schema';
import { focusRingPart, heightExclusions, heightTokens, markPart, providerMap, radiusToken, ringTokens, type BrandedProviderRule } from '../branded-button';
import { PROVIDER_LOGO_BUTTON_PAINT, PROVIDER_LOGO_NAMES, type ProviderLogoName } from '../provider-logo-glyphs';

const PROVIDERS = ['apple-pay', 'google-pay', 'paypal', 'shop-pay'] as const;
type Provider = (typeof PROVIDERS)[number];

/** Each provider's stand-in logo in the mark set (the `any` style), and the height range its guidelines allow (the
 *  header above). PayPal's button carries its wordmark, not the monogram. */
const RULES: Record<Provider, BrandedProviderRule> = {
  'apple-pay': { mark: 'logo/apple-pay', minHeight: 30 },
  'google-pay': { mark: 'logo/google-pay', minHeight: 40 },
  paypal: { mark: 'logo/paypal-wordmark', minHeight: 25, maxHeight: 55 },
  'shop-pay': { mark: 'logo/shop-pay', minHeight: 40 },
};
const LOGO = providerMap(RULES);

/** The style that stands in for every style: the provider's area and logo, no fill (Q3174.1 A). */
const ANY = 'any';
/** Each provider's own styles, in the SDK's own names and its own order (Q3174.2 A): Apple Pay's buttonstyle, Google
 *  Pay's buttonColor, PayPal's style.color (gold, its recommended one, first) and Shop Pay's one color. A style is a
 *  member only when the mark set holds its `button/<provider>-<style>` artwork, so a style whose artwork is not in is
 *  excluded, never stood in. */
const STYLES: Record<Provider, readonly string[]> = {
  'apple-pay': ['black', 'white', 'white-outline'],
  'google-pay': ['black', 'white'],
  paypal: ['gold', 'blue', 'silver', 'white', 'black'],
  'shop-pay': ['purple'],
};
const buttonMark = (p: Provider, style: string): string => `button/${p}-${style}`;
const have = new Set<string>(PROVIDER_LOGO_NAMES);
/** Every provider × style pair with its artwork, in provider order and then the provider's own style order. */
const PAIRS = PROVIDERS.flatMap((provider) => STYLES[provider].filter((style) => have.has(buttonMark(provider, style))).map((style) => ({ provider, style })));
/** The style axis: `any` first, then each style the first time a provider names it. */
const STYLE_VALUES = [ANY, ...new Set(PAIRS.map((x) => x.style))];
const stylesOf = (p: Provider): string[] => PAIRS.filter((x) => x.provider === p).map((x) => x.style);

/** The literal record (Q3174.3 A): each style's ground and edge, as its `button/` mark's record states them, and an
 *  empty entry at `any`, the member that paints nothing. */
const ENTRIES: Record<string, LiteralEntry> = Object.fromEntries(PROVIDERS.flatMap((provider) => [
  [`${provider}.${ANY}`, {}],
  ...stylesOf(provider).map((style) => {
    const paint = PROVIDER_LOGO_BUTTON_PAINT[buttonMark(provider, style) as ProviderLogoName];
    if (!paint) throw new Error(`wallet-button: ${buttonMark(provider, style)} has no ground in PROVIDER_LOGO_BUTTON_PAINT`);
    return [`${provider}.${style}`, { fill: paint.ground, ...(paint.edge ? { edge: paint.edge.color } : {}) }];
  }),
]));

const SIZE_MARK = { small: 'icon.size.sm', medium: 'icon.size.md', large: 'icon.size.lg' } as const;
const SIZE_HEIGHT = { small: 'size.sm.height', medium: 'size.md.height', large: 'size.lg.height' } as const;

export const walletButton: ComponentDef = {
  id: 'wallet-button',
  name: 'WalletButton',
  aliases: ['express-checkout-button', 'payment-button', 'pay-button'],
  category: 'form',
  status: 'draft',
  summary: 'Express checkout with Apple Pay, Google Pay, PayPal or Shop Pay, drawn by the provider.',
  description:
    'A payment button for a wallet: Apple Pay, Google Pay, PayPal or Shop Pay. The provider draws the button itself, so its logo, colors, wording and font are the provider\'s and never change with the theme. The component sets the height, the width, the corner radius where the provider allows one, and the focus ring. Each provider has a smallest and a largest height, so Google Pay and Shop Pay start at the medium size and PayPal stops at medium. The design file shows each provider\'s own button in each of its styles, and a stand-in with the provider\'s logo and no fill when the style is left open; the button the customer sees comes from the provider.',

  props: [
    { name: 'provider', type: "enum: 'apple-pay' | 'google-pay' | 'paypal' | 'shop-pay'", values: [...PROVIDERS], required: true, description: 'Which wallet. Each needs its provider\'s script on the page, which draws the button.' },
    { name: 'style', type: `enum: ${STYLE_VALUES.map((v) => `'${v}'`).join(' | ')}`, values: [...STYLE_VALUES], default: ANY, required: false, description: `The provider\'s color style, from its own list, passed to the provider: Apple Pay ${stylesOf('apple-pay').join(', ')}; Google Pay ${stylesOf('google-pay').join(', ')}; PayPal ${stylesOf('paypal').join(', ')}; Shop Pay ${stylesOf('shop-pay').join(', ')}. Pick it for the ground the button sits on: dark buttons on light grounds, light ones on dark grounds. any passes no style, so the provider draws its default. A style the provider does not offer is refused.` },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The height: 36, 44 or 56px. Google Pay and Shop Pay have no small size and PayPal no large one, because each provider sets a smallest and a largest height.' },
    { name: 'type', type: 'string', default: 'plain', required: false, description: 'The provider\'s wording, from its own list, passed to the provider: plain shows the logo alone; buy, checkout, donate, order, pay and subscribe add the provider\'s words, translated by the provider. A value the provider does not offer falls back to plain.' },
  ],

  states: ['rest', 'focus-visible'],
  variants: {
    provider: [...PROVIDERS],
    style: STYLE_VALUES,
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { provider: 'authoring', style: 'authoring', size: 'authoring' },

  tokens: {
    ...heightTokens(),
    // The logo's height. The `any` stand-in's logo takes the icon heights, its width from its own proportion. A style's
    // logo is drawn on a 44-high artboard that places it where the provider's SDK does, so it binds the button's own
    // height and keeps the provider's logo-to-height ratio at every rung.
    ...Object.fromEntries((['small', 'medium', 'large'] as const).flatMap((size) => STYLE_VALUES.map((style) => [`size.${size}.${style}.mark`, style === ANY ? SIZE_MARK[size] : SIZE_HEIGHT[size]]))),
    ...radiusToken(),
    // The edge's weight where a style draws one: the 1px its record states, held against it by lint-mark-colors (h).
    'border-width': 'border-width.hairline',
    ...ringTokens(),
  },
  // Each style's ground and edge, from its `button/` mark's record (Q3174.3 A); none at `any`.
  literal: { key: '{provider}.{style}', entries: ENTRIES },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        children: ['mark', 'focusRing'],
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
        height: 'size.{size}.height',
        minWidth: 120,
        radius: 'radius',
        strokeWidth: 'border-width',
        literal: 'surface',
        note: 'The provider\'s button at its size and corner: the style\'s own fill, and a 1px edge where the provider draws one. With the style left open it has no fill and no edge, and the provider draws the button inside it.',
      },
      mark: markPart({
        nesting: {
          kind: 'nest-fixed',
          variant: { name: LOGO['apple-pay'] },
          variantWhere: PROVIDERS.flatMap((provider) => [
            { when: { provider, style: ANY }, set: { name: LOGO[provider] } },
            ...stylesOf(provider).map((style) => ({ when: { provider, style }, set: { name: buttonMark(provider, style) } })),
          ]),
        },
        height: 'size.{size}.{style}.mark',
        note: 'The provider\'s logo, in its own colors and proportion, centered: for a style, exactly as the provider draws it on that style\'s button, at the provider\'s height for the button. Only its height is set.',
      }),
      focusRing: focusRingPart('The shared focus ring, around the provider\'s button while it has keyboard focus.'),
    },
    codeOnly: [
      'the provider\'s element — the component is a container the provider\'s element mounts into: apple-pay-button (Apple Pay JS), the button createButton() returns (Google Pay), the PayPal SDK button and Shopify\'s Shop Pay element. It never draws a button of its own. It passes size as the element\'s height, the brand radius as the element\'s radius option (clamped for Google Pay, below), and type and style through unchanged.',
      'the style — passed to the provider under its own option name: Apple Pay\'s buttonstyle, Google Pay\'s buttonColor, PayPal\'s style.color and Shop Pay\'s one color. any passes nothing, so the provider draws its default. The design file\'s fill and edge for each style are the provider\'s own paint as its script draws it, so a style picked in the design file is the button the customer sees.',
      'the height limits — Google Pay\'s and Shop Pay\'s 40px floor and PayPal\'s 55px ceiling: a small Google Pay or Shop Pay button is drawn at 40 and a large PayPal button at 55, and the design file has no member for any of them.',
      'the corner — Google Pay allows a radius of at most half the button\'s height, so the component passes min(radius, height / 2) as its buttonRadius. A soft brand\'s radius can pass half of a small or compact button. Apple Pay, PayPal and Shop Pay take the brand radius as it is.',
      'the width — the container fills its column, with a 120px floor. Apple Pay\'s titled buttons need 140, so a titled Apple Pay button takes the larger floor; Shop Pay\'s "Buy with" button needs 193. PayPal\'s script holds its own frame at 150 or wider (the SDK\'s CSS, not a documented rule), so give a PayPal button a slot of 150 or more: under 150 its frame overflows the slot. The design file\'s floor stays 120 for every provider.',
      'the provider\'s own states — the provider\'s element owns hover, pressed and disabled and draws them itself, and the design file does not show them. The component adds only the focus ring, outside the provider\'s element, at focus-visible.',
      'the accessible name — the provider\'s element names itself ("Apple Pay", "Buy with Google Pay"). The component adds no label, so nothing is announced twice.',
      'loading — the slot keeps its height before the provider\'s script has drawn the button, so the page does not move when it arrives.',
      'RTL — the provider\'s element lays out its own wording. The container mirrors nothing.',
    ],
  },

  figmaProperties: {
    variantAxes: ['provider', 'style', 'size'],
    excludeCoordinates: [
      // Q-B5 A, Q3174.1 A: a style the provider does not offer has no member.
      ...PROVIDERS.flatMap((provider) => {
        const missing = STYLE_VALUES.filter((style) => style !== ANY && !stylesOf(provider).includes(style));
        return missing.length ? [{ provider: [provider], style: missing }] : [];
      }),
      // Q-W2 A, Q3174.4 A: a size outside the provider's height range has no member.
      ...heightExclusions(RULES, { small: 36, medium: 44, large: 56 }),
    ],
    stateAxis: { name: 'state', values: ['rest', 'focus-visible'] },
    gridAxis: 'state',
    booleans: {},
  },

  accessibility: {
    role: 'button, drawn and named by the provider\'s element',
    wcag: [
      '1.4.11 Non-text Contrast (the provider\'s style is picked for the ground: dark buttons on light grounds, light ones on dark grounds)',
      '2.4.7 Focus Visible (the focus ring around the provider\'s button)',
      '2.5.8 Target Size (every size is at least 36px high, above the 24px floor)',
      '4.1.2 Name, Role, Value (from the provider\'s element)',
    ],
    keyboard: 'Tab reaches the button; Enter or Space starts the provider\'s payment sheet. The provider\'s element handles the keys.',
    focus: 'The focus ring around the provider\'s button at keyboard focus.',
    aria: 'The provider\'s element supplies the role and the accessible name, translated by the provider. Add no label of your own, which would announce the provider twice.',
  },

  content: {
    labelPattern: 'The provider\'s own wording only, chosen from its list (plain, buy, checkout, pay and the rest). Never your own text.',
  },

  docs: {
    usage: 'Offer the wallets the checkout accepts as a row or stack of buttons, each the same height, above or beside the card form. Pick each provider\'s style for the ground, and let the provider draw the button.',
    do: [
      'Give every wallet button in a group the same size',
      'Pick dark styles on light grounds and light styles on dark grounds',
      'Keep clear space around each button',
    ],
    dont: [
      'Draw a wallet button yourself or restyle the provider\'s one',
      'Write your own wording on a wallet button',
      'Make one wallet button smaller than the others beside it',
    ],
    contentGuidelines: 'The provider\'s wording, in the provider\'s language handling. Nothing to write.',
  },

  ai: {
    primaryPurpose: 'Offer an express checkout with a wallet, drawn by the wallet provider.',
    whenToUse: 'On a cart, checkout or product page, for each wallet the store accepts: Apple Pay, Google Pay, PayPal or Shop Pay.',
    avoidWhen: 'For a store\'s own checkout or pay action, use Button. To show which cards and wallets are accepted, use Provider logo tiles in a row. For signing in with a provider, use a sign-in button, not a wallet button.',
    commonPartners: ['button', 'provider-logo', 'button-group', 'sign-in-button'],
    triggerKeywords: ['apple pay', 'google pay', 'paypal button', 'shop pay', 'express checkout', 'wallet button', 'pay with'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['provider-logo', 'focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['a hand-drawn wallet button', 'a wallet logo pasted into a Button'],
    planned: ['payment-field'],
  },

  motion: {
    enter: 'None of its own. The provider\'s element appears once its script has drawn it, in the space the component holds.',
    exit: 'None.',
    reduceMotion: 'No motion of its own to reduce.',
  },

  notes: {
    contested: [
      'Q-W3 (the shared factory, Q-B4 A): SignInButton is PR 5, so the factory lands with its second component rather than as an abstraction with one user.',
      'Q-W5 (shape): built as A, no shape axis, the brand\'s radius.md. The proposal\'s §2.3 gave a shape axis, rectangle or pill. B, a shape axis whose pill binds radius.capsule, clamped to half the height for Google Pay.',
      'Q3175 A (PayPal\'s width, #3175): PayPal\'s script holds its frame at 150px or wider, above the component\'s 120 floor. Built as A: the design file\'s floor stays 120 for every provider (minWidth is keyed by size only) and the 150 is a code-only provider note in codeOnly, with no per-provider minWidth machinery for one provider. B was a typed minW 150 for PayPal in the gate and a raised PayPal floor in the def.',
    ],
    unverified: [
      'The provider limits typed in the gate are the proposal\'s reading of each provider\'s guidelines on 2026-10-25.',
      'Q3174.6 A: Apple\'s HIG says not to replicate its button ("Don\'t create custom Apple Pay button designs or try to replicate the Apple-provided ones"). The Apple Pay members draw Apple\'s own artwork, unaltered, as a design-file stand-in, on the reading that this matches the design template Apple itself publishes for designers; the code still mounts Apple\'s element. The license on that template (Figma Community, behind a sign-in) has not been read.',
      'The style artwork, grounds and edges were captured from each provider\'s public SDK on 2026-10-30 (the records in marks/provenance.json). An SDK that changes its paint later is not seen until the artwork is captured again.',
    ],
    evolution: [
      'Proposed on #2343 (2026-10-25, §2) as one of two branded buttons from one factory; the owner chose two components (Q-B4 A), valid provider × style pairs only (Q-B5 A) and the provider\'s own element in code (Q-B8 A). Built in PR 4 on the owner\'s logo marks (PR 3).',
      'Q-W1 (the Figma member) was built as A, a layout stand-in with no fill, while the providers\' artwork was not in. #3174 took B (Q3174.1–6, all A): a style axis in each SDK\'s own names, each style drawn from the provider\'s SDK artwork with its record\'s ground and edge, and the stand-in kept as the any style, so every member built before is still there at style any.',
      'Q-W2 (heights outside a provider\'s range): built as A, no member, and kept by Q3174.4 A: PayPal has no large member, because 55 is its documented ceiling.',
      'Q3195.3 A: Google Pay has no small member. Its SDK draws nothing under 40px, so a 36 request renders 40, the same floor as Shop Pay.',
      'The code prop buttonStyle (a free string) became style, an enum of the providers\' own names with any for the provider\'s default, so the code and the design file name a style the same way.',
    ],
    projection: [
      'In Figma each member is the provider\'s area, a frame at the size and radius the rules allow, with the provider\'s logo nested as a provider-logo instance whose height is bound and whose width follows its proportion, keeping its own paint. At a style, the frame takes the style\'s ground and 1px edge as literal paint; at any it has neither.',
    ],
  },
};
