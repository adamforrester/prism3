---
engine: minor
---
Every decisions-log note follows the voice standard's UI register (#1883). `theme.notes` ships in the
MCP `theme_brand` result, each emitted tree's `decisions`, the reports and the studio's Decisions log,
and its notes were engine-voiced: "CONFIRM" directives, all-caps words, issue numbers, a date and
maintainer terms ("hairline sentinel", "LIFT-primary", "DTCG composite spine"). Each note now says
what the engine decided, then why, in plain words. Text only: no decision changes, and no token,
contrast result or contract path moves. The `WCAG 1.4.1` citation the studio's link advisory reads is
kept verbatim. The provenance the notes carried (issue numbers, the date) moved to comments beside
each push. `lint-voice.ts` gains a DECISIONS LOG arm that renders every producer across the corpus, a
sweep of brand inputs and every schema enum value, reads the literals of every push, and fails an issue number, an all-caps word, a date, an internal id or a
maintainer term in any note, and any note no known producer claims.
