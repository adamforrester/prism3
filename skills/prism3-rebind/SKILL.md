---
name: prism3-rebind
description: >-
  Rebind an existing Figma design file onto Prism3: replace a legacy library's
  variables, styles and components with Prism3's, screen by screen, without
  losing what the designers built. Covers Prism3 materialized in the file and
  Prism3 consumed as a published team library. Teaches the never-detach rule,
  the read-only mapping pass that comes first, how to protect a backup you must
  not change, the Figma plugin-API traps that silently break a rebind, the
  mapping traps, the rogue-binding audit, and how to sort every remaining
  difference into a Prism3 improvement, a Prism3 gap to file, or a brand-only
  item, and how to audit and repair a rebuild someone else made. For an agent working in a brand's Figma file through a plugin or a
  desktop bridge that runs plugin code, with Prism3 either materialized in that
  file or published as a team library the file can enable.
when_to_use: >-
  When asked to move an existing product's screens onto Prism3 in Figma
  (rebind, rebuild, migrate, "swap to our components"), or to audit how far a
  file still depends on a legacy library. Not for authoring a brand (use
  prism3-theme), not for building UI in code (prism3-consume), and not for
  authoring a new component definition (prism3-build-component).
---

# prism3-rebind — moving an existing Figma file onto Prism3

You are working in someone else's design file. Prism3's variables, text styles and components are
either already in it (the plugin materialized them) or published as a team library the file consumes
(section 8); the screens still point at a legacy library. Your job is to
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
  When Prism3 is a published library its instances are remote too, so `remote` alone is not enough:
  confirm the main component's `key` is not one of Prism3's (section 8). Run the guard only on a
  top-level legacy instance, never on a node inside a Prism3 instance: for a nested instance,
  `detachInstance()` also detaches every ancestor that is an instance, so it would detach the Prism3
  component around it.
- **A layout override that keeps the instance attached is fine, and gets recorded.** For example, setting a
  nested part to FILL so a field stretches to its column. Record it as an override and as a gap: if every
  placement needs it, the component should do it.
- **Where Prism3 has no component** (a header, a footer, a product card, a carousel), rebuild with
  plain frames bound to Prism3 variables. Check the file's Prism3 components before deciding one is
  missing: the set grows, and tabs, accordions, lists, dividers and segmented controls now ship. The rule doesn't apply to pieces Prism3 doesn't have. Log the
  missing component, and use Prism3 atoms inside it (`icon-button`, `flush-icon-button`, `button`,
  `link`, text styles) wherever they fit.

## 2. Before the first write

1. **Mapping pass, read-only.** Walk every visible paint, stroke, text run, gap, padding, radius, effect and
   instance in scope, along with what each is bound to. Map every distinct value to a Prism3 role once, in
   one shared table (against library keys on the section 8 path), with a confidence: exact, close (give the ΔE or the px), judgment, or gap. Every
   judgment row becomes an owner question **before** any write. Rows are referenced by ID from each
   screen, so a value is decided once.
2. **Fonts.** Call `figma.listAvailableFontsAsync()` in the runtime that will write, and check every family
   and style in scope against it. Figma refuses to edit a text node's characters unless all its fonts load,
   and refuses to place a component whose text uses an unloaded font. A cloud runtime may lack fonts a
   designer's desktop has, so check before planning anything else. A runtime that lacks a brand font
   fails `loadFontAsync` for it, so do the text writes in a runtime that has the fonts (the
   designer's desktop), not one that doesn't.
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
   `buttonLabelWeight` (label weight), `radiusScale` and `controlShape` (corner radius). A setting is a brand
   change, not component work.
6. **Components the file has never used.** List every library component the pass will place that the
   file has no instance of yet, and get each one's key before the first screen. The plugin can't list a
   library's components from the consuming file (section 8, step 2), and a design-system search given no
   library file key may search only the open file. If a token or key lookup is refused, stop and ask;
   never route around the refusal.
7. **Publish state, per component.** Read each component's `getPublishStatusAsync()` in the library file.
   "Every published update accepted" in the consuming file is compatible with edits in the library that
   were never published (section 8, step 7).
8. **Geometry before building.** Compute what each decision implies before you build it: a placeholder
   ratio at a card's width gives the card's height. Where two decisions conflict, settle it with a
   measurement check here, not on the canvas.
9. **Grid columns per breakpoint.** Check each grid's column count at every breakpoint against the
   options the component offers. A mobile grid isn't always one column.
10. **Scope by page.** Check every screen in scope sits on the page in scope. An overlay state can sit
    over a view from a different page; that is a scope question for the owner.
11. **Slot sizing.** For a slot component, read its own sizing (horizontal and vertical), not only its
    width. A fixed-height row clips a taller card.
12. **Structure with pixels.** Pair every structural read with a screenshot before calling content
    missing. A depth-limited dump hides deep content.
13. **Steps only the owner can do.** The session can be refused some steps even after approval in
    chat; edits to a shared library are a common one. Tell the owner at the start which steps they will
    do themselves, and re-read the current state before asking.

## 3. Running a screen

- **One representative screen per pattern.** Rebinding every similar screen proves nothing more. The goal
  is to show that Prism3 bindings and component swaps work, and to find the gaps.
- **Do one screen first and compare it with the original** before running the rest. Fix the runner, then
  rerun that screen from a fresh copy. Never patch a half-built one.
- **Each run starts from a fresh copy, in one call:** delete the previous copy, clone or instance the parked
  original, rebuild. A failed run is then repaired by running it again.
- **Set breakpoint modes on the frame.** A mobile frame gets the `type-sets` collection's `mobile` mode
  and the `layout` collection's mode for its width (`setExplicitVariableModeForCollection`). Layout
  modes are named by the brand's breakpoints, so the smallest is `sm` in most brands and `xs` in a
  brand that defines one; read the collection's modes rather than assuming. That's what makes a fluid title
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

### Swapping in place

- **Measure the original first.** Store its measurements before inserting anything, then hide it, build,
  and compare against what you stored. Never build beside the original inside a horizontal auto layout
  parent: both get squeezed, and they agree with each other while both are wrong.
- **Check each swapped node before removing the original.** Compare at every depth: variant and boolean
  properties, text, image hash and visibility. Position and size (x, y, width, height) match within
  2px, and so does the container's height. Remove the original only when every check passes; otherwise
  revert.
- **When exactly one node fails,** ask the owner about that node, with its neighbors' values beside it.
  After the decision, re-run the check and confirm it is the only difference.
- **Copying overrides between instances of one set:** walk the children by index. Swap the main
  component where its key differs, then `setProperties` for the changed properties that aren't instance
  swaps. Copy visibility, the characters (after loading the fonts) and the whole fills array.
- **Order the cards of a GRID auto layout by absolute position,** y then x, never by child order.
- **Fit-test a library component at its new width** before swapping it in.
- **A name the original places outside its card is still the card's.** Before calling a sparse card's
  text missing, check the same card at the other breakpoint.

### Spacing

- **The default rule, until the owner sets another:** for each row role, per breakpoint, take the value
  most frames use and give it to every frame. Snap it to the nearest space step (a tie goes to the larger
  step) and bind it. Remove spacers of 150px or more, and give that row the role's majority value. If a
  spacer is the only value a role has, borrow the other breakpoint's value and flag it. A value already
  bound in an earlier, decided step isn't unified again.
- **Spacers take two forms:** large padding, and fixed-height frames with no children and no fill. Scan
  for both.
- **After any spacing change, refit absolutely positioned overlays** to their anchor, and read back
  their y and height.
- **After removing a spacer, screenshot the bottom of the frame** before changing a band. If the space
  below is gone, that is an owner question.
- **An owner's value can be off the token scale.** Search every FLOAT variable first, aliases resolved.
  If none matches, apply the raw value, flag it and propose a token. Never snap it, and never add a token
  to the library yourself.

## 4. Plugin-API traps

| Trap | What happens | Do instead |
|---|---|---|
| `swapComponent()` keeps the old instance's overrides | A style or variable the legacy instance had overridden on an inner layer survives the swap. The new Prism3 instance still points at the legacy library inside, and an audit that skips instance internals never sees it | After swapping, check inside the instance for remote styles and variables; `resetOverrides()` where the design didn't rely on them (re-apply the instance's own visibility) |
| A bound paint keeps its placeholder color | `setBoundVariableForPaint` returns a paint with the placeholder's color, and an export can render it: black text over a correct binding | Build the paint from `resolveForConsumer(node).value` |
| Mixed-run text keeps stale node-level bindings | After every run is restyled and refilled, the node's own `boundVariables` still lists the legacy fill and font aliases | Set the whole node's fills and text style first, then the runs |
| A legacy grid style counts as a rogue binding | `gridStyleId` points at the legacy library | Apply the Prism3 grid style for the frame's breakpoint (named by the breakpoint: `sm`, `md`, …). Only if the design's grid differs from it, unlink with `setGridStyleIdAsync('')`, write back identical `layoutGrids`, and log the difference as a gap |
| Already-bound paints slip past a value table | A pass that classifies raw paints by color skips paints that already carry a binding, including ones bound to the **legacy** library | Treat "bound to a remote variable" exactly like raw (on the library path, "remote and not one of Prism3's keys", section 8) |
| An uninstalled font hangs the load | `loadFontAsync` on an unlisted font can take most of the call budget to fail | Never load an unlisted font. A text node that uses one can still take a Prism3 text style: load only the style's font and call `setTextStyleIdAsync`. Only character edits need the missing font |
| `node.textStyleId = …` throws | With `"documentAccess": "dynamic-page"` in the manifest, `textStyleId` is read-only; the typings say to use `setTextStyleIdAsync` | `await node.setTextStyleIdAsync(id)` |
| A FILL instance of a hugging component doesn't stretch its parts | Placed to fill a column, the field's label stretches but its input box keeps its minimum width | Override the nested part to FILL on the instance (legal, still attached), and file it |
| `createAutoLayout` isn't part of the plugin API | It isn't in the plugin typings, so a script written against it fails at its first call | `createFrame()`, then set the layout mode and auto sizing |
| Mixed values are Symbols | A mixed `cornerRadius` or `strokeWeight` throws inside a template string | Guard for a Symbol before formatting |
| Stale references after a placement | Reading a node after its parent was replaced, or looping into the nested parts of a component you have placed | Collect labels before placing; skip nodes inside instances; check `.removed` before each use |
| A new library import never settles | `importComponentByKeyAsync`, `importComponentSetByKeyAsync` or `importStyleByKeyAsync` neither resolves nor rejects for minutes, and later imports queue behind it | Race every import against a timeout. Run a long one as a background promise kept on `globalThis` and poll it. After about 60 seconds, reload the plugin UI; if it still hangs, ask the owner to drag one instance into the file |
| Imported library objects don't last | An imported set, style or variable that nothing uses is gone a few calls later | Place an instance of each imported main in a parking frame at once, and reach the main through `getMainComponentAsync()`. Re-import styles and variables right before use. Remove the parking frame when the pass is done |
| A timed-out call keeps running | The plugin finishes its work after the bridge has reported a timeout, and leaves orphan nodes | After a timeout, find and remove orphans before rerunning. Give each slow step its own timeout race |
| A photo is a stack of image fills | Copying only the first IMAGE paint shows the wrong colorway | Copy the whole fills array |
| A FILL child collapses inside a hugging slot | A card whose inner frame fills vertically keeps the height of the card it replaced | Build components that go into slots to hug on both axes, with `minHeight` for a fixed look; test them inside the slot component |
| `resetOverrides()` renames a nested slot | The slot takes its main's name, and lookups by name break | Rename it back, or look slots up by their property reference |
| Setting a property to its current value records no override | The value doesn't survive a later update to the main component | Set the other value, then set it back; confirm it in the parent's overrides |
| Sticky isn't settable | The plugin can't make a layer Sticky: the pinned typings have no property for it. Fixed is settable, through the parent frame's `numberOfFixedChildren`. | An owner step in the UI: Prototype, then Sticky |
| Screenshots render the active file only | A second connected file can't be screenshotted | Read its geometry back through the bridge, in that file |
| A node's screenshot has no background | It renders on transparency, which is useless for contrast | Screenshot the container and crop |

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
  apart by `remote: true`, never by name. When Prism3 is itself a library, both are remote: tell them
  apart by key against the whole library (section 8).
- **Hand-drawn icons.** A "+" made of two thin rectangles, or a close glyph made of two vectors, is an icon.
  Look for small groups of rects or lines as well as vectors and instances.
- **Contrast is measured on the real ground.** Status text on a tinted card or photo background is measured
  against that ground, not white. A design value that barely passes on it (around 4.5:1 at small sizes)
  is a value question for the owner, not a binding question.
- **Over photography, measure the ring.** Sample a 2–8px ring of photo around the text box, not the whole
  image. Report the mean, the brightest 5% and the brightest pixel, and give the brightest-5% figure as
  the ratio.
- **A link over photography rebinds to `inverse.text.primary` and keeps its underline.** Prism3 has no
  on-media link color, and `inverse.text.link.default` is measured on the inverse grounds, not on a
  photo. Bind the link text to `inverse.text.primary`, keep (or add) the underline as the link cue, and
  set a media veil (`veil.*`) behind it when the photo is busy. Measure the ring in each mode:
  `inverse.text.primary` flips in dark mode and the veil does not. A brand that wants a brighter inverse
  link pins it in Theme › Color › Links; that is a brand item, not a Prism3 gap.
- **Check `textDecoration` before choosing which text layer carries a value.** A price stack can hold a
  struck-through layer next to the current one.

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
- instances whose main component is remote (nested ones surface only after their parents are detached).
  On the library path, "remote" means remote and not one of Prism3's keys (section 8);
- **inside Prism3 instances too**, for remote styles and variables left by a swap (section 4). On the
  library path, a remote style or variable counts only if its key is not Prism3's (section 8).

Report "left on purpose" separately, with a reason for each: photo fills, third-party marks, effects with
no Prism3 equivalent (map effects to Prism3's `shadow/*` and `shadow-dark/*` effect styles and its
gradient styles first), hidden leftovers the owner deferred. Finish by rechecking every fingerprint.

- **Say where each rogue item comes from:** the file, a library main component, or a local team
  component's main. One from a library goes to the library's owner. Inside a local team component,
  report it and don't edit it.
- **Detached-component checks normalize names** (case, spaces, hyphens) and compare structure, not names
  alone.
- **Check the explicit breakpoint and type modes** on every top-level frame (section 3).
- **"Update available" can't be read from the plugin API.** Report it as NOT VERIFIABLE, an owner check
  in the UI.
- **Classify a variable by its collection's key,** never by whether it appears in the published
  descriptor list. A hidden collection has no descriptors, yet published styles bind its variables. On
  the library path, read Prism3's collection keys in the library file, where hidden collections are
  listed too (section 8, step 5).
- **Exempt the placeholder (FPO) fill and deliberate component states** from consistency checks.
- **An instance's own padding isn't a raw value.** Leave instance nodes out of the unbound-spacing scan.

Once a set of rebuilt pages is done, run the consistency audit too (section 10). Every node can be
bound to Prism3 while the pages still disagree with each other.

## 8. When Prism3 is a published library, not local

Sections 1 to 7 hold unchanged: attached components, fonts checked first, the rogue-binding audit. What
changes is how Prism3 gets into the file, and how you tell it from the legacy library. Wherever this
skill says "remote" to mean legacy, read "remote, and not one of Prism3's keys".

1. **The library must be enabled in the file first, by a person.** The plugin API can't enable one, and
   `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` lists only collections from
   libraries already enabled. If Prism3's collections aren't in that list, stop and ask the owner to
   enable the library. Don't read an empty list as "no variables".
2. **Collect the keys; the mapping table's Prism3 side is a key.** Variables: list the collections
   (`name`, `key`, `libraryName`), then `getVariablesInLibraryCollectionAsync(collection.key)` for each
   Prism3 collection. Those are descriptors (`name`, `key`, `resolvedType`), not variables, so keep
   `resolvedType` in the row to catch a color row mapped to a number. The plugin API has no listing of
   a library's components or styles from the consuming file: read each component set's, component's and
   style's `key` in the library file itself (read-only), take them from the owner, or find them with
   a design-system search the bridge offers. Treat a key found by search as unconfirmed until its
   import succeeds (step 3). Judge what a set offers (ratios, sizes, states) from its variant
   properties (`componentPropertyDefinitions`, or its `children`), never from its description, which
   can be stale, before calling anything a gap (section 6).
3. **Import everything in the table before the first screen, in its own step.**
   `figma.variables.importVariableByKeyAsync(key)`, `figma.importComponentSetByKeyAsync(key)` (a set;
   place from its `defaultVariant` or the variant the row names), `figma.importComponentByKeyAsync(key)`
   (a standalone component), `figma.importStyleByKeyAsync(key)`. Each rejects when nothing is published
   (or, for a style, no style exists) under that key, or the request fails: catch per key and report it as a failed table row, not a failed
   screen. Imported mains are remote and read-only; override on the instance, never on the main.
4. **Import before you bind.** `setBoundVariable` and `setBoundVariableForPaint` take a `Variable`, and
   a library descriptor isn't one. Bind with the object `importVariableByKeyAsync` returned. For a
   breakpoint mode, take the collection from an imported variable
   (`getVariableCollectionByIdAsync(variable.variableCollectionId)`) and pass it to
   `setExplicitVariableModeForCollection`; read its `modes` rather than assuming names (section 3).
5. **Tell Prism3 from legacy by key, against the whole library, not the table.** The table holds only
   what the design mapped to. Prism3's own internals (the icon inside a button, the variables and
   styles a component binds inside itself) are not in it, and would read as legacy. Build the set of
   Prism3 keys from the library: every variable key `getVariablesInLibraryCollectionAsync` returns for
   each Prism3 collection (a variable is Prism3's when its collection's `key` is one of those
   collections' keys; a hidden collection lists no descriptors, so take its key from
   `getLocalVariableCollectionsAsync()` in the library file), and every component, variant and style key read from the library file or from
   an imported set's `children`. An instance is Prism3's when its main component's key is in the set,
   a style when its `key` is. Resolve a binding's alias with `getVariableByIdAsync(alias.id)` to read
   the variable's `key` and its `variableCollectionId`. Everything remote outside the set is legacy,
   and goes to the same detach guard and audit as before. Never decide by name, and never run the
   detach guard on a node inside a Prism3 instance (section 1).
6. **Fonts: same check, run after the import.** A library component's fonts are known only once it is
   imported. Import first, then compare the `fontName` of each imported text node with
   `figma.listAvailableFontsAsync()` before the first placement.
7. **Only published work is importable.** A change the Prism3 owner made in the library file can't be
   imported until it is published, and the consuming file takes the update in the Figma UI. If a screen
   needs something the owner says is fixed, check it was published and accepted before calling it still
   a gap. In the library file, `getPublishStatusAsync()` on a component, style or variable says whether
   it is unpublished, current or changed since it was published.

Log the library's name, every key imported, every import that failed and its reason.

## 9. What to hand back

- Per screen: placed components, overrides, snaps, grays for review, and what was left on purpose.
- On the library path: the library, the key table, imports that failed, and the publish status of
  anything a gap depends on.
- The difference table, each row sorted as improvement, gap or brand (proposed), with measurements.
- For a set of rebuilt pages: the consistency audit's findings table, and its row on #2886 (section 10).
- For an audit of someone else's rebuild: the report shape in section 11.
- Issues for the gaps the owner confirms. Brand-only items and setting changes go on a list for the brand's
  own file, kept out of the shared repository.
- Never put a client's name, file name, file key, product or page names into the shared repository,
  including issues and examples.

## 10. The consistency audit for rebuilt spec pages

A set of rebuilt pages must be consistent, not only bound to Prism3. The binding audit passes a control
drawn as plain text, because the text uses a library text style. `consistency-audit.js`, next to this
file, finds that kind of drift. It is read-only: it reads the pages and writes nothing.

**When to run it.** After rebuilding a set of pages that share elements (one flow, one template at two
breakpoints), and again after fixing what it found. Run it on the whole set at once: most checks compare
pages with each other, so a single frame has nothing to disagree with.

**How to run it.** It needs a dev build of the plugin with the agent link on, because it runs through the
link's `run-code` command (`apps/plugin/README.md`, the agent link section). Send one input line, then the
file's text, as the code:

```js
const auditInput = { pageId: '12:34', label: 'Checkout flow', run: 3 };
// …then the whole of consistency-audit.js
```

Give `frameIds` instead of `pageId` to audit exactly those frames. The file's header lists every option:
`allow` (roles and texts that check 1 skips, by default headings and titles), `controls` (which
component names count as controls), `mobileMaxWidth` (767 by default) and `library` (which variables
and styles count as the library's). On the library path (section 8), pass the Prism3 collection and
style keys as `library`; the default treats every local variable and style as the library's, which is
right only when Prism3 is materialized in the file. A large set can take longer than the 30-second
default, so pass a longer `timeoutMs` in the command's args.

**The four checks.**

1. **Control label.** Plain text, outside any instance, that repeats the label of a button, link, tab,
   tag or chip instance anywhere in the set. A page heading that matches a navigation link is expected:
   the allowlist skips text whose role or text style name contains `heading` or `title`.
2. **Pairing.** For each element role, the desktop text style and the mobile text style form the same
   pair on every page.
3. **Page to page.** At one breakpoint, each role uses one text style, one component and variant, and
   one spacing to its parent (the auto layout gap, or the distance from the previous sibling).
4. **Binding.** Every variable and style comes from the library, inside instances too, and no visible
   solid fill or stroke outside an instance is a raw color. It does not read gradient or image paints. This is section 7's audit in short form; section 7
   still applies in full to a rebind.

**Padding is yours to read.** Check 3's spacing is the auto layout gap or the distance from the previous
sibling; the script doesn't read padding, and vertical rhythm often lives in a wrapper row's top padding.
Add padding to the spacing you compare: group it by row role and breakpoint across the frames, so a drift
shows as the one frame that differs from the rest.

**What the checks rely on.** A role is the layer name, normalized: lowercase, separators as spaces, and a
trailing `copy` or `copy 2` removed, so `Price copy` and `price` are one role. A number stays, so
`Heading 1` and `Heading 2` are two roles. A layer Figma named (`Frame 12`, `Rectangle 4`, or a text
layer still named after its own text) has no role, and checks 2 and 3 skip it; the output's `coverage`
block counts the text layers without one, so name the layers that matter. A frame is desktop or mobile by the words in its name (`desktop`, `lg`, `xl`;
`mobile`, `sm`, `xs`), or by its width when the name has neither. Frames whose names match once those
words are removed are one page at two breakpoints. Check the `frames` list in the output before reading
the findings: a frame classified wrongly makes every pairing finding wrong.

**Reading the findings.** Each finding names its check, frame, node, role, the expected value (what most
pages use) and the actual one. Sort each into a true positive (fix it in the file, then rerun) or a
false positive (intended, such as a drawer title that repeats its trigger's label). Add a false
positive that will recur to `allow`, rather than ignoring it each run. A drift on one page shows up in
checks 2 and 3 both; fix it once.

**Logging the run.** The output's `runsRow` is a row for the Runs table on #2886. Fill its last three
cells (true positives, false positives, and any rule change you made after the run) and add it to the
issue with a comment, together with the findings table. Those rows decide when the audit becomes a
plugin command. `apps/plugin/test-consistency-audit.ts` runs the audit on a fixture and proves each
check fires on a seeded drift and stays quiet on a consistent set; change the audit only with it.

## 11. Auditing and repairing someone else's rebuild

The file has already been rebuilt, by another agent or a designer, and you are asked to check it and fix
what is wrong. Sections 1 to 10 still hold. What changes is that every node already has a value someone
chose, so each write replaces a decision, and the owner needs to see each one and undo any of them.

1. **Report in a fixed shape.**
   - A pass/fail table. NOT VERIFIABLE (the plugin API can't read it) and NOT VERIFIED (blocked, with
     the blocker) are outcomes of their own, never folded into pass.
   - Every change as node ID, value before → value after.
   - Every item skipped or held, with its reason and what unblocks it.
   - A closing "what's left" table.
   - A before/after screenshot pair for each frame you changed.
2. **Save a named version at every pass boundary** (`figma.saveVersionHistoryAsync`, or the owner saves
   one in the UI), so the owner can undo one pass without undoing the others.
3. **Read before each write.** Read the node's current value and compare it with the value you recorded.
   On a mismatch, abort the batch: someone else changed the file since your read.
4. **A library republish moves heights on its own.** When the owner accepts library updates, re-measure
   before the first write. Measurements taken before the update are stale.
