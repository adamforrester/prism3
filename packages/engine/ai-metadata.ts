/**
 * Prism3 engine — AI-readable metadata sidecar.
 *
 * Generates an `out/<id>.ai.json` peer to the DTCG `out/<id>.tokens.json`: the
 * agent surface for the SEMANTIC layer, per the practice's schema
 * (knowledge-base 31-color-systems §9 + 00-principles "descriptions = highest-ROI;
 * avoid_when > when_to_use"). Every field is GENERATED — `meaning`/`when_to_use`/
 * `avoid_when` from a deterministic role→intent model, and `paired_with` /
 * `contrast_with` / `mode_overrides` reshaped from data the engine already
 * computes (the on-* pairings, the floor contract, the per-mode resolution). The
 * point: contract-true metadata that regenerates, vs the field's hand-authored
 * metadata that rots. Keeps tokens.json DTCG-pure (no non-standard sibling keys).
 */
import { Theme, CORE_TIER } from './theme';
import { resolveAllModes, ResolvedRole } from './modes';
import { contrast, hexToRgb } from './color';

type AiToken = {
  $description: string;
  meaning: string;
  when_to_use: string;
  avoid_when: string;
  // #621 — RFC 2119, DERIVED not authored: MUST iff a real computed contrast contract backs this
  // token (`contrast_with` below, from the same `light.min > 0` check). A `MUST` with no gate behind
  // it is worse than no label (manufactures rigor it can't back up) — so the level can only ever be
  // as strong as the contract computation it reads, never hand-typed on a per-statement basis.
  avoid_when_level: 'MUST' | 'SHOULD';
  paired_with?: string[];
  contrast_with?: { token: string; min: string; ratio: number }[];
  mode_overrides: Record<string, string>;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const INTENT: Record<string, string> = {
  brand: 'brand identity', success: 'success / positive', warning: 'warning / caution',
  danger: 'destructive / error', info: 'informational',
};
const TIER_N: Record<string, number> = { primary: 1, secondary: 2, tertiary: 3 };
// state → the interaction moment it applies to (makes state variants informative)
const STATE_WHEN: Record<string, string> = { hover: 'on pointer hover', pressed: 'while pressed', focused: 'when keyboard-focused', disabled: 'when disabled / unavailable', selected: 'when selected / active', visited: 'after it has been visited' };
const sc = (state?: string) => (state && STATE_WHEN[state] ? ` ${STATE_WHEN[state]}` : '');
// `meaning` answers "what does this SIGNIFY / what is it for" (vs `$description`,
// which is "what it is"). Semantic signal per intent; structural purpose otherwise.
const SIGNAL: Record<string, string> = {
  brand: 'Brand identity', success: 'Success / positive signaling', warning: 'Warning / caution signaling',
  danger: 'Destructive / error signaling', info: 'Informational signaling',
};
const genMeaning = (group: string, variant: string): string => {
  if (group === 'disabled') return 'Unavailable / inactive state';
  if (group === 'field') return 'Form input / field chrome';
  if (variant === 'link') return 'Interactivity / navigation';
  if (variant === 'focus') return 'Keyboard focus indication';
  if (SIGNAL[variant]) return SIGNAL[variant];                                  // intent fill/text/icon/border (incl. danger)
  if (variant.endsWith('-subtle')) { const i = variant.replace('-subtle', ''); return `${SIGNAL[i] ?? cap(i)} (low-emphasis)`; }
  if (variant.startsWith('on-')) { const x = variant.slice(3); return `Legible content on ${(INTENT[x] ?? x)} fills`; }
  if (group === 'background') return 'Page / canvas surface';
  if (group === 'foreground') return 'Surface / fill on the canvas';
  if (group === 'text' || group === 'icon') return 'Content hierarchy / reading emphasis';
  if (group === 'border') return 'Separation / structure';
  if (group === 'scrim') return 'Background dimming / modal focus';
  if (group === 'veil') return 'Text legibility over a photograph';
  return `${cap(group)} role`;
};
// the on-color target an on-* label sits on. Every `on-<x>` is a STATUS FILL since #1140 — `on-inverse`
// is retired, because an inverse surface is a context and `on-` names a ground that gets painted.
const onTarget = (x: string): string => `foreground.${x}`;

/** A role name in backticks — the one shape the sidecar gate reads as a path claim and resolves. */
const q = (role: string) => `\`${role}\``;
const list = (roles: string[]) => roles.length < 2 ? roles.map(q).join('') : `${roles.slice(0, -1).map(q).join(', ')} and ${q(roles[roles.length - 1])}`;

/** The tonal ladder an ink can sit on: the three page tiers and the three surfaces placed on them.
 *  Named in page spelling; on an inverse role the decoration remaps each to its `inverse.` twin. */
const LADDER = ['background.primary', 'background.secondary', 'background.tertiary', 'foreground.primary', 'foreground.secondary', 'foreground.tertiary'];

/**
 * What `describe` may ask of the resolved data. Every surface or pairing claim in the prose is
 * COMPUTED through this, in every mode, rather than typed — #1623 (AI/A-5, A-8, A-9, A-10) found
 * the typed versions ("on any surface", "control borders", "the darkest permissible ground") false
 * in all four brands, because the engine gates an ink on its floor only and the prose widened that.
 * Names go in and come out in PAGE spelling; `real` maps them onto the role's own ground.
 */
type Ctx = {
  /** The stated floor of a role (its light-mode contract), 0 when it has none. */
  min: (role: string) => number;
  /** The modes in which `ink` falls below `min` on `ground`. Empty means it holds in every mode. */
  failing: (ink: string, ground: string, min: number) => string[];
};

/** "Clears N:1 in every mode on …" — the surface list an ink really holds on, plus where it does not.
 *  `alt` is named for the failing surfaces only when it clears every one of them itself. */
const surfaceClause = (ctx: Ctx, ink: string, min: number, alt?: string): { text: string; ok: string[] } => {
  const ok = LADDER.filter((s) => ctx.failing(ink, s, min).length === 0);
  const not = LADDER.filter((s) => !ok.includes(s));
  if (!ok.length) return { text: `Below ${min}:1 on ${list(not)} in at least one mode.`, ok };
  let text = `Clears ${min}:1 in every mode on ${list(ok)}.`;
  if (not.length) {
    const altHolds = alt && not.every((s) => ctx.failing(alt, s, min).length === 0);
    text += ` Below ${min}:1 on ${list(not)} in at least one mode${altHolds ? ` — use ${q(alt!)} there` : ''}.`;
  }
  return { text, ok };
};

// Intent-keyed examples (AI/A-21): the example names the intent's own situation, and an icon role is
// described as an icon.
const EXAMPLE: Record<string, string> = {
  brand: 'a brand accent or highlighted label', success: 'a success confirmation', warning: 'a caution note',
  danger: 'an inline validation error', info: 'an informational note',
};
const modeList = (ms: string[]) => (ms.length === 1 ? `${ms[0]} mode` : `${ms.slice(0, -1).join(', ')} and ${ms[ms.length - 1]} modes`);
const inkNoun = (k: string) => (k === 'icon' ? 'icons' : 'text');

type Described = { when_to_use: string; avoid_when: string; paired_with?: string[]; page_note?: string };

/** Generate the prose + relationship fields for one semantic role. The key splits
 *  as [group, variant, state]; nested ladders (background.secondary, text.link.hover)
 *  put the tier/state in `state`.
 *
 *  IT NEVER SEES AN INVERSE ROLE, and that is #1140's doing rather than an omission. An inverse role is
 *  its page twin plus one leading `inverse.` segment, so it splits into the same [group, variant, state]
 *  and gets the same description, DECORATED — see `onInverseGround` below. Before the restructure this
 *  function carried four bespoke inverse branches (background, foreground, border, and the `on-`
 *  spelling) plus a fifth in `describeInteractive`, each re-stating the same "on a dark band" idea in its
 *  own words, and `disabled`/`field` had none at all so their five and four inverse roles fell through to
 *  the generic fallback. One prefix strip covers all 113 and closes those nine by construction.
 *
 *  `$description` is NOT generated here any more (AI/A-22): the sidecar copies the token's own, which
 *  is the engine's measured statement, so one token has one "what it is". `page_note` is a sentence
 *  that is true on the page ground only (AI/A-13) — the page role appends it, the inverse twin drops it. */
const describe = (group: string, variant: string, state: string | undefined, ctx: Ctx): Described => {
  const intent = INTENT[variant];

  // background — the CANVAS (thin, page-level)
  if (group === 'background') {
    if (TIER_N[variant]) return { when_to_use: variant === 'primary' ? 'The page / base canvas.' : variant === 'secondary' ? 'A second page tier — one step off the base in light and dark; identical to `background.primary` in high-contrast modes.' : 'A third page-level surface step.', avoid_when: 'Do not use for surfaces placed on the page (use `foreground.*`) or for ink (use `text.*` or `icon.*`).', paired_with: ['foreground.primary', 'text.primary', 'border.primary'] };
  }

  // foreground — SURFACES & FILLS placed on the canvas
  if (group === 'foreground') {
    if (TIER_N[variant]) return { when_to_use: variant === 'primary' ? 'Cards — the default surface placed on the page.' : variant === 'secondary' ? 'Panels / nested containers.' : 'A third surface step.', avoid_when: 'Do not use for the page itself (use `background.*`) or for ink (use `text.*` or `icon.*`).', paired_with: ['text.primary', 'border.primary'] };
    if (variant.endsWith('-subtle')) { const i = variant.replace('-subtle', ''); return { when_to_use: `Low-emphasis ${i} surfaces — banners, badges, selected rows.`, avoid_when: `Do not use as a solid ${i} fill (use ${q(`foreground.${i}`)}) or for ${i} ink (use ${q(`text.${i}`)}).`, paired_with: [`text.${i}`, `icon.${i}`] }; }
    if (intent) return { when_to_use: `Filled ${variant} elements — badges, banners, status chips.`, avoid_when: `Do not use for ${variant} ink (use ${q(`text.${variant}`)}) or as a subtle tint (use ${q(`foreground.${variant}-subtle`)}).`, paired_with: [`text.on-${variant}`, `icon.on-${variant}`] };
  }

  // text / icon — INK. Every surface claim is the computed clause (AI/A-5), and `paired_with` is the
  // same computed list, so the prose and the pairing cannot disagree.
  if (group === 'text' || group === 'icon') {
    const k = group;
    const self = state ? `${k}.${variant}.${state}` : `${k}.${variant}`;
    const floor = (fallback: number) => ctx.min(self) || fallback;
    if (TIER_N[variant]) {
      const c = surfaceClause(ctx, self, floor(4.5), variant === 'primary' ? undefined : `${k}.primary`);
      // The on-* redirect is a `page_note`: the on-* inks are measured on the page fills only, so on an
      // inverse band it would be the wrong-ground pairing AI/A-7 removed from `paired_with`.
      return { when_to_use: `${cap(variant)} ${k}. ${c.text}`, avoid_when: 'Do not use on solid or vivid fills.', page_note: `Use the ${q(`${k}.on-*`)} ink paired with the fill.`, ...(c.ok.length ? { paired_with: c.ok } : {}) };
    }
    // (disabled ink is the cross-cutting disabled.text / disabled.icon, group === 'disabled' below.)
    if (variant === 'link') {
      const c = surfaceClause(ctx, self, floor(4.5));
      return { when_to_use: `Hyperlinks and interactive ${k}${sc(state)}. ${c.text}`, avoid_when: `Do not use for non-interactive ${k} (use ${q(`${k}.primary`)}).`, ...(c.ok.length ? { paired_with: c.ok } : {}) };
    }
    if (variant.endsWith('-subtle')) {
      const i = variant.replace('-subtle', '');
      const c = surfaceClause(ctx, self, floor(3));
      return { when_to_use: `Low-emphasis ${i} ${inkNoun(k)} and quiet accents. ${c.text}`, avoid_when: `For safety-critical ${i} messaging use the bold ${q(`${k}.${i}`)}; verify contrast for body text.`, ...(c.ok.length ? { paired_with: c.ok } : {}) };
    }
    if (variant.startsWith('on-')) { const x = variant.slice(3); return { when_to_use: `${cap(k)} placed on the ${x} fill it is paired with.`, avoid_when: `Do not use on standard surfaces — use ${q(`${k}.primary`)} or ${q(`${k}.secondary`)}.`, paired_with: [onTarget(x)] }; }
    if (intent) {
      const c = surfaceClause(ctx, self, floor(4.5));
      return { when_to_use: `${cap(variant)} ${inkNoun(k)} — e.g. ${k === 'icon' ? 'the icon beside ' : ''}${EXAMPLE[variant]}. ${c.text}`, avoid_when: `Do not use on a solid ${variant} fill.`, page_note: `Use ${q(`${k}.on-${variant}`)} there.`, ...(c.ok.length ? { paired_with: c.ok } : {}) };
    }
  }

  // border. A border's surface claim is SC 1.4.11's 3:1, computed like the inks' (AI/A-9).
  if (group === 'border') {
    if (variant === 'primary') {
      // Name the border that really clears 3:1 on every step, rather than a fixed one (AI/A-9: the old
      // advice named `border.secondary`, which clears it on `background.primary` alone).
      const strong = ['border.secondary', 'border.tertiary'].find((b) => LADDER.every((s) => ctx.failing(b, s, 3).length === 0));
      const redirect = strong ? ` ${q(strong)} clears 3:1 in every mode on ${list(LADDER)} — use it, or ${q('field.border.rest')} for an input.` : ` No border role clears 3:1 on every surface step; each border's entry lists where it does.`;
      return { when_to_use: 'Dividers, card outlines, low-emphasis separation.', avoid_when: `Do not use where 3:1 non-text contrast is required.${redirect}` };
    }
    if (variant === 'secondary') return { when_to_use: `Higher-emphasis dividers and separators. ${surfaceClause(ctx, 'border.secondary', 3).text}`, avoid_when: `Do not use as a faint hairline (use ${q('border.primary')}).` };
    // `border.inverse` HAD A BESPOKE BRANCH HERE UNTIL #1140, dispatching `default` (decorative) versus
    // `focus` (the ring) off the third segment. Both are ordinary `border` roles now —
    // `inverse.border.primary` and `inverse.border.focus` — so they take the branches below and the
    // inverse decoration, and `default` is gone entirely: it was byte-identical to `primary`.
    if (variant === 'tertiary') return { when_to_use: `The most prominent structural edge — a table outline, a section rule, the boundary that has to read as deliberate. ${surfaceClause(ctx, 'border.tertiary', 3).text}`, avoid_when: `Do not use as a hairline (use ${q('border.primary')}) or as a focus ring (use ${q('border.focus')}) — the ring has its own hue for a reason.` };
    if (variant === 'focus') {
      const c = surfaceClause(ctx, 'border.focus', ctx.min('border.focus') || 3);
      return { when_to_use: `The keyboard-focus indicator on interactive elements. ${c.text}`, avoid_when: `Do not use as a decorative divider (use ${q('border.primary')}).`, page_note: `On an inverse band, use ${q('inverse.border.focus')}.`, ...(c.ok.length ? { paired_with: c.ok } : {}) };
    }
    if (intent) return { when_to_use: `Validation/state borders for ${variant} (e.g. invalid fields).`, avoid_when: `Do not use as ${variant} ink or fill — use ${q(`text.${variant}`)} or ${q(`foreground.${variant}`)}.` };
  }

  // disabled — cross-cutting (docs/20 §7): one treatment, any intent.
  if (group === 'disabled') {
    if (variant === 'fill') return { when_to_use: 'The fill of ANY disabled control (button, chip, field), regardless of intent — a disabled control looks disabled.', avoid_when: 'Do not use for enabled controls (use `interactive.*` fills or `foreground.*`).', paired_with: ['disabled.on-fill'] };
    if (variant === 'on-fill') return { when_to_use: "The label or icon on a disabled control's fill — muted but legible on it.", avoid_when: 'Do not use on an enabled fill (use `interactive.*` on-fill inks) or on the page (use `disabled.text`).', paired_with: ['disabled.fill'] };
    if (variant === 'text') return { when_to_use: 'Text of a disabled or inactive element (a disabled outline/text control, disabled body copy).', avoid_when: 'Do not use for active content (use `text.primary` or `text.secondary`).' };
    if (variant === 'icon') return { when_to_use: 'Icon of a disabled or inactive element.', avoid_when: 'Do not use for active icons (use `icon.primary` or `icon.secondary`).' };
    if (variant === 'border') return { when_to_use: 'The border of a disabled outline control.', avoid_when: 'Do not use as a page divider (use `border.primary`) or on an enabled control (use `interactive.*` borders).', paired_with: ['disabled.fill'] };
  }

  // field — form-element chrome (docs/20 §17). Minimal; states compose from other families.
  if (group === 'field') {
    const validation = 'a validation state (use an intent border such as `border.danger`)';
    if (variant === 'fill') return { when_to_use: 'The fill of a text input / form field — TRANSPARENT by default, so the border frames the field on whatever ground it sits. Point it at a surface step for a filled field.', avoid_when: 'Do not use for the page (use `background.*`) or a card (use `foreground.*`).', paired_with: ['field.border.rest', 'field.placeholder', 'text.primary'] };
    if (variant === 'border') {
      // AI/A-10: "gated on the darkest permissible ground" named nothing an agent could resolve, and was
      // false on the darker steps. The clause names the real surfaces.
      if (state === 'hover') return { when_to_use: `The HOVER boundary of a form field — a subtly stronger perceivable border (SC 1.4.11) on pointer hover. ${surfaceClause(ctx, 'field.border.hover', ctx.min('field.border.hover') || 3).text}`, avoid_when: `Do not use as the resting border (use \`field.border.rest\`), the focus ring (use \`border.focus\`), or ${validation}.`, paired_with: ['field.border.rest'] };
      return { when_to_use: `The RESTING boundary of a transparent-fill field, before focus (SC 1.4.11). ${surfaceClause(ctx, 'field.border.rest', ctx.min('field.border.rest') || 3).text}`, avoid_when: `Do not use for the focus ring (use \`border.focus\`) or ${validation}.`, paired_with: ['field.placeholder'] };
    }
    if (variant === 'placeholder') return { when_to_use: `Placeholder / hint text inside a field. The fill is transparent, so the ground behind it decides: ${surfaceClause(ctx, 'field.placeholder', ctx.min('field.placeholder') || 4.5).text.replace(/^C/, 'c')}`, avoid_when: 'Do not use as a label (a11y anti-pattern) or for the entered value (use `text.primary`).', paired_with: ['field.border.rest'] };
  }

  if (group === 'scrim') return { when_to_use: 'The dimming layer behind a modal, dialog, or drawer.', avoid_when: 'Do not use as a solid surface or for any opaque element.', paired_with: ['inverse.foreground.primary'] };

  // veil — the media wash (#1030, renamed #1317). `variant` is the polarity, `state` the rung. A rung
  // names an INTENSITY (subtle / medium / strong), so the guidance is decision-shaped: pick the polarity
  // from the image, then the intensity from how much the image needs muting — the contrast judgment is
  // the designer's, against their own photo, because a per-image guarantee is one the engine cannot keep.
  //
  // NO `paired_with` (AI/A-6). The wash is identical in every mode, but every text role flips in dark
  // mode, so any role named here is dark-on-dark in half the modes (about 1.05:1 measured). The ink has
  // to hold still with the veil, and no semantic text role does.
  if (group === 'veil') {
    const ink = variant === 'dark' ? 'light' : 'dark';
    return {
      when_to_use: `A ${state} ${variant} wash over a photograph or video, to lift ${ink} text off it. Pick the polarity from the image (${variant} veil under ${ink} text), then the intensity for how much the image needs muting; verify contrast against your own photo. The ink must stay ${ink} in every mode, as the veil does — the page and inverse text roles flip in dark mode, so neither is a safe pair.`,
      avoid_when: 'Do not use as a modal backdrop (use `scrim.default`) or over a solid token surface — the wash assumes an unknown image, so on a known surface a semantic role measures the real contrast instead.',
    };
  }

  // fallback
  return { when_to_use: `Use as the ${group} ${variant} role.`, avoid_when: `Do not use outside the ${group} role.` };
};

// interactive.<color>.<slot>.<state?> (docs/20) — a DEEPER key than the other
// families (color + slot + optional fill-state), so it is described on its own
// rather than through the [group, variant, state] split above.
const INTERACTIVE_COLOR: Record<string, string> = { primary: 'primary', neutral: 'neutral', destructive: 'destructive', accent: 'accent' };
const describeInteractive = (color: string, slot: string, state: string | undefined, ctx: Ctx): Described => {
  const c = INTERACTIVE_COLOR[color] ?? color;
  // One shape for every sibling (AI/D-4): the other two colors, each as a resolvable family.
  const others = ['primary', 'neutral', 'destructive'].filter((o) => o !== c);
  const other = `${c === 'destructive' ? 'a non-destructive intent' : 'another intent'} (use ${others.map((o) => q(`interactive.${o}.*`)).join(' or ')})`;
  if (slot === 'fill') {
    // AI/A-8: `on-fill` is gated against `fill.rest` only, so a non-rest state is paired with it only
    // where it measurably holds in every mode; otherwise the entry says where it does not.
    const onFill = `interactive.${c}.on-fill`, min = ctx.min(onFill);
    const fails = state && state !== 'rest' ? ctx.failing(onFill, `interactive.${c}.fill.${state}`, min || 4.5) : [];
    const note = fails.length ? ` ${q(onFill)} is gated against ${q(`interactive.${c}.fill.rest`)} only; on this fill it drops below ${min || 4.5}:1 in ${modeList(fails)}.` : '';
    return { when_to_use: `The fill of a FILLED ${c} interactive element — buttons, controls, selectable rows${sc(state)}.${note}`, avoid_when: `Do not use for ${other}, or for outline/text appearances (use ${q(`interactive.${c}.text.*`)} or ${q(`interactive.${c}.border.*`)}).`, ...(fails.length ? {} : { paired_with: [onFill] }) };
  }
  if (slot === 'on-fill') return { when_to_use: `The label / icon placed on a filled ${c} interactive element.`, avoid_when: `Do not use on the page or on outline controls — use ${q(`interactive.${c}.text.*`)}.`, paired_with: [`interactive.${c}.fill.rest`] };
  // text and icon (AI/A-15: the icon slot had no branch and fell through to the generic fallback) —
  // the ink of an outline or text control, with its surface list computed like every other ink's.
  if (slot === 'text' || slot === 'icon') {
    const self = `interactive.${c}.${slot}.${state ?? 'rest'}`;
    const min = ctx.min(self);
    const clause = min > 0 ? surfaceClause(ctx, self, min) : undefined;
    return { when_to_use: `The ${slot === 'icon' ? 'icon' : 'ink'} for OUTLINE and TEXT ${c} interactive elements (no fill behind it)${sc(state)}.${clause ? ` ${clause.text}` : ''}`, avoid_when: `Do not use on a filled ${c} control (use ${q(`interactive.${c}.on-fill`)}).`, ...(clause?.ok.length ? { paired_with: clause.ok } : {}) };
  }
  // The border is stateful (#576), so it is described per state exactly like `fill` — and it names
  // its matching ink as `paired_with`, because by default the two ARE the same value and an agent
  // choosing one should know the other tracks it.
  if (slot === 'border') {
    return { when_to_use: `The border of an OUTLINE ${c} interactive element${sc(state)}.`, avoid_when: `Do not use as ink (use ${q(`interactive.${c}.text.*`)}) or as a page divider (use ${q('border.primary')}).`, paired_with: [`interactive.${c}.text.${state ?? 'rest'}`, 'background.primary'] };
  }
  // A `slot === 'inverse'` BLOCK STOOD HERE UNTIL #1140, and it was the clearest single argument for the
  // restructure. The inverse column nested its real slot one deeper (`inverse.<slot>.<state>`), so `state`
  // carried the sub-slot and the actual state sat a segment further on — which meant the block had to
  // re-implement `fill`/`on-fill`/`border`/`overlay`/`text` a second time, off a shifted index, and it
  // silently dropped the state from all five (`fill.hover` and `fill.rest` got the same prose). With the
  // marker moved to a leading `inverse.` segment the column splits identically to the page column, so the
  // five branches below serve both grounds, states included, and the decoration says which ground.
  //
  // The ground-specific sentence is a `page_note` (AI/A-13): on the inverse twin it used to tell the
  // role to use itself instead of itself. (`foreground.${c}-subtle` is AI/A-11 — held for #1614.)
  if (slot === 'overlay') return { when_to_use: `A translucent ${c} ${state ?? 'interaction'} wash for outline/text controls and hover/pressed/selected rows, menus, cards.`, avoid_when: `Do not use as an opaque fill (use ${q(`interactive.${c}.fill.*`)} or foreground.${c}-subtle) or as a modal backdrop (use ${q('scrim.default')}).`, page_note: `On an inverse band, use ${q(`inverse.interactive.${c}.overlay.*`)} — the page wash takes the page's polarity.`, paired_with: ['text.primary'] };
  return { when_to_use: `The ${slot} of a ${c} interactive element.`, avoid_when: `Do not use outside the ${c} interactive family.` };
};

/**
 * ── THE INVERSE DECORATION (#1140) ──────────────────────────────────────────────────────────────
 *
 * `inverse.<X>` is described as `<X>` and then decorated, because that is exactly what the name now
 * claims: the leading group says "same role, other ground", so a second body of prose for each inverse
 * role would be a second answer to a question the name already answers. Six bespoke branches went in
 * exchange for this one function, and nine roles (`disabled` ×5, `field` ×4) gained a real description
 * they never had.
 *
 * The decoration is deliberately thin — it names the GROUND and the page twin to reach for instead, and
 * leaves the role's own guidance alone.
 *
 * Role NAMES are remapped, in `paired_with` and in the prose alike, because a name is a concrete token a
 * consumer will bind: an inverse fill paired with `background.primary` would send ink to the wrong
 * ground, and an inverse `avoid_when` that says "use `text.brand`" sends an agent on a dark band to page
 * ink (AI/A-14). Every backticked role in the borrowed prose moves to its `inverse.` twin when that twin
 * exists — a mechanical rename, not a per-role re-decision. The remap is driven by the EMITTED role set
 * (`known`) rather than by `inverse-coverage.ts`.
 *
 * A pairing whose twin does NOT exist is DROPPED rather than kept on the page name (AI/A-7). Keeping it
 * paired `inverse.foreground.<intent>` with the page `text.on-<intent>`, a label measured only on the
 * page fill: 2.5–3.3:1 in the HC modes, against a 4.5:1 floor, in all four brands. A pairing nobody
 * measured is not a fallback.
 */

/** The one leading segment that marks a role as living on the inverse ground (#1140 Rule 1). */
const INVERSE_GROUP = 'inverse';

/** Extra guidance that is genuinely about the GROUND rather than the role, keyed by the segment it
 *  applies to. Kept tiny on purpose: an entry here is a claim the page prose cannot make. */
const INVERSE_NOTE: Record<string, string> = {
  overlay: ' Its polarity is the opposite of the page wash, because the band is the opposite lightness — a light wash on a light page is invisible, and this is that failure in reverse.',
};

/** A backticked role name (or `family.*` wildcard) moved onto the inverse ground when its twin exists. */
const toInverse = (name: string, known: (role: string) => boolean): string => {
  if (name.startsWith(`${INVERSE_GROUP}.`)) return name;
  const twin = `${INVERSE_GROUP}.${name}`;
  return known(twin) ? twin : name;
};

const onInverseGround = (d: Described, pageKey: string, known: (role: string) => boolean): Described => {
  const note = pageKey.split('.').map((s) => INVERSE_NOTE[s]).find(Boolean) ?? '';
  const remap = (text: string) => text.replace(/`([a-z][a-z0-9.*-]*)`/g, (_, n: string) => `\`${toInverse(n, known)}\``);
  const paired = d.paired_with?.map((p) => toInverse(p, known)).filter((p) => p.startsWith(`${INVERSE_GROUP}.`));
  return {
    when_to_use: `${remap(d.when_to_use)} Only on an INVERSE ground — a dark band on a light page, or the reverse.${note}`,
    avoid_when: `Do not use on the page ground; that is \`${pageKey}\`. ${remap(d.avoid_when)}`,
    ...(paired?.length ? { paired_with: paired } : {}),
  };
};

// ---- primitive tier (simplified) -------------------------------------------
type AiPrimitive = { $description: string; meaning: string; intent?: string; tier: 'primitive'; consume: string; aliased_by?: string[] };

// The contrast-role intent of each ramp band (the Univers/NB placement method:
// steps are placed at the luminance their role needs, not on an even-L curve).
const BAND_INTENT: Record<string, string> = {
  Highlights: 'Lightest tints — app / subtle backgrounds, hover & selected fills',
  Quarter: 'Subtle borders, dividers, and disabled / secondary fills',
  Mid: 'Solid fills & UI-element backgrounds',
  ThreeQuarter: 'Strong borders, secondary text, and hover/active states of solid fills',
  Shadows: 'Highest-contrast text and strong foreground',
};
const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };
const colorIntent = (seg: string[], node: any): string | undefined => {
  if (seg[0] !== 'palette') return undefined;                     // scale-role intent is color-primitive-specific
  if (seg[1] === 'white') return 'Pure highlight base — default light surface / on-color text';
  if (seg[1] === 'black') return 'Shadow base — scrim & shadow source / on-color text';
  if (seg[1] === 'black-alpha' || seg[1] === 'white-alpha') return 'Overlay / scrim / shadow compositing (alpha — composites over any surface)';
  const ext = node.$extensions?.prism3 ?? {};
  if (!ext.band) return undefined;
  // Usage-framed tails (what the step UNLOCKS) — distinct from the identity the
  // leaf $description states (the measured property / provenance). No paraphrase.
  // The pivot tail is a contrast claim, so it ships only where it is measurably true — 4.5:1 on white
  // AND on black. It was dead code until #1623 (AI/A-1) and is false for two committed ramps (AI/A-18).
  const hex = ext.hex ?? (typeof node.$value === 'string' && node.$value.startsWith('#') ? node.$value : undefined);
  const pivots = seg[2] === '500' && hex !== undefined && contrast(hexToRgb(hex), WHITE) >= 4.5 && contrast(hexToRgb(hex), BLACK) >= 4.5;
  const pivot = pivots ? ' — the one mid step that reads as text or icons over both light and dark fills' : '';
  return BAND_INTENT[ext.band] + pivot + (ext.anchor ? ' — reach for this when fidelity to the source brand color matters' : '');
};

// `consume` differs by family: colour/dimension are PRIVATE (reach them through a
// semantic alias); opacity/motion are consumable directly (their semantic layer is thin).
const CONSUME: Record<string, string> = {
  palette: 'Private primitive — reference a `color.*` semantic token that aliases this, not the raw step.',
  dimension: 'Private primitive — reference via space / radius / size / border-width / focus.',
  opacity: 'Consumable — reference directly for custom alpha (or use the scrim / disabled tokens).',
  motion: 'Consumable — motion durations/easings/springs are used directly; transitions compose them.',
  font: 'Private primitive — reach for it through a type style (`type.*`, in the typography tier of this file), not the raw size/weight.',
  shadow: 'Consumable — apply the elevation step directly (mode-aware: light shadow / reduced in dark, surface lift carries dark elevation).',
};
const primMeaning = (seg: string[]): string => {
  if (seg[0] === 'palette') {
    if (seg[1] === 'white' || seg[1] === undefined) return 'Pure white primitive';
    if (seg.length === 2) return `Pure ${seg[1]} primitive`;
    if (seg[1] === 'black-alpha' || seg[1] === 'white-alpha') return `${seg[1].startsWith('black') ? 'Black' : 'White'} at ${seg[2]}% alpha (composites over any surface)`;
    return `${seg[1]} ramp — raw step ${seg[2]}`;
  }
  if (seg[0] === 'opacity') return 'Opacity scale primitive';
  if (seg[0] === 'dimension') return `${seg[1]}px grid primitive`;
  if (seg[0] === 'motion') return seg[1] === 'easing' ? 'Easing curve primitive (cubic-bezier)' : seg[1] === 'spring' ? 'Spring primitive (damping / stiffness)' : seg[1] === 'stagger' ? 'Stagger delay primitive' : 'Motion duration primitive';
  if (seg[0] === 'font') {
    if (seg[1] === 'family') return `Font family stack — ${seg[2]} role`;
    if (seg[1] === 'size') return `Font size primitive — ${seg[2]}px (rem)`;
    if (seg[1] === 'weight') return `Font weight primitive — numeric ${seg[2]} (reference tier)`;
    if (seg[1] === 'line-height') return `Line-height multiplier — ${seg[2]} (unitless)`;
    if (seg[1] === 'letter-spacing') return `Letter-spacing primitive — ${seg[2]} (em)`;
    if (seg[1] === 'typeface') return `Typeface primitive — ${seg[2]}`;
    return `Typography primitive — ${seg.slice(1).join(' ')}`;
  }
  if (seg[0] === 'shadow') return `Shadow / elevation composite — ${seg[1]} (2-layer, mode-aware)`;
  return `${cap(seg[0])} primitive — ${seg.slice(1).join(' ')}`;
};

/** Refs inside a $value — a `{alias}` string, or alias strings in a composite object. */
const refsIn = (v: any): string[] => {
  if (typeof v === 'string') { const m = v.match(/^\{(.+)\}$/); return m ? [m[1]] : []; }
  if (v && typeof v === 'object') return Object.values(v).flatMap(refsIn);
  return [];
};

/** Where the tree lives relative to the sidecar — the note names it. `export_theme` writes the tree as
 *  `tokens.json`, not `<id>.tokens.json`, so it passes its own name (AI/A-17). */
export type AiMetadataOptions = { tokensFile?: string };

/** The ground steps that can supply an ink's floor, most likely first. The engine records the floor as a
 *  bare palette step (`neutral.050`), which is not a role an agent can bind (AI/A-4); this is the order
 *  in which a role standing on that step is looked for. */
const FLOOR_ROLES = ['background.secondary', 'background.primary', 'background.tertiary', 'foreground.primary', 'foreground.secondary', 'foreground.tertiary'];

export const buildAiMetadata = (theme: Theme, tree: any, opts: AiMetadataOptions = {}) => {
  const root = theme.root;
  const brand = tree?.[root] ?? {};
  const tokensFile = opts.tokensFile ?? `${theme.id}.tokens.json`;

  // ---- semantic tier (rich) ----
  const modes = resolveAllModes(theme);
  const byRole: Record<string, Record<string, ResolvedRole>> = {};
  for (const m of modes) for (const [k, r] of Object.entries(m.roles)) (byRole[k] ??= {})[m.mode] = r;
  const known = (r: string) => r in byRole;
  const modeNames = modes.map((m) => m.mode);
  const nodeAt = (path: string) => path.split('.').reduce((o: any, k) => o?.[k], brand);

  const colorRoles: Record<string, AiToken> = {};
  for (const [roleKey, perMode] of Object.entries(byRole)) {
    // #1140: an inverse role is its page twin with one leading segment, so it is split, described and
    // meant AS its page twin, then decorated. Everything downstream of `pageKey` is ground-agnostic.
    const inverse = roleKey.startsWith(`${INVERSE_GROUP}.`);
    const pageKey = inverse ? roleKey.slice(INVERSE_GROUP.length + 1) : roleKey;
    const [group, variant, state] = pageKey.split('.');
    const light = perMode.light;
    // Names come in page spelling and are measured on THIS role's ground.
    const real = (name: string) => (inverse ? toInverse(name, known) : name);
    const ctx: Ctx = {
      min: (r) => byRole[real(r)]?.light?.min ?? 0,
      failing: (ink, ground, min) => modeNames.filter((m) => {
        const i = byRole[real(ink)]?.[m], g = byRole[real(ground)]?.[m];
        // A translucent role, or one missing in a mode, cannot be verified — so it does not hold.
        if (!i || !g || (i.alpha ?? 1) < 1 || (g.alpha ?? 1) < 1) return true;
        return contrast(hexToRgb(i.hex), hexToRgb(g.hex)) < min;
      }),
    };
    // interactive.<color>.<slot>.<state?> carries a 4th segment — describe it whole.
    const base = group === 'interactive'
      ? describeInteractive(variant, state, pageKey.split('.')[3], ctx)
      : describe(group, variant, state, ctx);
    const d = inverse
      ? onInverseGround(base, pageKey, known)
      : { ...base, avoid_when: base.page_note ? `${base.avoid_when} ${base.page_note}` : base.avoid_when };
    const mode_overrides: Record<string, string> = {};
    for (const [mode, r] of Object.entries(perMode)) mode_overrides[mode] = `{${r.path}}`;
    // what it SIGNIFIES / is for. The inverse ground is a suffix on the page role's meaning, for the
    // same reason the prose is decorated rather than rewritten: the role signifies the same thing.
    const meaning = (group === 'interactive' ? 'Interactivity / actions' : genMeaning(group, variant)) + (inverse ? ' (inverse ground)' : '');
    const ai: AiToken = {
      // what it IS — the token's own description, copied, so one token has one answer (AI/A-22). The
      // sidecar used to generate a second, vaguer one that dropped facts such as a veil's opacity.
      $description: nodeAt(`color.${roleKey}`)?.$description ?? meaning,
      meaning,
      when_to_use: d.when_to_use,
      avoid_when: d.avoid_when,
      // Same condition as `contrast_with` below, on purpose — the level IS the presence of a real
      // contract, not a second opinion about it. See the AiToken comment for why that coupling is
      // the point, not duplication to clean up.
      avoid_when_level: light.min > 0 ? 'MUST' : 'SHOULD',
      mode_overrides,
    };
    if (d.paired_with?.length) ai.paired_with = d.paired_with;
    // `contrast_with` names the token the ratio was measured WITH — for a translucent wash that is
    // `legibleFor`, the ink that must survive on the composited result.
    //
    // This is a MIGRATION, not a bug fix, and the distinction is worth keeping straight: the old
    // `light.against` was already correct here, because `against` on an overlay HELD the ink. This
    // field wanted the ink and `against` happened to be carrying it. Verified rather than assumed —
    // every emitted `contrast_with.token` is byte-identical across this change. What #963 moves is
    // `against` itself, to mean the ground on every role; so this line has to follow, or it would
    // start naming the page where it used to name the ink. The emitted output not moving is the
    // evidence it followed correctly.
    //
    // `composited_over` is the genuinely new part, and it closes a real gap: "4.5:1 with
    // text.primary" was never actionable on its own, because which ground the wash sat on to make
    // that true was recorded nowhere an agent could read.
    //
    // A floor recorded as a bare palette step is named by the ROLE standing on it (AI/A-4) — in every
    // committed brand that is `background.secondary`. With no such role the full primitive path is
    // named instead, which resolves but is not a role; the sidecar gate refuses that for a committed brand.
    const asRole = (against: string): string => {
      if (known(against)) return against;
      const onFloor = FLOOR_ROLES.map(real).find((r) => byRole[r]?.light?.path.endsWith(`.palette.${against}`));
      return onFloor ?? `${CORE_TIER}.palette.${against}`;
    };
    if (light.min > 0) ai.contrast_with = [{
      token: light.model === 'ink-on-composite' ? light.legibleFor : asRole(light.against),
      min: `${light.min}:1`,
      ratio: Math.round(light.ratio * 100) / 100,
      ...(light.model === 'ink-on-composite' ? { composited_over: asRole(light.against) } : {}),
    }];
    colorRoles[roleKey] = ai;
  }

  // ---- primitive tier (simplified) + the reverse alias index (aliased_by) ----
  // Walk the whole tree once: collect leaves, and build path → [referrers] from
  // every alias (colour semantics, dimension semantics, transitions, scrim, …) so
  // each primitive carries the bidirectional graph for impact analysis.
  const leaves: { path: string; node: any }[] = [];
  const walk = (o: any, p: string[]) => {
    if (o && typeof o === 'object') {
      if (o.$type !== undefined) { leaves.push({ path: p.join('.'), node: o }); return; }
      for (const [k, v] of Object.entries(o)) if (!k.startsWith('$')) walk(v, [...p, k]);
    }
  };
  walk(brand, []);
  const strip = (ref: string) => (ref.startsWith(root + '.') ? ref.slice(root.length + 1) : ref);
  // Every ref a leaf makes — not just `$value`, but its per-mode (dark/HC) overrides AND a fluid
  // composite's responsive size refs (M-10). Without these, a primitive consumed SOLELY by a dark
  // override (or a fluid mobile size) shows zero consumers — contradicting the sidecar's own
  // "cannot drift" claim and hiding a load-bearing dark-side step from impact analysis.
  const allRefsOf = (node: any): string[] => {
    const refs = [...refsIn(node.$value)];
    const modeOv = node.$extensions?.prism3?.modes;
    if (modeOv && typeof modeOv === 'object' && !Array.isArray(modeOv)) for (const mv of Object.values(modeOv)) refs.push(...refsIn((mv as any)?.$value));
    const resp = node.$extensions?.prism3?.responsive;
    if (resp?.fluid) for (const e of [resp.min, resp.max]) { const m = String(e?.ref ?? '').match(/^\{(.+)\}$/); if (m) refs.push(m[1]); }
    return refs;
  };
  // Direct reverse edges (target → tokens that reference it directly).
  const directBy: Record<string, string[]> = {};
  for (const { path, node } of leaves) for (const ref of allRefsOf(node)) (directBy[strip(ref)] ??= []).push(path);
  // TRANSITIVE closure: a primitive's referrers include indirect ones too, so the
  // two-hop weight chain (composite → weight-role → numeric) is visible — the KB's
  // "re-map a brand's weights, every composite reflows" payoff is now provable from
  // the index. Without this, font.weight.700 would list only weight-role.strong and
  // hide the 15 composites that actually consume it.
  const aliasedBy: Record<string, string[]> = {};
  for (const target of Object.keys(directBy)) {
    const acc = new Set<string>();
    const visit = (t: string) => { for (const r of directBy[t] ?? []) if (!acc.has(r)) { acc.add(r); visit(r); } };
    visit(target);
    aliasedBy[target] = [...acc].sort();
  }

  const primitives: Record<string, AiPrimitive> = {};
  for (const { path, node } of leaves) {
    if (refsIn(node.$value).length > 0) continue;       // skip aliases/composites — primitives only
    // The palette, font and dimension primitives live under `core.` (CORE_TIER, theme.ts). Dispatch on
    // the family BELOW it — before #1623 (AI/A-1) every branch keyed on `seg[0]`, which is `core` for all
    // three, so 946 entries read "core primitive", none carried `intent`, and `consume` fell back.
    const full = path.split('.');
    const seg = full[0] === CORE_TIER ? full.slice(1) : full;
    const intent = colorIntent(seg, node);
    const p: AiPrimitive = {
      $description: node.$description,
      meaning: primMeaning(seg),
      ...(intent ? { intent } : {}),
      tier: 'primitive',
      consume: CONSUME[seg[0]] ?? 'Private primitive — prefer a semantic token.',
    };
    const by = aliasedBy[path];
    if (by && by.length) p.aliased_by = [...new Set(by)].sort();
    primitives[path] = p;
  }

  // ---- typography tier (composites + weight roles) ----
  // The consumer-facing type styles + the function-named weight roles. Without
  // this the agent surface would omit the entire typography semantic layer (and
  // aliased_by would dangle references at entries that don't exist in the file).
  const TYPE_DESC: Record<string, { desc: string; when: string; avoid: string }> = {
    display: { desc: 'hero / marketing display type', when: 'Large expressive headlines and hero moments.', avoid: 'Do not use for product-UI headings (use title) or running text (use body).' },
    title: { desc: 'heading type — visual hierarchy, decoupled from DOM level', when: 'Section and page headings; pick the size for visual prominence and set the DOM level (h1–h6) by document structure independently.', avoid: 'Do not bind the size to a heading level; do not use for running text (use body).' },
    body: { desc: 'running text / default UI copy', when: 'Paragraphs, descriptions, and default interface text.', avoid: 'Do not use for headings (use title/display) or dense control labels (use label).' },
    label: { desc: 'UI label type — buttons, form labels, tabs, chips', when: 'Control and form labels, button text, tabs, chips, badges.', avoid: 'Do not use for running text (use body).' },
    caption: { desc: 'caption / secondary small text', when: 'Image captions, helper text, metadata, footnotes.', avoid: 'Do not use for primary reading text (use body).' },
    eyebrow: { desc: 'eyebrow / kicker — small uppercase label above a heading', when: 'A short label sitting above a title or hero (a "kicker").', avoid: 'Do not use as the heading itself (use title) or for body copy.' },
    code: { desc: 'monospace / code type', when: 'Inline code, code blocks, and column-aligned values.', avoid: 'Do not use for prose (use body).' },
  };
  const typography: Record<string, any> = {};
  for (const c of theme.typography.composites) {
    const d = TYPE_DESC[c.group];
    // `resolves_to` is the EMITTED composite's own `$value` (AI/A-2). Re-deriving the paths here drifted:
    // line height and letter spacing named `line-height.*` / `letter-spacing.*` long after the
    // composites moved to the `-role` steps, so 155 styles pointed at tokens that do not exist.
    const emitted = nodeAt(`type.${c.path}`)?.$value;
    const resolves: Record<string, string> = emitted && typeof emitted === 'object' ? { ...emitted } : {};
    if (c.italic && resolves.fontStyle === undefined) resolves.fontStyle = 'italic';
    if (c.textCase !== 'none' && resolves.textCase === undefined) resolves.textCase = c.textCase;
    if (c.link && resolves.textDecoration === undefined) resolves.textDecoration = 'underline';
    // Key by the real tree path (`type.<path>`) so aliased_by references resolve.
    typography[`type.${c.path}`] = {
      $description: `${cap(d.desc)}${c.italic ? ' (italic variant)' : ''}${c.link ? ' (underlined link variant)' : ''}.`,
      meaning: `Type style — ${c.group}${c.variant ? ' ' + c.variant : ''} ${c.weightRole}${c.italic ? ' italic' : ''}${c.link ? ' link' : ''} (${c.sizePx}px, ${c.group} face${c.textCase !== 'none' ? `, ${c.textCase}` : ''})`,
      when_to_use: c.link ? `${d.when} The underlined link variant — pair with a \`text.link.*\` color.` : d.when,
      // AI/A-16: name the non-link twin as a path — `strong-link` pairs with `strong`, not the default.
      avoid_when: c.link ? `Do not use for non-link text (use \`type.${c.path.replace(/-link$/, '')}\`).` : d.avoid,
      resolves_to: resolves,
    };
  }
  for (const w of theme.typography.weightRoles) {
    // AI/A-3: the role lives under `core.`, and keying it anywhere else both named a token that does not
    // exist and made the `used_by` lookup below miss every time.
    const key = `${CORE_TIER}.font.weight-role.${w.role}`;
    const entry: any = {
      $description: `The ${w.role} font-weight role.`,
      meaning: `Function-named weight → ${w.value} — white-label-stable (the role is the contract; each brand maps the numeric).`,
      when_to_use: `Reference \`${key}\` (not the numeric) so a brand weight re-map reflows every consumer at once.`,
      avoid_when: `Do not hard-code the numeric (${w.value}); reference the role.`,
      resolves_to: `{${root}.${CORE_TIER}.font.weight.${w.value}}`,
    };
    const usedBy = (aliasedBy[key] ?? []).filter((p) => p.startsWith('type.'));
    if (usedBy.length) entry.used_by = usedBy;                      // which composites carry this role
    typography[key] = entry;
  }

  // ---- gradient tier (opt-in brand gradients) ----
  // Keyed by the real tree path (`gradient.<name>`) so an aliased_by reference (a
  // colour primitive listing a gradient that consumes it) resolves to a real entry.
  const gradient: Record<string, any> = {};
  for (const g of theme.gradient.gradients) {
    const r2 = (x: number) => Math.round(x * 100) / 100;    // round only for display/emit
    // AI/A-19: say which ink holds, per polarity, rather than quoting only the worse one. The pass/fail
    // test compares the raw value (CR-01); rounding is for the sentence.
    const inks = [{ ink: 'white', worst: g.worstOnWhite }, { ink: 'black', worst: g.worstOnBlack }];
    const holds = inks.filter((x) => x.worst >= 4.5), drops = inks.filter((x) => x.worst < 4.5);
    const avoid = !drops.length
      ? `White and black text both clear 4.5:1 at every sampled point (${r2(g.worstOnWhite)}:1 and ${r2(g.worstOnBlack)}:1 at worst); add a scrim for any other ink.`
      : holds.length
        ? `Do not set ${drops[0].ink} body text directly on it — it drops to ${r2(drops[0].worst)}:1 at the worst sampled point, below 4.5:1. ${cap(holds[0].ink)} text clears ${r2(holds[0].worst)}:1 at every sampled point; use ${holds[0].ink} ink, or a scrim or solid container for ${drops[0].ink}.`
        : `Do not set body text directly on it — white text drops to ${r2(g.worstOnWhite)}:1 and black text to ${r2(g.worstOnBlack)}:1 at the worst sampled point, below 4.5:1. Use a scrim or a solid container.`;
    gradient[`gradient.${g.name}`] = {
      $description: `Brand gradient — ${g.kind}${g.kind === 'linear' ? ` ${g.angle}°` : ` ${g.shape}`}, ${g.stops.length} stops.`,
      // AI/B-2: how the gradient materializes in Figma is host detail; it lives in the token's own
      // `$extensions.figma`, not in the agent's reading of what the gradient is for.
      meaning: `Decorative ${g.kind} gradient (opt-in); stop colors alias the ramp, ${g.interpolation} interpolation.`,
      when_to_use: 'Brand / marketing surfaces, hero backgrounds, decorative fills.',
      avoid_when: avoid,
      resolves_to: g.stops.map((s) => `{${s.aliasOf}}`),
      a11y: { worst_on_white: r2(g.worstOnWhite), worst_on_black: r2(g.worstOnBlack) },
    };
  }

  // AI/A-17: each tier's field list is the keys its entries actually carry, in schema order — a listed
  // field that is never emitted (`intent` and `used_by` were, for as long as A-1 and A-3 stood) tells
  // an agent to look for something that is not there.
  const fieldsOf = (tier: Record<string, any>, order: string[]) => {
    const seen = new Set(Object.values(tier).flatMap((e) => Object.keys(e)));
    return [...order.filter((f) => seen.has(f)), ...[...seen].filter((f) => !order.includes(f)).sort()];
  };
  return {
    $schema: 'prism3-ai-metadata/0.2',
    brand: theme.id,
    generated: true,
    note: `Agent-readable metadata, companion to ${tokensFile}. The color tier (semantic roles) and the typography tier ` +
      '(type styles and weight roles) carry the full field set; the primitive tier carries a reduced set, with a usage ' +
      '`intent` on color-ramp steps and `aliased_by` — the reverse index of the tokens that resolve to each primitive, ' +
      'directly or through another alias, so a type style shows up under the numeric weight its weight role maps to. ' +
      '`aliased_by` is recomputed from the token tree on every build. `contrast_with.ratio` is the light-mode measurement; ' +
      'the surfaces named in `when_to_use` and `paired_with` are measured in every mode.',
    color_fields: fieldsOf(colorRoles, ['$description', 'meaning', 'when_to_use', 'avoid_when', 'avoid_when_level', 'paired_with', 'contrast_with', 'mode_overrides']),
    typography_fields: fieldsOf(typography, ['$description', 'meaning', 'when_to_use', 'avoid_when', 'resolves_to', 'used_by']),
    primitive_fields: fieldsOf(primitives, ['$description', 'meaning', 'intent', 'tier', 'consume', 'aliased_by']),
    color: colorRoles,
    typography,
    ...(Object.keys(gradient).length ? { gradient_fields: fieldsOf(gradient, ['$description', 'meaning', 'when_to_use', 'avoid_when', 'resolves_to', 'a11y']), gradient } : {}),
    primitives,
  };
};
