---
engine: minor
---
#1812: `schema/lever-manifest.json` stops stating `linkPalette: default 'primary'`. The engine has no
static default for it: an unset `linkPalette` resolves to whatever `actionPalette` resolves to
(`theme.ts`, `input.linkPalette ?? actionPalette`), so on an accent- or neutral-action brand (aurora,
nb-redesign) the manifest named the wrong palette, and any surface or agent rendering "Auto" from it would
too. The lever's description already said "Defaults to following the action palette". New gate: every
lever's manifest default must be a no-op when stated explicitly, measured by running the engine (the DTCG
tree, `test.ts`) and the component materializer (`apps/plugin/test-write-components.ts`) with the lever
unset and set, with a per-(lever, value) sensitivity list for the values only the materializer sees. A shipped manifest change → ENGINE bump. CONTRACT STANDS (no token name moves).
