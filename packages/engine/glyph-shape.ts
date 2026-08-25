/**
 * Prism3 engine — RENDER EQUIVALENCE FOR GLYPH OUTLINES (#917).
 *
 * Answers ONE question: **do two `<path d>` strings draw the same picture?** Nothing else. It has no
 * opinion on whether a glyph is well-formed, filled, square, or correctly named — `lint-glyph-geometry.ts`
 * owns all of that. This file exists because that gate could only compare path STRINGS, and its own header
 * named the consequence: `minus`/`minus-filled` render identically and passed it.
 *
 * ── WHY A MODULE AND NOT A FUNCTION INSIDE THE GATE ─────────────────────────────────────────────
 *
 * #988's precedent, for its reason and not by analogy. A gate script does its work at module scope and
 * exits, so a normalizer living inside `lint-glyph-geometry.ts` could not be imported by `test.ts` without
 * running the gate — and an unproven normalizer is worse than no normalizer, because the gate reports the
 * normalizer's verdict as a fact about the corpus. `grounds.ts` came out of `lint-ratio-truth.ts` for
 * exactly this. So the transforms below are unit-tested against constructed inputs whose answer is known
 * by hand, in both directions, rather than only against the corpus they were written to explain.
 *
 * ── THE CLAIM, AND ITS CEILING ──────────────────────────────────────────────────────────────────
 *
 * `canonicalShape(d)` returns a string that is EQUAL for two paths iff they are related by a transform in
 * the enumerated list below. Equal canonical form therefore PROVES the two draw the same picture. Unequal
 * canonical form proves nothing: it means no transform in the list relates them, not that they differ.
 *
 * That asymmetry is the honest limit and it is worth stating in the direction that bites. This is a
 * SUFFICIENT test for sameness and not a NECESSARY one, so a duplicate related by some transform not in
 * the list still slips through the gate above — the same posture as `lint-glyph-geometry.ts`'s header on
 * what an offline check cannot see, and the same reason: an under-approximation of render equivalence is a
 * strictly better instrument than string equality, but it is not a rasterizer. True render equivalence
 * needs boolean geometry over filled regions. What is covered:
 *
 *   · **Start-point rotation.** A closed ring may begin at any of its vertices. This is the real
 *     `subtract` case — see the correction below.
 *   · **Whole-shape traversal reversal.** A ring filled under `nonzero` fills the same drawn either way.
 *   · **Subpath reordering.** Fill is a set operation over the subpaths; the order they are listed in does
 *     not reach the raster.
 *   · **`H`/`V` spelled as `L`,** and an explicit closing segment spelled as `Z`'s implicit one.
 *   · **Zero-length line segments,** which draw nothing.
 *   · **Collinear vertex splits** — a straight edge broken into two by a point lying on it.
 *
 * What is NOT covered, named so nobody reads a distinct canonical form as proof of a distinct picture: a
 * cubic whose control points make it exactly a line (not normalized to `L`); the same region decomposed
 * into a different number of subpaths; two coincident subpaths that overlap to one filled area; and
 * curve-versus-polyline approximations of the same visual arc.
 *
 * **Reversal is global, not per-subpath, and that is deliberate.** Under `nonzero` winding a hole is an
 * inner ring wound OPPOSITE to its outer one, so reversing one subpath of a multi-ring shape changes the
 * picture — it fills the hole. Canonicalizing each subpath's direction independently would merge a ring
 * with a hole and a ring with a second filled island on top of it. So the whole shape is canonicalized
 * twice, once with every subpath as authored and once with every subpath reversed, and the smaller string
 * wins: relative winding survives, absolute winding does not.
 *
 * ── A CORRECTION THIS FILE'S MEASUREMENT FORCED ─────────────────────────────────────────────────
 *
 * #917's own body, `icon-set.ts` and `lint-glyph-geometry.ts` all recorded that `subtract-line.svg` and
 * `subtract-fill.svg` "differ only in the WINDING of one rectangle". That is wrong, and it is wrong in a
 * way that would send the next reader after the wrong fix — `fill-rule` does not enter into it. Measured:
 *
 *     subtract-line   M5 11V13H19V11H5Z    ring (5,11) → (5,13) → (19,13) → (19,11)
 *     subtract-fill   M19 11H5V13H19V11Z   ring (19,11) → (5,11) → (5,13) → (19,13)
 *
 * Same four vertices, same traversal direction, different START VERTEX. Rotation alone merges them;
 * reversal alone does not. Corrected at all three sites in the PR that added this file.
 *
 * Coordinates are compared at 4 decimal places. The corpus is integer-and-4dp throughout, so the rounding
 * is not load-bearing today; it is here so that two paths differing in float noise below the raster do not
 * read as distinct pictures.
 */

/** Thrown for any path this file cannot parse EXACTLY. Never swallowed — see `parsePath`. */
export class GlyphPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlyphPathError';
  }
}

type Point = readonly [number, number];

/** One segment of a closed ring, ending at `to`. `H`/`V` are expanded to `L` at parse time. */
type Edge =
  | { readonly kind: 'L'; readonly to: Point }
  | { readonly kind: 'C'; readonly c1: Point; readonly c2: Point; readonly to: Point };

/** A closed subpath as a cycle: `edges[i]` runs `verts[i]` → `verts[(i + 1) % n]`. */
type Ring = { verts: Point[]; edges: Edge[] };

/** Absolute commands this file understands, and how many numbers each takes. */
const ARITY: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, C: 6, Z: 0 };

const round = (n: number): number => {
  const r = Math.round(n * 1e4) / 1e4;
  return r === 0 ? 0 : r; // collapse -0, which stringifies differently and rasterizes identically
};

const same = (a: Point, b: Point): boolean => round(a[0]) === round(b[0]) && round(a[1]) === round(b[1]);

const fmt = (p: Point): string => `${round(p[0])},${round(p[1])}`;

/**
 * Path string → tokens. A command letter this file does not implement is an ERROR, not a skip.
 *
 * `docs/34` shape 9: a parser that ignores what it does not recognize degrades silently into a weaker
 * comparison, and the gate above would report the weaker verdict as a fact. A relative command (`m`, `l`,
 * `h`, `v`, `c`), an arc (`A`), a quadratic (`Q`, `T`) or a smooth cubic (`S`) in some future glyph set
 * must stop the run, because every one of them would otherwise parse as a partial shape that still
 * compares cleanly against other partial shapes.
 */
const tokenize = (d: string): (string | number)[] => {
  const out: (string | number)[] = [];
  const re = /([A-Za-z])|(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?)|([\s,]+)|([\s\S])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    if (m[1] !== undefined) {
      if (!(m[1] in ARITY))
        throw new GlyphPathError(
          `command '${m[1]}' at index ${m.index} is not one of the absolute commands this comparison implements (${Object.keys(ARITY).join(' ')}). ` +
            `Relative commands, arcs and quadratics are refused rather than skipped: a partially parsed outline still compares cleanly against another partially parsed outline, which is a silent hole rather than a failure.`,
        );
      out.push(m[1]);
    } else if (m[2] !== undefined) out.push(Number(m[2]));
    else if (m[3] !== undefined) continue;
    else throw new GlyphPathError(`unexpected character '${m[4]}' at index ${m.index} in path data`);
  }
  return out;
};

/** Tokens → closed rings. Repeated coordinate sets after one letter are honored, per the SVG grammar. */
const parsePath = (d: string): Ring[] => {
  const tokens = tokenize(d);
  const rings: Ring[] = [];
  let verts: Point[] = [];
  let edges: Edge[] = [];
  let cursor: Point = [0, 0];
  let start: Point = [0, 0];
  let cmd = '';
  let open = false;

  /**
   * Append an edge, recording the point it leaves FROM. Keeps `verts[i]` the start of `edges[i]`.
   *
   * The finiteness check is not defensive padding — it caught a real bug in this file's first draft, where
   * `V` read the wrong argument index and produced coordinates of `NaN`. Nothing downstream noticed: the
   * canonical form came out containing the text `NaN`, and two such forms compare EQUAL to each other and
   * unequal to everything else, so the corpus quietly lost a merge and gained no failure. A non-finite
   * coordinate must stop the run for the same reason an unknown command must (`docs/34` shape 9).
   */
  const addEdge = (edge: Edge): void => {
    const coords = edge.kind === 'L' ? [edge.to] : [edge.c1, edge.c2, edge.to];
    for (const [x, y] of coords)
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new GlyphPathError(`command '${cmd}' produced a non-finite coordinate (${x}, ${y}) — the path is malformed or this file mis-read its arguments`);
    verts.push(cursor);
    edges.push(edge);
    cursor = edge.to;
  };

  /** Close whatever is open. A fill closes an unterminated subpath anyway, so `Z` is not required. */
  const flush = (): void => {
    if (edges.length && !same(cursor, start)) addEdge({ kind: 'L', to: start });
    if (edges.length) rings.push({ verts, edges });
    verts = [];
    edges = [];
  };

  let i = 0;
  while (i < tokens.length) {
    if (typeof tokens[i] === 'string') {
      cmd = tokens[i] as string;
      i += 1;
      if (cmd === 'Z') {
        flush();
        cursor = start;
        open = false;
        continue;
      }
    } else if (!cmd) {
      throw new GlyphPathError(`path data begins with a number rather than a command: '${d.slice(0, 24)}'`);
    } else if (cmd === 'M') {
      cmd = 'L'; // extra coordinate pairs after an M are implicit lines, per the SVG grammar
    }

    const n = ARITY[cmd];
    const args: number[] = [];
    for (let k = 0; k < n; k += 1) {
      const t = tokens[i + k];
      if (typeof t !== 'number') throw new GlyphPathError(`command '${cmd}' wants ${n} number(s) and the path ran out or gave a letter`);
      args.push(t);
    }
    i += n;

    if (cmd === 'M') {
      flush();
      cursor = [args[0], args[1]];
      start = cursor;
      open = true;
    } else {
      if (!open) throw new GlyphPathError(`command '${cmd}' appears before any M — there is no current point to draw from`);
      if (cmd === 'L') addEdge({ kind: 'L', to: [args[0], args[1]] });
      else if (cmd === 'H') addEdge({ kind: 'L', to: [args[0], cursor[1]] });
      else if (cmd === 'V') addEdge({ kind: 'L', to: [cursor[0], args[0]] });
      else addEdge({ kind: 'C', c1: [args[0], args[1]], c2: [args[2], args[3]], to: [args[4], args[5]] });
    }
  }
  flush();
  return rings;
};

/** Is `p` on the segment `a`→`b`, endpoints excluded? Used only to drop a split in a straight edge. */
const between = (a: Point, p: Point, b: Point): boolean => {
  const [ax, ay] = a, [px, py] = p, [bx, by] = b;
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  if (Math.abs(cross) > 1e-6) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
  return len2 > 0 && dot > 0 && dot < len2;
};

/**
 * Drop what does not reach the raster: zero-length line segments, and a vertex that merely splits a
 * straight edge in two. Both are provably invisible, which is the bar for anything in here — a transform
 * that is only usually invisible would merge two different pictures and report it as a declared duplicate.
 */
const simplify = (ring: Ring): Ring => {
  let { verts, edges } = ring;
  for (let changed = true; changed && edges.length > 2; ) {
    changed = false;
    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i];
      if (e.kind === 'L' && same(verts[i], e.to)) {
        // A zero-length line: remove the edge and the vertex it left from.
        verts = verts.filter((_, k) => k !== i);
        edges = edges.filter((_, k) => k !== i);
        changed = true;
        break;
      }
      const j = (i + 1) % edges.length;
      const next = edges[j];
      if (e.kind === 'L' && next.kind === 'L' && between(verts[i], e.to, next.to)) {
        // verts[j] splits one straight run: merge the two lines and drop the middle vertex.
        edges = edges.map((x, k) => (k === i ? { kind: 'L' as const, to: next.to } : x)).filter((_, k) => k !== j);
        verts = verts.filter((_, k) => k !== j);
        changed = true;
        break;
      }
    }
  }
  return { verts, edges };
};

/** One edge as text. Reversing a cubic swaps which control point comes first. */
const serEdge = (e: Edge, reversed: boolean, to: Point): string =>
  e.kind === 'L' ? `L${fmt(to)}` : reversed ? `C${fmt(e.c2)} ${fmt(e.c1)} ${fmt(to)}` : `C${fmt(e.c1)} ${fmt(e.c2)} ${fmt(to)}`;

/** A ring walked from vertex `r`, forwards or backwards. Every vertex is emitted as some edge's endpoint. */
const walk = ({ verts, edges }: Ring, r: number, reversed: boolean): string => {
  const n = edges.length;
  const parts: string[] = [];
  for (let k = 0; k < n; k += 1) {
    if (reversed) {
      const j = (((r - 1 - k) % n) + n) % n; // edges[j] runs verts[j] → verts[j+1]; backwards it ends at verts[j]
      parts.push(serEdge(edges[j], true, verts[j]));
    } else {
      const j = (r + k) % n;
      parts.push(serEdge(edges[j], false, edges[j].to));
    }
  }
  return parts.join(' ');
};

/** The rotation-invariant form of one ring, in a FIXED direction. Direction is chosen per shape, not here. */
const canonRing = (ring: Ring, reversed: boolean): string => {
  let best: string | undefined;
  for (let r = 0; r < ring.edges.length; r += 1) {
    const s = walk(ring, r, reversed);
    if (best === undefined || s < best) best = s;
  }
  return best ?? '';
};

/**
 * A path's canonical rendered shape. Equal strings PROVE the same picture; unequal strings prove nothing
 * (see this file's header — the covered transforms are enumerated, and the list is not exhaustive).
 *
 * Throws `GlyphPathError` on anything it cannot parse exactly, rather than returning a partial shape.
 */
export const canonicalShape = (d: string): string => {
  const rings = parsePath(d).map(simplify).filter((r) => r.edges.length > 0);
  if (!rings.length) throw new GlyphPathError(`path data '${d.slice(0, 40)}' yielded no closed subpath to compare`);
  // Both global directions, then the smaller. Reversing every subpath together leaves the picture alone;
  // reversing one of several does not, so the choice is made once for the whole shape.
  const forward = rings.map((r) => canonRing(r, false)).sort().join(' | ');
  const backward = rings.map((r) => canonRing(r, true)).sort().join(' | ');
  return forward < backward ? forward : backward;
};
