---
engine: minor
---
Dialog title size (#2958, owner Q588, Q588b A): a new optional brand input, `dialogTitleSize: large | medium | small`
(Form, after Tag style, default `large`). One title size for every dialog the brand ships, at every placement: Large
binds `type.label.lg.emphasis`, Medium `type.label.md.emphasis` and Small `type.label.sm.emphasis`. `applyDialogTitleSize`
materializes it into the Dialog def before projection, after Tag style and before weight intent, in the plugin's
`materializeForBrand`, the lever sweep and the spec chain; it is the identity at Large and for every def but Dialog. A
value setting: it moves one text-style binding, so Dialog keeps its 24 members, axes, properties and layer names. No
token is added and no token name moves, so CONTRACT is unchanged and every committed emission is byte-identical. Dialog's
code notes gain the setting's line. The lever copy is a DRAFT for the owner (Q1 on #2958). Accordion is not reached
(Q2 on #2958).
