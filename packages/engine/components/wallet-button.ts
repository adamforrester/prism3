/**
 * WalletButton — the express-checkout button a payment provider draws: Apple Pay, Google Pay, PayPal and Shop Pay
 * (#2343 PR 4).
 *
 * No KB brief. Category `form`, beside Button: it submits a payment the way Button submits a form, and it sits in the
 * checkout form beside the card fields. The proposal on #2343 (2026-10-25, §2) and the owner's calls on it are the
 * source: two components from one factory (Q-B4 A; SignInButton is PR 5), and in code a slot that mounts the
 * provider's own element (Q-B8 A). Q-B5 A decided valid provider × STYLE pairs only; with the style axis held by Q-W1,
 * this build reads it onto provider × size (the two exclusions below), a reading the owner sees on the PR.
 *
 * THE PROVIDER DRAWS THE BUTTON. All four wallets forbid a hand-drawn copy of their button ("Don't create custom
 * Apple Pay button designs"; Google Pay's createButton(); PayPal's and Shopify's SDK elements). So in code this
 * component renders no button of its own: it is a sized, focus-ringed slot the provider's element mounts into, and
 * the provider fixes the mark, the colors, the wording and the font. Prism3 drives the height steps, the width, the
 * corner radius where the provider allows a range, and the focus ring.
 *
 * THE FIGMA MEMBER IS A LAYOUT STAND-IN, NOT A COPY OF THE BUTTON (Q-W1 A on the PR, built as recommended). It is the
 * provider's area at the size and corner the provider rules allow, holding the provider's own logo, unaltered, in
 * its own colors, with Prism3's focus ring. It draws no fill and no edge: the providers state their button colors
 * only by name ("dark and light", "gold", "white with border"), not as values, and painting their ground would be
 * the hand-drawn copy every one of them forbids. So the button's style (black, white, gold) is a code setting passed
 * to the provider, not a Figma axis; the provider's own button artwork, if the owner supplies it, is the route to
 * a per-style drawing (Q-W1 B).
 *
 * THE PROVIDER RULES, AS DATA THE GATE HOLDS (`test.ts`, `#2343 PR 4 provider rules`, which types each rule again
 * from the providers' guidelines and never reads this file's numbers):
 *   - height: the shared `size.*` rungs, 36 / 44 / 56. Shop Pay's floor is 40, so it has no small member; PayPal's
 *     ceiling is 55, so it has no large member (Q-W2 A). Apple Pay's 30 and PayPal's 25 floors sit under every rung.
 *   - width: a 120px floor, Shop Pay's logo-button minimum and the largest any of the four states (Apple Pay plain:
 *     100). The button fills its column in use.
 *   - radius: the brand's `radius.md`. Apple Pay, PayPal and Shop Pay allow any radius; Google Pay at most half the
 *     height. Harbor's `radius.md` is inside that at every density, and the gate measures it there; a soft brand's
 *     can pass it (`baseMd` 12 × `radiusScale` 2 is 24px against a 28px compact small), so the code clamps Google
 *     Pay's radius to half the height, and the gate holds that clamp at the levers' softest corner. The Figma
 *     member draws the brand radius, which Figma caps at half the height when it renders.
 *   - no shape axis: the proposal's §2.3 gave `shape: rectangle | pill`; the build binds `radius.md` only (Q-W5 on
 *     the PR, built as A).
 *   - the mark: `brand-mark/logo/<provider>`, nested whole, height bound and width from its own proportion, keeping
 *     its own paint.
 */
import { ComponentDef } from '../component-schema';

const PROVIDERS = ['apple-pay', 'google-pay', 'paypal', 'shop-pay'] as const;

/** Each provider's logo in the mark set. PayPal's button carries its wordmark, not the monogram. */
const LOGO: Record<(typeof PROVIDERS)[number], string> = {
  'apple-pay': 'logo/apple-pay',
  'google-pay': 'logo/google-pay',
  paypal: 'logo/paypal-wordmark',
  'shop-pay': 'logo/shop-pay',
};

export const walletButton: ComponentDef = {
  id: 'wallet-button',
  name: 'WalletButton',
  aliases: ['express-checkout-button', 'payment-button', 'pay-button'],
  category: 'form',
  status: 'draft',
  summary: 'Express checkout with Apple Pay, Google Pay, PayPal or Shop Pay, drawn by the provider.',
  description:
    'A payment button for a wallet: Apple Pay, Google Pay, PayPal or Shop Pay. The provider draws the button itself, so its logo, colors, wording and font are the provider\'s and never change with the theme. The component sets the height, the width, the corner radius where the provider allows one, and the focus ring. Each provider has a smallest and a largest height, so Shop Pay starts at the medium size and PayPal stops at medium. The design file shows each button\'s space and logo for layout; the button the customer sees comes from the provider.',

  props: [
    { name: 'provider', type: "enum: 'apple-pay' | 'google-pay' | 'paypal' | 'shop-pay'", values: [...PROVIDERS], required: true, description: 'Which wallet. Each needs its provider\'s script on the page, which draws the button.' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The height: 36, 44 or 56px. Shop Pay has no small size and PayPal no large one, because each provider sets a smallest and a largest height.' },
    { name: 'type', type: 'string', default: 'plain', required: false, description: 'The provider\'s wording, from its own list, passed to the provider: plain shows the logo alone; buy, checkout, donate, order, pay and subscribe add the provider\'s words, translated by the provider. A value the provider does not offer falls back to plain.' },
    { name: 'buttonStyle', type: 'string', required: false, description: 'The provider\'s color style, from its own list, passed to the provider: black or white for Apple Pay and Google Pay, gold, blue, silver, white or black for PayPal. Pick it for the ground the button sits on: dark buttons on light grounds, light ones on dark grounds. Unset, the provider\'s default.' },
  ],

  states: ['rest', 'focus-visible'],
  variants: {
    provider: [...PROVIDERS],
    size: ['medium', 'small', 'large'],
  },
  axisKinds: { provider: 'authoring', size: 'authoring' },

  tokens: {
    'size.small.height': 'size.sm.height',
    'size.medium.height': 'size.md.height',
    'size.large.height': 'size.lg.height',
    // The logo's height; its width follows from its own proportion.
    'size.small.mark': 'icon.size.sm',
    'size.medium.mark': 'icon.size.md',
    'size.large.mark': 'icon.size.lg',
    'radius': 'radius.md',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset',
  },

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
        note: 'The provider\'s area at its size and corner, with no fill and no edge: the provider draws the button inside it.',
      },
      mark: {
        kind: 'nest',
        nests: 'brand-mark',
        nesting: {
          kind: 'nest-fixed',
          variant: { name: LOGO['apple-pay'] },
          variantWhen: { provider: Object.fromEntries(PROVIDERS.map((p) => [p, { name: LOGO[p] }])) },
        },
        height: 'size.{size}.mark',
        aspectLock: true,
        fixedPaint: true,
        note: 'The provider\'s logo, in its own colors and proportion, centered. Only its height is set.',
      },
      focusRing: {
        kind: 'absolute',
        when: 'focus-visible',
        nests: 'focus-ring',
        inset: 'ring-offset',
        strokeInset: 'ring-width',
        nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
        note: 'The shared focus ring, around the provider\'s button while it has keyboard focus.',
      },
    },
    codeOnly: [
      'the provider\'s element — the component is a container the provider\'s element mounts into: apple-pay-button (Apple Pay JS), the button createButton() returns (Google Pay), the PayPal SDK button and Shopify\'s Shop Pay element. It never draws a button of its own. It passes size as the element\'s height, the brand radius as the element\'s radius option (clamped for Google Pay, below), and type and buttonStyle through unchanged.',
      'the height limits — Shop Pay\'s 40px floor and PayPal\'s 55px ceiling: a small Shop Pay button is drawn at 40 and a large PayPal button at 55, and the design file has no member for either.',
      'the corner — Google Pay allows a radius of at most half the button\'s height, so the component passes min(radius, height / 2) as its buttonRadius. A soft brand\'s radius can pass half of a small or compact button. Apple Pay, PayPal and Shop Pay take the brand radius as it is.',
      'the width — the container fills its column, with a 120px floor. Apple Pay\'s titled buttons need 140, so a titled Apple Pay button takes the larger floor; Shop Pay\'s "Buy with" button needs 193.',
      'the provider\'s own states — the provider\'s element owns hover, pressed and disabled and draws them itself, and the design file cannot show them without copying the button. The component adds only the focus ring, outside the provider\'s element, at focus-visible.',
      'the accessible name — the provider\'s element names itself ("Apple Pay", "Buy with Google Pay"). The component adds no label, so nothing is announced twice.',
      'loading — the slot keeps its height before the provider\'s script has drawn the button, so the page does not move when it arrives.',
      'RTL — the provider\'s element lays out its own wording. The container mirrors nothing.',
    ],
  },

  figmaProperties: {
    variantAxes: ['provider', 'size'],
    // Q-W2 A: a size outside the provider's height range has no member. Q-B5 A (valid provider × style pairs only),
    // read onto provider × size while the style axis waits on Q-W1.
    excludeCoordinates: [{ provider: ['shop-pay'], size: ['small'] }, { provider: ['paypal'], size: ['large'] }],
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
    avoidWhen: 'For a store\'s own checkout or pay action, use Button. To show which cards and wallets are accepted, use Brand mark tiles in a row. For signing in with a provider, use a sign-in button, not a wallet button.',
    commonPartners: ['button', 'brand-mark', 'button-group'],
    triggerKeywords: ['apple pay', 'google pay', 'paypal button', 'shop pay', 'express checkout', 'wallet button', 'pay with'],
    generationPriority: 2,
  },

  composition: {
    composesWith: ['brand-mark', 'focus-ring'],
    alternativeTo: [],
    replacesPatterns: ['a hand-drawn wallet button', 'a wallet logo pasted into a Button'],
    planned: ['sign-in-button', 'payment-field'],
  },

  motion: {
    enter: 'None of its own. The provider\'s element appears once its script has drawn it, in the space the component holds.',
    exit: 'None.',
    reduceMotion: 'No motion of its own to reduce.',
  },

  notes: {
    contested: [
      'Q-W1 (the Figma member): built as A, a layout stand-in with the provider\'s logo and no fill. B, the owner supplies each provider\'s own button artwork per style and the stand-in draws it, adding a style axis; C, Prism3 paints the providers\' fills, which needs a literal-paint engine field and colors the providers do not publish.',
      'Q-W2 (heights outside a provider\'s range): built as A, no member. B, clamp in Figma too, which needs a height that is not a token.',
      'Q-W3 (the shared factory, Q-B4 A): SignInButton is PR 5, so the factory lands with its second component rather than as an abstraction with one user.',
      'Every logo in the owner\'s set is drawn for a light ground (Apple Pay and Shop Pay in one ink, Google Pay in five colors, the PayPal wordmark in three). A dark-style stand-in would need each provider\'s light logo, which the set does not hold.',
      'Q-W5 (shape): built as A, no shape axis, the brand\'s radius.md. The proposal\'s §2.3 gave a shape axis, rectangle or pill. B, a shape axis whose pill binds radius.capsule, clamped to half the height for Google Pay.',
      'Q-B5 A decided valid provider × style pairs only. With the style axis held by Q-W1, the build applies it to provider × size: Shop Pay has no small member and PayPal no large one.',
    ],
    unverified: [
      'The provider limits typed in the gate are the proposal\'s reading of each provider\'s guidelines on 2026-10-25.',
    ],
    evolution: [
      'Proposed on #2343 (2026-10-25, §2) as one of two branded buttons from one factory; the owner chose two components (Q-B4 A), valid provider × style pairs only (Q-B5 A, read here onto provider × size while style waits on Q-W1) and the provider\'s own element in code (Q-B8 A). Built in PR 4 on the owner\'s logo marks (PR 3).',
    ],
    projection: [
      'In Figma each member is the provider\'s area, a frame at the size and radius the rules allow, with the provider\'s logo nested as a brand-mark/logo instance whose height is bound and whose width follows its proportion, keeping its own paint.',
    ],
  },
};
