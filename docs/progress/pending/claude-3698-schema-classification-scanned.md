## (2026-11-16) — lint-schema-classification measures what the prose gates scan; three §5 gates read through (#3698 §5)

**What.** #3698 §5 suspected three gates of taking their universe from `regen.ts`, the subject they check. Each was
read through and its verdict proved with a mutation.

**`lint-schema-classification.ts`: derived, fixed.** Its expectation (the `git ls-files` listing) is independent, but
two of its classes were the classification's own words about the prose gates: class 1 was "covered because both prose
gates map over `SCHEMA_ARTIFACTS`", read off regen's list, and class 2 was "hand-named", read off each gate's source.
Dropping `...SCHEMA_ARTIFACTS.map(...)` from `lint-voice.ts` left this gate and `lint-voice.ts` itself green, with three
generated schema files unscanned; so did commenting out a class 2 line in `lint-us-english.ts`. A new SCANNED arm runs
each prose gate with `--files` (it exits before any scan, about 3 s each) and requires every class 1 and class 2 file in
both lists, and every EXEMPT and class 4 file in neither. Both mutations now fail by name (`NOT SCANNED: …`); with the
arm disabled, the first passes again; walking all of `schema/` in `lint-voice.ts` fails `SCANNED BUT NOT CLASSED SO`
for the four EXEMPT files and the maintainer record.

**`lint-payload-manifest.ts`: sound, documented.** The lists choose which files are looked at; what each one should be
comes from the authored manifest. A new `SCHEMA_ARTIFACTS` entry fails `UNCLASSIFIED`, and one dropped from the list
fails `STALE RULE`. Gap filed as #3818: `REPORT_ARTIFACTS` and `REFERENCE_ARTIFACTS` are outside its universe, so a new
report passes unclassified (owner decision on their class).

**`lint-emission-version.ts`: sound, documented.** Its oracle (an added note, or a forward version) is read from the
diff. A committed artifact change with no note fails by name. Shrinking the universe in the same diff (dropping the file
from `SCHEMA_ARTIFACTS`) passes it, `regen --check` and `drift-coverage` (229 ≥ 226), and fails `lint-payload-manifest`
(STALE RULE) and `lint-schema-classification` (UNCLASSIFIED) by name. Both headers now record the verdict and where the
guard lives.
