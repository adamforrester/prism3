## (2026-11-18) — One outline border weight for every button set (#576)

**What.** Owner decision (2026-11-18, A): one shared border-weight lever for every outline button set, not one per set.
The border color stays per set, through the existing Source rows. The new `BrandInput` field is `buttonBorderWeight`:
`hairline` (the default, today's 1px) or `thick` (2px). It is a sixth step in `applyButtonLayout`, the materializer
the other button settings share. It rebinds the container's one `border-width` key from `border-width.hairline` to
`border-width.thick` in button, button-neutral and button-destructive. The Studio shows it as a chip row in the
Button block, after the Outline hover line.

**Why a rebinding and not a token.** `dialogTitleSize` and `buttonContentSize` set the pattern: the setting picks an
existing rung, so no token name is added and `CONTRACT_VERSION` does not move (`token-contract.ts --check`:
unchanged). A new `border-width.outline` token would have added a guaranteed name for a value that already exists
twice. The edge is bound on the shared container, so filled and text members carry the 2px rung too and paint no
stroke, exactly as they carry the 1px one today.

**Refused, not ignored.** A button whose edge is bound anywhere but `border-width.hairline` throws, naming the def
and the key, rather than keeping its edge while the setting reads as applied. `brandTheme` refuses an unknown value
by name, as it does for every enum setting.

**What else moved.** The component-defs export carries the setting (`settings.button.borderWeight`), so its format
goes 1.4 → 1.5 with the authored schema. The lever joins both `TREE_BLIND_PAIRS` lists (it emits no token), both
skills' setting tables, and the Studio smoke's chip list.

**Held for the owner (DRAFT).** The key `buttonBorderWeight`; the values `hairline` / `thick`; the label "Outline
button border"; the option labels "Thin (1px)" / "Thick (2px)"; the description; the Studio placement. Also two scope
calls: icon buttons (whose outline members also draw a 1px edge) are left out, like every other button setting; and
whether a heavier option (`border-width.heavy`, 4px) belongs.

**Measured.** A new #576 block in `test.ts`. The scope is exactly the three sets across all 62 defs. One key moves,
to the literal rung. Every projected member binds `border-width/thick` with its paints unchanged (576 members, 144
outline, per set). Thin is the identity. A mis-bound edge throws. The rung is 2px in every committed brand. An
unknown value is refused. Mutations: dropping the rebinding fails 7 arms by name ("#576 scope: … (got none)", then the
rebinding and projection arms per set). Dropping the enum check fails "#576 brandTheme refuses an unknown
buttonBorderWeight by name".
