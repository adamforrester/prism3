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
const MUST_COVER = ['icon.glyph'];

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
    const part = raw as { glyph?: string };
    // The axis the glyph template names, read from the DEF. `'{name}'` → `name`; a literal glyph name
    // means every member draws the same thing on purpose, which is a different claim and is not this
    // corpus, so it fails here rather than being silently exempted.
    const axis = /^\{([a-z][a-z0-9-]*)\}$/.exec(part.glyph ?? '')?.[1];
    if (!axis) {
      failures.push(`${def.id}.${partName}: glyph is '${part.glyph ?? '(none)'}', not an axis template like '{name}' — a fixed glyph makes every member of the set draw one shape, which is #864's other extreme, so it needs a decision recorded here rather than a pass.`);
      continue;
    }
    if (!(def.figmaProperties?.variantAxes ?? []).includes(axis)) {
      failures.push(`${def.id}.${partName}: the glyph is chosen by axis '${axis}', which is NOT in figmaProperties.variantAxes [${(def.figmaProperties?.variantAxes ?? []).join(', ')}] — the set would carry one member per other coordinate and every one of them would draw the same glyph.`);
      continue;
    }

    covered.add(`${def.id}.${partName}`);
    const seenNames = new Map<string, string>();  // axis value → the `d` its document carries

    for (const plan of set) {
      const member = (plan.coord as Record<string, string | undefined>)[axis];
      const nodes = glyphNodes(plan).filter((g) => g.part === partName);
      if (nodes.length !== 1) {
        failures.push(`${def.id}.${partName}: ${nodes.length} GLYPH node(s) at ${JSON.stringify(plan.coord)}, expected exactly 1 — the def declares this part as kind 'vector', so a plan carrying none built an empty artboard (#864) and one carrying two draws twice.`);
        continue;
      }
      const node = nodes[0].node;

      // ---- EXPECTED, from the vocabulary --------------------------------------------------------
      const expectPath = member === undefined ? undefined : (ICON_PATHS as Record<string, string>)[member];
      if (expectPath === undefined) {
        failures.push(`${def.id}.${partName}: the member's '${axis}' coordinate is '${member ?? '(absent)'}', which the icon vocabulary does not define — the projector filled the template with something ICON_PATHS has no entry for.`);
        continue;
      }

      // ---- ACTUAL, by reading back the document that will be submitted --------------------------
      const svg = node.glyphSvg;
      if (typeof svg !== 'string' || !svg.length) {
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the plan carries NO glyphSvg. This is #864 verbatim — a member with no geometry builds as an empty artboard, resolves, writes and reports 0 misses.`);
        continue;
      }
      const paths = [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0]);
      if (paths.length !== 1) {
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the document carries ${paths.length} <path> elements, expected exactly 1 — 0 draws nothing and >1 needs a decision about how the outlines compose.`);
        continue;
      }
      const d = /\bd="([^"]*)"/.exec(paths[0])?.[1];
      const fill = /\bfill="([^"]*)"/.exec(paths[0])?.[1];
      const docVb = /\bviewBox="([^"]*)"/.exec(svg)?.[1];
      const docW = Number(/<svg\b[^>]*\bwidth="([0-9.]+)"/.exec(svg)?.[1]);
      const docH = Number(/<svg\b[^>]*\bheight="([0-9.]+)"/.exec(svg)?.[1]);

      // ---- A: it is the MEMBER'S OWN outline ----------------------------------------------------
      if (d !== expectPath) {
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the document draws a path this member does not own. Expected ICON_PATHS['${member}'] (${expectPath.length} chars, starting '${expectPath.slice(0, 24)}'), got ${d === undefined ? 'no d attribute' : `${d.length} chars starting '${d.slice(0, 24)}'`}.`);
        continue;
      }

      // ---- B: it is FILLED ----------------------------------------------------------------------
      // Box area cannot see this: `fill="none"` with no stroke has a bounding box and paints nothing.
      if (!fill || fill === 'none' || fill === 'transparent')
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the <path> has fill="${fill ?? 'absent'}" — an unfilled path with no stroke has a perfectly good bounding box and draws NOTHING, which every area check above passes.`);

      // ---- C: NON-ZERO INK, which is the quantity a human would check ---------------------------
      let ink: Box;
      try {
        ink = inkBox(d);
      } catch (err) {
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the outline could not be measured — ${(err as Error).message}`);
        continue;
      }
      if (ink.w <= 0 || ink.h <= 0)
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the outline measures ${ink.w}×${ink.h} — an outline with no area in one dimension is an invisible glyph, and the artboard around it looks exactly like a correct build.`);

      // ---- D: THE ARTBOARD is square, declared, and contains the ink ----------------------------
      // This is #864's second half. A Figma VectorNode's box IS its ink (only 19 of these 39 glyphs are
      // square), and every host binds ONE square variable to width AND height, so a non-square main
      // component distorts non-uniformly. The declared width/height are what deny the importer the
      // freedom to size the frame to the outline.
      if (docVb !== ICON_VIEWBOX)
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the document declares viewBox="${docVb ?? 'absent'}", not the set's '${ICON_VIEWBOX}' — a path drawn on one grid inside a document claiming another imports at the wrong scale.`);
      if (!(docW > 0) || !(docH > 0))
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the document declares width="${docW || 'absent'}" height="${docH || 'absent'}". Without both, an importer is free to size the frame to the INK — which is how a 14×2 'minus' becomes the main component's own box, and then a bar 7× too thick when a host stretches it into a square slot.`);
      else if (docW !== vb.w || docH !== vb.h)
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the document is ${docW}×${docH} but its viewBox is ${vb.w}×${vb.h} — the artboard and the coordinate system disagree, so the glyph imports scaled.`);
      else if (docW !== docH)
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the artboard is ${docW}×${docH}, not SQUARE. Hosts bind one variable to both axes of the slot they swap a glyph into (button and icon-button both bind size.{size}.icon to width and height), so a non-square member is stretched non-uniformly.`);
      // The read-back expectation the executors compare the imported frame against.
      if (JSON.stringify(node.glyphViewBox) !== JSON.stringify([vb.w, vb.h]))
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: glyphViewBox is ${JSON.stringify(node.glyphViewBox)}, expected [${vb.w}, ${vb.h}] — this is the only thing the executors can compare the imported frame's size against, so a wrong value makes their read-back agree with the wrong artboard.`);
      // The ink must fit the artboard: an outline outside it is clipped or off-canvas.
      if (ink.x < vb.minX || ink.y < vb.minY || ink.x + ink.w > vb.minX + vb.w || ink.y + ink.h > vb.minY + vb.h)
        failures.push(`${def.id}.${partName} @ ${axis}=${member}: the outline occupies ${ink.x},${ink.y} ${ink.w}×${ink.h}, which leaves the ${vb.w}×${vb.h} artboard at ${vb.minX},${vb.minY} — the part outside imports clipped or off-canvas.`);

      const prior = seenNames.get(member);
      if (prior !== undefined && prior !== d)
        failures.push(`${def.id}.${partName}: two members both named '${member}' carry DIFFERENT outlines — the axis does not determine the glyph.`);
      seenNames.set(member, d);
      glyphChecks++;
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
