---
engine: patch
---
`lint-naming.ts` reads each §6 rule from the build-component skill where it first appears, so it now also asserts that
each rule's anchor sentence, and the §6 and §7 headings, appear exactly once in the whole skill (#2948). A second copy
that a clean merge leaves further down fails by the rule's name instead of drifting unread. A self-check appends a
contradicting copy of each rule to the real skill and asserts the count fails. Gate only: no emitted artifact, token
or projected component surface moves.
