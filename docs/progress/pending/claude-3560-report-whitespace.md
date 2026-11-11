## (2026-11-11) — Report a problem: a brand word next to a newline or a tab is replaced with [brand] (#3560)

Found in the post-merge review of #3525 and #3522 (#3569). `scrub`'s whole-segment match
(`apps/studio/src/state/report.ts`, `SEGMENT`) counted a literal space as a boundary and no other whitespace, and its
`^`/`$` anchors match only at the ends of the whole text. A report line can span lines: the panel passes a run's
`summary` through, and the plugin's file-setup summary holds `\n`. So a palette or mode name, or a 1–2 letter root,
beside a line break or a tab went into the bundle unredacted, and the bundle ends up as a public issue.

`SEGMENT` now takes `\s` in place of the space, so a newline, a carriage return or a tab bounds a name as a space does.
A letter or a digit still never does, so an ordinary word that holds a name stays whole.

Not changed: `=`, `_`, `|`, `<>`, `*`, `+` and `·` are still not boundaries. No line format is confirmed to print a name
that way; #3569 lists it as suspected. The scope question about which names count (#3561) and the redaction copy
(Q-PMR.3) are the owner's and are not touched.

### Test

`test-report.ts` gains the issue's three repros plus a CRLF case (each name replaced, the line break kept), a short
root beside `\n` and `\t`, and a control: `tidewaters`, `overnight-watch` and `shelf` stay whole next to a newline or a
tab.

Mutation: `SEGMENT` back to a literal space → the four `#3560 a palette or mode name bounded by a newline or a tab is
replaced` arms and `#3560 a short root bounded by a newline or a tab is replaced` fail by name; the control stays green.
