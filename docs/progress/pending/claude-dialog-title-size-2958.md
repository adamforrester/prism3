## (2026-10-23) — Dialog title size: one brand-wide setting, Large / Medium / Small (#2958)

The owner decided the scope on #2958 (Q588, Q588b A, Q588c): one setting for each brand, applied to every dialog, mapped
onto the label ladder, with Large as the default so no brand moves. A wireframe went up on the issue first. It shows the
Dialog options block and the three sizes on a center dialog and an end sheet, with two example brands' emitted values.

- **The lever.** `dialogTitleSize`, `large | medium | small`, in Form after Tag style. Large is `type.label.lg.emphasis`,
  Medium `type.label.md.emphasis` and Small `type.label.sm.emphasis`. The label, option labels and description are a
  DRAFT (Q1 on #2958).
- **The materializer.** `applyDialogTitleSize` rebinds Dialog's `title-type` before projection. It keeps the role the def
  authored, and it is the identity at Large and for every other def. It sits after Tag style and before weight intent, in
  the plugin's `materializeForBrand`, the lever sweep's restated chain and `specMaterialize`. It throws by name if the
  title key ever holds something other than a `type.label.<rung>.<role>` ref.
- **A value setting (#2959's rule).** It moves one text-style binding: Dialog keeps its 24 members and every axis,
  property and layer name, so a brand switch reaches an existing file through Update. No token is added (every brand
  emits all three label rungs at Emphasis), so CONTRACT holds and `out/**` is byte-identical.
- **Where it lives.** Components › Dialog, a section built like Tag's (#2931, Q579 A): Dialog as a flat row, then a
  "Dialog options" line, then the block with the chips (Q578: component settings live with their components).
- **Code.** Dialog's code notes say the brand emits one title style from this setting, never a prop. The projected
  plans carry the code notes, so Dialog's projected surface moved by that one line, accepted with this PR's change note.
- **Not here.** Accordion uses the same fixed title. Whether it follows this setting or gets its own is Q2 on #2958 (the
  recommendation is its own setting later), so `DIALOG_TITLE_TYPE_KEYS` names Dialog alone.
