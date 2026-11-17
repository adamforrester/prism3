---
engine: patch
---
Apply Theme now sees every variable in the `core` collection (#1109). Three writers share `core`, each narrowed to its
own group, so a variable outside all three groups reached no orphan report and no rename. A pre-#1097 name with no brand
root (`palette/…`) now belongs to the group the rename rules carry it to, so it is renamed in place or reported with that
group. A variable in a group no writer owns is reported in the Apply Theme summary under its own label. Nothing is
deleted. Plugin only: the agent paste path is unchanged. `composeVariableRenames` joins the `@prism3/engine/figma`
facade, which the plugin reads it from. No committed artifact moves.
