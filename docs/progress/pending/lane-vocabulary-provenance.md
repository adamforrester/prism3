## (2026-09-30) — Personality trait notes name no source brand, and a gate keeps client names out of the bundles (#1824)

**STATUS: PR open from `lane/vocabulary-provenance`, labeled DO NOT MERGE.** ENGINE bump by change note (`engine: minor`). The nine new note strings are copy the owner reviews: the PR body's "Owner review: note copy" table has each one before and after.

**What was wrong.** Each personality trait's `why` quoted the example briefs by name, and some of those briefs are real brands' briefs. `resolveVocabulary` copies the `why` into `theme.notes`, which the MCP server serves and the emitted tree carries as `decisions`, and the redesign plans to show it as the Decisions log. It also shipped inline in the studio bundle and both plugin bundle files.

**What changed.**
- **The note and the provenance are separate.** Each `why` now says what the trait sets and why, in the UI register, with no brand and no quote. The research quotes moved to a `PROVENANCE` table in `test.ts`, which ships nowhere.
- **#1685's check survives, one notch weaker.** Each quote is still checked verbatim against the committed briefs' prose. What is lost is WHICH brief: the table names none, so a quote passes if it occurs in any brief. Naming the brief would name the client in a public repo. A new arm asserts each note names no brief id (read from the `examples/` listing) and carries no quotation mark.
- **The gate: a CLIENT NAMES arm in `lint-voice.ts`.** It scans a fixed, minimal name list over the three bundle files (studio `main.js`, plugin `main.js` and `ui.html`), raw with comments included, and over every trait note as `brandTheme` renders it. It takes the trait list from the schema enum, not from `TRAITS`. Each bundle must carry the resolver's refusal message, which proves the vocabulary is in what was read. Each enum trait must render exactly one note. Anything else is `blind`. `verify.ts` now runs the gate after `build-plugin` too.
- **Fallout the gate found, fixed in this PR.** Bundled comments in `components/button.ts` (two) and `preview.ts` (one) named a corpus brand, and so did the `brand-roots-1283` rename rule's `why` (a string, in the plugin bundle). All four are reworded without the names. The rule's stamp is untouched.

**The scope boundary, and why it is not the voice rules' scope.** The arm does not read `out/**`, `schema/**`, the README or the skills. The emitted corpus includes example brands that are real client brands, by id, file name and measured fixture, so the arm would fail on the corpus itself. Whether a public repo carries them is the owner's decision, filed as #1853. The gate header's CLIENT NAMES section says so, so the boundary is written down rather than implied.

**Traps for whoever re-verifies.**
- **Comments ship.** `vocabulary.ts`'s `//` comments reach the unminified bundles, so provenance "in a maintainer comment" there would still ship. That is why the quotes went to `test.ts`, and why the arm reads the bundles raw where the voice rules strip comments.
- **The bundle escapes non-ASCII**, so an apostrophe arrives as `’`. The name patterns anchor at the word start for that reason, and a self-check sample pins it.
- **`docs/superpowers/ui-redesign/concept-v4.html`** bundles the engine as it was when it was built, so it still carries the old notes until the redesign lane rebuilds it. It is under `docs/`, outside every bundle this arm reads. Noted in #1853.
