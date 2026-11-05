---
engine: minor
---
Each component definition's `anatomy.codeOnly` entry is data (#3441, owner decision #3437 Q1 A): a class from the declared register in `code-only-register.ts`, one of four dispositions (CARRIED, LOWERED, REFUSED or UNSUPPORTED, names pending Q3441.1), and its prose kept whole as `description`. `components.ai.json` (format `prism3-component-docs/1.1`) adds `syncBoundary` to every component: each entry's class and disposition, never its prose. The maintainer record carries all three. A new gate, `lint-code-only-classes.ts`, fails an unregistered class, a missing disposition, a register class no entry uses, and an admission not classed `not-projected`. Plans, the Figma emission and the token contract are unchanged.
