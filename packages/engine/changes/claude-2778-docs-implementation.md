---
engine: minor
---
Components carry a shipped `docs.implementation` list (#2778, owner decision A on Q362): the rules a developer building the component acts on and a designer placing it does not. 93 lines in 39 definitions move there from `docs.do`, word for word: the DOM and ARIA wiring, state ownership, events, CSS technique, and what each brand setting builds. `docs.do` keeps the usage rules and the ones both readers act on. The list ships in `components.ai.json` and the component-defs export, and opens each page's "Building it in code" section, before the props table. Both shipped schemas gain the optional field: `prism3-component-docs/1.2` and `prism3-component-defs/1.6`. No token names change.
