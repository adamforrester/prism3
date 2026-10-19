## (2026-10-19) — Component usage docs, phase 1: one doc section model, Markdown its first reader (#846)

**The decision.** The owner approved the usage docs wireframe on #846 (2026-10-19) and phased it: the
section model and Markdown parity first, the Figma panel second, the docs-site page third. This is the
first phase.

**The model.** `packages/engine/component-doc-sections.ts` is one pure function, `docSections(def, ctx)`,
that returns the ordered sections (Overview, Anatomy, Styles, Usage guidelines, Accessibility, Content
guidelines, Theming, Related components, Building it in code) with the wireframe's field map, and a list of
gaps. A section whose fields are all empty is not returned, so no surface can draw it. Theming has no def
field: it is drawn only when the caller passes the brand's modes, and the Markdown page is
brand-independent (#1701), so it passes none.

**Calls past the wireframe's table**, built as the recommendation and put to the owner on the PR: Props in
Building it in code, Motion inside Accessibility, the remaining composition lists in Related, the purpose
line in Overview, and `composition.planned` off the page (the wireframe already said so). Building it in
code will also read `docs.implementation` once Q362 is decided; until then every def lists it as a gap
and Button's do-items stay where they are.

**Anatomy captions.** The part `note` is the caption, but 64 of 219 notes are written for maintainers
(issue numbers, doc paths, section signs, code spans). Those parts are listed by name without a caption
and their notes go to `docGaps`, until the rewrite the owner split out. The classifier reproduces the
wireframe's per-def counts exactly. Four more notes name a tool (Figma), which consumer prose may not
(#2411); `lint-tool-neutral-prose` caught them on the first full run, and they are held back the same
way, with the reason `names a tool`.

**The page.** `emit-component-docs.ts` renders the model's sections in order and nothing else, so all 43
pages change shape. `components.ai.json` does not move. `schema/component-maintainer.json` gains each
def's `docGaps`. The stale "no reader" comment on `ComponentDef.content` is corrected (#846 finding 1).

**The gate.** `lint-component-docs.ts` keeps arms A to E with its section map moved to the new headings,
and gains arm F. `RULE`, written in the gate, names each section's title, its fields, when it is drawn
and how to empty it. F1 checks every field value reaches its own model section, F2 that the model draws
exactly the sections with data, in order, F3 that each section emptied on every def is not drawn and
comes back as a gap (the corpus alone has almost no empty section), F4 that each committed page's `##`
headings match the rule, and F5 that the record lists what was not drawn.

**Mutations, each failing by name (exit 1):** `ai.avoidWhen` dropped from Overview (`SOURCE DROPPED`) ·
Content drawn with no data (`NO-DATA SECTION DRAWN`, on focus-ring in the corpus and on every def
emptied) · maintainer notes captioned (`MAINTAINER CAPTION`) · a Theming section appended to a page
(`SECTION PARITY`) · Anatomy gaps left out of the record (`GAP NOT RECORDED`) · Usage retitled (`SECTION
TITLE`) · the sections reversed (`SECTION ORDER`).

**Trap for the next phase.** The panel and the site page must call `docSections(def, { modes })` with
the brand's modes, or they will silently have no Theming section. F2 already checks the model with modes;
each surface's own gate should check that it passed them.
