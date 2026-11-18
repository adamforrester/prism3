---
engine: patch
---
`lint-doc-gates.ts` fails a gate step in `ci.yml` that cannot fail (#3881): a step with a `run:` that carries
`continue-on-error` (anything but a literal `false`) or a step-level `if:`, and a job holding such steps that carries
`continue-on-error`. Either key left the gate listed, documented and run by `verify.ts` while CI stayed green whatever
it said. Gates only; no committed artifact moves.
