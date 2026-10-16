## (2026-10-15) — Field style lever: Outline or Underline for every field (#2695, Q332 A, Q333)

**What landed.** A Form lever, `fieldStyle` ("Field style", Outline / Underline, default Outline), placed right after
Control shape in the manifest and on the studio's Shape page. Built exactly as the owner's sixteen calls (Q333, each
option A) say. Under Underline, Text field, Password field, Select and Textarea draw a 1px bottom line in the field's
own border roles (rest, hover, focus, the three status borders, read-only, disabled), thickened to 2px at both
focus-visible states, with the shared ring moved out to `focus.ring.offset` (2px). Inline padding goes to `space.0`,
corners go to `radius.none` whatever Control shape says, the hover wash and the disabled plate are dropped, and
Textarea's grip is inset 2px so it sits above the line. No token is added (Q15 A), and no Figma axis (Q14 A): 84 members
per field either way. Apply Theme now says "Field style is now Underline. Update components to redraw the field sets."
when the stored brand's style changed (Q16 A).

**The mechanism is Control shape's.** `applyFieldStyle(def, style)` rewrites a field def before projection and is the
identity under Outline, so every Outline plan is byte-identical and nothing brand-specific reaches the projector. It
runs right after `applyControlShape` in the plugin's `materializeForBrand` and in `lint-lever-sweep.ts`'s restated
composition, so its square corner wins. It reads the frame part's own keys (its corner key, the ring's inset key, any
corner-pinned child) rather than naming keys, and new keys (`underline.side`, `underline.line.<state>`,
`underline.pad-x`) carry the rungs. So density can't move the zero padding: density moves the old `pad-x` keys, which
the frame no longer binds. The field family is `FIELD_FRAME_PARTS`, keyed by def id as `FIELD_CORNER_REFS` is.

**One schema field, and why it's per side.** `PartDef.strokeEdges` binds the four stroke sides apart. Figma binds a
weight per side anyway (#1332: a scalar binding lands on the four per-side keys), so the read-back already reads those
keys and needed no change. The validator now admits `{state}` on a `strokeEdges` key, as it does on a type key. The
footprint rule refuses state-keyed geometry because it moves a box, and an inside-drawn stroke left out of the layout
size moves none. The focus-ring wall in `test.ts` that held `strokeWidth` as the only stroke field now holds exactly
two, both width.

**The trap, and the shim change that witnesses it.** Both executors write a literal `strokeWeight = 1` on a stroked
node whose weight was not written, and a literal write after a binding unbinds it (#1266). Their guards checked only
the scalar `strokeWeight`, so an underline control would have had its per-side bindings overwritten to a 1px box. Four
guards (two per executor) now check the scalar and all four sides. The component shim didn't model that unbinding: a
literal write left the per-side bindings in place, so the bug was invisible offline. The shim now models it, as the
host does. EXECUTOR_REVISION moves to 28 (main reached 27 while this was in review). The paste script grew by the five-key list. Against the old base that
made icon-button 18 chunks; over main's later, smaller shell it is 17 again, so the pin did not move.

**How the tests stay independent.** Every expected name in the `#2695` arms (`border-width/hairline`, `/thick`,
`/none`, `space/0`, `radius/none`, `focus/ring/offset`, the border roles, `disabled/text`) is typed from the
decisions, never read off the materializer. The family is held by `color.field.fill`, the field chrome only the four
fields bind. `color.field.border.rest` was tried first and also matches Checkbox and Radio's unchecked box. Contrast is
recomputed from the roles' colors: the rest, hover, focus and three status lines each clear 3:1 on
`background.primary` and `background.secondary`, in every mode of every example brand. That agrees with the
proposal's measured floor of 3.16:1.

**One decision read two ways once in the code (Owner question on #2695).** Q14 A says the defs' `style` entry lists
both values as brand-set, and also that there is no per-instance prop. Listing `underline` in `variants.style` made it a
code coordinate: `lint-paint`'s census doubled each field's grid (108 → 216 coordinates) and `lint-axis-values` read a
two-value variant. Built: `variants.style` stays `['outline']`, and the codeOnly `style` entry names both values as the
brand's Field style setting. The register's reason now says why underline lives on the lever.

**Deferred, filed.** Password field's corner ignores Control shape's Boxed and Hairline on Outline brands (#2718,
pre-existing from #2648). Number input and Code input join the lever when they are built (#2719). The studio's Shape
preview has no field, so the lever has no preview effect there (#2720, an owner question).

**Review round (#2774 fixed here).** The independent review drove Update both ways through the shim. Outline →
Underline converged; Underline → Outline left the 12 hover members of each field set at 100% opacity, reported 12
content failures, and needed a second Update. The cause was on main (#2774): the host resets a bound paint's opacity to
1 on the first assignment that changes the paint's variable, and an in-place rewrite from the opaque `field.fill` to the
translucent wash is exactly that. The plugin executor now assigns a translucent bound paint twice, the rule the shim
already models from the host measurement (the second assignment finds the binding in place and keeps the opacity). The
paste executor is untouched: it only builds fresh, and the combine's re-resolve rescues a fresh build. Q16 A is now held
both ways in `test-update-apply.ts`, on all four fields: one Update, every key and id kept, every washed control
translucent, every disabled edge on `color.disabled.border` (Q346, which landed on main while this was open), and a
clean next dry run. Q8's disabled ink is now pinned per slot (value and placeholder `disabled.text`, glyphs
`disabled.icon`), so swapping the two fails by name. #2563 (members an Update ADDS) hits the same host rule and may be
helped by this fix, but its verify gap is separate and it stays open.
