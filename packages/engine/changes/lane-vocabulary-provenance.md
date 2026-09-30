---
engine: minor
---
Personality trait notes name no source brand (#1824). Each trait's `why`, which `resolveVocabulary`
copies into `theme.notes` (served by the MCP server, emitted as the tree's `decisions`, inlined into
every bundle), used to quote the example briefs by name, and some of those briefs are real brands'.
Each note now says what the trait sets and why, in the UI register, and a trait that applied no setting (every one kept) logs what it kept without a `why`. The research provenance moved to
`test.ts`, which ships nowhere and still checks every quote verbatim against the committed briefs
(#1685). Bundled comments and one rename rule's `why` that named a client were reworded the same way.
`lint-voice.ts` gains a CLIENT NAMES arm over both built bundles (raw, comments included) and every
rendered trait note. No committed artifact moves: no corpus brand sets `personality`.
