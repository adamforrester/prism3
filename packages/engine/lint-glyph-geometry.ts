/**
 * Prism3 engine — GLYPH GEOMETRY GATE (#864, the second instance of #802's class).
 *
 *   npx tsx packages/engine/lint-glyph-geometry.ts
 *
 * A `vector` part must submit an outline that DRAWS SOMETHING, on a SQUARE artboard, and a different
 * one for every member of the set. #864 was four members drawing nothing: the def carried one `icon`
 * component with a `size` axis and no geometry anywhere, so the plugin built four empty artboards. It
 * resolved, it wrote, it reported **0 misses**, and every gate in the repo was green over it — because
 * every other gate here asks whether a thing EXISTS, whether a ref RESOLVES, whether a count MATCHES,
 * or whether nothing THREW. An artboard with no outline in it satisfies all four.
 *
 * ── THE QUANTITY, IN THE UNITS A HUMAN WOULD CHECK ──────────────────────────────────────────────
 *
 * Not "the plan has a `glyphSvg`", and not "the document parses". `docs/34` shape 16: two
 * implementations agreeing on a wrong formula still agree, so the check has to name the thing a
 * designer would look for. That thing is: **an outline with non-zero box area, one per glyph, across
 * every member of the set** — and then two properties that the box area alone cannot see:
 *
 *   · IT IS FILLED. A `<path>` with `fill="none"` and no stroke has a perfectly good bounding box and
 *     paints nothing. Box area is necessary and not sufficient.
 *   · IT IS THE MEMBER'S OWN OUTLINE. Templating `glyph: '{name}'` wrong is not four members carrying
 *     none, it is 39 members carrying ONE — the same defect at the opposite extreme, and the one a
 *     count of members reports as a pass.
 *
 * ── AND THE ARTBOARD, WHICH IS THE OTHER HALF OF #864 AND WAS FOUND WHILE FIXING IT ─────────────
 *
 * A Figma `VectorNode`'s box IS its ink: measured over this corpus, only 19 of 39 glyphs are square,
 * `minus` is 14×2 and `more-vertical-filled` is 4×18. Every host binds ONE SQUARE variable onto the
 * slot it swaps a glyph into (`button.ts` and `icon-button.ts` both bind `size.{size}.icon` to width
 * AND height), so a 14×2 main component stretched into that square is a bar 7× too thick — which
 * *builds fine and renders wrong*, the exact thing #864 exists to stop producing.
 *
 * The document therefore declares `width`/`height` as well as `viewBox`, and that is what makes the
 * imported frame the ARTBOARD rather than the ink: an importer given only a viewBox is free to size
 * the result to the outline. So this gate asserts the declared dimensions are present, SQUARE, equal
 * to the viewBox's own, and that the ink fits inside them.
 *
 * ── INDEPENDENCE, WHICH IS THE WHOLE DESIGN (`docs/34`) ─────────────────────────────────────────
 *
 * EXPECTED comes from the VOCABULARY and the DEF: the part's `glyph` template names an axis, the
 * coordinate names a member, and `ICON_PATHS[member]` is the path that member must draw. The viewBox
 * is re-parsed here from `ICON_VIEWBOX` rather than obtained from `viewBoxDims()` — the projector
 * calls `viewBoxDims()`, so importing it would make both halves one derivation and the check could
 * not fail. **The duplicated parse IS the gate.**
 *
 * ACTUAL comes from the projected plan's `glyphSvg` — the literal document that will be handed to
 * `figma.createNodeFromSvg`, read back by parsing it, never by re-running `glyphDocument`.
 *
 * The ink box is measured by this file's own path walker (`inkBox`), which is not a copy of anything:
 * nothing else in the repo measures a path's extent. It flattens curves rather than taking control
 * points as the bound, because a cubic's hull is larger than the curve and a gate that overstates the
 * ink would let a genuinely empty glyph pass on its handles. It THROWS on a command it does not model
 * rather than skipping one — a glyph that arrives using arcs must fail loudly, since a walker that
 * silently ignores a command reports a smaller box, and the direction of that error is toward
 * "measures nothing and calls it clean".
 *
 * ── BOTH DIRECTIONS, SO IT CANNOT PASS OVER AN EMPTY SET ────────────────────────────────────────
 *
 *   · Every def declaring a `kind: 'vector'` part must be REPRESENTED by a projected GLYPH node
 *     (`MUST_COVER`). Without this, a projector that stopped emitting `type: 'GLYPH'` altogether
 *     satisfies everything above vacuously and this file reports clean over nothing.
 *   · Every name in the vocabulary must be carried by exactly one member, and every member must carry
 *     a name in the vocabulary. A member count would pass on 39 copies of `check`.
 *   · A node that is NOT a glyph must not acquire a `glyphSvg`, and a glyph must not be missing one.
 *
 * ── WHAT THIS CANNOT CLAIM, STATED RATHER THAN IMPLIED ──────────────────────────────────────────
 *
 * `createNodeFromSvg` runs inside Figma. There is no SVG importer in Node, so **nothing here verifies
 * the child structure Figma returns** — that the frame wraps a VECTOR at all, that its outline
 * survived the import, that `constraints` took. This gate checks the document SUBMITTED and the
 * geometry it declares; the only mechanism that can catch the real host disagreeing is the executors'
 * runtime `NO VECTOR` miss, which fires when the import produces no outline with area. Same posture as
 * `lint-absolute-inset.ts`'s header naming what it cannot see, and the same reason: a model of a host
 * is not evidence about the host.
 *
 * The corpus's own duplication is admitted rather than hidden. Three of the source set's `-fill` files
 * draw their `-line` sibling's shape, because a pure stroke has no filled form: `plus`/`plus-filled`
 * and `close`/`close-filled` are byte-identical, and `minus`/`minus-filled` differ only in the winding
 * of one rectangle. So 39 names are 36 distinct **shapes** and 37 distinct **path strings**.
 * `DUPLICATE_PATHS` records the two string collisions by name with the reason, and it is checked in
 * BOTH directions — an entry that stops colliding fails as stale, a new collision fails as undeclared.
 * Without it, "every member draws its own outline" would either be false or would have to be weakened
 * to a claim no wrong template could break.
 *
 * **The limit that gap exposes, and it is this file's own blind spot:** the arm compares path STRINGS,
 * so `minus`/`minus-filled` pass it while rendering identically. Two paths that draw one shape by
 * different routes are invisible here. Closing that needs shape comparison rather than string
 * comparison, which is a different instrument; what this arm actually catches is a template filled
 * from the wrong thing, where the collision is literal. Stated rather than implied, because a reader
 * who takes "37 distinct outlines" as "37 distinct pictures" is off by one.
 */

import { componentDefs } from './components/index';
import { figmaAnatomySet, type AnatomyPlan, type FigmaNodePlan } from './anatomy-figma';
import { ICON_NAMES, ICON_PATHS, ICON_VIEWBOX } from './icon-glyphs';
import type { ComponentDef } from './component-schema';

/**
 * The scope floor. `docs/34`: a gate with a scope asserts each promised surface is REPRESENTED, never
 * merely counts. `<def>.<part>` for every def declaring a vector part today; if one stops being
 * covered — including by being deleted — this file fails rather than reporting clean over a smaller
 * set. A count would read that as a pass.
 */
const MUST_COVER = ['icon.glyph', 'checkbox.mark', 'checkbox.dash'];

/**
 * VECTOR PARTS THAT DRAW ONE FIXED GLYPH, keyed `<def>.<part>` → the name they draw and why.
 *
 * Until #910 this gate refused a literal `glyph` outright, and its message said what to do about it:
 * *"a fixed glyph makes every member of the set draw one shape, which is #864's other extreme, so it
 * needs a decision recorded here rather than a pass."* This is that record. `icon` is a vocabulary
 * browser — one part, 39 members, one glyph each — and every arm below was written for it. A checkbox's
 * mark is the opposite claim: one shape at every coordinate the part appears at, with a SECOND part
 * carrying the other shape, and which shape belongs to which part is a design fact.
 *
 * THE `glyph` NAME IS RECORDED HERE, NOT JUST THE EXEMPTION, and that is the arm rather than bookkeeping.
 * Swapping `check` and `minus` between `mark` and `dash` in the def is the invisible mutation this class
 * of def invites: both names resolve, both draw real ink on the right artboard, both fit, both are filled
 * — an indeterminate checkbox simply renders a tick. Every geometric arm below passes. So the def's claim
 * about what a part draws is compared against a claim authored in a different file, and a mismatch fails
 * as a stale record in whichever direction it moved.
 *
 * AND `at` RECORDS THE COORDINATE, for the same reason and against a hole the first version of this
 * table left open. The count arm below reads `presentWhen` off the DEF to decide how many GLYPH nodes a
 * member should carry, and the projector reads the same field to decide whether to emit one — so the two
 * halves of that arm are ONE derivation with respect to WHICH coordinate a mark appears at, and
 * `presentWhen: { selection: ['unchecked'] }` on `mark` would put a tick in the empty box with both sides
 * of the arm agreeing that it belongs there. `docs/34` shape 1, in the middle of a check written to avoid
 * it. Recording the coordinate here is the second author: it is compared to the def's own `presentWhen`
 * by value, so a gate value moving in either file fails.
 *
 * The distinction between the two fields is worth keeping straight, because they catch different defects
 * and one does not imply the other: `glyph` is WHAT is drawn (swap the two and an indeterminate box shows
 * a tick), `at` is WHERE it is drawn (widen the gate and an unchecked box shows one). Both render as a
 * plausible checkbox and neither moves any geometric measurement in this file.
 *
 * Checked in BOTH directions, same discipline as `DUPLICATE_PATHS`: an entry for a part that is now
 * axis-templated fails, an entry for a part that no longer exists fails, and an `at` naming a coordinate
 * the def no longer gates on fails as a stale memory rather than as a silent exemption.
 */
const FIXED_GLYPH: Record<string, { glyph: string; at: Record<string, readonly string[]>; why: string }> = {
  'checkbox.mark': {
    glyph: 'check',
    at: { selection: ['checked'] },
    why: "the checked mark. `glyph: '{selection}'` cannot express this set — the vocabulary holds no `unchecked` glyph, because an empty box draws nothing — so the two drawn values are two parts gated by `presentWhen` and the third is the absence of both",
  },
  'checkbox.dash': {
    glyph: 'minus',
    at: { selection: ['indeterminate'] },
    why: 'the indeterminate dash, the other half of the same split. Deliberately `minus` and not `minus-filled`: the two differ only in the winding of one rectangle (see `DUPLICATE_PATHS`) and the line form is the one the rest of the corpus draws',
  },

  // FIELD-MESSAGE'S THREE STATUS GLYPHS (#1010), and this table is the RIGHT place for them rather than a
  // formality to be satisfied. The mapping reads TRANSPOSED — `error` draws `warning-triangle` and
  // `warning` draws `error-circle` — because a name in `icon-glyphs.ts` describes the ENCLOSURE it draws,
  // not the tone that uses it. Measured, because reading the names gives the wrong answer:
  //
  //     warning-triangle   triangle outline + bar y9-14 + dot y16-18   an exclamation, in a TRIANGLE
  //     error-circle       ring 2-22/4-20   + bar y7-13 + dot y15-17   an exclamation, in a CIRCLE
  //
  // One mark in two enclosures, and the Prism2 reference assigns the enclosure per tone. So the single
  // most likely future edit to this def is somebody "fixing" the mapping to agree with the names, and
  // that edit draws correct ink on a correct artboard at a correct coordinate — every geometric arm in
  // this file passes it, exactly as an indeterminate checkbox showing a tick would. Recording the pairing
  // here makes it fail as a stale record instead, in whichever file moved.
  //
  // `error-circle` and `check-circle` share one 20px ring, differing only in what sits inside it, so
  // their BOUNDING BOXES are identical — measured while writing #1010's read-back, where a box-based
  // fingerprint both failed on correct code and could not have caught two tones sharing one glyph. That
  // is a second reason the name belongs in a table: the geometry cannot tell these two apart.
  'field-message.iconError': {
    glyph: 'warning-triangle',
    at: { tone: ['error'] },
    why: "the error mark: an exclamation in a TRIANGLE, per the Prism2 reference, and the only one of the three whose enclosure is not a circle. `glyph: '{tone}'` cannot express this set for `checkbox`'s reason one level up — the vocabulary holds no glyph named `error`/`warning`/`success`, and `default` draws nothing at all — so the three drawn tones are three `presentWhen`-gated parts and the fourth is the absence of all three. Shape is the channel that survives when a user cannot tell `error`'s ink from `warning`'s, which is the SC 1.4.1 contract this def exists for",
  },
  'field-message.iconWarning': {
    glyph: 'error-circle',
    at: { tone: ['warning'] },
    why: 'the warning mark: the SAME exclamation as `error`\'s in a CIRCLE rather than a triangle. The name is the enclosure, not the tone — do not "correct" this to `warning-triangle`, which would give error and warning one identical shape and leave ink as the only difference between them',
  },
  'field-message.iconSuccess': {
    glyph: 'check-circle',
    at: { tone: ['success'] },
    why: 'the success mark: a circled check, on the same 20px ring `error-circle` draws. Deliberately the outline form and not `check-circle-filled` — the reference asks for "a stroked outline glyph at the same optical weight as the text", and every glyph in this set is a filled path, so outline here means a ring with a hole rather than a stroke',
  },
};

/** `presentWhen`-shaped gates compared by VALUE, order-insensitively, so a reordered value list is not a
 *  failure and a changed one is. Both sides are plain data; nothing here calls the projector's own reader. */
const sameGate = (a: Record<string, readonly string[]>, b: Record<string, readonly string[]>): boolean => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  const vals = (v: readonly string[]): string => JSON.stringify([...v].sort());
  return ka.length === kb.length && ka.every((k, i) => kb[i] === k && vals(a[k]) === vals(b[k] ?? []));
};

/**
 * NAMES THAT LEGITIMATELY SHARE ONE SHAPE, keyed `<a>|<b>` (sorted) → the reason.
 *
 * These are a defect in the SOURCE set, not in the mapping: each name resolves to the file it claims,
 * and the two files draw the same thing. Recorded here because the "every member draws its own
 * outline" arm below is what makes a mis-templated `glyph` fail, and an unexplained collision would
 * otherwise force that arm to be weakened into uselessness. Filed upstream as #917.
 */
const DUPLICATE_PATHS: Record<string, string> = {
  'close|close-filled': "Remix's close-line.svg and close-fill.svg are byte-identical (sha256 2d004b029720) — an X has no filled form, so the source set has nothing to put under -fill",
  'plus|plus-filled': 'add-line.svg and add-fill.svg are byte-identical (sha256 e3af16eef67d) — same reason as close',
};

/** The placeholder swap target, passed unconditionally exactly as `apps/plugin/src/main.ts` does — it
 *  is inert on a def with no swap parts, and a def with them would otherwise project differently here
 *  than in the plugin. */
const SWAP_TARGET = 'FPO-default-icon';

/**
 * `ICON_VIEWBOX` re-parsed HERE. Deliberately not `viewBoxDims()` from `anatomy-figma.ts`, which is
 * what the projector calls: sharing that function would make EXPECTED and ACTUAL one derivation, and
 * this gate could not fail on a wrong artboard. The second parse IS the check — do not DRY it away.
 */
const declaredViewBox = (): { minX: number; minY: number; w: number; h: number } => {
  const [minX, minY, w, h] = ICON_VIEWBOX.split(/\s+/).map(Number);
  if (![minX, minY, w, h].every((n) => Number.isFinite(n)) || !w || !h)
    throw new Error(`ICON_VIEWBOX '${ICON_VIEWBOX}' is not '<minX> <minY> <width> <height>' with non-zero dimensions`);
  return { minX, minY, w, h };
};

type Box = { x: number; y: number; w: number; h: number };

/**
 * THE INK a path draws, as a bounding box. Nothing else in this repo measures this, so it is not a
 * second copy of anything — it is the independent half.
 *
 * Curves are FLATTENED (24 samples per segment) rather than bounded by their control points. A cubic's
 * control hull is strictly larger than the curve, so hull-bounding would overstate the ink, and the
 * direction of that error is the one that matters: it would let a glyph that draws almost nothing pass
 * on the strength of its handles.
 *
 * An unmodelled command THROWS. The corpus today is `M L H V C Q Z` absolute (censused: 0 relative
 * commands, 0 arcs), and a walker that skipped an arc would report a smaller box and call it clean.
 */
const inkBox = (d: string): Box => {
  const toks = d.match(/[A-Za-z]|-?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) ?? [];
  let i = 0, x = 0, y = 0, subX = 0, subY = 0, cmd = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const see = (px: number, py: number): void => {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  };
  const n = (): number => {
    const v = Number(toks[i++]);
    if (!Number.isFinite(v)) throw new Error(`path ran out of numbers after '${cmd}'`);
    return v;
  };
  // A cubic sampled along its length. Quadratics are raised to cubic first, so there is one sampler.
  const curve = (p: Array<[number, number]>): void => {
    for (let k = 0; k <= 24; k++) {
      const t = k / 24, u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      see(w.reduce((a, c, j) => a + c * p[j][0], 0), w.reduce((a, c, j) => a + c * p[j][1], 0));
    }
  };
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M') { x = n(); y = n(); subX = x; subY = y; see(x, y); }
    else if (cmd === 'L') { x = n(); y = n(); see(x, y); }
    else if (cmd === 'H') { x = n(); see(x, y); }
    else if (cmd === 'V') { y = n(); see(x, y); }
    else if (cmd === 'C') {
      const a = n(), b = n(), c = n(), e = n(), f = n(), g = n();
      curve([[x, y], [a, b], [c, e], [f, g]]); x = f; y = g;
    } else if (cmd === 'Q') {
      const a = n(), b = n(), f = n(), g = n();
      curve([[x, y], [x + (2 / 3) * (a - x), y + (2 / 3) * (b - y)], [f + (2 / 3) * (a - f), g + (2 / 3) * (b - g)], [f, g]]);
      x = f; y = g;
    } else if (cmd === 'Z' || cmd === 'z') { x = subX; y = subY; }
    else throw new Error(`unmodelled path command '${cmd}' — this walker covers M L H V C Q Z absolute, and skipping a command would understate the ink`);
  }
  const r = (v: number): number => Math.round(v * 1e4) / 1e4;
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: r(minX), y: r(minY), w: r(maxX - minX), h: r(maxY - minY) };
};

/** Every GLYPH node in a plan, by the part name it was projected from. */
const glyphNodes = (plan: AnatomyPlan): Array<{ part: string; node: FigmaNodePlan }> => {
  const out: Array<{ part: string; node: FigmaNodePlan }> = [];
  const walk = (n: FigmaNodePlan): void => {
    if (n.type === 'GLYPH') out.push({ part: n.name, node: n });
    for (const c of n.children ?? []) walk(c);
  };
  walk(plan.root);
  return out;
};

/** Every node in a plan, glyph or not — for the "a non-glyph must not acquire geometry" direction. */
const allNodes = (plan: AnatomyPlan): FigmaNodePlan[] => {
  const out: FigmaNodePlan[] = [];
  const walk = (n: FigmaNodePlan): void => { out.push(n); for (const c of n.children ?? []) walk(c); };
  walk(plan.root);
  return out;
};

const failures: string[] = [];
const notes: string[] = [];
const covered = new Set<string>();
const vb = declaredViewBox();
let glyphChecks = 0;

for (const def of componentDefs as ComponentDef[]) {
  const parts = Object.entries(def.anatomy?.parts ?? {}).filter(([, p]) => (p as { kind?: string }).kind === 'vector');
  if (!parts.length) {
    // A def with no vector part must not have projected one anyway, and must not have picked up glyph
    // geometry on some other node. This is the direction that catches the projector attaching geometry
    // by a condition wider than `kind === 'vector'`.
    //
    // A THROW HERE IS REPORTED, NOT SWALLOWED — and that is not a hypothetical. The first version of
    // this block wrote `catch { stray = [] }`, and mutating the projector's geometry condition to one
    // that matched every part made five defs throw and this gate report CLEAN, because the swallow
    // turned "I could not look" into "I looked and found nothing". `docs/34` shape 9. The two defs that
    // legitimately cannot project (`text-field`, `textarea` declare no `figmaProperties`) are excluded
    // by the guard rather than by a catch, so the catch only ever sees a real failure.
    if (!def.anatomy || !def.figmaProperties) continue;
    let stray: AnatomyPlan[] = [];
    try {
      stray = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    } catch (err) {
      failures.push(`${def.id}: does not PROJECT, so no node in it could be inspected for stray glyph geometry — ${(err as Error).message}`);
      continue;
    }
    for (const plan of stray)
      for (const n of allNodes(plan)) {
        if (n.type === 'GLYPH')
          failures.push(`${def.id}: projected a GLYPH node '${n.name}' at ${JSON.stringify(plan.coord)}, but the def declares no part of kind 'vector' — geometry appeared from somewhere other than a def.`);
        else if (n.glyphSvg !== undefined || n.glyphViewBox !== undefined)
          failures.push(`${def.id}: node '${n.name}' at ${JSON.stringify(plan.coord)} is a ${n.type} carrying glyph geometry, and this def declares no vector part at all — the executors only read that geometry on a GLYPH, so it is silently ignored.`);
      }
    continue;
  }

  let set: AnatomyPlan[] = [];
  try {
    set = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  } catch (err) {
    failures.push(`${def.id}: declares ${parts.length} vector part(s) and does not PROJECT — ${(err as Error).message}`);
    continue;
  }

  for (const [partName, raw] of parts) {
    const part = raw as { glyph?: string; presentWhen?: Record<string, readonly string[]> };
    const key = `${def.id}.${partName}`;
    // The axis the glyph template names, read from the DEF. `'{name}'` → `name`; a literal glyph name is
    // a DIFFERENT claim (one shape at every coordinate) and must be recorded in `FIXED_GLYPH` with the
    // name it draws, so a fixed glyph is admitted by decision rather than by the absence of a rule.
    const axis = /^\{([a-z][a-z0-9-]*)\}$/.exec(part.glyph ?? '')?.[1];
    const fixed = FIXED_GLYPH[key];
    if (!axis && !fixed) {
      failures.push(`${def.id}.${partName}: glyph is '${part.glyph ?? '(none)'}', not an axis template like '{name}' — a fixed glyph makes every member of the set draw one shape, which is #864's other extreme, so it needs a decision recorded here rather than a pass. Add '${key}' to FIXED_GLYPH in this file with the name it draws and why.`);
      continue;
    }
    if (axis && fixed) {
      failures.push(`${def.id}.${partName}: FIXED_GLYPH records it as drawing one fixed '${fixed.glyph}', and the def templates it on axis '${axis}'. A stale entry exempts a templated part from the vocabulary arms below — drop it in the same PR that templated the part.`);
      continue;
    }
    if (axis && !(def.figmaProperties?.variantAxes ?? []).includes(axis)) {
      failures.push(`${def.id}.${partName}: the glyph is chosen by axis '${axis}', which is NOT in figmaProperties.variantAxes [${(def.figmaProperties?.variantAxes ?? []).join(', ')}] — the set would carry one member per other coordinate and every one of them would draw the same glyph.`);
      continue;
    }
    // THE RECORD AGAINST THE DEF, for a fixed part. Authored in two files, so swapping `check` and
    // `minus` between `mark` and `dash` fails here — every geometric arm below passes that mutation,
    // because both are real glyphs correctly drawn on the right artboard.
    if (fixed && part.glyph !== fixed.glyph) {
      failures.push(`${def.id}.${partName}: the def draws glyph '${part.glyph ?? '(none)'}' and FIXED_GLYPH records '${fixed.glyph}'. One of the two moved. Nothing below can see this — a wrong-but-real glyph draws correct ink on a correct artboard, so an indeterminate checkbox showing a tick passes every measurement in this file.`);
      continue;
    }
    if (fixed && !(ICON_NAMES as readonly string[]).includes(fixed.glyph)) {
      failures.push(`${def.id}.${partName}: FIXED_GLYPH records glyph '${fixed.glyph}', which the vocabulary does not define — the entry is a memory of a name that no longer exists.`);
      continue;
    }
    // THE COORDINATE, against the def. Ordered BEFORE the count arm and it `continue`s, because that arm
    // derives its expectation from the very field this one is checking: letting a disagreement through
    // would produce 54 "expected exactly 0" failures from the wrong side of the comparison and bury the
    // one sentence that says which file moved. Falling through is half of ordering (#969).
    if (fixed && !sameGate(fixed.at, (part.presentWhen ?? {}) as Record<string, readonly string[]>)) {
      failures.push(`${def.id}.${partName}: the def draws its fixed '${fixed.glyph}' at ${JSON.stringify(part.presentWhen ?? {})} and FIXED_GLYPH records ${JSON.stringify(fixed.at)}. One of the two moved. The count arm below cannot see this — it asks the def where the mark belongs and asks the projector where it is, and both read the same field, so widening the gate to '${Object.values(part.presentWhen ?? {}).flat().join('/') || '(nothing)'}' draws a mark at a coordinate that has none with the arm fully green.`);
      continue;
    }

    covered.add(key);
    const seenNames = new Map<string, string>();  // axis value (or the fixed name) → the `d` its document carries
    // A VARIANT-GATED part (#910) is legitimately absent at most coordinates, so the count arm below has
    // to know WHICH. Read off `presentWhen` in the def, and asserted in BOTH directions: a gated part
    // missing where its gate is satisfied fails, and one PRESENT where it is not fails too. Without the
    // second direction, adding `presentWhen` support here would have silently turned "exactly 1 GLYPH
    // node" into "0 is fine now" for every vector part in the corpus — a weakening of an arm that
    // already existed, which is what the header's warning about degrading a check is about. This is also
    // the only place `presentWhen` is measured against a projection rather than merely validated.
    const gated = (coord: Record<string, string | undefined>): boolean =>
      Object.entries(part.presentWhen ?? {}).every(([a, vs]) => coord[a] !== undefined && vs.includes(coord[a]!));
    let appearances = 0;

    for (const plan of set) {
      const coord = plan.coord as Record<string, string | undefined>;
      const member = axis ? coord[axis] : fixed!.glyph;
      const at = axis ? `${axis}=${member}` : `fixed '${member}'`;
      const nodes = glyphNodes(plan).filter((g) => g.part === partName);
      const want = gated(coord) ? 1 : 0;
      if (nodes.length !== want) {
        failures.push(`${def.id}.${partName}: ${nodes.length} GLYPH node(s) at ${JSON.stringify(plan.coord)}, expected exactly ${want}${part.presentWhen ? ` (presentWhen ${JSON.stringify(part.presentWhen)} is ${want ? 'satisfied' : 'NOT satisfied'} here)` : ''} — the def declares this part as kind 'vector', so a plan carrying none where one is due built an empty artboard (#864), one carrying two draws twice, and one carrying a node where the gate excludes it draws a mark at a coordinate that has none.`);
        continue;
      }
      if (!want) continue;
      appearances++;
      const node = nodes[0].node;

      // ---- EXPECTED, from the vocabulary --------------------------------------------------------
      const expectPath = member === undefined ? undefined : (ICON_PATHS as Record<string, string>)[member];
      if (expectPath === undefined) {
        failures.push(axis
          ? `${def.id}.${partName}: the member's '${axis}' coordinate is '${member ?? '(absent)'}', which the icon vocabulary does not define — the projector filled the template with something ICON_PATHS has no entry for.`
          : `${def.id}.${partName}: the fixed glyph '${member}' is named in ICON_NAMES but has no ICON_PATHS entry — the vocabulary's two halves disagree, so this part's artboard would import empty.`);
        continue;
      }

      // ---- ACTUAL, by reading back the document that will be submitted --------------------------
      const svg = node.glyphSvg;
      if (typeof svg !== 'string' || !svg.length) {
        failures.push(`${def.id}.${partName} @ ${at}: the plan carries NO glyphSvg. This is #864 verbatim — a member with no geometry builds as an empty artboard, resolves, writes and reports 0 misses.`);
        continue;
      }
      const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
      if (paths.length !== 1) {
        failures.push(`${def.id}.${partName} @ ${at}: the document carries ${paths.length} <path> elements, expected exactly 1 — 0 draws nothing and >1 needs a decision about how the outlines compose.`);
        continue;
      }
      const d = /\bd="([^"]*)"/.exec(paths[0])?.[1];
      const fill = /\bfill="([^"]*)"/.exec(paths[0])?.[1];
      const docVb = /\bviewBox="([^"]*)"/.exec(svg)?.[1];
      const docW = Number(/<svg\b[^>]*\bwidth="([0-9.]+)"/.exec(svg)?.[1]);
      const docH = Number(/<svg\b[^>]*\bheight="([0-9.]+)"/.exec(svg)?.[1]);

      // ---- A: it is the MEMBER'S OWN outline ----------------------------------------------------
      if (d !== expectPath) {
        failures.push(`${def.id}.${partName} @ ${at}: the document draws a path this member does not own. Expected ICON_PATHS['${member}'] (${expectPath.length} chars, starting '${expectPath.slice(0, 24)}'), got ${d === undefined ? 'no d attribute' : `${d.length} chars starting '${d.slice(0, 24)}'`}.`);
        continue;
      }

      // ---- B: it is FILLED ----------------------------------------------------------------------
      // Box area cannot see this: `fill="none"` with no stroke has a bounding box and paints nothing.
      if (!fill || fill === 'none' || fill === 'transparent')
        failures.push(`${def.id}.${partName} @ ${at}: the <path> has fill="${fill ?? 'absent'}" — an unfilled path with no stroke has a perfectly good bounding box and draws NOTHING, which every area check above passes.`);

      // ---- C: NON-ZERO INK, which is the quantity a human would check ---------------------------
      let ink: Box;
      try {
        ink = inkBox(d);
      } catch (err) {
        failures.push(`${def.id}.${partName} @ ${at}: the outline could not be measured — ${(err as Error).message}`);
        continue;
      }
      if (ink.w <= 0 || ink.h <= 0)
        failures.push(`${def.id}.${partName} @ ${at}: the outline measures ${ink.w}×${ink.h} — an outline with no area in one dimension is an invisible glyph, and the artboard around it looks exactly like a correct build.`);

      // ---- D: THE ARTBOARD is square, declared, and contains the ink ----------------------------
      // This is #864's second half. A Figma VectorNode's box IS its ink (only 19 of these 39 glyphs are
      // square), and every host binds ONE square variable to width AND height, so a non-square main
      // component distorts non-uniformly. The declared width/height are what deny the importer the
      // freedom to size the frame to the outline.
      if (docVb !== ICON_VIEWBOX)
        failures.push(`${def.id}.${partName} @ ${at}: the document declares viewBox="${docVb ?? 'absent'}", not the set's '${ICON_VIEWBOX}' — a path drawn on one grid inside a document claiming another imports at the wrong scale.`);
      if (!(docW > 0) || !(docH > 0))
        failures.push(`${def.id}.${partName} @ ${at}: the document declares width="${docW || 'absent'}" height="${docH || 'absent'}". Without both, an importer is free to size the frame to the INK — which is how a 14×2 'minus' becomes the main component's own box, and then a bar 7× too thick when a host stretches it into a square slot.`);
      else if (docW !== vb.w || docH !== vb.h)
        failures.push(`${def.id}.${partName} @ ${at}: the document is ${docW}×${docH} but its viewBox is ${vb.w}×${vb.h} — the artboard and the coordinate system disagree, so the glyph imports scaled.`);
      else if (docW !== docH)
        failures.push(`${def.id}.${partName} @ ${at}: the artboard is ${docW}×${docH}, not SQUARE. Hosts bind one variable to both axes of the slot they swap a glyph into (button and icon-button both bind size.{size}.icon to width and height), so a non-square member is stretched non-uniformly.`);
      // The read-back expectation the executors compare the imported frame against.
      if (JSON.stringify(node.glyphViewBox) !== JSON.stringify([vb.w, vb.h]))
        failures.push(`${def.id}.${partName} @ ${at}: glyphViewBox is ${JSON.stringify(node.glyphViewBox)}, expected [${vb.w}, ${vb.h}] — this is the only thing the executors can compare the imported frame's size against, so a wrong value makes their read-back agree with the wrong artboard.`);
      // The ink must fit the artboard: an outline outside it is clipped or off-canvas.
      if (ink.x < vb.minX || ink.y < vb.minY || ink.x + ink.w > vb.minX + vb.w || ink.y + ink.h > vb.minY + vb.h)
        failures.push(`${def.id}.${partName} @ ${at}: the outline occupies ${ink.x},${ink.y} ${ink.w}×${ink.h}, which leaves the ${vb.w}×${vb.h} artboard at ${vb.minX},${vb.minY} — the part outside imports clipped or off-canvas.`);

      const prior = seenNames.get(member);
      if (prior !== undefined && prior !== d)
        failures.push(`${def.id}.${partName}: two members both named '${member}' carry DIFFERENT outlines — the axis does not determine the glyph.`);
      seenNames.set(member, d);
      glyphChecks++;
    }

    // A FIXED part's completeness arm is a floor, because arms E and F below are about a set that
    // ENUMERATES the vocabulary and a fixed part enumerates nothing. Without this the whole per-part
    // block is vacuous the moment `presentWhen` excludes every coordinate — `docs/34` shape 9, reached
    // by a typo in a gate value rather than by a projector change.
    if (fixed) {
      if (!appearances)
        failures.push(`${def.id}.${partName}: drew its fixed '${fixed.glyph}' at NONE of the set's ${set.length} members. Every arm above ranges over the coordinates it appears at, so a part gated out of all of them reports clean having measured nothing.`);
      notes.push(`${key}: fixed '${fixed.glyph}' at ${appearances}/${set.length} member(s) on a ${vb.w}×${vb.h} artboard${part.presentWhen ? `, gated ${JSON.stringify(part.presentWhen)}` : ''}`);
      continue;
    }

    // ---- E: EVERY name in the vocabulary, and no others -----------------------------------------
    // "39 members" is the number a count would check and the number 39 copies of `check` also satisfies.
    const missing = ICON_NAMES.filter((n) => !seenNames.has(n));
    const extra = [...seenNames.keys()].filter((n) => !(ICON_NAMES as readonly string[]).includes(n));
    if (missing.length)
      failures.push(`${def.id}.${partName}: ${missing.length} of the vocabulary's ${ICON_NAMES.length} names have NO member — [${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ', …' : ''}]. A consumer writing <Icon name="…" /> for one of those resolves to nothing.`);
    if (extra.length)
      failures.push(`${def.id}.${partName}: ${extra.length} member(s) name a glyph the vocabulary does not define — [${extra.slice(0, 6).join(', ')}].`);

    // ---- F: EVERY MEMBER DRAWS ITS OWN OUTLINE, duplicates admitted by name ---------------------
    // The arm that fails when `glyph: '{name}'` is templated wrong. A collision must be DECLARED, in
    // both directions, or "39 members carrying one path" reads as a pass.
    const byPath = new Map<string, string[]>();
    for (const [name, path] of seenNames) byPath.set(path, [...(byPath.get(path) ?? []), name].sort());
    const collisions = [...byPath.values()].filter((ns) => ns.length > 1);
    for (const ns of collisions) {
      const key = ns.join('|');
      if (!DUPLICATE_PATHS[key])
        failures.push(`${def.id}.${partName}: [${ns.join(', ')}] all draw ONE outline and that collision is not declared. If the vocabulary genuinely holds one shape under several names, add '${key}' to DUPLICATE_PATHS in this file with the reason; otherwise the glyph template is filled from the wrong thing and every member of this set draws the same glyph.`);
    }
    const live = new Set(collisions.map((ns) => ns.join('|')));
    for (const key of Object.keys(DUPLICATE_PATHS))
      if (!live.has(key))
        failures.push(`${def.id}.${partName}: DUPLICATE_PATHS declares '${key}' as one shape under two names, and this run found them DISTINCT. A stale exemption is a hole in the "every member draws its own outline" arm — drop the entry in the same PR that made them differ.`);
    notes.push(`${def.id}.${partName}: ${seenNames.size} name(s) → ${byPath.size} distinct outline(s) on a ${vb.w}×${vb.h} artboard, ${collisions.length} declared collision(s)`);
  }

  // ---- G: geometry must not appear on a node that is not a glyph -------------------------------
  for (const plan of set)
    for (const n of allNodes(plan)) {
      if (n.type !== 'GLYPH' && (n.glyphSvg !== undefined || n.glyphViewBox !== undefined))
        failures.push(`${def.id}: node '${n.name}' at ${JSON.stringify(plan.coord)} is a ${n.type} carrying glyph geometry — the executors only read it on a GLYPH, so it is silently ignored and the node builds empty.`);
      if (n.type === 'GLYPH' && n.glyphViewBox === undefined)
        failures.push(`${def.id}: GLYPH node '${n.name}' at ${JSON.stringify(plan.coord)} carries no glyphViewBox — the executors' size read-back degrades to no check at all, which is the shape of #801 one tier over.`);
    }
}

for (const m of MUST_COVER)
  if (!covered.has(m))
    failures.push(`SCOPE NOT REPRESENTED: '${m}' is a known vector part and this run checked no plan carrying one. If it was legitimately removed, drop it from MUST_COVER in this file in the same PR; otherwise a clean run here means nothing.`);

// FIXED_GLYPH's OTHER DIRECTION. The per-part loop above fails a def that templates a part this table
// records; nothing there can see an entry naming a part that no longer exists at all — the loop simply
// never reaches it. `MUST_COVER` happens to name both of today's entries, but the two tables answer
// different questions and a future fixed part need not be a scope floor, so this is not that check
// arriving twice: the exemption itself has to be perishable, same as `DUPLICATE_PATHS`.
const vectorParts = new Set(
  (componentDefs as ComponentDef[]).flatMap((def) =>
    Object.entries(def.anatomy?.parts ?? {})
      .filter(([, p]) => (p as { kind?: string }).kind === 'vector')
      .map(([partName]) => `${def.id}.${partName}`)),
);
for (const key of Object.keys(FIXED_GLYPH))
  if (!vectorParts.has(key))
    failures.push(`STALE FIXED_GLYPH: '${key}' is recorded as drawing a fixed '${FIXED_GLYPH[key].glyph}', and no def declares a vector part by that name. The per-part loop cannot see this — it only ever reads entries for parts that exist — so the exemption would outlive its subject and silently admit the next part to take that name.`);

console.log(`Glyph geometry — ${glyphChecks} glyph(s) measured across ${covered.size} vector part(s): ${[...covered].join(', ') || 'NONE'}`);
for (const n of notes) console.log(`    ${n}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} glyph-geometry failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nA vector part must submit an outline that DRAWS SOMETHING, filled, on a square artboard, and a`);
  console.error(`different one for every member. #864 was four members drawing nothing: it resolved, it wrote, it`);
  console.error(`reported 0 misses, and every other gate was green — because an empty artboard exists, its refs`);
  console.error(`resolve, its count matches and nothing throws.`);
  process.exit(1);
}
console.log(`  ✓ every member carries its OWN filled outline, with non-zero area, inside a square ${vb.w}×${vb.h}`);
console.log(`    artboard the document declares rather than leaves to the importer.`);
console.log(`    The limit, stated: this is the document SUBMITTED to figma.createNodeFromSvg, not the subtree`);
console.log(`    Figma returns — there is no SVG importer in Node. A host that imports this and produces no`);
console.log(`    outline is caught by the executors' runtime 'NO VECTOR' miss, not here.`);
