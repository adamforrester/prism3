## (2026-11-10) — Renaming a brand color carries its interactive column's anchors and overrides (#3448)

An interactive column with no explicit `name` is named by its palette (`name ?? palette`). So renaming the brand color
renames the column, and every key that names the column has to follow. `cascadeRename`
(`apps/studio/src/state/palette-input.ts`) moved `interactivePalettes[].palette`, and since #3405 each override's
`palette` *value*. It did not move the *keys*: `modeAnchors[mode][<old>]`, and override roles under `interactive.<old>.`
and `inverse.interactive.<old>.`. The engine ignores a key that names no column, so after a rename the column's Dark
anchor and its role overrides went back to Auto without a word. A rename now moves those keys too, in every mode,
custom modes included, when the column has no explicit `name`. A named column's keys name the column, so they stay.
The old name wins: a key already on the new name belongs to no live column (a rename onto a taken name is refused),
so it is a leftover, such as a removed column leaves behind (#3549). It is dropped before the carry, so it cannot
bring back a value the user removed or drop the one they just set. No new copy: nothing is lost, so there is nothing to
say.

### Gate

`test-interactive-input.ts` §11 is the issue's repro. Its oracle is the engine's `resolveAllModes`, not the module:
after the rename, Dark's fill resolves to `accent-y 400`, Light's border override to `accent-y 700`, and promo's
inverse text override to `accent-y 100`. A second column with an explicit `name` keeps its keys and its Dark anchor.
A further arm puts a stale Dark anchor and a stale border override on `accent-z`, then renames `accent-y` onto it: the
column resolves to the live `accent-z 400` and `accent-z 700`.

Mutation: drop the new key-carry block, and `#3448 carry: the column's Dark anchor follows the rename …` fails, along
with the border and inverse arms.

Mutation (review): restore the "keep a key already on the new name" guards, and `#3545 old name wins: a stale Dark
anchor on the new name does not beat the live one …` fails, with its border twin.
