## (2026-11-16) — lint-code-only-classes expects the owner's disposition names, not the emitter's constant (#3698 §5)

**What.** The gate's PAYLOAD arm built the `syncBoundary` it expects from `DISPOSITION_NAMES`, the constant
`project-def.ts` prints from. So a wrong name regenerated `components.ai.json` into agreement, and the arm could only
catch drift, which `regen --check` already does (docs/34 shape 2; #3698 §5 confirmed it). The gate now restates the
owner's four names (Q3441.1 A: CARRIED, LOWERED, REFUSED, UNSUPPORTED) as literals in `DECIDED_NAMES`, the way the two
export schemas already do (#3451). PAYLOAD expects those, and a new NAMES arm holds `DISPOSITION_NAMES` to them key for
key, naming the decision, so a rename has to be made here too, on purpose.

**Measured.** Mutating the emitter's names (`lowered: 'LOWER'` in `code-only-register.ts`) and regenerating: main's gate
printed `✅ codeOnly classes: 553 entries …`. This one fails `NAMES: disposition 'lowered' is "LOWER" …` and 117
`PAYLOAD: <def>.syncBoundary[i] is …/LOWER and the def says …/LOWERED` lines. Each arm fires alone: with NAMES disabled
PAYLOAD still reports all 117, and with PAYLOAD pointed back at the constant NAMES still fires.

**Another gate already caught this rename.** Under the same mutation, `lint-component-docs` fails with `SCHEMA:
/components/<def>/syncBoundary/<i>/disposition: "LOWER" is not one of [...]`, because the export schemas list the names
as literals. So the defect was a gate that could not fail by itself, not a rename that could ship. This change makes
`lint-code-only-classes` sound in its own right, so its PAYLOAD line means what it prints.
