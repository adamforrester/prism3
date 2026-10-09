/**
 * WHAT THE HOST DRAWS (#2379) — one check, read off live nodes, for the dry run and the apply's verify alike.
 *
 * The host draws a bound paint's STORED color, not its variable: on the NB master an in-place update left every
 * rewritten paint storing black under an intact binding, and the sets drew solid black. And a glyph's vectors are
 * drawn where they sit, so 24px vectors in a 16px frame drew 1.5× too large. Neither shows in `diffAnatomy`, which
 * reads which variable a paint binds and the fields a plan declares.
 *
 *   paints  every bound SOLID paint stores the color and alpha (as its opacity) its variable resolves to, for that
 *           node. An INSTANCE is not read: its paints are its main's.
 *   glyphs  every frame that holds only vectors holds them inside its own bounds.
 *
 * Plan-free on purpose: a fault here is a fault whatever the plan says, so a member whose record was captured over
 * the damage still reads as damaged. The dry run makes such a member "to update", never current; the apply's verify
 * fails by the same lines after it writes.
 */

export type DrawVar = { name: string; resolveForConsumer(consumer: unknown): { value: unknown } };
/** `part` is `.` for the member, then child names joined by `/`, as the dry run and verify name parts. */
export type DrawnFault = { part: string; field: 'fills' | 'strokes' | 'glyph'; file: string; want: string };

type Live = { name?: unknown; type?: unknown; fills?: unknown; strokes?: unknown; x?: unknown; y?: unknown; width?: unknown; height?: unknown; children?: readonly unknown[] };
type RGBA = { r: number; g: number; b: number; a?: number };

const isRGB = (v: unknown): v is RGBA => !!v && typeof v === 'object' && ['r', 'g', 'b'].every((k) => typeof (v as Record<string, unknown>)[k] === 'number');
const hex = (c: RGBA): string => `#${[c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
const pct = (a: number): string => `${Math.round(a * 100)}%`;
const tail = (name: string): string => name.slice(name.indexOf('/') + 1);

/** The file's variables by id, for `drawnFaults`. */
export const varsById = async (host: { variables: { getLocalVariablesAsync(): Promise<readonly unknown[]> } }): Promise<Map<string, DrawVar>> =>
  new Map((await host.variables.getLocalVariablesAsync()).map((v) => [String((v as { id?: unknown }).id ?? ''), v as DrawVar] as const));

/** Every way `root` draws other than its paints' variables and its glyphs' frames say. `skip` leaves a part (and
 *  everything under it) unread: a hand edit the update keeps. */
export const drawnFaults = (root: unknown, vars: ReadonlyMap<string, DrawVar>, skip: (part: string) => boolean = () => false): DrawnFault[] => {
  const out: DrawnFault[] = [];
  const walk = (n: Live, part: string): void => {
    if (skip(part) || n.type === 'INSTANCE') return;
    for (const field of ['fills', 'strokes'] as const) {
      const ps = n[field];
      if (!Array.isArray(ps)) continue;
      for (const p of ps as { type?: string; color?: unknown; opacity?: number; boundVariables?: { color?: { id?: string } } }[]) {
        const v = p?.type === 'SOLID' && p.boundVariables?.color?.id ? vars.get(p.boundVariables.color.id) : undefined;
        const got = p.color;
        if (!v || !isRGB(got)) continue;
        let want: unknown;
        try { want = v.resolveForConsumer(n).value; } catch { continue; }
        if (!isRGB(want)) continue;
        const wantA = typeof want.a === 'number' ? want.a : 1;
        const gotA = p.opacity ?? 1;
        const same = (['r', 'g', 'b'] as const).every((k) => Math.abs(got[k] - want[k]) < 1.5 / 255) && Math.abs(gotA - wantA) < 0.01;
        if (!same) out.push({ part, field, file: `stored ${hex(got)} at ${pct(gotA)}`, want: `${tail(v.name)}, which resolves to ${hex(want)} at ${pct(wantA)}` });
      }
    }
    const kids = (Array.isArray(n.children) ? n.children : []) as Live[];
    if (n.type === 'FRAME' && kids.length && kids.every((k) => k.type === 'VECTOR')) {
      const W = Number(n.width ?? 0), H = Number(n.height ?? 0);
      for (const k of kids) {
        const x = Number(k.x ?? 0), y = Number(k.y ?? 0), w = Number(k.width ?? 0), h = Number(k.height ?? 0);
        if (x < -0.5 || y < -0.5 || x + w > W + 0.5 || y + h > H + 0.5)
          out.push({ part, field: 'glyph', file: `a vector ${w.toFixed(1)}×${h.toFixed(1)} at ${x.toFixed(1)},${y.toFixed(1)}`, want: `inside its ${W}×${H} frame` });
      }
      return;
    }
    for (const k of kids) walk(k, part === '.' ? String(k.name ?? '') : `${part}/${String(k.name ?? '')}`);
  };
  walk(root as Live, '.');
  return out;
};

/** A fault as one content line, the form verify's other content lines take. */
export const faultLine = (member: string, f: DrawnFault): string => `${member}/${f.part}.${f.field}: ${f.file} (the plan says ${f.want})`;
