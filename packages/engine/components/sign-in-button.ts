/**
 * SignInButton — "Continue with Apple / Google / Facebook", drawn by Prism3 to each provider's own rules (#2343 PR 5).
 *
 * No KB brief. Category `form`, beside WalletButton and Button: it submits a sign-in the way Button submits a form,
 * and it sits in the sign-in form. The source is the proposal on #2343 (2026-10-28, "PR 5: SignInButton", §1–§6) and
 * the owner's calls on it the same day (Q-S1 to Q-S12, all A); the wireframe the owner saw is linked there.
 *
 * PRISM3 DRAWS THE BUTTON (Q-S2 A, Q-S3 A). All three providers allow a custom button that follows their rules, so
 * unlike WalletButton this is a real button in Figma and in code: a native button that calls the provider's own
 * sign-in function. Every provider shares one height (the size axis), which Apple's and Google's parity rules ask for.
 *
 * THE PROVIDER'S COLORS, FONT AND WORDING ARE LITERALS FROM ONE RULE RECORD (`RULES` below, Q-S2 A). A component
 * binds token names only, and these values are not the brand's to theme: the provider fixes them. So the def carries
 * them as a `literal` record keyed by provider × style, and the container (`literal: 'surface'`) and the label
 * (`literal: 'label'`) read it. The provider's fill never changes; hover and pressed lay a wash over it (Q-S6 A).
 * Prism3's tokens still drive the height, the padding and gap (Apple and Facebook), the brand's label type (Apple and
 * Facebook, Q-S7 A), the radius (`radius.md`, Q-S12 A), the 140 width floor and the focus ring.
 *
 * ALL EIGHT PAIRS SHIP, 96 MEMBERS (Q831 A, superseding Q-S5 A's wait for artwork). Each style's glyph is in the mark
 * set: `provider/apple` and `provider/facebook` (black since #3134), `provider/google`, and `provider/facebook-blue`,
 * derived from `social/facebook` and scaled to the provider inset.
 *
 * ONE BLACK GLYPH PER PROVIDER, PAINTED WHITE ON A DARK FILL (Q846 A). Apple black and Facebook blue carry the black
 * `provider/apple` and `provider/facebook` with a literal tint, `#ffffff` (the rule's `tint`, the literal entry's
 * `markTint`, the plan's `literalTint`), painted on every vector of the glyph. That is the one place a brand mark is
 * retinted: only here, only a `provider/*` glyph, and only where the fill is dark. `lint-mark-colors.ts` (g) fails any
 * other host or mark that tints, and `test.ts` (`Q846 A dark-fill styles draw white`) types which styles do. Q846 A
 * dropped the derived `provider/apple-black`, a duplicate of the black `provider/apple`; `provider/facebook-blue` stays,
 * because a one-color tint cannot draw a blue disc with a white "f".
 *
 * The members stay data: a provider × style pair is a member only when the mark set holds its glyph, and the style
 * axis lists only the styles some member carries, so a future provider whose artwork is not in yet is excluded, never
 * stood in. `makeSignInButton(names)` reads the vocabulary it is given; the gate (`test.ts`, `#2343 PR 5 provider rules
 * ARTWORK`) counts 96 over the real set, and 84 over the set without the derived glyph.
 *
 * THE PROVIDER RULES, AS DATA THE GATE HOLDS (`test.ts`, `#2343 PR 5 provider rules`, which types each rule again from
 * the providers' guidelines, read 2026-10-27, and never reads this file's values):
 *   - colors: the fill, the 1px inside edge and the label ink of each style, as the providers publish them
 *     (Google's hex values; Apple's black and white; Facebook #0866FF, its current brand blue, Q837 A).
 *   - the font: Google Sans Medium 14/20 on Google members at every size, a literal with a fallback; the brand's
 *     label type on Apple and Facebook, which leave the font free.
 *   - the width floor: 140, Apple's minimum and the largest of the three.
 *   - the mark: `brand-mark/provider/<provider>[-<glyph color>]`, nested whole, height bound, its own paint, or
 *     white where the fill is dark (Q846 A).
 *   - the wording: "Continue with <Provider>" in Figma, with no text property (Q-S8 A); the code prop takes the
 *     provider's own list.
 */
import { ComponentDef, type LiteralEntry } from '../component-schema';
import { BRAND_MARK_NAMES } from '../brand-mark-glyphs';
import { BUTTON_SPACING } from '../button-spacing';
import { focusRingPart, heightTokens, markPart, radiusToken, ringTokens } from '../branded-button';

const PROVIDERS = ['apple', 'google', 'facebook'] as const;
type Provider = (typeof PROVIDERS)[number];

/** The wash a hover or pressed state lays over the provider's fill: dark on a light fill, light on a dark one, at
 *  Button's neutral overlay steps (10% and 20%). A literal, because the fill under it is one: a mode-following wash
 *  would flip on a fill that does not. */
const WASH = {
  onLight: { hover: '#0000001a', pressed: '#00000033' },
  onDark: { hover: '#ffffff1a', pressed: '#ffffff33' },
} as const;

/** A style: the provider's fill, edge and ink, the wash for its fill, the glyph it carries, and the color the glyph is
 *  painted where the fill is dark (Q846 A: one black glyph per provider, painted white on a dark fill). */
type StyleRule = { fill: string; edge?: string; ink: string; wash: keyof typeof WASH; mark: string; tint?: string };

/** THE ONE AUTHORED RULE RECORD (Q-S2 A): per provider, its name, its wording list, its font when it fixes one, its
 *  spacing when it fixes one, and its styles in the provider's own names (Q-S4 A), the code default first. */
const RULES: Record<Provider, {
  name: string;
  wording: Record<string, string>;
  font?: LiteralEntry['font'];
  styles: Record<string, StyleRule>;
}> = {
  apple: {
    name: 'Apple',
    wording: { continue: 'Continue with Apple', 'sign-in': 'Sign in with Apple', 'sign-up': 'Sign up with Apple' },
    styles: {
      black: { fill: '#000000', ink: '#ffffff', wash: 'onDark', mark: 'provider/apple', tint: '#ffffff' },
      white: { fill: '#ffffff', ink: '#000000', wash: 'onLight', mark: 'provider/apple' },
      outline: { fill: '#ffffff', edge: '#000000', ink: '#000000', wash: 'onLight', mark: 'provider/apple' },
    },
  },
  google: {
    name: 'Google',
    wording: { continue: 'Continue with Google', 'sign-in': 'Sign in with Google', 'sign-up': 'Sign up with Google' },
    font: { family: 'Google Sans', style: 'Medium', size: 14, lineHeight: 20, fallback: { family: 'Roboto', style: 'Medium' } },
    styles: {
      light: { fill: '#ffffff', edge: '#747775', ink: '#1f1f1f', wash: 'onLight', mark: 'provider/google' },
      dark: { fill: '#131314', edge: '#8e918f', ink: '#e3e3e3', wash: 'onDark', mark: 'provider/google' },
      neutral: { fill: '#f2f2f2', ink: '#1f1f1f', wash: 'onLight', mark: 'provider/google' },
    },
  },
  facebook: {
    name: 'Facebook',
    wording: { continue: 'Continue with Facebook', login: 'Login with Facebook' },
    styles: {
      blue: { fill: '#0866ff', ink: '#ffffff', wash: 'onDark', mark: 'provider/facebook', tint: '#ffffff' },
      white: { fill: '#ffffff', ink: '#0866ff', wash: 'onLight', mark: 'provider/facebook-blue' },
    },
  },
};

/** Every provider × style pair the rules name, in rule order: provider, then style. */
const PAIRS = PROVIDERS.flatMap((p) => Object.keys(RULES[p].styles).map((style) => ({ provider: p, style })));

/** The size rungs, with the mark one icon rung under Button's (16 / 20 / 24) and the label type per size. */
const SIZE_KEYS = {
  small: { mark: 'icon.size.xs', type: 'type.label.sm.emphasis' },
  medium: { mark: 'icon.size.sm', type: 'type.label.md.emphasis' },
  large: { mark: 'icon.size.md', type: 'type.label.lg.emphasis' },
} as const;

/** The padding and gap per provider and size. Apple and Facebook take Button's spacing (the mark side at the icon
 *  inset, the far side at the label inset), which density moves. Google fixes its own: 12 at both sides at every
 *  size, which density does not move. Its 10px gap is off the space scale, so it binds the 8px step (Q-S14 on the PR). */
const spacingTokens = (): Record<string, string> => Object.fromEntries(PROVIDERS.flatMap((p) => (['small', 'medium', 'large'] as const).flatMap((size) => {
  const k = (slot: string): string => `size.${size}.${p}.${slot}`;
  return p === 'google'
    ? [[k('padding-x'), 'space.150'], [k('padding-x-visual'), 'space.150'], [k('padding-y'), BUTTON_SPACING[`size.${size}.padding-y`]], [k('gap'), 'space.100']]
    : [[k('padding-x'), BUTTON_SPACING[`size.${size}.padding-x`]], [k('padding-x-visual'), BUTTON_SPACING[`size.${size}.padding-x-visual`]], [k('padding-y'), BUTTON_SPACING[`size.${size}.padding-y`]], [k('gap'), BUTTON_SPACING[`size.${size}.gap`]]];
})));

/** Build the def over a mark vocabulary (Q-S5 A, kept by Q831 A). A pair whose glyph the vocabulary lacks has no
 *  member, and the style axis carries only the styles some member has. Exported so the gate builds it over a
 *  vocabulary without a glyph, and counts. */
export const makeSignInButton = (markNames: readonly string[]): ComponentDef => {
  const have = new Set(markNames);
  const built = PAIRS.filter((x) => have.has(RULES[x.provider].styles[x.style].mark));
  const providers = PROVIDERS.filter((p) => built.some((x) => x.provider === p));
  const styles = [...new Set(PAIRS.map((x) => x.style))].filter((s) => built.some((x) => x.style === s));
  // Every provider × style coordinate with no member: a pair the rules do not name, or one whose glyph is missing.
  const excludeCoordinates = providers.flatMap((p) => {
    const missing = styles.filter((s) => !built.some((x) => x.provider === p && x.style === s));
    return missing.length ? [{ provider: [p], style: missing }] : [];
  });
  const entries: Record<string, LiteralEntry> = Object.fromEntries(built.map(({ provider, style }) => {
    const r = RULES[provider], s = r.styles[style];
    return [`${provider}.${style}`, {
      fill: s.fill,
      ...(s.edge ? { edge: s.edge } : {}),
      ink: s.ink,
      wash: WASH[s.wash],
      text: r.wording.continue,
      ...(r.font ? { font: r.font } : {}),
      ...(s.tint ? { markTint: s.tint } : {}),
    }];
  }));
  const first = built[0];
  const styleList = (p: Provider): string => Object.keys(RULES[p].styles).filter((s) => built.some((x) => x.provider === p && x.style === s)).join(', ');
  const wordingList = (p: Provider): string => Object.keys(RULES[p].wording).join(', ');
  return {
    id: 'sign-in-button',
    name: 'SignInButton',
    aliases: ['social-sign-in-button', 'social-login-button', 'continue-with-button'],
    category: 'form',
    status: 'draft',
    summary: 'Sign in with Apple, Google or Facebook, drawn to each provider\'s rules.',
    description:
      'A button that signs the user in with their Apple, Google or Facebook account. Each provider sets its own colors, its own mark and its own wording, so those never change with the theme: the button shows the provider\'s fill, edge and label color for the style picked, and the words "Continue with" and the provider\'s name. Google also sets its own typeface. The theme sets the height, the corner, the spacing and the focus ring, so every sign-in button in a stack is the same height. Pick the style for the ground the button sits on.',

    props: [
      { name: 'provider', type: `enum: ${providers.map((p) => `'${p}'`).join(' | ')}`, values: [...providers], required: true, description: 'Which account the button signs in with. The button calls that provider\'s own sign-in, which needs the provider\'s script on the page.' },
      { name: 'style', type: `enum: ${styles.map((s) => `'${s}'`).join(' | ')}`, values: [...styles], required: false, description: `The provider\'s color style, from its own list: ${providers.map((p) => `${RULES[p].name} ${styleList(p)}`).join('; ')}. Unset, the first in the provider\'s list. A style another provider uses is refused.` },
      { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'The height: 36, 44 or 56px. Give every sign-in button in a group the same size.' },
      { name: 'wording', type: 'string', default: 'continue', required: false, description: `The provider\'s wording, from its own list, translated by the app: ${providers.map((p) => `${RULES[p].name} ${wordingList(p)}`).join('; ')}. The provider\'s name is never translated. A wording the provider does not offer is refused.` },
      { name: 'fullWidth', type: 'boolean', default: false, required: false, description: 'Fill the column instead of hugging the label. The button never drops under 140px wide.' },
      { name: 'onClick', type: '(event: MouseEvent) => void', required: false, description: 'Called before the provider\'s sign-in starts, for analytics or a loading state. The sign-in itself is the provider\'s.' },
    ],

    states: ['rest', 'hover', 'pressed', 'focus-visible'],
    variants: {
      provider: [...providers],
      style: styles,
      size: ['medium', 'small', 'large'],
    },
    axisKinds: { provider: 'authoring', style: 'authoring', size: 'authoring' },
    // Apple and Facebook take Button's spacing, so density moves it; Google's is fixed by Google, so it stays.
    densitySpacing: (['apple', 'facebook'] as const).flatMap((p) => ['padding-x', 'padding-x-visual', 'padding-y', 'gap'].map((slot) => `size.{size}.${p}.${slot}`)),

    tokens: {
      ...heightTokens(),
      ...Object.fromEntries((['small', 'medium', 'large'] as const).flatMap((s) => [[`size.${s}.mark`, SIZE_KEYS[s].mark], [`size.${s}.type`, SIZE_KEYS[s].type]])),
      ...spacingTokens(),
      ...radiusToken(),
      'border-width': 'border-width.hairline',
      ...ringTokens(),
    },
    // The provider's own colors, font and wording (Q-S2 A, Q-S7 A, Q-S8 A), as literals from the rule record above.
    literal: { key: '{provider}.{style}', entries },

    anatomy: {
      root: 'container',
      parts: {
        container: {
          kind: 'box',
          role: 'target',
          children: ['mark', 'label', 'focusRing'],
          layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'fixed' } },
          padding: { block: 'size.{size}.{provider}.padding-y', inlineLabel: 'size.{size}.{provider}.padding-x-visual', inlineEnd: 'size.{size}.{provider}.padding-x' },
          gap: 'size.{size}.{provider}.gap',
          height: 'size.{size}.height',
          minWidth: 140,
          radius: 'radius',
          strokeWidth: 'border-width',
          literal: 'surface',
          note: 'The provider\'s button: its fill, and a 1px edge where the provider draws one. Hover and pressed lay a light wash over the fill, which never changes.',
        },
        mark: markPart({
          nesting: {
            kind: 'nest-fixed',
            variant: { name: RULES[first.provider].styles[first.style].mark },
            variantWhere: built.map(({ provider, style }) => ({ when: { provider, style }, set: { name: RULES[provider].styles[style].mark } })),
          },
          height: 'size.{size}.mark',
          literal: 'mark',
          note: 'The provider\'s own glyph at the leading edge, in its own colors, or in white where the button\'s fill is dark. Only its height and that color are set.',
        }),
        label: {
          kind: 'text',
          type: 'size.{size}.type',
          literal: 'label',
          note: 'The provider\'s wording, in the provider\'s label color. Google\'s label is set in Google\'s own typeface; Apple\'s and Facebook\'s in the theme\'s label style.',
        },
        focusRing: focusRingPart('The shared focus ring, outside the provider\'s button while it has keyboard focus.'),
      },
      codeOnly: [
      'the native button — every provider renders a real <button type="button"> drawn by Prism3, never the provider\'s iframe. Enter and Space activate it, as on any button.',
      'the provider\'s sign-in — on click the button calls the provider\'s own function: AppleID.auth.signIn() (Sign in with Apple JS), the OAuth code client from Google Identity Services (google.accounts.oauth2.initCodeClient(…).requestCode()), or FB.login() (the Facebook JS SDK). The popup or redirect that follows is the provider\'s; the component draws nothing past its own button. onClick runs first.',
      'the provider scripts — each provider\'s script must be on the page before the button is used; until it loads, the button stays in place and its click waits for the script rather than failing.',
      'the provider\'s own buttons — the providers\' rendered buttons (appleid-signin, google.accounts.id.renderButton, fb-login-button) are documented, not wrapped. A team that wants Google\'s personalized "Continue as …" button renders it directly, in its own frame, beside the stack (Q-S3 A).',
      'the colors and the font — the code reads the same literal record as the design file: each provider × style\'s fill, 1px inside edge, label ink and hover and pressed wash, the white the glyph is painted on Apple black and Facebook blue, and Google\'s font, font-family "Google Sans", Roboto, Arial, sans-serif at 500, 14px / 20px at every size. None of them is a token, so no theme or mode moves them.',
      'the wording — a fixed key per provider × wording (continue, sign-in, sign-up for Apple and Google; continue, login for Facebook), translated by the app; the provider\'s name is never translated. The wording prop is typed per provider, so a wording the provider does not offer is a type error, not a fallback.',
      'the width — the button hugs its label with a 140px floor, Apple\'s minimum and the largest of the three, and fullWidth makes it fill its column.',
      'RTL — the row mirrors, so the glyph stays at the leading edge, now the right. The glyph itself is never flipped.',
      'forced colors — under forced-colors mode the button follows the system colors like any button (its fill, edge and label become ButtonFace, ButtonText and the system border), while the glyph keeps forced-color-adjust: none, the brand mark\'s own rule, so the provider\'s artwork is never repainted.',
      'the accessible name — the visible wording is the name ("Continue with Google"), so the label and the name match. No aria-label is added, and the glyph is decorative (aria-hidden, the brand mark with no label).',
    ],
    },
    figmaProperties: {
      variantAxes: ['provider', 'style', 'size'],
      excludeCoordinates,
      stateAxis: { name: 'state', values: ['rest', 'hover', 'pressed', 'focus-visible'] },
      gridAxis: 'state',
      booleans: {},
    },

    accessibility: {
      role: 'button',
      wcag: [
        '1.4.3 Contrast (Minimum) (each style\'s label color on its fill is the provider\'s, and each clears 4.5:1 at rest and focus-visible; the Facebook styles fall short at hover and pressed, under the wash)',
        '1.4.11 Non-text Contrast (the provider picks each style for its ground: dark buttons on light grounds, light ones on dark grounds)',
        '2.4.7 Focus Visible (the focus ring outside the provider\'s fill)',
        '2.5.3 Label in Name (the visible wording is the accessible name)',
        '2.5.8 Target Size (every size is at least 36px high and 140px wide, above the 24px floor)',
        '4.1.2 Name, Role, Value (a native button)',
      ],
      keyboard: 'Tab reaches the button; Enter or Space starts the provider\'s sign-in.',
      focus: 'The shared focus ring, outside the provider\'s fill, at keyboard focus.',
      aria: 'A native button named by its visible wording, such as "Continue with Google", translated by the app; the provider\'s name stays as the provider writes it. Add no label of your own. The glyph is decorative and hidden from assistive tech, because the wording already names the provider.',
    },

    content: {
      labelPattern: 'The provider\'s own wording only, from its list: Continue with, Sign in with or Sign up with Apple or Google; Continue with or Login with Facebook. Never your own text, and never the provider\'s name alone.',
    },

    docs: {
      usage: 'Offer the sign-in providers the product supports as a stack of buttons, each the same size, above or below the email sign-in. Pick each provider\'s style for the ground: dark buttons on light grounds, light ones on dark grounds. Use one wording for every button in the stack.',
      do: [
        'Give every sign-in button in a stack the same size and width',
        'Pick dark styles on light grounds and light styles on dark grounds',
        'Use the same wording for every provider in a stack',
      ],
      dont: [
        'Recolor a sign-in button, or set its label in another typeface where the provider fixes one',
        'Write your own wording, or show the provider\'s glyph without its words',
        'Make one provider\'s button smaller or quieter than the others beside it',
      ],
      contentGuidelines: 'Pick one wording from the provider\'s list and use it on every button in the stack. Translate the words around the provider\'s name; never translate the name.',
    },

    ai: {
      primaryPurpose: 'Let a user sign in or sign up with their Apple, Google or Facebook account.',
      whenToUse: 'On a sign-in or sign-up screen, one button for each account provider the product supports, stacked at one size.',
      avoidWhen: 'For signing in with an email and password, use Button. For paying with a wallet such as Apple Pay, use WalletButton. For a social link in a footer, use Link with a brand mark. For a provider outside Apple, Google and Facebook, use Button with the provider\'s name in the label.',
      commonPartners: ['button', 'text-field', 'password-field', 'divider', 'brand-mark'],
      triggerKeywords: ['sign in with apple', 'sign in with google', 'continue with google', 'login with facebook', 'social login', 'social sign in', 'oauth button'],
      generationPriority: 2,
    },

    composition: {
      composesWith: ['brand-mark', 'focus-ring'],
      alternativeTo: [],
      replacesPatterns: ['a hand-drawn social sign-in button', 'a provider logo pasted into a Button'],
      planned: [],
    },

    motion: {
      enter: 'None of its own.',
      exit: 'None.',
      reduceMotion: 'The hover and pressed wash changes without a transition, so there is nothing to reduce.',
    },

    notes: {
      contested: [
        'Google Sans licensing: whether Google Sans may be used outside Google\'s own assets is unverified (Q-S7). The design file falls back to Roboto Medium where Google Sans is not installed, and reports the fallback.',
        'The Facebook styles fall short of 4.5:1 at hover and pressed, where the wash (Q-S13 A) lightens the blue fill or darkens the white one: blue hover 4.13:1, blue pressed 3.53:1, white hover 3.83:1, white pressed 3.00:1. Rest and focus-visible measure 4.82:1. Whether these states should clear 4.5:1 is a follow-up owner question.',
      ],
      unverified: [
        'The provider rules typed in the gate are the proposal\'s reading of each provider\'s guidelines on 2026-10-27.',
        'The Google G on the dark style: Google says the G must appear on a white background, while its own dark asset puts it on #131314.',
        'Whether Google\'s 14/20 holds at the 36 and 56 heights; the build keeps it at every size.',
        'Facebook\'s white-style label color is not published; the build uses #0866ff.',
      ],
      evolution: [
        'Proposed on #2343 (2026-10-28, PR 5) with a wireframe of all members; the owner chose all twelve calls as A: Apple, Google and Facebook (Q-S1), Prism3 draws the button with the provider\'s fill, edge and ink as literal paint (Q-S2), a native button that calls the provider\'s sign-in (Q-S3), the providers\' style names (Q-S4), members only where the mark set holds the glyph (Q-S5), rest, hover, pressed and focus-visible (Q-S6), Google Sans as a literal font (Q-S7), the label fixed with no text property (Q-S8), no logo-only member (Q-S9), its own page (Q-S10), the shared helpers (Q-S11) and radius.md with no shape axis (Q-S12).',
        'Q831 A (2026-10-28) supersedes Q-S5 A\'s wait for artwork: Apple\'s black glyph and Facebook\'s blue one are derived from social/apple and social/facebook, scaled to the provider inset, so all eight pairs ship, 96 members. The membership stays data, for a future provider whose glyph is not in yet.',
        'The owner decided Q-S13 to Q-S17 as A (2026-10-29): a literal wash of black at 10% and 20% on a light fill and white on a dark one, which does not flip with the mode (Q-S13); Google\'s 8px gap with 12px at both sides, since its 10px gap is off the space scale (Q-S14); Continue with Facebook (Q-S15); glyph heights 16, 20 and 24 (Q-S16); and code offers only the styles whose artwork is in the design file, all eight today (Q-S17).',
        'Q846 A (2026-10-29): #3134 drew provider/apple and provider/facebook black, so each provider has one black glyph, painted white where the button\'s fill is dark (Apple black, Facebook blue). Every other mark is never retinted. The derived provider/apple-black, now a duplicate of provider/apple, was dropped; still 96 members.',
        'Q837 A (2026-10-28): Facebook\'s blue moved from #1877f2 to its current brand blue, #0866ff, in both styles and in the facebook marks. White on it measures 4.82:1, so every style now clears 4.5:1 at rest and focus-visible; the Facebook hover and pressed states stay under it (see contested).',
      ],
      projection: [
        'In Figma the button\'s fill, edge and label color are plain colors with no variable, and the label has no text property; Google\'s label carries Google Sans Medium 14/20 directly, not a text style. The glyph is a brand-mark/provider instance, its height bound and its width from its proportion; on Apple black and Facebook blue its vectors are painted white as a plain color.',
      ],
    },
  };
};

export const signInButton = makeSignInButton(BRAND_MARK_NAMES);
