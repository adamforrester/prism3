---
name: prism3-rebind
description: >-
  Rebind an existing Figma design file onto Prism3: replace a legacy library's
  variables, styles and components with the file's local Prism3 ones, screen by
  screen, without losing what the designers built. Teaches the never-detach rule,
  the read-only mapping pass that comes first, how to protect a backup you must
  not change, the Figma plugin-API traps that silently break a rebind, the
  mapping traps, the rogue-binding audit, and how to sort every remaining
  difference into a Prism3 improvement, a Prism3 gap to file, or a brand-only
  item. For an agent working in a brand's Figma file through a plugin or a
  desktop bridge that runs plugin code, with Prism3 already materialized in that file.
when_to_use: >-
  When asked to move an existing product's screens onto Prism3 in Figma
  (rebind, rebuild, migrate, "swap to our components"), or to audit how far a
  file still depends on a legacy library. Not for authoring a brand (use
  prism3-theme), not for building UI in code (prism3-consume), and not for
  authoring a new component definition (prism3-build-component).
---

# prism3-rebind — moving an existing Figma file onto Prism3

You are working in someone else's design file. Prism3's variables, text styles and components already
live in it (the plugin materialized them); the screens still point at a legacy library. Your job is to
make the screens use Prism3, and to report, precisely, everywhere Prism3 can't yet match the design.
**The report is the deliverable as much as the rebinding is.** A rebind that hides its gaps teaches the
team nothing.

## 1. The rule: never detach a Prism3 component to match a design

Recorded as a decision in `docs/46-never-detach.md`. Place the Prism3 component **attached**, and match
the design as closely as its variants, properties, text content and *layout* overrides allow. Do not
detach it, do not restyle its layers (fills, fonts) to look like the design, and do not build a lookalike
frame from bound variables in its place. Then list every visible difference that remains. Each one is a
decision for the owner (section 6), and most become component work.

- **Detaching is only for the legacy library's instances you are replacing.** Before calling
  `detachInstance()`, confirm the main component is remote: `(await n.getMainComponentAsync()).remote`.
- **A layout override that keeps the instance attached is fine, and gets recorded.** For example, setting a
  nested part to FILL so a field stretches to its column. Record it as an override and as a gap: if every
  placement needs it, the component should do it.
- **Where Prism3 has no component** (a header, a footer, a product card, tabs, a carousel), rebuild with
  plain frames bound to Prism3 variables. The rule doesn't apply to pieces Prism3 doesn't have. Log the
  missing component, and use Prism3 atoms inside it (`icon-button`, `button`, text styles) wherever they fit.

## 2. Before the first write

1. **Mapping pass, read-only.** Walk every visible paint, stroke, text run, gap, padding, radius, effect and
   instance in scope, along with what each is bound to. Map every distinct value to a Prism3 role once, in
   one shared table, with a confidence: exact, close (give the ΔE or the px), judgment, or gap. Every
   judgment row becomes an owner question **before** any write. Rows are referenced by ID from each
   screen, so a value is decided once.
2. **Fonts.** Call `figma.listAvailableFontsAsync()` in the runtime that will write, and check every family
   and style in scope against it. Figma refuses to edit a text node's characters unless all its fonts load,
   and refuses to place a component whose text uses an unloaded font. A cloud runtime may lack fonts a
   designer's desktop has, so check before planning anything else.
3. **Dependents.** For every node you will write to, ask what renders it elsewhere. A component node (a
   main component) can have instances on a page you were told not to touch: `getInstancesAsync()` on each target. If a
   protected page is instances of your targets, editing the targets edits the protected page. Rebuild
   detached copies instead, and park the untouched mains in a hidden, locked frame. Moving a main, or
   hiding its ancestor, doesn't change its instances.
4. **Fingerprint what must not change, visible content only, per node.** Hash structure, size, position,
   visibility, paints and their bindings, and text runs, for each visible node, keyed by node ID. Skip hidden
   subtrees: Figma re-runs layout on hidden layers, which moves them without anything visible changing, and
   a whole-screen hash then flags a change no one can see. Keep the per-node table as well as a total, so a
   mismatch names the node. Fingerprint before the first write and recheck after every structural step and
   at the end.
5. **Check the settings before calling anything a gap.** Several apparent gaps are brand settings
   (`packages/engine/levers.ts`). Examples: `buttonMinWidthMultiplier` (a narrow action row overflows),
   `buttonLabelWeight` (label weight), `radiusScale` and `radiusHairline` (corner radius). A setting is a brand
   change, not component work.

## 3. Running a screen

- **One representative screen per pattern.** Rebinding every similar screen proves nothing more. The goal
  is to show that Prism3 bindings and component swaps work, and to find the gaps.
- **Do one screen first and compare it with the original** before running the rest. Fix the runner, then
  rerun that screen from a fresh copy. Never patch a half-built one.
- **Each run starts from a fresh copy, in one call:** delete the previous copy, clone or instance the parked
  original, rebuild. A failed run is then repaired by running it again.
- **Set breakpoint modes on the frame.** A mobile frame gets the type collection's mobile mode and the
  layout collection's small mode (`setExplicitVariableModeForCollection`). That's what makes a fluid title
  style render at its mobile size. A breakpoint is a mode, not a choice of text style.
- **Order the placements:** first the components (fields, rows, buttons, icon buttons, veils, tags), then
  detach whatever legacy instances remain, then rebind everything raw. Handle composite controls (a chip with
  its own close glyph) before generic glyph detection, so a part isn't taken for a whole.
- **Gather all of a legacy component's visible text** before replacing it. A "button with a value" has two
  text layers, and `findOne` returns only the first.
- **Instrument every run:** a phase timer, a soft deadline a few seconds before the bridge's limit that
  throws with the phase name, and a catch that returns the timings. Catch with `String(e)`: some failures
  aren't Error objects. After any timeout, inspect the file's state before rerunning; the stall may have
  happened before anything was written, or the bridge connection may have dropped.
- **Log per screen:** what was placed, every snap (value → step), every override, every gray or color snapped
  to a role (for owner review), and everything left unbound. The left list is a to-do list with expected false
  positives (paints the run itself has bound).
- **Screenshot after every component swap and compare with the original.** Some faults never show in the
  node tree. A hugging inner frame that doesn't stretch, a 36px tap target overflowing a fixed-width row, and
  a dropped label are all visible only in pixels.

## 4. Plugin-API traps

| Trap | What happens | Do instead |
|---|---|---|
| `swapComponent()` keeps the old instance's overrides | A style or variable the legacy instance had overridden on an inner layer survives the swap. The new Prism3 instance still points at the legacy library inside, and an audit that skips instance internals never sees it | After swapping, check inside the instance for remote styles and variables; `resetOverrides()` where the design didn't rely on them (re-apply the instance's own visibility) |
| A bound paint keeps its placeholder color | `setBoundVariableForPaint` returns a paint with the placeholder's color, and an export can render it: black text over a correct binding | Build the paint from `resolveForConsumer(node).value` |
| Mixed-run text keeps stale node-level bindings | After every run is restyled and refilled, the node's own `boundVariables` still lists the legacy fill and font aliases | Set the whole node's fills and text style first, then the runs |
| A legacy grid style counts as a rogue binding | `gridStyleId` points at the legacy library | Unlink it with `setGridStyleIdAsync('')` and write back identical `layoutGrids` |
| Already-bound paints slip past a value table | A pass that classifies raw paints by color skips paints that already carry a binding, including ones bound to the **legacy** library | Treat "bound to a remote variable" exactly like raw |
| An uninstalled font hangs the load | `loadFontAsync` on an unlisted font can take most of the call budget to fail | Never load an unlisted font. A text node that uses one can still take a Prism3 text style: load only the style's font and call `setTextStyleIdAsync`. Only character edits need the missing font |
| A FILL instance of a hugging component doesn't stretch its parts | Placed to fill a column, the field's label stretches but its input box keeps its minimum width | Override the nested part to FILL on the instance (legal, still attached), and file it |
| `createAutoLayout` isn't part of the plugin API | It isn't in the plugin typings, so a script written against it fails at its first call | `createFrame()`, then set the layout mode and auto sizing |
| Mixed values are Symbols | A mixed `cornerRadius` or `strokeWeight` throws inside a template string | Guard for a Symbol before formatting |
| Stale references after a placement | Reading a node after its parent was replaced, or looping into the nested parts of a component you have placed | Collect labels before placing; skip nodes inside instances; check `.removed` before each use |

## 5. Mapping traps

- **Stacked paints: classify the composite.** A fill style made of a gray under translucent black overlays
  renders much darker than its first paint. First-paint logic sends it to a lighter role than the design
  shows.
- **One color, many roles.** A single near-black serves text, icons, button fills, selection underlines and
  control strokes. Classify by context (node type, ancestors, decoration, whether it sits inside an input),
  not by color alone.
- **A legacy variable whose value no table row covers** (often on hidden layers, such as icon slots inside
  fields). Only the binding audit finds these; screenshots never will.
- **Legacy names can look like Prism3's.** A legacy collection may reuse a similar root prefix. Tell them
  apart by `remote: true`, never by name.
- **Hand-drawn icons.** A "+" made of two thin rectangles, or a close glyph made of two vectors, is an icon.
  Look for small groups of rects or lines as well as vectors and instances.
- **Contrast is measured on the real ground.** Status text on a tinted card or photo background is measured
  against that ground, not white. A design value that barely passes on it (around 4.5:1 at small sizes)
  is a value question for the owner, not a binding question.

## 6. Sorting every difference: improvement, gap, or brand

For each difference that remains after placing attached components, **propose** one of three kinds. The
owner decides; an agent never self-certifies an improvement.

1. **Prism3 improvement.** The Prism3 version is better for accessibility, consistency or best practice:
   a real tap target instead of a bare glyph, an icon on an error message, taller selection rows. Keep it,
   record it, file nothing.
2. **Prism3 gap.** The component can't express something the design legitimately needs: a missing size, a
   missing state (for example a focused field with a value), an input box that won't fill its column, a
   missing ratio, a missing component. File an issue.
3. **Brand-only.** A legitimate brand choice that shouldn't change Prism3 for every brand: a chip style, a
   checkout button with a price slot, a brand blur effect. It belongs in the brand's library or settings.

A difference that a setting resolves (section 2, step 5) is none of the three: change the setting.

**When to stop and file a gap:** when matching the design would need you to detach, restyle a component's
layers, or build a lookalike. Stop, place the attached component, and file the difference with a measured
table: design value, Prism3 value, and where the change would go.

## 7. The rogue-binding audit (read-only, last)

A rogue binding is anything that still resolves to the legacy library. Walk every node in scope and count:

- `node.boundVariables`, every key and alias (this catches stale text aliases and size and spacing bindings);
- `boundVariables.color` on each fill and stroke paint;
- `fillStyleId`, `strokeStyleId`, `effectStyleId`, `textStyleId` and `gridStyleId`;
- per text run: `fillStyleId`, `textStyleId` and its `boundVariables`;
- instances whose main component is remote (nested ones surface only after their parents are detached);
- **inside Prism3 instances too**, for remote styles and variables left by a swap (section 4).

Report "left on purpose" separately, with a reason for each: photo fills, third-party marks, effects with
no Prism3 equivalent, hidden leftovers the owner deferred. Finish by rechecking every fingerprint.

## 8. What to hand back

- Per screen: placed components, overrides, snaps, grays for review, and what was left on purpose.
- The difference table, each row sorted as improvement, gap or brand (proposed), with measurements.
- Issues for the gaps the owner confirms. Brand-only items and setting changes go on a list for the brand's
  own file, kept out of the shared repository.
- Never put a client's name, file name, file key, product or page names into the shared repository,
  including issues and examples.
