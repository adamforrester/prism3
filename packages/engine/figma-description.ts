/**
 * Prism3 engine — the FIGMA register of token and style descriptions (#1623 sign-off). PURE, node-free.
 *
 * A Figma variable or style carries one `description`, read in the Variables panel and the picker by a
 * designer mid-task. The DTCG `$description` is written for a different reader — a developer or an agent
 * resolving names — and carries the full contract: every mode's floor, the resolving token path, the why.
 * The owner's sign-off on the #1623 audit keeps both and splits them: the DTCG description and the
 * `.ai.json` keep the full detail; Figma gets its OWN line of about 90 characters (docs/voice-standard.md,
 * the plugin register: "≤1 line per control (~90 chars for a `desc`)"). `lint-figma-descriptions.ts`
 * holds every emitted Figma description to that register.
 *
 * BUILT FROM STRUCTURED DATA, NEVER FROM THE DTCG TEXT. Every builder here takes values — px, a per-mode
 * contrast floor (`min`), an alpha, a ground role, a face — and composes the sentence from them. None of
 * them reads, cuts or rewrites a `$description`. A truncated DTCG sentence would keep the wrong half as
 * often as the right one, and a rewrite of it would couple the two registers so that a DTCG wording
 * change silently moved the Figma one.
 *
 * THE FIGMA REGISTER, as these builders apply it:
 *   • the variable name is already on screen, so the line says what the name does not;
 *   • names a designer may act on are Figma slash names (`background/secondary`), never dotted DTCG
 *     paths, never backticked, and never all-caps emphasis;
 *   • a contrast claim states the floor that holds in EVERY mode (the lowest `min` across modes): a
 *     Figma variable has one description for all its modes, and the per-mode floors live in the DTCG
 *     overlays and the `.ai.json`. A floor is a floor, so the lower number is true in every mode;
 *   • a percentage that differs by mode keeps the per-mode parenthetical `lint-description-claims.ts`
 *     parses — `40% (60% in dark and hc-light; 70% in hc-dark)`.
 */

/** The standard-mode body-text floor (WCAG 2.2 SC 1.4.3). Text roles gated below it carry the large-text limit. */
export const BODY_TEXT_FLOOR = 4.5;

/** The large-text limit a sub-body text role carries (owner sign-off, #1623 DT/T-7 · FG/F-16). WCAG 2.2
 *  defines large text as ≥18pt (24px) or ≥14pt bold (18.66px). Shared by the DTCG and Figma registers so
 *  the two state the same rule in the same words. */
export const LARGE_TEXT_ONLY = 'large text (≥24px, or ≥18.66px bold) or non-essential text only';

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const num = (n: number): string => String(+n.toFixed(2));
const slash = (dotted: string): string => dotted.replace(/\./g, '/');

/** Name the modes a value applies to — `dark and hc-light`, or `high-contrast modes` for both HC modes. */
export const modesPhrase = (ms: string[]): string => {
  const hc = ms.includes('hc-light') && ms.includes('hc-dark');
  return [...ms.filter((m) => !hc || (m !== 'hc-light' && m !== 'hc-dark')), ...(hc ? ['high-contrast modes'] : [])].join(' and ');
};

/** `40%`, or `40% (60% in dark and hc-light; 70% in hc-dark)` when the value differs by mode. `byMode[0]` is light. */
export const perModePercent = (byMode: Array<[string, number]>): string => {
  const [, base] = byMode[0];
  const others = new Map<number, string[]>();
  for (const [m, v] of byMode.slice(1)) if (v !== base) others.set(v, [...(others.get(v) ?? []), m]);
  if (!others.size) return `${base}%`;
  return `${base}% (${[...others].map(([v, ms]) => `${v}% in ${modesPhrase(ms)}`).join('; ')})`;
};

// ── color roles ──────────────────────────────────────────────────────────────────────────────────

/** What the Figma color builder needs to know about one role, all of it read from structured fields. */
export type ColorFacts = {
  /** The role path below `<root>.color.` — `text.secondary`, `inverse.interactive.primary.fill.pressed`. */
  role: string;
  /** Each emitted mode's contract floor (`$extensions.prism3[.modes.<m>].min`); absent = ungated. */
  mins: Array<number | undefined>;
  /** Each emitted mode's alpha as a percentage (100 = opaque), light first, `[mode, pct]`. */
  alphas: Array<[string, number]>;
  /** The ground the floor is measured on, as a color role path (`background.secondary`), if any. */
  ground?: string;
  /** Inverse interactive `on-fill` only: the engaged fill states the label measures below its floor on, in some mode. */
  dropsOn?: string[];
  /** Inverse interactive fill states only: how many neutral rungs the state sits off the rest fill. */
  rungs?: number;
};

const floorOf = (mins: Array<number | undefined>): number | undefined => {
  const gated = mins.filter((m): m is number => typeof m === 'number' && m > 0);
  return gated.length === mins.length && gated.length ? Math.min(...gated) : undefined;
};

/**
 * The Figma description of a color role. Throws on a role family it does not know, so a new family
 * cannot reach a designer's file carrying no description, or the DTCG text by default.
 */
export const figmaColorDescription = (f: ColorFacts): string => {
  const inv = f.role.startsWith('inverse.');
  const r = inv ? f.role.slice('inverse.'.length) : f.role;
  const seg = r.split('.');
  const floor = floorOf(f.mins);
  const on = f.ground ? ` on ${slash(f.ground)}` : '';
  const claim = floor !== undefined ? `${num(floor)}:1${on}` : '';
  const pct = perModePercent(f.alphas);
  const inverse = inv ? 'inverse ' : '';
  const fail = (): never => { throw new Error(`figma-description: no Figma description for the color role '${f.role}' — add its family to figmaColorDescription`); };

  switch (seg[0]) {
    case 'background': {
      if (seg[1] === 'primary') return inv ? 'Inverse page surface — the opposite-polarity band' : 'Page surface — the base canvas';
      if (seg[1] === 'secondary') return inv ? 'Inverse page surface, second tier' : 'Page surface, second tier — one step off the base';
      if (seg[1] === 'tertiary') return inv ? 'Inverse page surface, third tier' : 'Page surface, third tier';
      return fail();
    }
    case 'foreground': {
      const k = seg[1];
      if (k === 'primary') return inv ? 'Inverse surface — the opposite-polarity fill' : 'Surface on the page — a card';
      if (k === 'secondary') return inv ? 'Inverse surface, second tier' : 'Second surface — a panel or nested container';
      if (k === 'tertiary') return inv ? 'Inverse surface, third tier' : 'Third surface step';
      if (k.endsWith('-subtle')) return `Subtle ${k.slice(0, -'-subtle'.length)} tint — banners, badges, selected rows`;
      return `Bold ${k} fill — ${claim}`;
    }
    case 'text':
    case 'icon': {
      const what = seg[0];
      const k = seg[1];
      if (k === 'primary') return `Primary ${what} — strongest neutral`;
      if (k === 'link') return `Link ${what}, ${seg[2]} — ${claim}`;
      if (k.startsWith('on-')) return `${cap(what)} on a solid ${k.slice(3)} fill — ${claim}`;
      const subtle = k.endsWith('-subtle');
      const lead = k === 'secondary' || k === 'tertiary' ? `${cap(k)} ${what}` : subtle ? `Muted ${k.slice(0, -'-subtle'.length)} ${what}` : `${cap(k)} ${what}`;
      // Sub-body TEXT carries the large-text limit instead of its ground: the limit is the thing a
      // designer acts on, and both do not fit the register (the ground stays in the DTCG description).
      if (what === 'text' && floor !== undefined && floor < BODY_TEXT_FLOOR) return `${lead} — ${num(floor)}:1; ${LARGE_TEXT_ONLY}.`;
      if (!subtle && k !== 'secondary' && k !== 'tertiary') return `${lead} — ${claim} and on its own tint`;
      return `${lead} — ${claim}`;
    }
    case 'interactive': {
      const c = cap(seg[1]);
      const part = seg[2];
      const st = seg[3];
      if (part === 'fill') {
        if (inv && st !== 'rest') return `${c} fill on inverse, ${st} — ${f.rungs ?? fail()} neutral rungs off the white / black rest`;
        if (inv) return `${c} fill on inverse, rest — white / black, ${claim}`;
        return claim ? `${c} fill, ${st} — ${claim}` : `${c} fill, ${st}`;
      }
      if (part === 'on-fill') {
        // `at rest` names the ground (the ink is gated against `fill.rest`), so no path is spent on it.
        const rest = `Label on the ${seg[1]} ${inverse}fill — ${num(floor ?? fail())}:1 at rest`;
        return f.dropsOn?.length ? `${rest} only` : rest;
      }
      if (part === 'text') return `${c} label, ${st} — ${claim} (outline, text)`;
      if (part === 'icon') return `${c} icon, ${st} — ${claim} (outline, ghost, text)`;
      if (part === 'border') return `${c} outline edge, ${st} — ${claim}, follows the label`;
      // The tinted wash (#1614): the category's own fill at an opacity step, over whatever it sits on.
      if (part === 'subtle-fill') return inv
        ? `${c} ${st} tinted wash on inverse — the ${seg[1]} inverse fill at ${pct}`
        : `${c} ${st} tinted wash — the ${seg[1]} fill at ${pct} over the page (inverse surfaces use the inverse wash)`;
      if (part === 'overlay') return inv
        ? `${c} ${st} wash on inverse — ${pct}, opposite polarity to the page wash`
        : `${c} ${st} wash — ${pct} neutral over the page (inverse surfaces use the inverse wash)`;
      return fail();
    }
    case 'disabled': {
      const k = seg[1];
      if (k === 'fill') return 'Disabled control fill — one muted neutral, any intent';
      if (k === 'border') return 'Disabled control border — muted neutral';
      if (k === 'on-fill') return `Label / icon on a disabled fill — muted, ${num(floor ?? fail())}:1`;
      if (k === 'text' || k === 'icon') return `Disabled ${k} — reduced contrast, ${claim}`;
      return fail();
    }
    case 'border': {
      const k = seg[1];
      if (k === 'primary') return 'Default border — a decorative divider';
      if (k === 'secondary') return 'Stronger border / divider';
      if (k === 'tertiary') return 'Strongest border / divider';
      if (k === 'focus') return `Focus ring color — ${claim}`;
      return `${cap(k)} border — ${claim}`;
    }
    case 'scrim':
      return `Modal and drawer backdrop — black, ${pct}`;
    case 'veil': {
      const [, tone] = seg;
      return tone === 'dark'
        ? `Media veil — ${pct} black wash over an image to lift light text. Check contrast on your photo.`
        : `Media veil — ${pct} white wash over an image to lift dark text. Check contrast on your photo.`;
    }
    case 'field': {
      const k = seg.slice(1).join('.');
      if (k === 'fill') return `Form field fill — transparent by default; the border marks the field`;
      if (k === 'border.rest') return `Form field border — ${claim}`;
      if (k === 'border.hover') return `Form field hover border — ${claim}; pair it with a second cue`;
      if (k === 'placeholder') return `Form field placeholder — ${claim}`;
      return fail();
    }
    default:
      return fail();
  }
};

// ── palette primitives ───────────────────────────────────────────────────────────────────────────

/** What each tonal band holds — the gloss that makes the band name readable (#1623 DT/T-8). Shared by
 *  the DTCG and Figma registers so both gloss the band in the same words. */
export const BAND_GLOSS: Record<string, string> = {
  Highlights: 'near-white tints', Quarter: 'light tints', Mid: 'mid tones', ThreeQuarter: 'dark shades', Shadows: 'near-black shade',
};
export const BAND_NAME: Record<string, string> = {
  Highlights: 'Highlight', Quarter: 'Quarter-Tone', Mid: 'Mid-Tone', ThreeQuarter: 'Three-Quarter-Tone', Shadows: 'Shadow',
};
/** `Quarter-Tone band (light tints, steps 100–350)` — the band's real step range in THIS ramp. */
export const bandPhrase = (band: string, keys: string[]): string => {
  const range = keys.length > 1 ? `steps ${keys[0]}–${keys[keys.length - 1]}` : `step ${keys[0]}`;
  return `${BAND_NAME[band]} band (${BAND_GLOSS[band]}, ${range})`;
};

/**
 * A palette step. `label` is the ramp's display name (`Brand (red)`, `Neutral`); `generated` names the
 * hue the engine generated for a status the brand supplies none of (#1623 FG/F-14), which is the one fact
 * about such a ramp a designer needs, so it replaces the band.
 */
export const figmaPaletteDescription = (p: { label: string; key: string; band: string; bandKeys: string[]; anchor: boolean; generated?: string }): string => {
  if (p.generated) return `${cap(p.label)} ${p.key} — generated ${p.generated} (the brand supplies none).`;
  return `${cap(p.label)} ${p.key} — ${p.anchor ? 'the brand color, exact' : bandPhrase(p.band, p.bandKeys)}`;
};
export const figmaAlphaDescription = (tone: string, pct: number): string => `${cap(tone)} at ${pct}% — composites over any surface`;
/** The palette's three literals — the extremes and the no-paint transparent. */
export const FIGMA_EXTREME: Record<string, string> = {
  white: 'Pure white — the light extreme',
  black: 'Pure black — the dark extreme',
  transparent: 'Transparent — alpha 0, no paint (the default form field fill)',
};

// ── dimensions ───────────────────────────────────────────────────────────────────────────────────

export const figmaDimensionDescription = (px: number): string => `${px}px — dimension primitive`;
export const figmaSpaceDescription = (px: number, mult: number): string =>
  mult ? `${px}px — ${num(mult)}× the ${num(px / mult)}px base` : `${px}px — no space`;
export const figmaRadiusDescription = (key: string, px: number): string =>
  key === 'none' ? 'No corner radius — 0px' : `${px}px corner radius${key === 'round' ? ' (pill)' : ''}`;
export const figmaBorderWidthDescription = (px: number): string => (px ? `${px}px stroke` : 'No stroke — 0px');
export const figmaIconSizeDescription = (px: number, rung: string): string => `${px}px icon artboard — pairs with size/${rung}`;
export const figmaOpacityDescription = (pct: number): string => `${pct}% opacity`;

/** `size/<rung>/<prop>`. `labelPadPx` is the same rung's `padding-x`, for the icon-side inset. */
export const figmaSizeDescription = (prop: string, px: number, labelPadPx?: number): string => {
  switch (prop) {
    case 'height': return `Control row height — ${px}px`;
    case 'min-height': return `Minimum target size — ${px}px (WCAG 2.2 SC 2.5.5)`;
    case 'padding-x': return `Horizontal padding, label side — ${px}px`;
    case 'padding-x-visual': return `Horizontal padding, icon side — ${px}px (the icon's box adds space${labelPadPx !== undefined ? `; label side is ${labelPadPx}px` : ''})`;
    case 'padding-y': return `Vertical padding — ${px}px`;
    case 'gap': return `Gap between label and icon — ${px}px`;
    default: throw new Error(`figma-description: no Figma description for size field '${prop}'`);
  }
};

/**
 * `control/size/<rung>/<field>` — the owner-approved control lines (#1623 FG/F-11). `c` is the rung's
 * own px per field, `bodyRung` the body type rung its label shares.
 */
export const figmaControlDescription = (field: string, c: Record<string, number>, bodyRung: string): string => {
  switch (field) {
    case 'height': return `Checkbox / radio box — ${c.height}px square`;
    case 'width': return `Switch track width — ${c.width}px (twice the ${c.track}px track height)`;
    case 'dot': return `Radio dot — ${c.dot}px (half the ${c.height}px box)`;
    case 'line-box': return `Label line height (body ${bodyRung}, ${c['line-box']}px) — the control centers on the label's first line.`;
    case 'inset': return `Switch thumb inset — ${c.inset}px ((${c.track}px track − ${c.thumb}px thumb) ÷ 2). Switches only.`;
    case 'radius': return `Checkbox/radio corner — ${c.radius}px, clamped to the ${c.height}px box (does not follow the radius scale).`;
    case 'track': return `Switch track height — ${c.track}px. Switches only.`;
    case 'thumb': return `Switch thumb — ${c.thumb}px (0.75 × the ${c.track}px track). Switches only.`;
    default: throw new Error(`figma-description: no Figma description for control field '${field}'`);
  }
};

/** `focus/ring/<key>` (#1623 FG/F-17). */
export const figmaFocusDescription = (key: string, px: number): string => {
  switch (key) {
    case 'width': return `Focus ring width — ${px}px (meets WCAG 2.4.13, AAA focus appearance).`;
    case 'offset': return `Focus ring offset — ${px}px from the element edge`;
    case 'offset-field': return `Focus ring offset on form fields — ${px}px, so the ring sits on the field edge`;
    default: throw new Error(`figma-description: no Figma description for focus ring field '${key}'`);
  }
};

// ── layout ───────────────────────────────────────────────────────────────────────────────────────

export const figmaBreakpointDescription = (px: number): string => `Min-width ${px}px (mobile-first)`;
export const figmaContainerDescription = (key: string, px: number): string => {
  if (key === 'max') return `Content width cap — ${px}px (fluid below it)`;
  if (key === 'narrow') return `Reading measure — ${px}px`;
  throw new Error(`figma-description: no Figma description for container '${key}'`);
};
/** `grid/<key>` across breakpoint modes — `perBreakpoint` is the `sm 4 · md 8 · lg–2xl 12` list. */
export const figmaGridVarDescription = (key: 'columns' | 'gutter' | 'margin', perBreakpoint: string): string =>
  `Grid ${key} by breakpoint: ${perBreakpoint}`;
/** A `Grid / <bp>` style. The recognizer in `apps/plugin/src/prune-figma.ts` keys on this template. */
export const figmaGridStyleDescription = (columns: number, bp: string, gutterPx: number, marginPx: number): string =>
  `${columns}-column grid for ${bp} — ${gutterPx}px gutter, ${marginPx}px margin. A static copy of the layout variables.`;

// ── effect styles ────────────────────────────────────────────────────────────────────────────────

/** A shadow effect style. `rank` is the 1-based elevation among `of` drop shadows; `inset` for the inner one.
 *  The recognizer in `apps/plugin/src/prune-figma.ts` keys on this template. */
export const figmaShadowDescription = (s: { inset: boolean; rank: number; of: number; mode: string }): string => {
  const what = s.inset ? 'Inner shadow for wells, pressed states and inputs' : `Elevation ${s.rank} of ${s.of}`;
  const mode = s.mode === 'light' ? 'light mode' : s.mode === 'dark' ? 'dark mode (softer; surfaces lift instead)' : `${s.mode} mode`;
  return `${what} — ${mode}`;
};

/** A gradient paint style. Opens with `gradient <name> —` and the kind / stops / interpolation clause: the
 *  recognizer in `apps/plugin/src/prune-figma.ts` keys on exactly that opening. */
export const figmaGradientDescription = (g: { name: string; kind: string; angle?: number; shape?: string; stops: number; interpolation: string }): string =>
  `gradient ${g.name} — ${g.kind}${g.kind === 'linear' ? ` ${g.angle ?? 0}°` : ` (${g.shape ?? 'ellipse'})`}, ${g.stops} stop${g.stops === 1 ? '' : 's'}, ${g.interpolation} interpolation`;

// ── typography ───────────────────────────────────────────────────────────────────────────────────

/** What each type group is for — the same purposes the `.ai.json` states for the group, in the Figma register. */
export const TYPE_PURPOSE: Record<string, string> = {
  display: 'hero headlines',
  title: 'headings',
  body: 'running text',
  label: 'control and form labels',
  caption: 'captions and helper text',
  eyebrow: 'labels above headings',
  code: 'code',
};

/**
 * A text style (#1623 FG/F-13): the style's own words first, then size, face, leading and use —
 * `display xl strong — 48→112px Clash Display, tight line-height, for hero headlines.` The name words
 * stay the lead so `apps/plugin/src/prune-figma.ts` can still recognize an engine text style by them.
 */
export const figmaTextStyleDescription = (s: { words: string; group: string; minPx?: number; px: number; face: string; lineHeight: string }): string => {
  const size = s.minPx !== undefined && s.minPx !== s.px ? `${s.minPx}→${s.px}px` : `${s.px}px`;
  const purpose = TYPE_PURPOSE[s.group];
  if (!purpose) throw new Error(`figma-description: no purpose for the type group '${s.group}' — add it to TYPE_PURPOSE`);
  return `${s.words} — ${size} ${s.face}, ${s.lineHeight} line-height, for ${purpose}.`;
};

/** A `font-fluid/*` size variable: the rung's size in each Figma mode. */
export const figmaFluidSizeDescription = (words: string, byMode: Array<[string, number]>): string =>
  `${words} size — ${byMode.map(([m, px]) => `${px}px ${m}`).join(', ')}`;

/** `font/family/<category>`: the face, then as many fallbacks as fit the register. */
export const figmaFontFamilyDescription = (category: string, stack: string[]): string => {
  const head = `${cap(category)} font — ${stack[0]}`;
  const rest = stack.slice(1);
  if (!rest.length) return head;
  let fallbacks = '';
  for (let i = rest.length; i > 0; i--) {
    fallbacks = rest.slice(0, i).join(', ') + (i < rest.length ? ', …' : '');
    if (`${head}; falls back to ${fallbacks}`.length <= 90) break;
  }
  return `${head}; falls back to ${fallbacks}`;
};
export const figmaFontSizeDescription = (px: number, rem: number): string => `${px}px (${rem}rem) font size`;
export const figmaFontWeightDescription = (n: number): string => `Font weight ${n}`;
/** `font/weight-role/<role>` (#1623 FG/F-14). */
export const figmaWeightRoleDescription = (role: string, numeric: number): string => `Weight role '${role}' → ${numeric}.`;
/** `font/style/<category>/<role>` — the style cut a text style binds. */
export const figmaFontCutDescription = (category: string, weightRole: string, italic: boolean): string =>
  `Font style for ${category} ${weightRole}${italic ? ' italic' : ''} text styles`;
