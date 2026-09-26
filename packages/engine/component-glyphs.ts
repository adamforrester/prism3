/**
 * COMPONENT-OWNED GLYPHS (#1670) — geometry a component draws that is deliberately NOT in the icon set.
 *
 * The icon vocabulary (`icon-glyphs.ts`) is the set a designer browses and a consumer names in
 * `<Icon name="…" />`. A spinner is not a member of it, and #1670 is explicit that it must not be: a static
 * loading glyph in the icon set invites a developer to ship the drawing without the behavior (rotation, a
 * reduced-motion substitute, an anti-flash delay, a host that announces busy). So the spinner's drawing lives
 * here, keyed by a name a `vector` part can reference (`glyph: 'spinner'`), and `glyphPath`/`glyphSvgFor` in
 * `anatomy-figma.ts` look here before the icon set.
 *
 * A COMPOSED glyph, which the icon set never is: one document, several filled LAYERS, each with its own
 * layer opacity. The spinner needs two — the faint full ring (the track) and the head arc — and they have to
 * travel as one artboard because Figma builds a glyph from one SVG document, and two sibling glyph parts in
 * one frame would need a non-auto-layout parent to overlap.
 *
 * WHY FILLED OUTLINES AND NOT STROKES, which is the decision this file carries. The owner's spec (2026-09-26)
 * is a 2px stroke at 24px with round caps, scaling proportionally with size (16 → 1.33, 20 → 1.67,
 * 32 → 2.67). A Figma stroke does none of that on its own: `strokeWeight` is absolute and does not follow a
 * frame `resize()`, so a 24px drawing instanced into a 16px slot would keep a 2px stroke; and `PartDef` has no
 * stroke-cap field. The band drawn as an OUTLINE (its two edges plus two semicircular caps) scales with the
 * artboard like every other glyph, carries its round caps as geometry, and takes its ink through the same
 * `descendantFills` path every glyph uses. In code the same drawing is a real stroke on a 24-unit viewBox,
 * which scales the same way for the same reason (see `spinner.ts`).
 *
 * WHY LAYER OPACITY FOR THE TRACK. The track is 20% of the spinner's OWN color, whatever that is: a host
 * pushes its ink onto every vector inside the instance (`descendantFills`), and the spinner can sit on a
 * filled button's on-fill, an outline button's icon ink, a disabled ink, or any of their inverse twins. A
 * variable carrying the alpha (#1673's `subtle-fill` approach) would need a 20% twin of every ink a host can
 * push, and the host would still push its solid ink onto the track. A PAINT opacity is reset whenever the host
 * rebinds the paint (#1673's own finding). A LAYER opacity is neither: rebinding the fill leaves it alone, so
 * the track stays at 20% of whatever ink arrives. The SVG `opacity` attribute imports as the vector's layer
 * opacity, and both executors write each imported layer's opacity from the document (`glyphLayerOpacities`).
 */

/** THE OWNER'S NUMBERS (2026-09-26, picked on a live comparison page). The artboard and radius are the
 *  comparison page's own geometry: a 24-unit viewBox with the ring's centerline at radius 10 (a 2-unit inset). */
export const SPINNER_GEOMETRY = {
  /** The artboard, in units. Every glyph in the engine is drawn on 24. */
  viewBox: 24,
  /** The centerline radius of the ring and the arc. */
  radius: 10,
  /** The band's thickness at the 24-unit artboard — 2px at 24px, scaling with the rendered size. */
  stroke: 2,
  /** The head arc's length as a fraction of the circumference, measured on the centerline. Round caps add
   *  half the stroke at each end, exactly as a `stroke-dasharray` dash with `stroke-linecap: round` does. */
  arc: 0.33,
  /** The track's opacity: a faint full ring at 20% of the spinner's own color. */
  track: 0.2,
} as const;

/** One filled layer of a composed glyph. */
export type GlyphLayer = { id: string; d: string; fillRule?: 'evenodd'; opacity?: number };

const r3 = (n: number): string => {
  const v = Math.round(n * 1000) / 1000;
  return String(Object.is(v, -0) ? 0 : v);
};

/** The spinner's two layers, from the numbers above. The arc starts at twelve o'clock and runs clockwise —
 *  the drawing the Figma member shows is the spinner at rest, one rotation position. */
export const spinnerLayers = (g: { viewBox: number; radius: number; stroke: number; arc: number; track: number } = SPINNER_GEOMETRY): GlyphLayer[] => {
  const c = g.viewBox / 2;
  const ro = g.radius + g.stroke / 2;
  const ri = g.radius - g.stroke / 2;
  const cap = g.stroke / 2;
  const at = (r: number, deg: number): string => {
    const t = (deg * Math.PI) / 180;
    return `${r3(c + r * Math.cos(t))} ${r3(c + r * Math.sin(t))}`;
  };
  // The track: an annulus, two full circles each drawn as two half-arcs, the hole cut by `evenodd`.
  const track =
    `M${r3(c + ro)} ${r3(c)}A${r3(ro)} ${r3(ro)} 0 1 1 ${r3(c - ro)} ${r3(c)}A${r3(ro)} ${r3(ro)} 0 1 1 ${r3(c + ro)} ${r3(c)}Z` +
    `M${r3(c + ri)} ${r3(c)}A${r3(ri)} ${r3(ri)} 0 1 1 ${r3(c - ri)} ${r3(c)}A${r3(ri)} ${r3(ri)} 0 1 1 ${r3(c + ri)} ${r3(c)}Z`;
  // The head: the band from -90° clockwise through `arc` of a turn, capped by two semicircles of radius
  // stroke/2 that bulge beyond each end (sweep flag 1 at both caps; the inner edge runs back with sweep 0).
  const a0 = -90;
  const a1 = -90 + g.arc * 360;
  const large = g.arc > 0.5 ? 1 : 0;
  const head =
    `M${at(ro, a0)}A${r3(ro)} ${r3(ro)} 0 ${large} 1 ${at(ro, a1)}` +
    `A${r3(cap)} ${r3(cap)} 0 0 1 ${at(ri, a1)}` +
    `A${r3(ri)} ${r3(ri)} 0 ${large} 0 ${at(ri, a0)}` +
    `A${r3(cap)} ${r3(cap)} 0 0 1 ${at(ro, a0)}Z`;
  return [
    { id: 'track', d: track, fillRule: 'evenodd', opacity: g.track },
    { id: 'arc', d: head },
  ];
};

/** The registry `anatomy-figma.ts` resolves a `vector` part's `glyph` against before the icon set. */
export const COMPONENT_GLYPHS: Record<string, readonly GlyphLayer[]> = {
  spinner: spinnerLayers(),
};
