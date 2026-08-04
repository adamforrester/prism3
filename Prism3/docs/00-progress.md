# 00 — Progress & Status Log

> A living record of where Prism3 is, what was decided and why, and what comes
> next — so the work survives context loss and a fresh agent (or human) can pick
> it up without re-deriving anything. Update this when state or direction
> changes. Most recent entry first.

---

## (2026-08-03) — Review pass 2: "Weight roles by face" clipped at DEFAULT settings

**STATUS: web only.** From the same review. No emitted artifact moves.

**The measurement that made it a bug rather than a nitpick.** The table ran **899px inside a 798px
container on the DEFAULT two-face brand** — so every brand saw it clipped out of the box, not just
unusual ones — and **1308px at four faces**. The specimens are the entire point of the table, and they
were the part cut off.

**Why it grew without bound.** Each face column was `mtbl-fill mtbl-spec`, so column count scaled with
the face count and every one of them wanted a full sentence at specimen size. `.mtbl-scroll` contained
it, so nothing looked broken — it just quietly hid the content.

**Fixed-width face columns + a shorter specimen.** `Ag 123` replaces `The quick brown fox` — the same
specimen the Primitives typeface library already uses, so the two agree, and a weight difference is
perfectly legible in four glyphs. **798px at two faces (no scroll), 1000px at four** (down from 1308,
and scrolling at four columns is honest).

**The category list in the header moved to its tooltip** — it was the widest thing in the cell and a
THIRD copy of a fact the Semantics Typefaces table (category → face) and the Primitives library
("Binding") already carry.

**Verification.** `regen --check` (88) · 1275/0 · plugin typecheck/test/build · sandbox-clean ·
US-English clean. Measured at two and four faces; `.tpw-samp` and `.tpw-mark` both still have live
users, so no CSS was left inert.

---

## (2026-08-03) — Review pass 1: the defects, and a capability #415 removed without noticing

**STATUS: engine + web.** From a code + UI review of the typography work. No emitted artifact moves —
`regen --check` stays at 88, because no shipping brand hits the case below.

**The one that matters: #415 removed the only way to declare a face as MONOSPACE.** Reported as a
narrow Figma bug (`fontStyleName` keyed on the `code` category, so a mono face elsewhere got
`Semi Bold` — a style JetBrains Mono lacks, which `loadFontAsync` fails on outright). Fixing it
surfaced a bigger root cause: the fallback tail is chosen per CATEGORY, so
`families.body: 'JetBrains Mono'` emitted `['JetBrains Mono', …, 'sans-serif']` — a monospace face
promising a proportional fallback. And because `deriveTypefaces` dedupes by slug walking TYPE_GROUPS
order, `body` won the stack and **`font.typeface.jetbrains-mono` shipped a sans tail for every
consumer including `code` itself**.

Before #415 the brand said "this face is mono" by putting it on `families.mono`. There is no such
channel now — so **the face `code` binds IS the declaration**, and any auto-padded binding on that same
face is re-padded with `MONO_FALLBACK`. One signal, three symptoms: the typeface primitive's tail, the
binding's tail, and (via the tail) the Figma style name. `code: null` declares no mono face and
re-pads nothing, which is correct rather than a gap; a brand that supplied a full array is still
trusted verbatim.

**The lesson worth keeping: I reported the symptom I could see and it was the smaller half.** The
style-name bug was visible from the emitted artifact; the fallback-tail bug needed someone to ask why
the fix could not read the signal it wanted. When a fix cannot find the information it needs, the
missing information is usually the actual defect.

**UI defects, same pass.**
- **Literal backticks shipped in visible copy** (mine, #415): `el()` escapes its text, so
  `` `font.family.<category>` `` rendered with the backticks. Markdown in a plain-text string never
  renders — the page-wide scan found exactly one, now zero.
- **Preview still spoke the retired vocabulary.** Its Faces table was headed `Role` over rows that are
  categories, described as "the family each **role** resolves to". #415 changed the tier and the
  mirror kept the old word. Renamed to `Typefaces` / `Category`, matching the tokens it mirrors.
- **`Role` meant two things on one tab** — categories in that table, weight roles in the next. Exactly
  the collision class #411 had just fixed for the nudge labels, one tab away. Now it appears once.
- **Stale prose only, code correct**: `write-plan.ts` said `font/family/<role>`. Checked rather than
  assumed — it resolves through a `Map` keyed by variable NAME, so it is terminology-agnostic and
  works. Comment-level, fixed as such.

**Verification.** `regen --check` (88, no drift) · **1277/0** (a new regression test pins the mono
face on a non-code category, with the same brand's sans category as a non-vacuous control) · NB
regression PASS · web + plugin typecheck/test/build · sandbox-clean · US-English clean. Page re-scanned
in Chromium: 0 literal backticks, `Role` appears exactly once across the Typography page.

---

## (2026-08-03) — #411: the nudge is a signed delta, with the rung it lands on underneath

**STATUS: web + a one-word engine export.** No emitted artifact moves — `regen --check` stays at 88.

**The collision.** The nudge selects offered `2 tighter · tighter · default · looser · …`, and
`tighter`/`wider` are literally `LETTER_SPACING_KEYS` entries. On Semantics `tighter` names THE
TIGHTEST RUNG; on Text styles the same word meant "shift one rung tighter". Same word, two meanings,
one tab apart.

**Why rung names could not simply replace them.** The control is a SHIFT, and two categories derive
TWO rungs (title: `compact` at 18–24px, `snug` at 28–40px). `cozy` on title would be ambiguous —
`compact→cozy` (+1) or `snug→cozy` (+2)? — and binding the category to one rung would flatten the
size-sensitivity the nudge exists to preserve.

**The shape.** Signed delta in the select, resolved rung(s) on a line beneath, modelled on
`.mtbl-worth` (the "what this resolves to" line #402 established for the per-mode table). The select
now carries no word that is a rung name; the line carries the concreteness rung names would have had,
and is honest for a two-band category in a way no single label can be.

**The line is computed through the ENGINE's own `shiftRung`**, which is why `theme.ts` gained an
`export`. A local copy of that clamp would be a second implementation of the thing the label claims to
describe, and the two would drift — the label would eventually state a rung the build does not
produce. One implementation makes them agree by construction. The export is pure and the artifacts are
byte-identical.

**Range ordering — a call the issue left open, and it disagrees with its own example.** #411's
"Watch for" leans RAMP order (tightest first, matching how both ladders read on Primitives), but its
worked example writes `compact–snug`, which is SIZE order. I took the stated lean, so title reads
`snug–compact`. One `sort` if the example was the intent; flagged on the PR rather than silently
picked.

**Two things verified rather than assumed.**
- **Column parity.** Measured `.cs-table` on `main` and on the branch: **800px both**, page overflow
  false both. Row height grows 54→72 (the new line), and the two nudge columns actually get NARROWER
  (103→94 and 103→98) because the labels are shorter — the rest of the row absorbs it. The issue asked
  for this to be confirmed rather than assumed; it predicted height-not-width and was right.
- **The out-of-range fallback still works.** A hand-authored `leadingShift.body: 4` (legal in the
  engine, outside the derived option set) renders `+4` and resolves to `loose`. The line needs no
  special case for it — it is computed from the shift rather than enumerated, which is the property
  that makes the fallback free.

**Widest option is now `default` at 44px against an 82.4px cell** — 38px of headroom, where the old
labels fitted by 1.1px and would have overflowed on one more rung. In every compact form considered,
the widest option is the word "default" itself; the deltas cost nothing.

**A trap avoided by having hit it before.** The resolved line is written imperatively in the change
handler AND re-derived on the next paint. `apply()` repaints only the volatile region, and a derived
affordance that waits for a full paint lags the value it describes — measured in #415, where the
`.set` class did exactly that. Also: `el()` escapes its text argument, so the sign-convention note
sets `innerHTML` — passing markup to `el` would have printed the tags.

**Verification.** `regen --check` (88) · 1275/0 · NB regression PASS · web + plugin
typecheck/test/build · sandbox-clean · US-English clean. Chromium: every category's resolved line
correct against its derived rungs, `title +1` → `compact–cozy` with `.set`, persisted as
`typography.leadingShift.title`, zero overflow on any worth line.

---

## (2026-08-03) — #423 + #422: derived-mode columns are readings, and the frozen specimen goes

**STATUS: web only.** One file, no emitted artifact moves. Two owner-filed findings in the same
region — the typography per-mode tables — and they overlap inside `renderWeightTable`, which is why
they ship together rather than as two conflicting PRs.

### #423 — a raw engine error was reaching the user

Clicking a stepper in an **HC Light / HC Dark** column printed the engine's internal string verbatim:
`modeLevers: mode 'hc-dark' is generate-only and not customizable`.

**The structural cause is worth stating, because it will recur.** The engine refuses per-mode levers on
derived modes (`CUSTOMIZABLE_MODES = ['light', 'dark', ...customNames]`). The one-mode-at-a-time pages
already gate on it — `DERIVED_MODES.has(currentMode)` swaps in `renderGeneratedNote`. **A table that
shows every mode AS COLUMNS has no such gate**, so each column has to check for itself. Converting any
control to columns re-opens this hole, which is exactly what #416 did on its way in (caught in review,
fixed before merge).

Derived columns are now READINGS, not disabled controls: they show the resolved value — the weight,
the px, the rung — with a title saying the mode is auto-derived. A derived mode holds no levers, so it
always resolves to the baseline, and that is a real fact worth the cell. Empty or greyed cells would
have thrown away information to fix a crash.

Covered: `renderWeightTable`, `renderSizeTable`, both `renderRepointTable` call sites (line height +
letter spacing), and the Typefaces table #416 added. Headers carry the same `auto` marker the mode
chips already use, so a derived column is identifiable before you click it.

**The verification is the part to keep.** A one-cell probe is what let this ship in #416 in the first
place — I drove the Dark column and assumed the rest followed. The check now SWEEPS: for every
`.mtbl-tbl` on the page, find the columns whose header carries `auto` and assert they contain zero
`select`/`input`/`button`. It asks the structural question of every table rather than probing one
cell, and it reports **6 tables, 12 derived columns, 0 interactive controls, 68 readings**. A new
per-mode table is covered by it automatically.

### #422 — the specimen was frozen at the baseline

`renderWeightTable` built its specimen from `w.value`, the STATIC baseline from `ty.weightRoles`,
outside the per-mode loop. It never moved for any edit in any mode. It *did* vary row to row (each
role has a different baseline), which is what made it look like it worked.

**Owner decision: drop the column rather than re-wire it.** Re-wiring only raises "which mode's value
should it show", and the honest answer is that this table's job is *which NUMBER each role resolves to
per mode* — rendering that number is a question `Weight roles by face` below already owns and answers
better, per FACE. "600 in a face that stops at 500" is the fact that matters, and that table was
deliberately made mode-blind (owner, 2026-08-01), so the two do not contradict each other.

**It also fixes the overflow.** The table measured 888px and scrolled at four modes; without the
specimen it measures **798px and does not scroll** — predicted at `112 + 4×148 = 704` plus the fill
column, confirmed by measurement.

**Verification.** `regen --check` (88) · 1275/0 · NB regression PASS · web + plugin
typecheck/test/build · sandbox-clean · US-English clean. Chromium, four-mode brand: the sweep above,
plus the Dark weight stepper still writing `modeLevers.dark.weights.subtle` and no error bar anywhere.

---

## (2026-08-03) — #416: one rule for editing a mode-varying value, and it was already the rule

**STATUS: web only.** One file, no emitted artifact moves. **Owner decision: columns on Typography,
mode bar leaves.**

**The issue asked for a decision between three mechanisms. The useful finding was that the codebase
had already converged on a rule and never written it down.**

- Every COLUMN-PER-MODE table edits a value with **many parallel instances** — 7 leading rungs, 6
  tracking rungs, 5 weight roles, the per-size pins (`renderSizeTable`'s own comment already said
  "rows are sizes, columns are modes").
- Every MODE-BAR control in the app — `renderPerModeSelect`, used by radius, tempo and density — edits
  a **single lever**, and each of those carries `Auto` + a `.set` indicator.

Typefaces bindings was seven categories sitting on the single-lever side. That is why it felt wrong,
and it is the whole explanation for the affordance gap the #419 review found: it was the one
many-instance control on the wrong side of the line, so it alone lacked the `Auto`/`.set` its
neighbours have. **The gap was never a missing feature — it was a misplaced control.**

**Because every mode-varying value on Typography is a many-instance value, the mode bar has no editing
job left there and is gone from the page.** Same conclusion #350/#268 reached for Primitives, from the
other end: those have no per-mode values, this one shows them all at once.

**What changed.**
- `renderTypefaceBindings` → `Category | Light baseline | <mode>… | Specimen`. The Light column stays
  EDITABLE (unlike the leading/tracking re-point table, whose baseline is set in the table above it) —
  this is the only place the family baseline is authored. Other modes get `Auto — <base>` plus the
  library faces, and `.set` when overridden. A single-mode brand keeps a plain `Face` column and is
  visually unchanged, measured at the same 798px.
- **The `Aliases` column went.** It was added in #415 only to stop the third column reading as empty;
  the mode columns now occupy that space and its removal buys back width.
- `renderCategorySetup` stops disabling everything outside Light. Those values are mode-invariant by
  contract (#296) — which the old UI stated correctly but illegibly, as greyed controls with the
  reason in a note above them. **This was also load-bearing for removing the bar**: `currentMode` is
  global, so a user who left another page in Dark would have found this table permanently dead with no
  switcher to escape it.
- `renderTypefaceLibrary`'s `boundFace` reads the BASELINE, not `currentMode`. A primitive is
  mode-invariant; a face bound only in a non-light mode is still reported via `bindingOf`'s
  "Only in <mode>" branch, which reads `familiesByMode` directly.
- `.te-modenote` deleted — its last user was the per-mode note a column table has no need for.

**A correctness detail worth keeping.** An override stored equal to the baseline is INERT (`diffAssign`
drops it, so it produces no token and no mode entry). Rendering it as "set" would style a cell that
changes nothing, so it is normalized to `undefined` and the cell reads Auto — which is what it
actually is. The baseline face is also removed from the non-light option lists entirely: binding it IS
Auto, and offering both would give one outcome two controls, the second of which writes an inert entry.

**The accepted cost, measured.** At four modes the table is **1059px and scrolls horizontally**. The
owner was shown this before deciding. It is not new behavior on the page — Weight roles already
measured 888px and scrolled — and `.mtbl-scroll` handles it. A single-mode brand, the common case, is
unaffected at 798px.

**A regression this PR created and caught before merge — the reason to test the columns you ADD, not
just the one you were thinking about.** Moving Typefaces to a column table made it the fifth instance
of #423: every column iterated `rp.modes` and wired `setModeLever(m, …)` with no check that `m` is
customizable, so picking a face in the HC Light/Dark column threw the engine's internal string at the
user — `mode 'hc-dark' is generate-only and not customizable`. The mode-bar version was never exposed
to this, because the one-mode-at-a-time pages gate on `DERIVED_MODES.has(currentMode)` and swap in
`renderGeneratedNote`; a column table has no such gate and each column must check for itself. My own
verification pass missed it because I exercised the Dark column and assumed the rest followed.

Derived columns are now READ-ONLY, showing the resolved face rather than an empty or disabled control
— a derived mode holds no levers, so it resolves to the canonical baseline, and that is a real fact
worth a cell. The header carries the same `auto` marker the mode chips already use. The shared
`modeIsEditable()` helper lands here with its first user; #423 applies it to the four pre-existing
tables (`renderWeightTable`, `renderSizeTable`, and both `renderRepointTable` call sites).

**Verification.** `regen --check` (88) · 1275/0 · NB regression PASS · web + plugin
typecheck/test/build · sandbox-clean · US-English clean. Driven in Chromium on a four-mode brand: mode
bar absent from both tabs, **zero interactive controls in the two derived columns and no error bar
where the raw engine string used to appear**, `Auto — <base>` on inherited cells, `.set` present on exactly the
overridden one, the sibling category untouched, the write persisted as
`modeLevers.dark.families.title`, **clearing to Auto removes the entry entirely** (`modeLevers` → null,
which is the #419 finding closed), zero disabled controls on Text styles, and a single-mode brand
rendering `Category | Face | Specimen` at 798px with no scroll.

---

## (2026-08-03) — #414: Semantics stops offering Primitives-tier authoring

**STATUS: web only.** One file, no emitted artifact moves.

**Three leftovers from the four-tab split (#388 B1), all on Typography → Semantics → Typefaces.**

**1. `Custom face…` reopened authoring at the semantic tier.** The binding select offered it, revealing
a free-text field for naming a face. That is the exact conflation the tab split removed: Primitives
owns the library (add / remove a face), Semantics owns which face does each job. The select now offers
library faces plus `code`'s `None` opt-out, and adding a face is one action in one place again.

**Deleting the input was safe rather than merely tidy, and the issue flagged this as the thing to
check.** `ty.typefaces` is the DERIVED union of the authored library and every bound face (including
per-mode ones), so a bound face is always already in the option list — the input could only ever be
reached by choosing `Custom face…`. The one case where a bound face might be missing from the list is
two categories naming the same face under different casing, which dedupes to one primitive under the
first spelling; that is covered by the existing `opts.push([shown, shown])` line, not by the input.
**Per-mode overrides do not need it either** — verified in the browser, not reasoned about: switching
to Dark and picking a face from the select alone writes
`modeLevers.dark.families.title`. The staging round-trip works end to end too: a face added on
Primitives (`typefaceLibrary: ['Fraunces']`) appears as a bindable option on Semantics.

**2. The "exact spelling matters" note moved to Primitives.** It is advice about typing a face name,
and after item 1 the add-face field is the only place a name is typed. It now sits directly under that
field.

**3. The per-mode note pointed at an adjacency that no longer existed.** "The library **above**" — the
library moved to Primitives in the split. #419 had already re-pointed it; this fixes the missing word
("every face **that** any mode names") and states the location. Worth keeping in mind that the owner
read this stale note as *the mode bar having regressed*: the bar is hidden exactly where #350/#268 hid
it, and a note claiming a false adjacency is what made a correct rule look broken.

**A stray effect of #415 reverted in passing.** `.mtbl-mode .tf-stat{display:block;margin-top:4px}`
was added in #415 for the Semantics availability line, but the Primitives library's own "On this
device" cell is *also* a `.tf-stat` inside a `.mtbl-mode` td — so that rule had been silently
restyling it. Removing the Semantics stat takes the rule with it, and the library cell measures back
at `display:inline` / `margin-top:0`. Deleted rather than left inert, per the `.errbar-global` lesson
from #388.

**A probe failure worth recording, because it is the same trap twice.** The first verification run
reported the Dark override writing nothing. The app was fine; the probe clicked the mode chip and then
re-navigated to the tab, which resets the mode — so the write landed on the Light path. This is the
"mode-chip clicked before tab switch" mistake from the #390 work, in a new costume. **Switch modes
AFTER arriving at the tab, never before.**

**Verification.** `regen --check` (88) · 1275/0 · NB regression PASS · web + plugin
typecheck/test/build · sandbox-clean · US-English clean. UI checked in Chromium: no `Custom face…` on
any of the seven selects, zero inputs and zero availability spans left in the bindings table, both
tables still on the shared 798px grid, and the per-mode write confirmed against the persisted input.

**Left for #416, deliberately.** Removing the input also removes the last (if unreachable) way to
*clear* a per-mode override, which sharpens the affordance gap the #419 review found: an inherited
value and an explicit override still render identically. That belongs with #416's "one stated rule for
editing a mode-varying value", not here — see the note on #416.

---

## (2026-08-03) — #415: the family ROLE tier is gone; categories bind typefaces directly

**STATUS: engine + schema + web + fixtures.** The tier changes shape, so every artifact moves — but
no composite changes the face it resolves to. Verified explicitly rather than assumed: for nb, aurora
and wendys, each composite's `fontFamily` was walked through the semantic to the typeface primitive
before and after, and all three brands report **0 composites with a changed resolved face** at an
unchanged composite count. What changed is the tier between them.

**What was there.** `font.family.{display,text,mono}` — three abstract ROLES, each aliasing a
typeface primitive, with a brand-level `familyMap` saying which category consumed which role. #269
introduced it and argued the case on brand-invariance: a codebase binds a NAMED tier-2 handle, so
swapping the face behind it leaves every consumer reference intact.

**Why it went.** That argument is sound and it does not pick roles. It holds for any *named* tier-2,
and category names satisfy it exactly as well — `font.family.title` survives a face swap the same way
`font.family.display` did. What role-keying additionally bought was a COUPLING: `display`, `title`,
`label` and `eyebrow` all defaulted to the one `display` role, so any per-mode family change moved
all four together. #390 could not fix that from inside the tier; it added a second, parallel mechanism
(a per-mode `familyMap`) whose entire job was letting two categories that shared a role come apart —
and it paid for it by stamping a `modes.<m>` block onto every composite in the category, which is the
exact shape #377 had just finished removing from leading and tracking.

**The evidence that settled it was Prism2's own file.** `Tokens/Prism2/tokens/raw-figma/` binds
`pds/font/family/{display,title,body,detail}` straight onto `pds/font/family/{inter,roboto,poppins}`.
Category names, one tier, no roles. The display/text/mono triad is a real idea about brand identity —
it just belongs to the brand's font *choices*, not to a layer of tokens.

**What the collapse deletes.** `familyMap` (brand-level and per-mode), `TypeComposite.family`,
`familyByMode`, `familyMapByMode`, `FontFamilyRole`/`FamilyRoleName`, and the whole per-composite
family re-point path in `tree.ts`. A composite's family IS its group, so it aliases
`font.family.<group>` and carries no family field. **`Typography.familiesByMode` is now the complete
per-mode family story** — the test that proves it asserts the ENTIRE composite tree is byte-identical
between a brand with a per-mode face and one without, because inheritance happens at the semantic.

**Two sub-decisions, both owner-confirmed.**
- **`families.code: null` replaces `families.mono: null`.** Same opt-out, one tier down. `code` is the
  ONLY category that may be nulled — every other one is load-bearing, so nulling it would silently
  delete a tier of the type system. Refused in `deriveFamilies`, which is the single choke point both
  the brand build and the per-mode re-derivation pass through, so a mode cannot reach a state a brand
  cannot. A test sweeps all six other categories to prove the carve-out is enforced rather than an
  accident of `code` being last in the list.
- **A bulk-set in the UI.** Seven categories instead of three roles means a single-face brand would
  otherwise state the same name seven times. `code` is deliberately outside the bulk control's reach
  and the label says so: a monospace choice is a different decision, and sweeping a text face across
  it would be silent.

**A new validation the collapse made necessary.** A per-mode `families` entry may only name a category
the brand BINDS. `code: null` is the live case — a dark override for a dropped category derives a
binding the light build has no counterpart for, and the emitter walks the LIGHT bindings, so it would
vanish rather than fail. Throws, on the same reasoning as the #328 per-mode size guard: a per-mode
request that is quietly ignored is only wrong in one mode's output, which is where nobody is looking.

**The UI change, and why the editor moved rather than duplicating.** The Text styles FACE select is
the control that exposed the tier as a mistake — with every role on one face it rendered several
options all labelled "Inter" (the values were roles, the labels were faces), so picking one was
guesswork. That is now a READ-ONLY resolved reading. The one editor lives on Semantics, because
`font.family.*` is a semantic token and that is what the tab split (#388) is for. Two live editors for
one value is the state the mode-bar overlap already put this page in (#416); this does not add a third.
The three-card grid became a table on the tab's shared 112/148/148/390 grid — deleted, not left inert
(the `.errbar-global` lesson from #388).

**Fixture stance, restated.** `fixtures/figma/nb/font.json` gains four `font/family/*` variables and
`text-styles.json` rebinds 32 styles. This is the same call #328 made when the weight list shrank: the
COLOR/palette fixtures are the frozen real Token Press export, the TYPOGRAPHY half is an engine
snapshot and moves with the engine. Here the real-world evidence points the same way, which the weight
case could not claim. `display` and the two faces NB actually binds keep their variable IDs; only the
four genuinely-new variables get fresh ones, past the font/font-fluid high-water mark.

**Traps hit on the way, all previously logged and all fired again.**
- **The #366 backtick trap, three more times.** Backticks in a CSS comment terminate the stylesheet
  template literal, and esbuild reports the failure dozens of lines away from the edit.
- **The intrinsic-width trap (#360/#369/#388).** A `nowrap` token pill contributes its full
  single-line width as min-content, so a 148px column `width` is a hint it blows straight past —
  measured at 829px against the shared 798px grid. An explicit px cap clamps it.
- **A new one worth recording: `[hidden]` loses to an author `display:block`.** The availability line
  was `hidden` on all seven rows and printed on all seven anyway, because a new
  `.mtbl-mode .tf-stat{display:block}` rule outranks the UA sheet's `[hidden]` rule. Only visible in a
  screenshot — the DOM property was correct the whole time.
- **Appending a control only when visible.** The custom-face input was appended `if (!input.hidden)`,
  so "Custom face…" had nothing to reveal. The handler that unhides it runs long after the cell is
  built. Always append, toggle with `hidden`.

**Verification.** `regen` → `regen --check` (88 artifacts, unchanged count) → 1275/0 tests → NB
regression PASS (ΔE00 1.95, 11/11 contrast, 23/23 dimensions) → web + plugin typecheck, test and
build → plugin main.js sandbox-clean → US-English gate 91 files clean. The UI was exercised in a
headless browser, not just typechecked: bulk-set, per-row change, custom-face reveal, `code → None`,
and a Dark per-mode override each verified against the persisted brand input.

**Unblocked by this.** #414 (Semantics cleanup — the `Custom face…` affordance, the spelling note's
home) and #416 (the three competing per-mode typography mechanisms) were both parked behind #415 and
can now proceed. #411 (nudge labels) is independent and still ready.

---

## (2026-08-03) — Motion's Playback select and the bezier row get their section clearance (#401)

**STATUS: web.** Two CSS rules. `out/*` untouched.

**The convention this page broke.** `.psec-d` (the section description) deliberately carries **no
bottom margin** — in a `palSection`, the *next* element owns the gap. `.prow` is the reference
implementation: `padding:20px 0 6px`. Two elements never joined in: `.mo-toolbar` carried
`margin:-4px`, which pulls it up by *more* than `.psec-d`'s entire 4px top margin gives, so the
Playback select sat tighter than a plain zero-margin element would; `.adv-bez` had no top spacing at
all and sat flush.

**Measured, and the first metric was wrong.** Box-top minus description-bottom read `-4 / 0` for the
two offenders — but it also read **0 for `.prow`**, the element they were supposed to match. `.prow`
spends its clearance as *padding*, so its box is flush and its **content** is inset 20px. Comparing
box edges would have "proven" the reference was equally broken and sent the fix at `.psec-d`
instead. Re-measured at content top:

```
            before        after
.mo-toolbar   -4px   →     20px
.adv-bez       0px   →     20px
.prow         20px   →     20px  (reference, untouched)
```

**Fixed at the two offenders, not at `.psec-d`.** Giving the description a bottom margin would have
been one line instead of two, but it changes the gap under *every* `palSection` on every page — a
site-wide reflow to fix two elements, and it would have double-counted everywhere `.prow` already
pays for its own clearance. Clearance stays where the convention puts it: on the element below.

**Paid as `padding-top`, not `margin-top`**, so it matches `.prow` exactly rather than being a second
mechanism that happens to produce the same number — margins collapse and combine with siblings,
padding does not.

Verified in **Light and Dark**: both rows at exactly 20px, matching the reference; no horizontal
scroll, no page errors. Screenshot reviewed.

---

## (2026-08-03) — Surfaces & fills overflowed 900–1104px; the filed root cause was wrong (#395)

**STATUS: web.** One CSS line. `out/*` untouched.

**The report reproduced exactly** — horizontal scroll at 940/959/1000px, clean at ≤900 and ≥1100.
**The diagnosis in the issue did not survive measurement.** #395 attributed it to `.sf-row`'s bare
`1fr` being `minmax(auto,1fr)` and proposed clamping it to `minmax(0,1fr)`, citing `.arow-main` as
the proven precedent. Applied and rebuilt: the track resolved to **`0px`** — the clamp worked
perfectly — and **the overflow did not move by a pixel**.

**Why it could never have been the cause.** The fourth track is not content, it is the *whitespace*
the layout comment describes ("controls LEFT · whitespace · example RIGHT"). Its child is an empty
spacer div, so its min-content is already 0 and `1fr`/`minmax(0,1fr)` are identical there. The
proposed fix was a no-op by construction.

**The real constraint is the tracks that cannot move.** Four of the five are fixed —
`56+168+172+228` — and four gaps add 80, so the row needs **704px and cannot shrink an inch below
it**. Measured, the row box runs `viewport − 400`:

```
viewport   940   1000   1050   1100   1120
row box    540    600    650    700    720   ← needs 704
```

So 704px is not available until **~1104px**, while the collapse breakpoint sat at **900px**. Every
width in that 200px band rendered a layout that could not fit; `.sf-ex` (the last fixed track) is
simply what got pushed past the panel edge first.

**Fix: raise the breakpoint to 1120px, and revert the ineffective clamp.** The page already owns a
designed narrow layout — the two-column collapse — it was just being handed 200px of widths it was
never given. 1120 rather than 1104 so the spacer has a little width at the boundary instead of
exactly zero (measured: 17px at 1121, 96px at 1440).

**Reverting the `minmax` was deliberate.** Keeping a no-op change with a comment claiming it prevents
blowout would leave a false explanation in the file, and the next person would trust it. The spacer
has no content; it was never the cause and cannot become one without someone putting content there.

**Verified across 12 widths** (720→1440, including 1119/1121 either side of the new boundary) in
**both Light and Dark**: zero horizontal scroll, zero child overhang, no page errors. Below the
breakpoint the existing collapse is unchanged.

**Method note worth keeping:** the before-measurement is what caught this. Applying a plausible fix
and seeing the symptom persist is only possible if the symptom was quantified first — had I measured
only after, `minmax(0,1fr)` would have shipped as the fix with the bug still in it, since the visual
difference between "clamped and still broken" and "unclamped and broken" is nil.

**Trap for the next CSS edit here:** the stylesheet is a TS template literal, so a backtick inside a
CSS comment terminates the string. Cost one confusing `TS1351` before I spotted it.

---

## (2026-08-03) — A target-size floor, and the mode-editing pattern split logged

**STATUS: engine (test-only) + docs.** No emitted artifact moves — `MIN_TARGET_PX` is a constant and
a gate, not a value in the tree.

**The engine gated contrast everywhere and target size nowhere.** WCAG 2.2 SC 2.5.8 Target Size
(Minimum), AA, asks 24×24 CSS px; nothing in 1277 tests checked a control height against it. This
was reachable until an hour ago: at the old `spaceBase 4`, `compact` put xs/sm/md at 16/16/20px and
shipped clean.

**Height, not area.** A control's width grows with its label, so height is the dimension that can
actually be too small — gating it is the conservative, checkable half.

**24, not 44.** SC 2.5.5 (AAA) asks 44 and mainstream systems ship 32–40px controls; a 44px gate
would fail every real design system including this one. 24 is the line below which a control is a
*conformance failure* rather than a tight-but-defensible choice.

**The reachable set is now finite, so the gate is exhaustive rather than a sample.** With the rhythm
fixed and density an enum of three, `3 × 5 = 15` heights is the entire space a brand can produce, and
the gate enumerates all of it. Worth stating because it will stop being true the moment someone
re-introduces a dimension lever — that is when this needs revisiting, not before.

**A second assertion pins the floor as LOAD-BEARING.** `compact` xs is exactly 24px, so the gate is
one rung from firing. Asserting only "≥ 24" would pass just as happily if the ladder drifted upward
and the threshold were quietly wrong; asserting the minimum *equals* the floor keeps the check honest
about what it is measuring.

**Verified by injecting the regression it exists for** rather than by observing it pass: adding one
rung below the ladder floor and widening the density window fires both assertions with
`UNDER: compact/xs: 16px`. Reverted, 1279/0. A gate never seen red is a gate never seen work — and
this one guards a floor currently held by arithmetic, not by construction.

**Also logged: discussion-backlog item 7 — mode editing has two patterns.** Typography introduced
side-by-side mode columns; every other page uses the global mode switcher. The owner returned to
Size & radius, expected the typography pattern, and concluded per-mode radius/density/shadow were
unbuilt — all three have existed since Phase D (#184/#188/#329), and `modeLevers` carries ten
per-mode fields. **The capability is complete; the affordance is invisible from Light.** The split
itself is defensible (read surfaces went multi-mode, write surfaces stayed single-mode — different
jobs), but nothing signposts it. The datum worth keeping is *who* it fooled: if the person building
it mis-reads the capability after a few weeks on an adjacent surface, documenting the convention
will not save a new user. Resolution deferred to the mode-switcher-on-page work, which it composes
with.

Gates: `test.ts` **1277 → 1279**, `regen --check` 88 byte-match, NB regression exit 0, US-English
clean, web typecheck + build clean.

---

## (2026-08-03) — "+ Add face" becomes a submit CTA (#405)

**STATUS: web.** `out/*` unchanged. Owner-raised; closes #405.

The add-face button wore `.adv-add` — the **dashed reveal** affordance. That class means one of two
things elsewhere in the app: on Palettes, *"tap this and the fields appear"*; in the breakpoint editor,
*"append an empty row"*. Here the field is **already exposed**, so the dashed form promised "this will
show you something" while meaning "commit what I typed". Two different actions wearing one look.

Owner settled the shape: keep the field exposed — *"99% of the time someone is going to need to enter
a custom font family for their brand"* — which makes the reveal treatment actively wrong rather than
merely redundant.

**I filed the issue claiming Enter-to-submit was missing. It wasn't.** Probing the running app before
changing anything: Enter submits, click submits, the empty-name error fires, and a duplicate is
rejected with the engine's own vocabulary (*"Fraunces is already in the library"* vs *"a role binds it,
so it is in the library list already"*). All four already worked. **The only real defect was the
visual treatment**, so that is all that changed — 13 lines. Reading the handler would have told me the
same thing, and I wrote the issue without doing either.

- **`.adv-add` was left alone**, not restyled. Its breakpoint use is a genuine add-a-row, where the
  dashed slot look is right. The add-face button gets its own `.tf-addbtn`, modelled on `.bm-load` —
  the app's existing inline solid CTA — rather than a new invented treatment.
- **The `+` went with it.** A leading plus belongs to the same add-a-row vocabulary as the dashed
  border; a submit CTA reads better as just "Add face".
- **`flex:none`** so the button's intrinsic width stays out of the row's sizing — the trap #369 and
  #388 both hit. Re-measured: input 260px, button 98px, row 800px, zero page overflow.
- White on `--ink` is **17.72:1**.

---

## (2026-08-03) — The size ladder reads equally: no dimming, no legend, on the shared grid (#404)

**STATUS: web.** `out/*` unchanged. Owner-raised; closes #404.

Primitives carried two ladder tables that taught **opposite** lessons about the same idea. The
leading/tracking ladders (#388 part B1) deliberately do not dim unbound steps — the code says why:

> an unbound step is the **common** case here (15 steps, ~6 rungs), so dimming most of the table would
> read as an error state.

The size ladder, directly above them, did the opposite: `.sl-row.unused` at `opacity:.42` plus a
three-key legend. Owner's framing is the right one — *"the user cannot change the ladder, but these
are all the available font sizes and should read equally."* On a **read-only primitive** table a faded
row implies unavailable or wrong, and neither is true: 22 steps exist, and which are bound changes the
moment Shape or Range moves.

**This was a gap I left, not a pre-existing one.** B1 established the non-dimming convention on the
tables it added and never carried it back to the one sitting above them.

- **The legend went with the dimming.** Two of its three keys described which rungs travel with the
  levers — a **Text styles** concern, not a property of the raw material — and the third existed only
  to explain the fade. The blue `head` dot went too: it was the levered-rung marker those keys
  explained, and an unexplained color-coded dot is worse than no dot.
- **Converted to the shared table** (`112/148/148/390`), which it was the last bespoke row layout on
  the tab to resist. "Bound by" now carries what the dimming encoded, in the same vocabulary and the
  same faint tier as its sibling — `not bound` / `fluid floor only` as ordinary text.
- **All the orphaned CSS was deleted**, not left behind: the row grid, the dot, the legend, the
  opacity rule, the px/rem/who spans. #388's inert `.errbar-global` is the lesson — a rule that no
  longer applies is worse than no rule, because the next reader trusts it.

**Two things the measurements alone would have missed.**

The scroll-to-first-bound behavior keyed off `.unused` (`querySelector('.sl-row:not(.unused)')`), so
removing the class would have silently killed it — the ladder would open at 160px, which most brands
never reach. It now captures the first bound row during the build loop instead. Flagged on the issue
before the work started, which is why it survived.

And the **sticky header**, which only the screenshot caught: this is the one tier table that scrolls
vertically, and 22 rows of full-size specimens scroll the column labels away within a single row. The
siblings never needed it. The corner cell needs a higher `z-index` than the rest because `.mtbl-stick`
is already sticky on the left axis and slides under its own row headers at the intersection.
**Behavioral checks were green before this fix and after it** — the same blind spot as #374.

---

## (2026-08-03) — The schema validator learns schema-valued `additionalProperties` (#391)

**STATUS: engine.** `out/*` unchanged — this enforces a contract, it does not change generation.
Closes #391.

`validate()` implemented `additionalProperties` in **one** of its two forms:

```
false      → the unknown-key guard          IMPLEMENTED
{ schema } → applied to every value          NOT implemented — silently dropped
             `properties` does not cover
```

The second form is how you type a **map with open keys**, and `modeLevers` (`{ [modeName]: {levers} }`)
is exactly that shape — so the validator walked into its entire subtree and dropped it on the floor.
**Seven nodes** across the contract, including every per-mode lever. Measured before the fix:

```
density bad enum              accepted
typeSizes body (not heading)  accepted
typeSizes below group floor   accepted
unknown lever key             accepted
```

- **The engine was never at risk.** `brandTheme()` deep-validates all of this at resolve time and
  throws with good messages — which is exactly what the schema descriptions themselves promise. What
  was inert is the **published contract**, which is what `design.md` authors and the plugin/web hosts
  read *before* they ever reach `brandTheme()`. A malformed brand got "valid" from the validator and
  then threw later, further from the mistake. The #281 shape one level up: a gate reporting clean
  because it never looked.
- **The fix is four lines**; finding it was the work. It surfaced only because #390 added a field to
  `modeLevers` and I probed the validator by **running** it instead of reading the schema — the same
  step that caught #367's inert `minLength`. Two passes had previously added fields to this exact
  subtree and concluded from inspection that they were covered.
- **`true` and absent stay permissive.** Only the object form carries a sub-schema, so the change
  cannot start rejecting input that was legal by omission.

**No fixture was out of contract.** The issue warned that switching this on might surface existing
invalid fixtures — it didn't. `regen` (which runs `validateOrExit` on every example through its real
CLI path) exits 0, and `--check` shows zero drift.

**A harness error worth recording**, because it briefly looked like a real failure: my first sweep fed
`parseDesignMd(...).input` straight to `validateBrandInput` for all three examples and Wendy's came
back *"missing required id/primary/neutral"*. Wendy's is the **plain-spec** path — `parseDesignMd`
returns `{version, name, colors, …}`, not a `BrandInput`, and `cli.ts` compiles it before validating.
The authoritative check was never my hand-rolled loop; it is `regen`, which already exercises every
example through its real path. **When a bespoke probe disagrees with the shipped pipeline, suspect the
probe.**

**14 assertions, all of which RUN the validator** rather than reading the schema — one per affected
node kind (enum, nested unknown key, nested numeric bound, top-level unknown key, both halves of
#390's field, radius range, and the pre-#296 number-instead-of-rung shape), plus five legal inputs
that must still be accepted, plus one asserting the error names the **full path** (a sub-schema
applied at the wrong depth would still reject, but point at `modeLevers` and leave the author hunting).
**Tamper-tested**: reverting the one-line lookup turns exactly those 9 red and leaves the 5 accepts
green.

---

## (2026-08-03) — The spacing rhythm and fine grid base stop being brand levers (owner decision)

**STATUS: engine + web.** `out/*` unchanged — no committed brand ever set either, which is itself
part of the argument. Removes `spaceBase` and `baseUnit` from the BrandInput contract, the lever
manifest, and the UI; both are now fixed constants in `scale.ts`.

**`spaceBase` → locked at 8, on measured grounds rather than taste.** Generating the two scales and
diffing the reachable px settled it: switching to base 4 does **not unlock spacing values, it renames
them and truncates the scale.**

```
base 8  0 2 4 6 8 12 16 20 24 32 40 48 56 64 72 80 88 96
base 4  0 1 2 3 4  6  8 10 12 16 20 24 28 32 36 40 44 48
        gains 1/3/10/28/36/44 (1 and 3 are hairlines, not spacing)
        loses 56/64/72/80/88/96 — the entire layout end
```

And `12px` stops being `space.150` and becomes `space.300`. The numbered-multiplier taxonomy's whole
claim (KB 02/22/24) is that the number means "n× base" **invariantly across brands** — which is only
true if the base is invariant. A per-brand base makes the one thing the scale was chosen to buy
untrue. 4px spacing is still offered as `space.050`; it just is not the multiplier.

**`baseUnit` → locked at 4, because it moved no design value.** Generating one brand at 4 vs 8:

| axis | @4 | @8 | differing leaves |
|---|---|---|---|
| `dimension` | 36 | 23 | **13** |
| `radius` / `border` / `space` / `size` | — | — | **0** |

Every consuming axis feeds its own px into the grid as `extras`, so the rungs it needs exist
regardless of the setting. It was a control that looked consequential and changed nothing but the
size of a vocabulary nothing was required to use.

**The trigger was a real defect, and it is fixed separately.** The owner found these levers by
setting `spaceBase 4` + `spacious` and getting components far too small with `lg` and `xl` both at
32px. The duplicate was the density clamp bug (its own entry), not the rhythm. Worth separating: the
rhythm produced *small* components, which is what a 4px rhythm means; only the *collision* was wrong.

**Removal is loud, not silent.** The schema is `additionalProperties: false`, so a `design.md` that
still sets either now fails validation with `spaceBase: unknown property (not in contract)` and exits
1 — verified. Preferred over accepting-and-ignoring, which would leave an author believing a setting
applied. Nothing to migrate: no committed brand set either, and neither is part of the `x-prism3`
surface, so `brand-skills` needs no matching change (checked, not assumed).

**Two tests were retargeted, not deleted.** Both configured the removed fields through `brandTheme`,
so after the change they silently became duplicate default-brand runs — passing while asserting
nothing. They now call the pure scale functions directly, which keeps the #274 `extras` mechanism
under test at bases a *brand* can no longer request while being honest that it is no longer brand
config. Deleting them would have left that mechanism live and unguarded. Engine **1269 → 1261**
(the `baseUnit-6` fixture and the four-base loop collapse into targeted assertions).

**Web:** the Spacing grid section keeps its specimen and loses its controls, with a note saying why.
An empty control column reads as a rendering bug; a vanished section loses a scale worth reading.

Gates: `regen --check` 88 byte-match, NB regression exit 0, US-English clean, web typecheck + build
clean, and a stale brand input rejected with exit 1.

---

## (2026-08-03) — Density collapsed a size step, in shipped output (owner-reported)

**STATUS: engine.** Owner set `spaceBase 4` + `spacious` and saw component sizes that were far too
small, with `lg` and `xl` both at 32px. The small sizes were the rhythm doing what it says; **the
duplicate was a real defect, and it was never about `spaceBase`.**

**`componentSizes` shifted an index into a five-rung ladder and CLAMPED at the ends.** So the end
step resolved to its neighbour's metrics: `compact` collapsed xs+sm, `spacious` collapsed lg+xl.
Five names, four values, at **every** rhythm including the default 8:

```
base 8  compact      xs:32  sm:32 ←   md:40  lg:48  xl:56
        comfortable  xs:32  sm:40  md:48  lg:56  xl:64
        spacious     xs:40  sm:48  md:56  lg:64  xl:64 ←
```

**This was committed, not hypothetical.** `examples/aurora.design.md` is `density: compact`, so
`out/aurora.tokens.json` shipped `size.xs.height` and `size.sm.height` both aliasing
`{prism.dimension.32}`. It had been that way since compact existed.

**Why 1269 tests missed it.** The tier gates its PADDING contract hard — `gap < padXVisual < padX`
asserted across every density × spaceBase × size, deliberately as an ordering rather than literals —
and **never once asserted a height**. The one property that makes a size ladder a ladder was the
one property with no test. Worth keeping in mind as a shape: the thoroughly-gated axis is where an
untested neighbour hides best.

**Fixed by reframing, not by special-casing the ends.** The ladder is now **seven rungs of which a
density NAMES five** — `comfortable` takes the middle five, `compact` slides the window down one,
`spacious` up one. No clamp, so no collision is reachable; the two outer rungs exist purely so the
window has somewhere to go. Rejected the alternative of clamping-with-a-nudge (detect the collision
and adjust): it treats the symptom, and leaves the next person to rediscover why an end step is
special. A window has no ends to special-case.

**Blast radius is exactly one brand.** `comfortable` is rungs 1–5 — the historical ladder,
byte-identical — so nb / harbor / wendys do not move and the NB regression target is untouched.
Aurora moves by the fix: `size.xs.height` 32→24px, `size.xs.padding-y` 4→2px. `spacious` xl now
reaches its own rung (72px, padX 32) instead of borrowing lg's, which is why the `#326` padding
expectation for spacious changed `…,24` → `…,32` — the old value recorded the clamp.

**Two gates added**, both of which fail on the old code: heights strictly increasing across xs…xl at
every density × spaceBase, and `comfortable @ base 8` pinned at `32/40/48/56/64` so the reframing is
provably a fix to the ENDS and not a quiet re-baseline of the middle.

**Verified in the browser** on all three densities: 5/5 distinct and increasing in each, no page
errors. Gates: `test.ts` **1269 → 1271**, `regen --check` 88 byte-match, NB regression exit 0,
US-English clean, web typecheck + build clean.

**Follow-ups from the same conversation** (separate PRs): no target-size floor exists anywhere in the
engine — at `spaceBase 4` controls fall under WCAG 2.2 SC 2.5.8's 24px minimum with nothing to catch
it; and the owner has decided to **lock `spaceBase` at 8** and **remove `baseUnit`** (a diff at
baseUnit 4 vs 8 showed it changes only the primitive `dimension` ladder — 36 leaves vs 23 — while
radius / border / space / size are byte-identical, i.e. it moves no semantic value).

---

## (2026-08-03) — The per-mode table says what a rung is WORTH, and the rung table stops going stale (#388 part B, final)

**STATUS: web.** The last two part-B items. `out/*` unchanged.

**1. Values, not just rung names.** The complaint that opened #377 was that a per-mode cell reading
*"rung `tight` → rung `snug`"* re-points a rung into its own axis and never says what it MEANS. Each
mode cell now carries a second line with the value that rung is worth in that mode — *"in Dark,
`tight` = 1.15×"*, which is the reading #377 asked for and #385's tier made expressible.

It is a second **LINE**, not richer option text, and that is forced rather than chosen: a previous pass
put `relaxed · 1.65×` in the options, and since a closed select renders exactly what it lists, the
shared column width ellipsised it to `relaxed · 1...` — truncating the one thing the cell must always
say. **Height is the affordable axis here; width is not.** Re-measured: `112/148/148/390` across all
five tables, zero page overflow.

Shown on every row including `Auto`, not only on overrides. It costs a faint line and buys a column
that reads top-to-bottom as that mode's actual leading ramp, with no cross-referencing to the baseline
column; the `.set` tier distinguishes inherited from overridden at a glance.

**2. The rung table was stale after every edit — in two places, and the invisible one was worse.**
Measured first: change `tight` from 1.05 to 1.00 and the select reads 1.00 while its specimen still
renders at 1.05. That is the defect #369 noted and #388 carried forward.

But the specimen is only the half you can see. `lo`/`hi` for each select's **disabled** options come
from `steps[idx ± 1]`, so moving one rung re-derives what its NEIGHBOURS may legally select — and
`apply()` repaints neither. Left stale, a now-illegal option stays clickable and the engine throws on
it: a select whose entire purpose (#388 part A) is making off-ladder values *unreachable* instead of
merely rejected.

So the fix is `applyFull()`, not the surgical specimen repaint the issue proposed. **A control/paint
split would have fixed the visible half and left the live one** — which is the trap worth recording,
because the issue text pointed straight at it. Verified both: specimen tracks (`1.05 → 1.00`), and
`snug`'s enabled set grows from `1.05…1.25` to `1.00…1.25` the moment `tight` moves.

**#366's backtick trap fired a third time** this session, writing the comment for the new CSS rule.
Same signature every time: `tsc` reports `TS1005: ',' expected` pointing at a line far from the edit.
The rule now carries the same inline warning its neighbours do.

---

## (2026-08-03) — The Preview token list shows per-mode COMPOSITE re-points (#397 review finding)

**STATUS: web.** Found in review of #398, fixed here. Two readers of a node's value consulted the base
`$value` and never `$extensions.prism3.modes[m]`, so a composite with a per-mode re-point rendered
**four identical mode columns** on the one page whose entire purpose is showing per-mode divergence.

```
aliasAt      modes[m] ✓        hopAt        modes[m] ✓        shadow branch  modes[m] ✓
compositeParts  ✗ base only    typeComposite  ✗ base only
```

**It was latent until the same day it wasn't.** The gap was flagged during #397's review as
hand-edit-only — no UI control could create a per-mode composite re-point. **#398 shipped exactly that
control**, so the defect became reachable through the shipped app within hours of being called
theoretical. Worth recording as a pattern: "unreachable today" is a statement about the current UI, and
it expires the moment someone builds the missing control.

**Fixed at the root, not per call site.** The two-line "which `$value` applies in this mode" expression
was already open-coded in three places and missing from two. It is now one `valueAt(node, m)` accessor
that all five use — so a sixth reader cannot forget, which is the actual failure mode here. Threading
`m` into `compositeParts` also fixed the short-path scan, which was enumerating alias paths per mode
for `aliasAt` but only once for composites.

`typeComposite` takes an optional explicit `value`: a composite's mode override is a full `$value`
snapshot (`{ ...value, ...parts }`, #385/#390), so it carries all five aliases and reads identically —
no special-casing needed at the call site.

**Verified with a negative control**, because "it renders differently now" is not proof the probe
works. On a brand carrying BOTH a per-mode family (#390) and a per-mode size (#328) on
`title.2xl.strong`, the probe counts distinct rendered mode cells:

```
before the fix   1 distinct cell   font.family.display · font.size.40 · Clash Display · 40px  (all modes)
after the fix    2 distinct cells  light  → font.family.display · font.size.40 · Clash Display · 40px
                                   dark   → font.family.text    · font.size.36 · Inter · 36px
```

Both the alias cell (#397's code) and the resolved-value cell (#393's) diverge, on both mechanisms.

---

## (2026-08-03) — Caption gets its own leading band: a 7th rung, `cozy` at 1.40 (#388)

**STATUS: engine.** `out/*` **regenerated** — this changes emitted output for every brand. Owner-approved.

Caption shared the `normal` rung (1.50) with body and code, so the **smallest running text the system
emits carried long-form body leading**. Captions are where leading does the most legibility work, and
they are short runs, not paragraphs.

**"Caption at 1.4" turned out not to be a one-line change, and that is the finding.** `lineHeightFor`
returns a rung NAME, and no rung was worth 1.40:

```
tight 1.05 · snug 1.15 · compact 1.25 · normal 1.50 · relaxed 1.65 · loose 1.75
```

1.40 existed on the *ladder* (it is the first body step) but nothing bound it, so honoring the value
required a **7th rung** — a public contract change, not a default tweak. Surfaced to the owner rather
than either silently growing `LineHeightKey` or quietly rounding caption to `compact` (1.25). Approved
as `cozy`, inserted between `compact` and `normal`.

- **1.40 is the tightest value that is still a READING leading.** It is the bottom of the KB's body
  range (1.4–1.6), so caption lands tighter than body without dropping into heading leading. Picking
  1.30 would have crossed the deliberate 1.30→1.40 ladder gap that separates the two.
- **Deliberate divergence from NB, recorded not hidden.** NB ships all 8 caption styles at 1.5. The
  engine now emits 1.4 on purpose — "better than the examples" is the standard — so the Figma capture
  carries a **`revisions` entry** marking the change **PREDICTED, not re-captured**, exactly as #377's
  display-banding entry does. The fixture is a real `getLocalTextStylesAsync()` capture; the discipline
  is that every deviation from it is explicit.

**Three tests went red for the right reason, and I fixed the tests rather than renumbering them.** Each
asserted an INDEX or a COUNT where the claim was really about a name or a relationship:

```
lineHeights.length === 6                        → === LINE_HEIGHT_KEYS.length
LINE_HEIGHT_KEYS.length - 1 - idx === 5         → === LINE_HEIGHT_KEYS.length - 1
idxOf('body') === 3                             → LINE_HEIGHT_KEYS[idxOf('body')] === 'normal'
```

"body derives `normal`" was always the claim; `3` was incidental and broke the moment a rung was
inserted above it. Renumbering would have left the same landmine for the next insert.

Six new assertions pin the band itself: caption derives `cozy`; caption is **tighter than body** *and*
**looser than title** (the band is only meaningful bracketed on both sides); `cozy` resolves to 1.40;
the default ramp is still **strictly increasing** with the insert — worth pinning because the ordering
guard runs on *authored* brands, so a badly placed default would ship a permanently inverted ramp no
brand input could fix; and `cozy` binds a real ladder step rather than an invented value.

Aliases went 911 → 912 in the Wendy's fidelity report (the new role), all resolving, 432/432 contrast
contracts still hold.

---

## (2026-08-03) — The per-mode family control goes live (#388 part B2, #390)

**STATUS: web.** `out/*` unchanged — this exposes the #390 engine field, it does not change generation.

The Family select in the category table carried `fsel.disabled = perMode`. That was never a UI
decision: **there was no per-mode field to write into.** `familyMap` was brand-wide, and
`modeLevers.<mode>.families.<role>` swaps the FACE a role binds — so a mode could only move every
category on that role at once. #390 added the missing field; this makes the control live in every mode.

- **I had this on the wrong tab.** The #388 comment said the *Semantics* tab would need #390's field.
  Wrong: `familyMap` is category → role, and categories are composites, so it belongs on **Text
  styles** — where the control already existed, greyed out. The work turned out to be enabling an
  existing select rather than building a new section.
- **Outside Light the baseline option is "Auto", not a role name.** A mode naming its own baseline role
  would store an inert self-map, which the engine drops (#390's suppression contract) — so a role-named
  baseline would look like an override that vanishes on reload. "Auto" is the honest label, and it
  keeps *clearing* an override reachable.
- **`applyFull` on the per-mode branch only.** `.set` is DERIVED state (does this mode carry an
  override?) and `apply()` repaints only the volatile region, so the class lagged a repaint behind the
  value. Caught by measuring: the write and the persisted state were already correct while the
  affordance still read unset. The Light branch keeps `apply()` — the only thing it changes on screen
  is the select's own value, which the DOM already holds.

**A verification trap worth recording.** My first probe clicked the mode chip *before* switching to the
Text styles tab, and read a Light-mode row while believing it was Dark — the values looked plausible
(`display`, unset) so nothing announced the mistake. The mode strip is hidden on Primitives by design
(#388 part B1), so there was no chip to click. **Ordering matters in these probes: reach the tab that
has the mode axis first.** Same family of error as #365's wrong-control read.

Verified end to end on a seeded two-mode brand: the select is enabled in Dark with an Auto option;
picking `text` writes `modeLevers.dark.familyMap.title` and marks `.set` immediately; the sibling
`display` stays on Auto; Light's baseline is untouched; and choosing Auto prunes `modeLevers` back to
absent. 0 page errors.

---

## (2026-08-03) — type.* composites get a stacked, labeled alias cell (closes #393's open gap)

**STATUS: web.** The gap #393 shipped with, closed. A typography composite has **no single alias** —
its `$value` is five aliases at once (family, size, weight, leading, tracking) — so `Show → Alias
only` fell back to rendering the resolved value and the control looked broken on those 38 rows.

**Owner picked the stacked form from four mocked options, and the width is why.** Joined inline the
five paths run **~123 characters** — about 775px at 11.5px mono, i.e. the entire 850px content
column before the Token column is drawn, so all 38 rows would scroll sideways. Stacking spends
height instead, and spends it in exactly one section: `type.*` is the only shape in the system with
more than one alias, so the cost cannot spread.

**Options considered and rejected**, recorded so they are not re-derived: inline full paths (~123
chars, scrolls every row); inline short paths (~98, still scrolls); leaf names only (~35, the only
one that comfortably fits, but it stops being a path — you would go to Foundations to act on it, and
it cannot be copied).

**The short-path machinery from #393 applied unchanged, which is the useful part.** All five parts
resolve under `font.*` — a single namespace — so the per-table callout rule already shipped is
truthful here without special-casing. One real fix was needed: the section's namespace set was built
from `aliasAt` alone, which returns nothing for a composite, so `type.*` reported **no** namespaces
and never earned its callout. Composite part paths now feed that set.

**Reused `.pfk` for the part labels rather than adding a near-duplicate class** — doc 26's "reuse
the component kit, don't hand-roll a one-off variant". It is nominally the *control* micro-label, and
these are data labels; the stretch is deliberate and noted here rather than silently forked.

**Verified in Chromium, including the regression.** `Show=both` and `Show=alias` both render 38
stacks; `Show=value` renders 0 and falls back to the resolved composite; labels read Family / Size /
Weight / Leading / Tracking; Short yields `family.display` plus "All aliases in this table resolve
under font.* — prefix hidden." **And the single-alias tables are untouched** — `color` still renders
`neutral.050` with zero stacks, which is the check that matters, since the new branch sits in the
shared cell renderer. No console or page errors.

**Note for whoever reads the old issue:** #384/#385 renamed these parts, so the real paths are
`font.line-height-role.snug` / `font.letter-spacing-role.tight`, not the `leading.*` / `tracking.*`
#377 proposed. They are noticeably longer, and are part of why the inline forms did not fit.

**Gates:** web typecheck + build clean, `regen --check` 88/88, `test.ts` 1262/0, nb-regression exit 0,
US-English clean over 91 files.

---

## (2026-08-03) — Typography splits into four tabs, one tier each (#388 part B1)

**STATUS: web** (+ two engine doc corrections). `out/*` unchanged.

The Foundations/Styles split (#272) was drawn one line short. Typography has **three** tiers where every
other axis has two, so a two-way split had to put a line through the middle of something:

```
Foundations   size ladder (primitive)   +   leading/tracking rungs (semantic)
Styles        weight roles (semantic)   +   categories (composite)
```

Both tabs straddled the line they were named for, which is what made the rung tables read as
"conflicting with the Styles tab" — the complaint that opened #377. Now: **Primitives · Semantics ·
Text styles · Preview**, one tier each.

**The argument that settled it was not tidiness.** Separating the tiers makes Semantics *uniform* — four
sections that are all the same shape (a named role, the primitive it binds, who uses it, what each mode
substitutes), where before they were scattered across two tabs with weight roles and rung values never
visibly related. That regularity is invisible while the tiers are mixed, and it is what makes the tab
teach the model instead of just listing controls.

- **The typeface library is the ONLY editable primitive in typography.** Walked the tiers rather than
  assuming: the size ladder (22 steps), the line-height ladder and the letter-spacing ladder are all
  fixed and brand-invariant. What reads as "editing sizes" is Shape / Range / per-rung pins — all
  composite levers. So Primitives is one editable list plus three reference tables, and that is the
  honest shape, not a thin tab.
- **The ladders are SHOWN, read-only.** Otherwise they are visible nowhere in the app and you only ever
  see the handful of steps some rung happens to bind — you cannot see that 1.30→1.40 is a deliberate
  gap, only that neither 1.35 nor anything else appears.
- **SIZE has no Semantics row, and that is load-bearing.** A size role would duplicate the composite
  name — `body.md` IS the size role — where `tight` is not implied by `caption`. Recorded in the tab
  doc block so nobody "fixes" the asymmetry later by inventing one.
- **The mode-switcher rule is now a POSITIVE list** (`semantics || styles`), not `!== 'primitives'`.
  The negative form silently grants the switcher to any tab added later — which is exactly how Preview
  would have got one the moment a fourth tab appeared.

**Three bugs in my own new code, all found by measuring rather than reading.**

1. `el('tr' + (who.length ? '' : ' unused'))` — `el`'s first argument is the **tag**, so this built an
   element named `"tr unused"`. Dropped the class entirely rather than fixing it: an unbound step is the
   *common* case (15 steps, ~6 rungs), so dimming most of the table would read as an error state.
2. The new table wore `mtbl-t`; the class is **`mtbl-tbl`**. A near-miss class name is invisible in
   source and silent at runtime — the table simply lost `width:100%` and sat at 657px inside a 798px
   container, off the shared grid.
3. The specimen wore `.mtbl-spec-t` (nowrap + ellipsis) instead of `.ltbl-samp`. A nowrap block
   contributes its full single-line width as min-content, so the long leading specimen forced the fill
   column to **590px** while the short tracking one sat at **239px** — #369's trap, reproduced exactly.
   `.ltbl-samp` wraps and caps at `52ch`, which bounds the contribution.

All three produced a page that *rendered*. Only the measured column widths (`112/148/148/390` across
all three tables, checked per table) showed them.

**Folded in, per owner: the stale leading/tracking range docs.** `TypographyInput.lineHeights` still
documented `[0.8, 3]` and `letterSpacings` `[-0.5, 0.5]` — continuous ranges that #384 superseded when
it locked the ladders. A stale range reads as "any number in here is fine", which is precisely what the
UI believed until #388 shipped `step="0.05"` and landed on 1.35 inside the 1.30→1.40 gap. The schema's
per-property descriptions were already correct; only the two parent descriptions carried the old
framing, and they now match.

**Still to come in part B:** the Text styles per-mode table naming values rather than rungs, the #390
per-category per-mode family control on Semantics, the specimen-refresh fix, and the caption leading
band.

---

## (2026-08-03) — Preview token list splits on the tier line (#390)

**STATUS: web.** No engine change, no token movement — `regen --check` 88/88 untouched. The Preview
token list now carries the primitive/semantic split via `.pvseg`, the same mechanism Typography took
first (#272) and doc 26 called "the pattern #267 generalises".

**Two defects, and neither is visible until the tiers are apart.** Primitives have no modes, so the
four mode columns were rendering **four identical cells** for all 142 palette steps — the non-color
branch already guarded this (`hasModes ? modeLabels : ['Resolved']`), the color branch never did. And
a semantic's resolved hex is only half of it: which token it **aliases** is the editable relationship.

**The alias has to live inside the mode cell, and that is measured rather than assumed.** Of harbor's
147 color roles, only **6** alias the same target in all four modes; 97 keep the palette family and
change step; **44 change family outright** (`background.primary`: white → neutral.950 → white →
black). A single "aliases to" column would have been wrong for 141 of 147 rows.

**Tier by SHAPE, not a category list** — `$value` is an alias string ⇒ semantic — so a token added
later files itself. **One carve-out, and the mock got it wrong before this landed:** a typography
composite holds an *object* of aliases rather than an alias string, so the shape rule filed all 38
`type.*` composites under Primitives. Doc 26 puts the full type ramp under Typography's **Styles**
tier, and a composed style is the least primitive thing in the system. `$type === 'typography'` is
therefore an explicit semantic override.

**`color` is the ONLY semantic category with modes.** `size`, `font`, `space`, `motion`, `grid`,
`icon`, `radius`, `border-width` and `focus` are all mode-invariant, so the Semantics tab is one
four-column table and nine single-column ones — not a uniform grid with exceptions.

**Short alias paths are decided per TABLE, because a blanket rule would lie.** Stripping the shared
prefix only works where one namespace covers the table. `color` is all `palette.*` (safe);
**`size` aliases both `dimension.*` and `space.*`**, so it keeps full paths and says why. The callout
is computed from the table's actual alias namespaces, never assumed.

**A bug worth recording, because it was invisible and the fix is one word.** The chain marker (a
semantic aliasing another semantic — `grid.sm.gutter → space.200 → dimension.16`, 30 of them) never
rendered. It tested the tier of `deref(...)`, and **`deref` follows the chain all the way to the
terminal primitive**, which can never be semantic — so the condition was structurally unreachable.
`subNode` is the single hop. Caught by driving the real UI in Chromium, not by the typecheck, which
was perfectly happy.

**Verified in a browser, not by inference.** Playwright against the built bundle: Primitives shows one
`Value` column across 10 categories; Semantics shows Color at four mode columns with 691 two-line
cells; Short mode yields `neutral.050` plus the right callout; `size` keeps full paths with the
two-namespace explanation; `type` appears under Semantics; 10 chain markers on `grid`. No console or
page errors.

**Known gap, deliberately not closed here.** With **Show → Alias only**, a `type.*` composite still
renders its resolved value, because it has no single alias to show — its `$value` is five aliases at
once. The cell falls back rather than going empty. Listing all five is possible but long, and the
approved mock never covered composites (it had them on the wrong tier), so this wants a look before
it is built.

**Gates:** web typecheck + build clean, `regen --check` 88/88, `test.ts` 1243/0, nb-regression exit 0,
DTCG 911/911 aliases + 432/432 contracts, US-English clean over **91** files — the 91st being the
freshly built bundle, which is the #387 coverage gap showing its face in the count.

---
## (2026-08-03) — A mode can move one category to a different family role (#390)

**STATUS: engine.** `out/*` **unchanged** — NB sets no per-mode `familyMap`, so every committed artifact
byte-matches. Closes #390.

Two family mechanisms were each correct and composed into a gap:

```
familyMap                            category → role    brand-wide, mode-invariant
modeLevers.<mode>.families.<role>    role → face        per mode
```

Nothing re-pointed a **category** per mode. Since `display`/`title`/`label`/`eyebrow` all default to the
`display` role, a mode swap moved every one of them together — Dark could not move `title` without also
moving `display`. Now `modeLevers.dark.familyMap = { title: 'text' }` does exactly that, and the sibling
stays put.

- **It names a ROLE, not a face.** Pointing a category straight at `font.typeface.*` is what #269
  rejected — the role is the brand-invariant handle a shared codebase binds to — and a base resolving to
  `family.display` beside a Dark resolving to `typeface.poppins` is incoherent tiering even where it
  resolves. A brand wanting a **fourth simultaneous face** still needs a fourth role; #269 deferred that
  and this does not change it. The two are orthogonal, which is why this shipped and that did not.
- **Modeled on #328, deliberately.** Per-mode size already re-points a category at a different ladder
  step; this re-points it at a different role. Same suppression contract (a self-map is inert and
  dropped, so a no-diff declaration cannot create a mode entry), same throw-never-drop validation, same
  `rungModes` emission path. Reusing the shape meant the emit was three lines.
- **The mode-note builder was quietly wrong before this.** It hardcoded `size` / `leading/tracking`, and
  its second branch had been **dead since #377** moved leading and tracking onto the semantic role. Add
  `fontFamily` and a family re-point would have been labelled "leading/tracking". Rebuilt from the
  fields actually present; a `fontSize`-only note is byte-identical, which is why `--check` stayed green.

**A test that would have passed for the wrong reason.** The core assertion is a *negative* — display does
**not** move while title does — and `comp(...)!.familyByMode` on a composite that didn't exist would read
`undefined` and pass vacuously, as would `.every()` over an empty array. Measured first: 6 title
composites, 6 display, `display.xl` real. Then pinned the complement — display **does** move when mapped
— so the negative can never rot into a structural impossibility. A negative assertion needs its positive
control or it stops testing without ever going red.

**The schema addition is documentation, not enforcement — and I only know that because I ran it.** Adding
`familyMap` to the contract and probing the live validator returned `accepted` for a bad role, an unknown
category, and a number where a string belongs. The root cause is **pre-existing and much wider than this
field**: `validate()` implements `additionalProperties: false` (the unknown-key guard) but not
schema-valued `additionalProperties` (a sub-schema applied to every value). `modeLevers` is exactly that
shape, so its whole subtree — `radius` range, `density` enum, `typeSizes` floors — has never been
validated either. **7 nodes** affected; filed as **#391** rather than fixed here, because switching it on
lights up four levers at once across every fixture. Real enforcement for this field is `brandTheme()`,
covered by unit tests. This is the second time the "read the schema, assume it validates" step would have
shipped an inert contract (#367 was the first) — the rule that caught both is *run the validator*.

---
## (2026-08-02) — The leading/tracking fields bind to the ladder, and errors stop hiding (#388)

**STATUS: web.** #384 locked the leading/tracking ladders in the engine. The dashboard was never told.
The Foundations fields kept `min="0.8" max="3" step="0.05"` from when any value was legal, so:

```
line-height  compact = 1.30   arrow-key up   →  1.35   (the deliberate 1.30→1.40 gap)
engine       throws "not a step on the ladder"
rebuild()    catches, keeps the last-good theme
user         sees the field still showing 1.35
```

The value was rejected and the UI said nothing. **Two independent defects met here**, which is why one
fix would not have been enough:

- **The control was the wrong verb.** A locked ladder means *bind to an existing step*, not *type a
  number*. The fields are now selects over `LINE_HEIGHT_LADDER` / `LETTER_SPACING_LADDER`, so an
  off-ladder value is unreachable rather than caught. Steps that would **cross a neighboring rung** are
  rendered `disabled` with a title, not omitted — the ramp order is a real constraint, and showing it
  grayed teaches it, where hiding it would make the ladder look shorter than it is.
- **The error surface was per-page.** It was rendered only inside `renderPrimitives`' paint closure, so
  an engine throw from *any other page* set `lastError` and displayed nothing. That shape is the bug:
  the next page added would have forgotten it too. The bar is now mounted once in the chrome and
  refreshed by `syncErrorBar()` on every apply.

**The trap this left, and how it was caught.** Mounting in the chrome is not sufficient on its own —
`build()` re-runs on every page-nav click and mints a fresh host. The first version hardcoded
`globalErrHost.style.display = 'none'` there, which meant **the bar vanished the moment the user changed
page** — reintroducing the exact hole it exists to close, one layer down. Verified in-browser: with a
live error, nav to Layout showed `h=0`. `build()` now calls `syncErrorBar()` instead of hardcoding
hidden — visibility is always *derived*, never asserted. Re-verified across all eight pages: `h=62` on
every one, cleared on undo, and still cleared after nav.

**A second silent-inertness, same PR.** The `.errbar-global` rule was written full-bleed
(`border-radius:0`, no side borders) and placed **above** `.errbar` at equal specificity, so every
declaration lost the source-order tiebreak and did nothing. Rendered, the plain `.errbar` card matches
the mode bar it sits under, so the fix was to **delete the override, not reorder it** — the class stays
as a marker with no rules. Confirmed by reading computed style, not by reading the source:
`radius 7px / border-left 1px / margin-bottom 16px`, all inherited.

**The width bound had to travel with the control.** `.ltbl-in` carried `width:92px` with a comment
saying exactly why — *a control that sizes to its content is what breaks column parity in an auto-layout
table*. Swapping in a select dropped the rule on the floor and left `.ltbl-in` as dead CSS. A closed
select's intrinsic width is its **widest option** (#360's trap), so the column was being sized by
whichever ladder label happens to be longest today (`-0.015em`) and would have moved silently the day a
label grew. `.ltbl-sel` now pins 124px, measured against that label. Parity re-measured at
**112/148/148/390** across all three Foundations tables, zero overflow, no page-level horizontal scroll.

Worth recording that **#366's trap fired again** while writing that comment: backticks around
`.errbar-global` terminated the stylesheet template literal, and `tsc` reported it as
`Property 'errbar' does not exist` at a line 300 below the edit. The comment now says so inline.

Verification was end-to-end in a real browser, driving the actual controls rather than guessing at
selectors — two earlier attempts to force an engine throw failed silently because they never reached
one, which reads identically to "the bar is broken". The reliable route is Typography → **Styles** →
shape `Compact` + the `titleFloor 16` toggle: the shape cards trial-build and self-disable when they
would clash, but the toggle does not, so it is the one control that can still drive the engine into a
throw. 12 selects, 0 leftover number fields, 0 page errors, and the picked step round-trips through
`localStorage` across a reload.

**Deferred to #388 part B** (needs #385 on `main`): the Styles table naming values rather than rungs,
Foundations separating the ladder from the roles, the Foundations → **Primitives** rename, the
specimen-refresh fix, and the caption leading band.

---

## (2026-08-02) — The dashboard's status colors become a set (#285)

**STATUS: web.** #355 fixed the neutral greys; the audit that followed found every remaining chrome
failure was a **semantic status color**, and that they had never been checked as a group. The root cause
was structural: **there was no set.**

```
success   #1f9d63   #1a9c52   #1a7f4b      three greens for one concept
danger    #c9342f   #dd3322   #b0341a      three reds for one concept
warning   #b06a12
```

Nine literals, scattered, with no shared definition — which is exactly why two greens, one red and the
amber all sat under AA without anyone noticing. Nothing held them to a common bar.

Now `--ok` / `--warn` / `--danger` (plus `--ok-inv` / `--danger-inv`), defined once beside the neutrals,
every value clearing **4.5:1 on `--paper`** — the worse of the two light surfaces.

- **The fix is the set, not the values.** Patching each failing color would have left the same nine
  literals free to drift apart again. One semantic → one token is what stops the next one appearing.
- **`--ok-inv` / `--danger-inv` are measured against `--ink`, not `--paper`.** They sit on inverted
  panels; darkening them would have *broken* contrast rather than fixed it. This is the trap the #285
  method notes warn about — **and my own derivation script walked straight into it**, reporting
  `.sg-st` (`#c9ccce`, 1.45:1) as a failure. It sits inside `.sg-btns.sg-inv`, a dark panel. Caught by
  checking what the element was, not by trusting the number.
- **Status DOTS were already compliant** and changed anyway: they are non-text (SC 1.4.11, 3:1) and
  cleared that bar. They joined the set for consistency, because one status green should be one green —
  recorded so a future reader does not mistake it for a compliance fix.
- **Verified by walking the rendered DOM**, effective backgrounds resolved by climbing to the first opaque
  ancestor, large-text rule applied per element: **zero chrome failures** across every page and segment.
  The 22 remaining signatures are all `.sg-*` style-guide specimens rendering **brand-generated** colors,
  which #285 already carries as a separate question — a specimen showing a brand color at its true value
  is being honest, and flagging it as a dashboard defect would be a category error.
- **Does not close #285.** The chrome portion is done; the generated-color question stays open there.

---
## (2026-08-02) — Leading & tracking get their semantic tier (#377, PR 3b)

**STATUS: engine.** The architectural half. Leading and tracking now carry the same two tiers every other
typography axis already had, and the per-mode override moves from 38 composites onto one role.

```
font.line-height.150          PRIMITIVE  1.5, no modes ever
font.line-height-role.normal  SEMANTIC   → {font.line-height.150}
                                         $extensions.prism3.modes.dark → {font.line-height.165}
type.body.md.lineHeight       COMPOSITE  → {font.line-height-role.normal}
```

Exactly `font.weight.400` / `font.weight-role.default`, so the tier line finally reads identically on
every axis. Verified end to end on a dark-mode brand: role carries the override, step carries none.

- **#296 is preserved, not reopened.** Its contract was "a rung primitive is mode-invariant". Under one
  tier the adjective WAS the primitive, so the only way to honor that was to re-point every composite —
  the fan-out. Now the numeric STEP is the primitive and stays mode-invariant, while the adjective is a
  role above it that a mode may re-point. The rule is unchanged; there is finally a place to put the
  exception.
- **Minted from need, per #328's rule for weights.** The ladder is 15 steps; a default brand binds 6, so
  6 emit. The other 9 would be dead leaves nothing references. Per-mode role targets are unioned in, the
  same way `weightsRef` unions per-mode numerics.
- **The `deref` fix landed with the change that needs it.** `emit-figma-font.ts` read composite
  sub-values through single-hop `subNode`. With the role inserted it would have hit the alias node, failed
  its `typeof === 'number'` test, and taken the `: 1` fallback — **baking every Figma text style at 100%
  line height, and all tracking at 0**, silently, because `?? 1` and `?? 0` are plausible values. The
  earlier 23-site audit is why this was two lines rather than an expedition.
- **Three tests had to move, and one of them would otherwise have become unfailable.** `D-lhls(i)`
  asserted no-diff suppression on `line-height.normal`; after the split that path is a step, which never
  carries modes, so the assertion would have passed vacuously forever. Moved to the role, where a real
  override lands.
- **My own new assertion was wrong and caught it.** I asserted the composite carries no per-mode
  `lineHeight` at all — but a mode variant is a **full-value snapshot** (`{ ...value, ...parts }`), so the
  field is present by spread. The real proof the fan-out is gone is that it is *identical to light*: the
  composite was not re-pointed, the role beneath it was. That is the stronger assertion and the one now in
  the suite.
- **`#328`'s size/leading compose test was split across the two tiers deliberately.** Per-mode SIZE is
  genuinely per-composite (keyed by group AND rung); leading is rung-wide. Asserting both on the composite
  would have been asserting the fan-out this issue removes.
- **Key ordering is a known cosmetic, and it matches the reference system.** Tracking steps emit as
  `0, 20, 50, neg-30, neg-20, neg-10` — JS orders integer-like keys numerically first, then string keys by
  insertion. Prism2's own file does exactly the same (`0, 3, 6, neg-03, neg-015`), so this follows the
  convention rather than diverging from it.
- **Still to come (3c, web)**: the Styles table should now offer VALUES rather than rung names — the
  self-referential "rung `tight` becomes rung `snug`" reading is what the owner flagged, and the tier is
  what makes the honest version expressible. Plus the Foundations → Primitives rename.
- **Verified**: 1243 tests, `regen --check` 88/88, NB regression PASS, `tsc -p web`, US-English clean.
  `out/*` moves for every brand — this is a token-PATH change, which is why it shipped alone.

---

## (2026-08-02) — Leading & tracking get curated ladders, and the ramp can no longer invert (#377, PR 3a)

**STATUS: engine.** The founding defect of #377, fixed: `{ tight: 2.5, loose: 0.9 }` was **accepted**,
resolving to `2.5, 1.15, 1.25, 1.5, 1.65, 0.9` — a ramp whose rung named "tight" renders looser than the
one named "loose", silently, across all 38 composites. Font sizes already refused that shape; weight roles
warn; leading and tracking did neither.

**Zero artifact churn** — `regen --check` stays 88/88 in sync. This lands the ladders and the guards
*without* touching a single emitted token path. The semantic tier (which does change paths) is PR 3b, and
splitting there is what keeps a breaking-path change reviewable on its own.

- **Two guards, and the second is the one the issue exists for.** ON-LADDER: a range check accepted 1.52,
  so a typo could mint a private `line-height.152` no other brand could reference. Refusing beats snapping
  — #341 removed silent quantisation from the size ramp for exactly this reason. ORDERED: rung names are a
  relative-emphasis contract (tight → loose); an inverted ramp makes all six of them lie.
- **The ladders are sized from field research, not taste.** Both reference systems already ship the
  two-tier shape — Prism2 (`lineheight.105…175` + adjective aliases) and NB (`1p1…1p5` + size aliases) —
  and the engine's previous six values **were Prism2's ladder**, flattened. Density comes from where
  brands need to move: the KB's archetype guidance ("approachable → generous body 1.5–1.6; expert →
  controlled headings") was **unexpressible**, because the old set offered exactly ONE value (1.50) across
  the entire 1.40–1.60 body range. Now 5. The 1.30→1.40 gap is deliberate: the heading/body boundary.
- **Wider than any single reference system, on purpose.** Prism2 ships 6 because 6 is what Prism2 needed.
  A white-label generator needs the union of what ANY brand might bind. That argument applies only to the
  primitive tier — the semantic set stays at 6, matching the field.
- **A test was asserting the bug.** `type-ramp(f)` re-anchored `relaxed` to **1.9** — off-ladder *and*
  above `loose` (1.75). It had encoded an inverted ramp as an expectation, and only surfaced because the
  new guard rejected it. Changed to 1.6 (a real re-anchor, ordered) with the reason recorded inline.
- **The schema constraint is enforced, not decorative.** Swapped `minimum/maximum` for `enum` on all 12
  rung properties. Deliberate echo of #367's trap, where `minLength` would have been silently ignored —
  `enum` **is** implemented by the hand-rolled validator (CR-04 made it type-independent), and that was
  verified by running it, not by reading it.
- **Honest about the trade**: this NARROWS the input. A brand could previously author any value in
  `[0.8, 3]`; now it binds one of 15 steps. What is bought is a ramp that cannot invert, a set the UI can
  actually present, and no private per-brand steps. What is lost is arbitrary values — the decided
  direction ("locked ladder", owner-confirmed), and the ladder covers every range the KB calls for with
  3+ options where the old set had 1.
- **Verified**: 1240 tests (16 new — both inversion shapes, off-ladder rejection, ladder coverage per KB
  range, key-collision safety, and the Prism2 `×100` / `neg-` key conventions), `regen --check` 88/88,
  NB regression PASS, schema validator exercised on four inputs.

---

## (2026-08-02) — The category nudge range is derived, not guessed (#377, PR 2 of 3)

**STATUS: web + engine.** The per-category leading/tracking nudge offered a fixed `±2`. That was wrong in
**both directions at once**, and the same mistake caused both: guessing the range instead of computing it.

- **It hid live steps.** `display` derives the *tightest* leading rung, so reaching `loose` needs **+5**.
  The owner's own test case — *"one brand might want display snug, another loose"* — was half
  unsupported: snug is +1 and worked, loose was unreachable through the UI.
- **It offered dead ones.** `shiftRung` clamps. `eyebrow` derives the *widest* tracking rung, so its `+1`
  and `+2` were silent no-ops. From `normal`, `+3/+4/+5` all render `loose`.
- **Every one of the seven categories was affected**, on one axis or both. The ±2 comment reasoned "±2
  still lands inside them from most starting points" — true for mid-ramp categories, false for every
  category sitting at an end, which is exactly where the interesting nudges live.

**Fix:** `derivedRungFor` is now exported from the engine, and the UI computes each category's reachable
span from the rungs its composites actually derive. A category spanning several rungs (title bands by
size) gets the union. Engine-bounded to ±5, which is what the validator already accepted.

```
display  leading   default … 5 looser      (no "tighter" — already at the tight end)
title    leading   2 tighter … 4 looser
body     leading   3 tighter … 2 looser
eyebrow  tracking  5 tighter … default     (no "wider" — already at the wide end)
```

- **Why export the derivation rather than duplicate it.** The UI cannot offer an honest range without
  knowing what each composite derives *before* the nudge. Reimplementing `lineHeightFor`/`trackingFor` in
  the web layer would have created a second source of truth that silently rots the moment the engine's
  bands change — and PR 1 changed them this same day. The export is the seam that keeps one answer.
- **This composes with PR 1 automatically.** PR 2 branches from `main`, so display still derives only
  `tight` here and computes `0..5`. Once PR 1's banding lands, display derives `tight`+`snug` and the
  range recomputes to `-1..5` with no code change — the payoff of deriving rather than hardcoding.
- **#360's select-width trap re-checked**, since the option lists got longer: a closed `<select>`'s
  intrinsic width is its *widest option*, and "5 tighter" is the same width as "2 tighter", so the selects
  measure 84–91px against the 92px cap. Table stays 800/800, no overflow.
- **Verified**: 1224 tests (7 new asserting the derivation's ends and title's multi-rung span),
  `regen --check` 88/88 (no emitted artifact moves — the export adds no output), NB regression PASS,
  browser-checked across all seven categories on both axes, no page errors.

---
## (2026-08-02) — Display leading gets size bands (#377, PR 1 of 3)

**STATUS: engine.** `lineHeightFor` sent **every** display size to `tight` (1.05) — 48px through 160px, a
3.3× span — while `title` banded across a 2.2× one. The function contradicted its own premise, and the
seam showed at the tier boundary:

```
title.2xl    40px → snug   1.15
display.sm   48px → tight  1.05     ← two rungs tighter for 8px more size
```

Now `display → px >= 64 ? 'tight' : 'snug'`. Largest rung jump between adjacent sizes drops from **2 to
1**, matching how title moves.

- **Deliberately coarse, and that is not the final answer.** With only six rungs there is nothing between
  snug and tight, so 64–160px all take `tight`. #377's 15-value ladder adds **1.10 exactly here**; these
  bands should be revisited when it lands. Recorded in the code comment so the next reader knows it is a
  staged step, not a considered endpoint.
- **The Figma round-trip fixture caught it, which is the system working.** `fixtures/figma/nb/text-styles.json`
  is a **real capture** (`figma.getLocalTextStylesAsync()`, file key `Zrn9YDqrFiwjs2IfKInNY0`) of NB tokens
  imported into Figma. The test reconstructs each style's multiplier from that capture's px and asserts the
  engine reproduces it — so a deliberate leading change fails it by design. **Exactly one** of 38 styles
  moved: `text/display/sm/strong`, 50.4 → 55.2px (48 × 1.15).
- **The fixture edit is PREDICTED, not re-captured, and says so.** A `revisions` block now records the
  change, the reasoning and that provenance, because every other field in that file is verbatim Figma
  output and a silent hand-edit would quietly turn a capture into a fabrication. Precedent for editing
  these fixtures on an intentional engine change is #337 (font.json, 39→35 vars).
- **Trap for the next leading change**: that assertion pins the leading of all 38 NB text styles via a
  captured artifact that cannot be re-generated locally — it needs a re-import into Figma. Expect to
  update it by prediction and to justify each field, rather than regenerating.
- **Verified**: seam closed (40px and 48px both 1.15), max adjacent jump 1 rung, `regen --check` 88/88,
  `test.ts` 1217 passed, NB regression PASS, `tsc -p web`, US-English gate clean.

---

## (2026-08-02) — the US-English gate could not see `grey` (#313 closed, and the gate was wrong)

**STATUS: engine.** Went to close #313 as already-done and found the conversion it tracked was
incomplete — because the gate that was supposed to have enforced it is structurally blind to a third
of the rule.

**What the gate scans:** `/\b[A-Za-z]{3,}(?:is(?:e|ed|es|ing|ation)|our)\b/`. CLAUDE.md states three
rules — `color` not `colour`, `gray` not `grey`, `-ize` not `-ise`. Two fall out of that pattern:
`colour`/`behaviour` end in `-our`, `-ise` is explicit. **`grey` ends in neither.** The pattern could
never match it, so `greyscale` sat in a `description` field of the published `theme-schema.json`
contract through 90-file scans, reported clean every time.

**The arc had half-learned its own lesson.** #260→#302→#310 correctly established that *a fixed word
list under-counts* — `colour|grey|behaviour` misses `generalised`. True. But the conclusion drawn was
pattern **instead of** list, when the correct answer was pattern **plus** list: replacing one with
the other just moves the blind spot, and it moved onto the one word in the original list with no
productive suffix to match. `STEMS` is now a second substring scan alongside `PATTERN`.

**Closing #313 needed the fix, not just the button.** Its checklist asked for four things; three were
genuinely done (the file is gated, `theme-schema.example.json` is clean, CLAUDE.md's convention note
was amended). The first — *19 sites converted* — was 18 of 19. Verified rather than assumed, which is
the only reason it turned up: the check that found it was a raw `grey|colour|behaviour` grep run
**independently of the gate**, precisely because trusting the gate is what the gate is for.

**The gate now self-checks, which is the part worth keeping.** Deleting a scan previously made it go
QUIET, not fail — a narrowed detector reports success forever and nothing downstream can distinguish
"clean" from "not looking". There is now a fixture assertion ahead of the file walk: one sample per
stated rule plus one false positive that must NOT trip. Tamper-tested — removing `STEMS` fails with
*"the gate's own detection is broken: `a greyscale mode` should be flagged"* instead of passing.

**`regen --check` stays at 88/88** — `theme-schema.json` is hand-authored, not emitted, so regen must
not touch it either way. That was on #313's checklist and is the reason the file needed a direct
source edit with no generator to re-run.

**Gates:** `regen --check` 88/88, `test.ts` 1217/0, nb-regression exit 0, DTCG 899/899 aliases +
432/432 contracts, US-English clean.

**Follow-up (same PR, caught by CI): the PR's own "US-English clean" claim was checked against a
stale local `web/dist/main.js`.** `STEMS` correctly caught two REAL hits once CI rebuilt web fresh —
`grey`/`greyed` inside two CSS-in-JS comment strings in `main.ts` (`.sh-tintblock`'s tint note,
`.mctx-opt.fixed`'s locked-row note). These are CSS comments living inside template-literal string
content, not TS-level comments — the web build has no `--minify` step, so they survive into the
shipped bundle and are correctly in scope (unlike genuine TS `//`/`/** */` comments, which the build
strips and which stay exempt). Fixed to `gray`/`grayed`; a third occurrence (a `//` TS comment that
doesn't reach the bundle) was fixed too for consistency, not because the gate required it. The
trap for next time: **validate this gate against a freshly-built `web/dist/`, not whatever happens
to be sitting in the working tree** — CI runs the gate *after* the web build for exactly this
reason, and a local check that skips the rebuild can pass while CI fails on the identical commit.

## (2026-08-02) — field.border.hover becomes a step offset, not a second ratio (#352, item 4 — closes the issue)

**STATUS: engine.** Last item on #352. `field.border.hover` targeted `cfg.secondaryMin` — a **text**
constant (4.5 light/dark, 7 HC) — while `field.border.rest` was already on `nonTextMin`. Same
category error as the bold fills: a border carries no text, so SC 1.4.11 governs it.

**Ratio or step offset — the call was offset, and the current output argued for it.** A hover state's
job is to be perceptibly DIFFERENT from rest, which is a delta, not an absolute. Chasing an absolute
ratio makes the delta depend on wherever `rest` happened to land, and it already had: **2 ramp steps
in light/dark, 3 in HC**, for the same nominal affordance. An offset is also the idiom `iFill`
already uses for interactive fill states, so this removes a second way of saying the same thing.

**TWO steps, and the number was chosen from the data rather than for tidiness.** Light and dark
already resolved to a 2-step delta, so both are **byte-identical** — only HC changes, tightening 3
steps to 2. One step was tempting for symmetry with `iFill`'s hover offset, and would have been
wrong: a field border is a hairline, and one step on 1px of chrome is a far weaker cue than one step
on a filled button. That would have shipped as a silent regression in the affordance, gates green.

**What the artifacts show, and it is worth reading precisely:** in light/dark the ONLY diff is the
`description` and the `min` (4.5 → 3) — no color moves, because the pick was already where the
offset puts it. HC is the only mode where a color moves (`neutral.650`→`600` in hc-light,
`350`→`400` in hc-dark). So the change is mostly a correction to what the engine CLAIMS, which was
the same shape as #375.

**Pinned, because "uniform" is the property and nothing measured it.** The old test asserted
`hover.min >= 4.5` — the rule being removed — and nothing anywhere checked that the delta was
consistent across modes, which is why the 2-vs-3 split sat there unnoticed. There is now an
assertion that hover sits a uniform 2 ramp steps from rest in EVERY mode. Tamper-tested: changing
the offset to 1 fails it with `deltas 50, 50, 50, 50`.

**Note the contract direction changed, not just the number.** `hover` is no longer gated at a higher
bar than `rest`; both sit at `nonTextMin`, and what is asserted is that hover is *strictly stronger
than rest*. A gate that says "hover ≥ 4.5" was checking the wrong thing — a hover border that
happened to equal rest would have passed it.

**#352 is now fully addressed:** item 1 link ink (#373), item 2 the fills (#375 + #378), item 3
withdrawn as a reversal of a recorded decision (#379), item 4 here.

**Gates:** `regen` + `--check` clean, `test.ts` **1206/0**, nb-regression exit 0, DTCG 899/899
aliases + 432/432 contracts, US-English clean.

---
## (2026-08-02) — bold fills relax to the non-text bar; NB divergence enumerated, not re-baselined (#352, item 2 completed)

**STATUS: engine.** This finishes item 2. #375 did only the interactive fill *state contracts* and
explicitly deferred the rest because two walls blocked it; this removes both walls deliberately.
Unlike #375, **this moves colors** — 63–75 alias changes per brand, 28 `min` changes.

**What changed.** Every fill-vs-floor computation now gates at the mode's NON-TEXT bar (SC 1.4.11)
instead of its text bar: `foreground.{brand,success,warning,info,danger}` and the interactive fill
*picks* (`actionRest`, `iDestructiveRest`, every opt-in accent column). Fills sit closer to their
anchors — nb light `success` green.550→500, `warning` amber.600→500, `info` info.550→500.

**#375's `stateMin` parameter is gone, one PR after it landed.** It existed only to hold `rest` at
4.5 while the other states relaxed. With every fill-vs-floor computation on one bar the split is
degenerate, so it collapsed back to a single `fillMin`. The #375 framing — "rest carries the text
bar because it anchors the label" — was a pragmatic dodge around the two walls below, not a
principle. The label's legibility is `on-fill`'s contract, measured against the fill; the fill's
relationship to the *page* is non-text in every state, rest included.

**Wall 1 — the no-pure-black rule, now scoped rather than obeyed.** Relaxed fills sit closer to
their anchor, i.e. more saturated mid-tones, and the ink can no longer reach 4.5 without going
black. The rule is about ink on the page CANVAS; black on a bright amber fill is the legible,
conventional answer. Scoped in `test.ts` by each role's own `against` (starts with `foreground.` or
contains `.fill.`) rather than by name, so a new `on-*` role inherits the carve-out automatically.
**Paired with a second assertion so the carve-out is not a hole**: every pure black must be ink on a
fill AND must clear its own min — a black that fails its floor is still a bug, and would otherwise
now pass silently.

**That unblocked the `onColor` bug filed as latent in #375.** Its escalation picked a side from the
two SOFT candidates then escalated to the pure version *of that side* — so N950 at 4.26 could win the
soft round and escalate to pure black 4.60 while legal pure white sat at 4.56. Now re-opens the
choice across both pures. It was unreachable under #375's scope; it is reachable now.

**Wall 2 — NB. The fixture is NOT re-baselined, and that is a deliberate departure from the
instruction as literally written** ("re-baseline the NB fixture with a note on why it diverges").
`fixtures/figma/nb` is the frozen real Token Press export, and its entire value is being an
*independent* target. Overwriting it with engine output makes it self-referential — it could never
again catch a real-NB regression, and every future run would compare the engine to itself (the #281
trap, in a new place). So the divergence is **enumerated** instead, following the `KNOWN_OUTLIERS`
precedent in `nb-regression.ts`: 19 rows of `{mode, name, nb, engine}` in `NB_KNOWN_DIVERGENCES`.
Same outcome — the divergence is accepted and explained — without destroying the target.

**The waiver is exact, and tamper-tested in both directions.** A divergence that *changes* fails
(`recorded red/450→red/500, got red/450→red/550`), and a waiver that no longer applies fails as
stale. Verified by tampering, not by assuming: a waiver that silently covers everything is worse
than no waiver.

**The 19 divergences are three groups, and only the first is a decision** — the other two are
consequences: (1) `foreground/*`, the relaxed fills; (2) `text|icon/on-*` in dark, where the fill
moved toward its anchor and got darker so the winning ink side FLIPS from NB's 950 to 025 or black;
(3) `border/focus`, which derives from `actionRest` by construction.

**HC is EXEMPT, and the measurement is what decided it.** Applying the rule per-mode looked
internally consistent — each mode reads its own non-text bar, and HC's 4.5 is still stricter than
standard's 3. It is wrong anyway. Routing HC through `nonTextMin` made hc-light's `foreground.brand`
and `foreground.danger` resolve to `red.550` at 4.62 — **byte-identical to standard light**. A
high-contrast mode whose brand and danger fills are indistinguishable from the standard mode has
stopped being high-contrast on that axis. HC exists to EXCEED minimums, so deriving its fills from a
WCAG-floor rule erases the thing users switch to it for; `fillFloorMin` keeps `kind: 'hc'` on the
7:1 text bar. Consequence worth noting: **HC still reproduces NB exactly in both HC modes**, so the
12 `hc-*` waivers came back out and the table is 19 rows, not 31.

The general lesson, since it nearly shipped: "the same rule, applied uniformly" is not automatically
right when one of the things it applies to exists precisely to be an exception. Consistency was the
argument FOR, and it was the wrong axis to optimise.

**Decision #3 (hover/pressed label out of scope for 1.4.3) is now LOAD-BEARING.** It was recorded as
inert in #375. With fills relaxed, harbor/dark measures 4.28 on hover and 3.62 on pressed, and no
single ink clears 4.5 across all five fill states for that column. The preview spec now gates the
label at TEXT on `rest` only, UI on hover/pressed, with the owner-decision provenance written at the
call site so it is not later "fixed" as a bug.

**Gates:** `regen` + `--check` clean, `test.ts` **1212/0**, nb-regression exit 0, DTCG aliases
899/900/897 resolve + 432/432 mode contracts, US-English clean.

---
## (2026-08-02) — the iconContrast default is pinned, and #352 item 3 is withdrawn (#352, item 3 reframed)

**STATUS: engine.** No behavior change, no token moves. The only artifact diff is the lever
description in `schema/lever-manifest.json`.

**#352's item 3 said "flip the `iconContrast` default to `'3:1'`". That item is wrong and is
withdrawn** — it reverses a decision this repo had already recorded. The default is `'text'`
(icons mirror text tier for tier) by owner call, logged in the 2026-08-01 entry above: *icons sit
next to text and should match it; the lever is the escape hatch.* WCAG's 3:1 for graphical objects
is a **minimum, not a target**, which is exactly what the lever exists to expose.

**The interesting part is how the drift happened, because it is a documentation failure, not a
reasoning failure.** The decision WAS documented — but only in this log. The place a developer
actually reads, the `iconContrast` declaration in `theme.ts`, described `'3:1'` as
"standards-correct" and said nothing about `'text'` being deliberate. So the audit re-derived the
standards argument from scratch, reached the defensible-looking conclusion, and wrote "flip the
default" into the plan **on the same issue that carried the decision**. A later agent working the
plan top-to-bottom would have reversed an owner call with every gate green.

**Verified, not assumed: on `main`, flipping the default to `'3:1'` passes 1205/0.** Nothing caught
it. The existing `iconContrast` test was blind by accident — it asserts on **nb**, and nb is the one
brand whose action anchor (550) already clears both bars, so it does not move under the lever. A
test that exercises a lever on the single brand immune to it proves nothing.

**So the decision is now enforced rather than remembered**, matching the US-English gate's posture:
- the rationale sits at the `theme.ts` declaration and in the shipped lever description, where it
  gets read, framed so `'text'` reads as a choice;
- `test.ts` pins the default, pins the LEVER manifest default alongside it, and — the part that
  matters — asserts the default actually MEANS mirroring, tier by tier. A default of `'text'` that
  silently resolved icons somewhere else would satisfy the first two checks while shipping the exact
  thing the decision prevents.
- Tamper-tested: flipping the default now fails three assertions instead of zero.

**A second audit claim, checked and found FALSE.** #352 also reported *"`icon.tertiary` is already
at 3 while `icon.secondary` is at 4.5 — the family is internally inconsistent too."* It is not.
That is the **tier ladder** (primary 7 / secondary 4.5 / tertiary 3) mirrored faithfully from text;
the audit compared two different tiers as though they should match. Measured across all eight tiers:
icon mirrors text exactly under the default. No fix was needed and none was made — the ladder is now
asserted so it is not "corrected" later either.

**What is left of item 3: nothing.** No engine change was warranted. Recorded here rather than
silently dropped, so the next reader does not re-open it a third time.

**Gates:** `regen` + `--check` clean, `test.ts` **1209/0**, nb-regression exit 0, DTCG 899/899
aliases + 432/432 contracts, US-English clean.

## (2026-08-02) — interactive fill STATES drop to the non-text bar (#352, item 2 of 4)

**STATUS: engine.** Three lines of behavior change. **No color moves in any artifact** — the only
diff in `out/**` is `min` values on `interactive.<col>.fill.{hover,pressed,focused,selected}`
(4.5 → 3, and 7 → 4.5 in HC). The walk is untouched; what changed is what we *assert*.

**The rule.** `rest` carries the text bar; the other states carry only the non-text bar (SC 1.4.11).
Rest is the state the component is read in and it anchors the label, so it stays at 4.5:1. The other
states exist to signal a *change* from rest — 1.4.11 asks that a state be identifiable, not that it
re-clear a text floor it was never carrying alone.

**Owner call on the accessibility question, and it needs recording precisely, because half of it is
a deliberate exemption rather than a derivation.** The question asked was whether text on a fill
needs to meet contrast in the interactive states at all. The honest answer is that the two halves
are governed by different criteria and only one of them transfers:

- **The fills** — yes, exempt. SC 1.4.11 explicitly covers *"visual information required to identify
  user interface components and **states**"* at 3:1. That is this change.
- **The label on them** — no exemption exists. SC 1.4.3 applies to text and does not carve out
  transient states; hover and pressed are reachable states with visible text.

The owner's decision was to treat hover/pressed *text* as out of scope for 1.4.3 (option 3 of 3
offered). **That decision is recorded but is currently inert** — with the corrected scope below,
every example brand's `on-fill` clears 4.5 against all five fill states on its own. Nothing relies
on the exemption today. If a future brand does start relying on it, this is the paragraph that says
it was a deliberate product call and not an oversight.

**The scope error, which is the part worth carrying.** I first relaxed the fill *picks* as well as
the state contracts — `actionRest`, `iDestructiveRest`, and the bold semantic `foreground.*` fills
all moved to the non-text bar. That is wrong twice over, and each failure taught something the diff
cannot show:

1. **`border.focus` derives from `actionRest`** (`modes.ts:684`). Relaxing the rest pick moved the
   focus ring, which broke `fixtures/figma/nb` — the **New Balance regression target**, not a
   snapshot to regenerate. A fixture diff on `color/border/focus` is the tell.
2. **The bold semantic fills are ink-bearing surfaces.** Relaxing `foreground.danger`/`info` moved
   them lighter, flipping `text.on-danger`/`on-info` to the dark side, where the ink fallback
   escalated to **pure black** — violating the harshness invariant ("no pure black in standard
   modes", `test.ts` ~2509). Capping the fallback at N950 instead just traded that for 19 contrast
   failures. Neither is a fixable tension: those fills were never in scope.

The owner's own framing had the answer in it — *"a change in state from the rest state which DOES
need to meet contrast."* Rest pinned, states relaxed. Once scoped that way the NB regression, the
harshness invariant, and the preview contracts all hold untouched.

**Two traps for whoever edits `iFill`.**

- **`fillMin` applies to `rest` too.** The loop covers all of `FILL_STATES` including `default`→
  `rest`, so relaxing the parameter silently relaxes rest's own contract — the exact thing this
  change exists to preserve. Hence `stateMin` as a separate argument.
- **`stateMin` defaults to `fillMin`, and must.** `interactive.neutral` passes `neutralStrong ? … : 0`
  because a subtle grey fill is not held to any floor. An earlier version hardcoded `cfg.nonTextMin`
  for states and *raised* neutral's bar from 0 to 3, failing 27 contracts across the extreme brands.
  Opt in per call site; never assume the non-text bar is a floor everyone wants.

**A latent bug found here and deliberately NOT fixed** (one concern per PR — filing it so it is not
re-discovered from scratch). `onColor`'s pure fallback compares the two *soft* candidates to choose a
side, then escalates to the pure version **of that side**. Those are different questions: on the
`sm` fixture's dark destructive fill, N950 measured 4.26, lost to nothing, and escalated to pure
black at 4.60 — while legal pure white sat at 4.56. It reached for an ink the harshness invariant
bans to gain 0.04:1. The fix is to re-open the choice at escalation across the inks standard modes
actually permit (`pickMostExtreme([white, N950])`). It is currently unreachable — verified by
reverting it with the final scope in place, tests stay 1205/0 — because it only fires when a fill
pick moves. Anything that moves the interactive rest picks will wake it up.

**Gates:** `regen` + `--check` clean, `test.ts` 1205/0, US-English gate clean (90 files).

---

## (2026-08-02) — The add-face field was unstyled (owner-reported)

**STATUS: web.** #370's "Font family name" input shipped with only `flex`/`min-width` — no border, padding,
radius, background or font — so it rendered as a raw browser default beside styled controls. Owner spotted
it on the preview.

The field two tiers below it in the *same section* (`.tf-in`, the custom-face input on a binding card)
already carried the shared treatment. So the fix is to wear that class rather than restate its six
declarations: `tf-in tf-addin`, with `tf-addin` reduced to the width constraint alone. `tf-in` sets
`width:100%`, so `tf-addin` now says `width:auto` explicitly instead of relying on declaration order to
let the flex basis win.

**The lesson is about how it escaped review**, not about the CSS: #370's verification was entirely
behavioral — nine states, add / duplicate / reject / persist / bind / unbind / remove, all passing — and
every one of those assertions is blind to whether the control has a border. This is the same trap recorded
at #351 ("behavioral browser assertions miss visual regressions"), and it caught a new class of it: not a
changed layout but a **missing style**, which no geometry measurement flags because the element is exactly
where it should be. Cheap guard when adding a control: assert its computed border/padding/radius/font
against an existing peer, which is how this fix was verified.

---

## (2026-08-02) — Correcting the #355 audit count (my error, caught in review)

**STATUS: docs.** #372's entry claimed the contrast audit found **1** remaining failure app-wide. That
was wrong. The reviewer independently found **4**; a corrected re-run finds **23**. The `--faint`/`--muted`
fix itself is unaffected and was independently confirmed — this corrects the *audit* claim beside it, which
would otherwise be read as a baseline by whoever picks up #285.

**Three causes, all worth avoiding next time:**

- **Swallowed navigation errors.** Every click was `.catch(()=>{})`. Verified afterwards: 5 of 6 page
  clicks worked and "Color" silently stayed on Preview — so an entire page went unaudited while the run
  reported having visited it. **An audit that swallows navigation errors reports the pages it tried, not
  the ones it saw**, and it cannot tell you which.
- **Headline number came from a different set than the printed detail.** The script printed
  `worst.slice(0, 14)` but reported `totalFailing` as the result. Nothing was hidden at n=1, but the shape
  invites exactly this class of error.
- **The count is not brand- or state-independent.** The reviewer ran `aurora`, I ran "Start blank".
  `.mctx-mark.ok` only exists while the mode-context popup is open. Quoting a bare count without pinning
  brand + interaction state produces a number nobody can reproduce, including me.

**What the corrected audit actually shows** — and the split matters more than the total:

- **Dashboard chrome (this repo's own CSS)**: `.tf-stat.no` 4.27/3.85 · `.mctx-mark.ok` 3.46/3.12 ·
  `.cb-mark` ok 3.55/3.20 · `.cb-mark` no 4.59/4.14 · and `.tf-stat.ok` **passing** at 5.02/4.53. Every one
  is a **semantic status color** (success / warning / danger). #355 moved only the neutral greys, so the
  status palette has never been contrast-checked as a set — and one member passing by 0.03 says it sits on
  the line by accident, not design. That is the real unit of work for #285, not five separate fixes.
- **Style-guide specimens (`.sg-*`, 18 signatures)**: these render **brand-generated** colors, so the
  numbers move per brand. A specimen showing a brand color at its true value is being honest, not broken —
  counting them as dashboard defects is a category error. The live question underneath is that a generated
  color used as *label text* carries a text obligation the swatch does not, which is the same SC 1.4.3 vs
  1.4.11 line #352 is drawing in the engine. Flagged on #285 rather than silently classified.

The lasting lesson is narrower than "test more": **assert your navigation**. A verification harness that
cannot fail loudly will report success for pages it never reached, and every number downstream inherits
that silence.

---

## (2026-08-02) — The dashboard's own chrome clears AA (#355)

**STATUS: web.** `--faint` was **2.31:1** on `--paper` and `--muted` **4.36:1**, against AA's 4.5:1 — the
tool failing the bar it enforces on generated brand output. Both moved down; `--ink2`/`--ink` were already
fine and are untouched.

```
--faint  #a1a1aa → #6d6d74    2.31 → 4.63:1
--muted  #71717a → #55555a    4.36 → 6.68:1
--ink2   #3d3d44  unchanged          9.71:1
--ink    #18181b  unchanged         15.97:1     (all against --paper, the worse of the two surfaces)
```

- **#355 offered two resolutions and the measurement killed one of them.** Its "Done when" allowed
  re-scoping the convention "to only use these tokens where AA doesn't apply". Every one of the ~130
  uses is **9–15px text**, and WCAG large text starts at 18.66px bold / 24px regular — so nothing
  qualified for the 3:1 allowance and there was no escape hatch. Raising the values was the only
  option actually on the table. (Same text-vs-non-text distinction #352 is drawing in the engine, SC
  1.4.3 vs SC 1.4.11 — worth keeping the two consistent.)
- **The trap: fixing each token independently deletes a tier.** The lightest legal gray on this paper is
  ~4.5:1, which is roughly where `--muted` already sat. Darkening `--faint` to pass lands it on `#6d6d74`;
  a minimal `--muted` fix lands on `#6e6e76` — **the same color**. The ramp is therefore *shifted*, not
  patched: `--faint` parks on the AA floor and `--muted` moves clear of it, so four visually distinct
  tiers survive. Owner picked this over collapsing to a single muted tier.
- **Verified by walking the rendered DOM, not by reading CSS.** A static audit cannot see effective
  backgrounds — a token's contrast depends on whichever ancestor actually paints. The audit walks every
  element with a text node, resolves the real background by climbing until it finds an opaque one, and
  applies the large-text rule per element. **Zero `--faint`/`--muted` uses fail after the change** — that
  part held up under an independent re-run on a different brand.
- **CORRECTED (see the entry below): the "1 failure app-wide" figure this entry originally carried was
  wrong.** The audit under-counted; the real number is coverage- and brand-dependent, and the remaining
  failures are semantic STATUS colors, not neutrals. Do not use that figure as a baseline for #285 — the
  corrected list lives on #285 itself.
- **Checked and ruled out before editing**: no dark theme exists (single light `:root`), no
  `--faint`/`--muted` text sits on a dark background (darkening would have *broken* those), the plugin
  surface has no second copy of these tokens, and the one `background:var(--muted)` is a non-text
  indicator box that only gains contrast.
- **ADJACENT FIND, deliberately NOT fixed here** — belongs to #285, the broader dashboard WCAG audit:
  `.mctx-mark.ok` (the green ✓ status glyph, 12px bold) is **3.46:1 on `--panel` / 3.12:1 on `--paper`**.
  Left alone because it is a different token family from the one #355 names, and "just darken the green"
  is really "re-derive the status pair": its partner `.mctx-mark.no` **passes** (5.23 / 4.71) and the
  on-dark `.mctx-b.on .mctx-mark.ok` variant passes easily (11.10), so changing one of three needs a
  balance judgment, not a mechanical edit. Measured fix for whoever takes it: `#1f9d63` → `#197f50`
  (4.51 / 5.01) preserves the hue.

---

## (2026-08-01) — link ink stops being the button fill (#352, item 1 of 4)

**STATUS: engine.** Prerequisite for relaxing the bold fills. `text.link.*` is **byte-identical**;
the only artifact movement is aurora's `icon.link.*`, and it is a bug fix.

**Owner call, and it reversed mine.** I had recommended documenting the 4.5:1 fill bar rather than
changing it, on the grounds that relaxing it broke 35 assertions. That was wrong, and the reasoning
is worth keeping: *"we shouldn't make fills meet 4.5:1 just because it's programmatically set up
that way in our engine. If we need text to pass on fills, that's why we have `*.on-fill`."* The
failures were never evidence the bar was right — they were **three separate defects the over-gating
was masking**. I had let "this breaks tests" stand in for "this is correct."

**This item fixes the first of the three.** `text.link.default` did not merely resemble the button
fill — it **was** `actionRest`, the same object, then rated against the floor at the text bar. So a
text role's legibility was an accident of how the FILL happened to be gated. Relax the fill toward
its anchor and link text silently drops below AA in every brand and mode.

Link ink now derives its own step on the action palette at its own bar. Same anchor, so a link
still reads as the brand's action color; different floor, because ink and a fill are different
contracts. **Clamped, not `exact`** — an authored `actionAnchorStep` pins a FILL, and inheriting
that pin here would let a deliberate fill choice push link text below its floor.

**A latent bug fell out, and it is the more interesting half.** `icon.link.*` shares this
derivation, so with `iconContrast: '3:1'` the lever was moving the **reported minimum** while the
ink stayed text-gated: aurora emitted `accent.600` at 4.95:1 under a stated `min: 3`. A gate that
says 3 while showing you 4.5. Now `accent.500` at 3.3:1 — the lever governs the color. Aurora is the
only example brand that ships the lever, which is why it is the only artifact that moved.

**nb does NOT move, and that is correct rather than a miss** — its action anchor (550) already
clears both bars, and `pickBrand` keeps a passing anchor. My first test asserted every brand would
relax and failed on nb; the test's PREMISE was wrong, not the code. Rewritten to assert the
universal property (a looser floor can only relax, never darken) plus the observable case on aurora.

**The icon default stays 4.5:1 — deliberate, recorded so it is not "fixed" later.** Owner: icons
sit next to text and should match it; the `iconContrast` lever is the escape hatch. Verified the
lever is intact and comprehensive before relying on it: `icon.secondary` 550→450, `success` 550→500,
`warning` 600→500, `info` 550→500, `link` moves, while `icon.on-*` correctly holds 4.5 (that is the
on-fill contract) and `icon.*-subtle` stays ungated. `icon.brand`'s min drops to 3 but its step
stays 550 — because 550 already clears 3:1, not because the lever missed it.

**Tamper-tested:** restoring `linkBase = actionRest` reproduces the bug exactly — aurora's icon link
returns to 600 at 4.95 under `min: 3`, and the artifact round-trip breaks.

**Remaining (#352 items 2–4):** relax `foreground.*` + `interactive.*.fill.*` to `nonTextMin`, scope
the no-pure-black rule to ink-on-background, re-baseline NB (owner: re-baseline and record why);
then `field.border.hover`, a border sitting at a text bar while `field.border.rest` is already 3.

**The audit that found them:** of 82 roles gated at 4.5:1, 56 are genuinely ink and **16 are
non-text held to a text bar**. The evidence that this is drift rather than design sits inside one
family — `interactive.neutral.fill.*` uses `nonTextMin`, `interactive.*.on-inverse.fill.*` uses 3,
and `interactive.{primary,destructive}.fill.*` uses 4.5. Same concept, three bars. Classified rather
than pattern-matched: `interactive.*.overlay.*` looks non-text but is measured against
`text.primary`, so 4.5 is right there — its contract is "ink stays legible on me."

**Verified:** 1199 → **1205** tests; nb-regression PASS; `regen --check` 88/88; web typecheck clean;
US-English gate clean.

## (2026-08-01) — Staging a typeface from the UI (#287's deferred half)

**STATUS: web.** #287 shipped the engine field and explicitly deferred "the web UI for staging/removing
library entries" to a follow-up, mirroring #269 (engine `#280` → UI `#282`). This is that follow-up: an
add form under the library table, and a remove control on the rows that are allowed to have one.

- **The decided semantics needed no new logic, only an affordance.** Owner call, recorded on #287: only
  *unbound* entries are deletable. So the delete button's render condition is exactly `bind.unbound`,
  which #369 already computes — no cascade, no guard, no new state. A bound entry gets **no button at
  all** rather than a disabled one, because a disabled control invites the click it then refuses. The
  known "why can't I delete this?" cost is answered on the cell that already names the roles in the way:
  *"In the library and bound — re-point Display to something else to make this removable."*
- **The remove control lives in the FILL column**, which looks like an odd home for a row action until
  you try it anywhere else: a fifth column, or a button inside any fixed-width cell, pushes that cell
  past its token and breaks the `112/148/148` parity #363 had just established. The fill column absorbs
  slack, so the grid survives. Parity was re-measured in **all nine** UI states below, not just at rest.
- **Validation mirrors the engine rather than duplicating it.** `typefaceSlug` is imported from
  `theme.ts` instead of re-implemented, so the UI's duplicate check and the engine's throw agree by
  construction — including case-insensitivity (`fraunces` is correctly refused against `Fraunces`).
  The check runs against the **derived** list, not the authored array: a name already reachable through a
  role binding would be absorbed by the union and its row would never appear, which reads as "the button
  did nothing". Those two cases get *different* messages, because they are different facts — one is
  already staged, the other is already bound.
- **Harness caveat worth recording**: the Playwright pass selected `.tf-card` by `hasText: 'Mono'` and got
  the **Display** card. The lifecycle assertions (bound ⇒ not removable, tooltip present; unbound ⇒
  removable) hold regardless of which role is involved, so the run is still valid — but the face was bound
  to Display, not Mono, and the docs should say so rather than describe an interaction that did not happen.
- **Verified**, nine states, column parity `112/148/148/390` and zero scroll overflow in every one: add a
  face → row appears *Not bound — staged* with a remove control; duplicate of a **bound** face → refused
  with the "a role binds it" message; duplicate of a **staged** face, different case → refused with the
  "already in the library" message; whitespace-only → refused; **survives a reload** (it is brand state);
  bind it to a role → the control **disappears** and the explanatory tooltip appears; unbind → the control
  returns; remove → the row is gone. No page errors in any state.

---

## (2026-08-01) — Foundations lands on one column grid (#363)

**STATUS: web.** Leading & tracking and the typeface library both converted to the shared `.mtbl` format,
in one pass — which is what #363's sequencing note asked for, so Foundations would not end up with one
converted table beside unconverted card grids. All three tables now measure **exactly
`112/148/148/390`**.

- **`.mtbl` geometry, not `.mtbl` semantics.** These are mode-invariant primitives, so neither table gets
  mode columns — that would assert a dimension the values do not have, the same rule that keeps Category
  setup and Responsive out of this format. Columns are `Rung | Value | Used by | Specimen`.
- **Pairing the two conversions caught a stale claim that neither issue mentioned.** The library's
  standing copy read *"a face exists here exactly as long as a role below binds it… re-point the last
  role that used it and it disappears."* **#367 made that false three commits earlier** — a staged face
  now sits in the library bound to nothing. The copy is replaced, and `bindingOf()` distinguishes three
  states where the old code had two: bound here, bound only in another mode, and the new *staged*. The
  old fallback label for "no binding in this view" was `Bound by a mode override only`, which would have
  confidently mislabelled every staged face.
- **Three separate width failures, all the same root cause**, and none visible without measuring: an
  element's **intrinsic contribution**, not its declared `width`, sizes an auto-layout table column.
  `.mtbl-stick` declares `width:112px` with no `max-width`, so content wins.
  1. The token pill forced the Face column **112 → 215px**. Moved to the fill column.
  2. Long "Used by" text forced that column **148 → 166px**. `overflow:hidden` + `text-overflow` does
     **not** reduce a `nowrap` block's min-content width — only an explicit `max-width` does.
  3. Making the fallback list `nowrap` forced the fill column to **726px** and overflowed the table at
     1057px. It wrapped before the conversion; letting it wrap again fixed it, because for wrapping text
     min-content is the longest *word*.
- **Then parity itself had to be paid for honestly.** Capping widths produced `JetBrains …` and
  `Bound to Display +…` — an ellipsis through every row's primary identifier. Fixed by **wrapping rather
  than ellipsizing** (min-content becomes the longest word, so the cap still holds) and by dropping the
  `Bound to` prefix from cells sitting under a column already headed **Binding** — ~55px of a 124px
  budget spent restating the header. Better copy and a fixed layout from the same change.
- **The leading specimen is the one cell on the page that must WRAP** — leading is invisible on a single
  line — so it deliberately does not take `.mtbl-spec-t`'s nowrap+ellipsis. Verified each rung's specimen
  renders 2 lines at its own computed line-height.
- **KNOWN, PRE-EXISTING, NOT FIXED HERE**: editing a rung value does not refresh its specimen until the
  page re-renders — `apply()` rebuilds the theme but not the section. **Measured identically on `main`
  with this change stashed**, so it is not a regression from the conversion. The fix is the control/paint
  split #365 used for responsive sizing; it is a behavior change, not a format one, so it stays out of a
  format PR.
- **Verified**: all three tables `112/148/148/390`, `798/798` with no scroll overflow, no body scroll, no
  page errors; the value inputs measure 92px in a 148px cell with zero clipped (`scrollWidth` is not a
  usable clipping test here — #360); a staged face seeded through `localStorage` renders as the third row
  labeled *Not bound — staged*, flips the section note to the union wording, adds **no** binding card, and
  **is offered in all three role selects** — which is #287's own Verify criterion, confirmed end to end.

---

## (2026-08-01) — apply-but-warn reaches the anchor (#331)

**STATUS: engine + web.** **Zero artifact change** — `regen --check` 88/88. That is the load-bearing
verification, not a footnote: no committed brand pins an interactive anchor, so the new behavior can
only manifest where it was reported — on an authored pin.

**The inconsistency.** Every override in the app applies-then-warns. `contrastMark`'s own comment
states why: a UI that refused the option would be false assurance, because the same override is
authorable through `design.md`/`BrandInput`, which the engine accepts. The **anchor** broke that
rule — `pickBrand` substituted the nearest passing step, so picking 150 rendered 500 in the swatch,
the example, and every derived hover/pressed row. The Source select still showed 150. The one thing
you could never see was the consequence of your own choice, and the substitution protected nothing,
since the identical pin through `design.md` was honored anyway.

**Owner decision: apply-but-warn all the way through** — render the raw step, derive the family from
it, let the whole column fail contrast together, honestly.

**What makes that safe is AUTHORED vs DERIVED, and the code already drew that line.** `paAnchor =
modeAnchor('primary') ?? theme.actionAnchorStep` is `undefined` when nothing was pinned. So `exact`
applies only to a pin; an unpinned column still clamps — because there the substitution is the
engine choosing a sane default, not overruling anybody. Without that split this would have relaxed
every column in every brand.

**The bug this pass hit, and the general lesson.** The accent columns broke a test that pins *no*
anchor. Cause: `brandTheme` always resolves `anchorStep` (`e.anchorStep ?? interactiveStepFor(...)`),
so by the time `modes.ts` reads it, **authored and derived are indistinguishable**. Inferring
provenance at the point of use was the mistake; it now travels with the value as `anchorPinned`. The
built-ins need no flag — `actionAnchorStep` is passed through undefined-preserving, so presence *is*
provenance. Worth stating as a rule: when a normalizer fills in a default, the fact that it was
defaulted is information, and it dies at the normalizer unless something carries it.

**The UI warning had to be rewritten, not just kept.** It read *"the engine used 500 instead"* and
fired on requested ≠ effective — a condition that can no longer be true, since the pin is now
applied. It warns off the RESOLVED ratio instead, so it reports the real miss
(`2.84:1 against background.primary, needs 4.5:1`) and says the family derives from it.

**`tsx` does not typecheck.** 1183 tests passed over a genuine type hole — `r.min`/`r.ratio` are
optional on the web's role type and I dereferenced both. Only `tsc -p web` saw it. Same trap #353
logged a day earlier; it is worth treating "green suite" and "typechecked" as separate claims.

**Tamper-tested, both directions:** removing `exact` restores the substitution and fails all four
#331 assertions (the pin resolves to `.550` instead of `.100`); forcing every column to `pinned`
fails the unpinned-still-clamps assertion *and* the two pre-existing accent-column contracts —
which is the check that proves the provenance split is load-bearing rather than decorative.

**Verified:** 1177 → **1183** tests; nb-regression PASS; `regen --check` 88/88; web typecheck clean;
US-English gate clean (90 files).

---

## (2026-08-01) — Typeface library: a face can exist before it has a job (#287)

**STATUS: engine.** `typography.typefaceLibrary: string[]` — authored faces, independent of the three
role bindings. `deriveTypefaces` becomes a union of role-bound ∪ authored. Web UI is deliberately out of
scope, same sequencing as #269 (engine `#280` → UI `#282`).

- **Walk order is load-bearing, twice.** Role sets first, library appended last. (1) A face that is both
  staged and bound keeps its **role-derived** stack — reversed, a library entry would win the dedupe and
  a `mono`-bound face would emit the *sans* fallback tail, which is a silently wrong stack rather than a
  crash. (2) An empty library appends nothing, so every existing brand derives the identical list in the
  identical order. That is what makes the feature byte-additive, and `regen --check` confirms it: 88
  artifacts still byte-match.
- **The removal decision cost nothing to implement, which was the point.** Owner-confirmed: only *unbound*
  entries are deletable. The engine needs **no cascade code at all** for that, so #269's "no cascade
  needed" resolution stands. The absence is what is asserted: drop a still-bound name from the library and
  its primitive **survives**, because the role keeps deriving it. Both directions are in `test.ts` rather
  than implied — bound-and-dropped survives, unbound-and-dropped disappears.
- **One real (small) guess, documented and self-correcting.** A library-only face has no role to take a
  fallback tail from, so it gets the sans one. Staging a mono face before binding it gives it a sans tail
  until a role claims it; nothing consumes an unbound primitive's tail, and binding re-derives it. There
  is a test asserting exactly that transition rather than leaving it to be discovered.
- **Trap dodged in the schema, worth recording.** The obvious constraint for the entries was
  `"minLength": 1` — and it would have been the **only** `minLength` in `theme-schema.json` and
  **completely inert**, because the hand-rolled validator implements `enum`/`minimum`/`pattern` and not
  `minLength`. That is precisely the failure CR-04 documents two comments away in `emit-dtcg.ts`. Used
  `"pattern": "\\S"` instead, which the validator *does* enforce and which rejects both `''` and `'   '`,
  matching the engine's own guard. Verified by running the validator, not by reading it.
- **A second reformat trap**: rewriting `theme-schema.json` via `json.dumps` reflows the entire file
  (1,080 lines changed for a 5-line addition — the file uses inline objects `{ "type": "string" }` that
  `indent=2` explodes). Insert as text, not as a re-serialize.
- **Verified**: 16 new assertions (1177 → **1193**), `regen --check` 88/88 in sync, NB regression PASS,
  `tsc -p web` clean, US-English gate clean. Schema validator exercised directly on four inputs — a valid
  library, `''`, `'   '`, a bare string, and a number entry — rather than assumed from the schema text.

---

## (2026-08-01) — Weight availability moves to Preview as roles × faces (#362)

**STATUS: web.** Answers #328 Q2 ("delete or repurpose the Foundations weight scale?") from the direction
the owner's walkthrough proposed: the information was right, the *tab* was wrong. `renderWeightScale` was
#103 Phase B **advisory availability** — read-only information sitting on an editing tab — and it is gone
from Foundations.

- **It replaced a section rather than adding one.** Preview already had a "Weight roles" block
  (`tp-wgrid`): every role at its numeric, with a specimen — but only ever in the **text** face. So the
  work was not "build a new table on Preview", it was "give the existing one its missing axis". That
  reframing is what kept the diff small and is why the old `.tp-w*` CSS went out with the `.ws-*` CSS.
- **The axes flipped, deliberately.** Old: rows = the 9 CSS numerics, columns = the 3 fixed family roles.
  New: rows = the **5 weight roles the system actually ships**, columns = the **faces**. The old shape
  had a fixed column count and enumerated numerics nothing used; the new one puts the open-ended axis
  (faces) where `.mtbl-scroll` can take the overflow, which is what makes it survive #287's typeface
  library.
- **Mode-blind by decision, not by omission** (owner-confirmed). A role's numeric can be re-pointed per
  mode (`weightRolesByMode` — real, and emitted to Figma by `emit-figma-font.ts`), so role × face × mode
  is three axes into a 2D table. Resolution: **availability is a property of the FACE and does not vary
  by mode**, so the table's core fact stays true with base numerics, and a flag names any re-pointed role
  rather than silently presenting Light's numeric as the only one. Both branches of that flag were driven
  in the browser — two re-points → "2 roles are re-pointed … (emphasis, strong)", revert one → "One role
  is re-pointed … (emphasis)".
- **The face column set is a UNION across modes**, which is the one place mode-blindness would have lost
  something real: a face bound only in Dark still ships (or doesn't ship) these weights. Deduped
  case-insensitively on the primary family name, with the binding roles shown in the column header
  (`Inter display · text`).
- **The specimen #356 removed comes back here, once per face** — and it earns its place rather than
  decorating. In the default brand the `max` row (900) renders **visually identical to `strong` (700) in
  JetBrains Mono**, because mono stops at 800 and the browser falls back. That is the `○` mark being
  *shown* rather than asserted, so the legend now says so explicitly: a specimen matching the row above
  it is the fallback you were warned about.
- **Trap**: the CSS block is a **template literal**. A comment containing backticks (I wrote
  `` `tpw-samp` ``) silently terminates the string and produces two confusing `TS1005: ',' expected`
  errors pointing at CSS, not at the quote. The comment there now says so.
- **Verified**: Foundations is down to Typefaces / size ladder / Leading & tracking with zero `.ws-table`
  and no "Weight scale" text; Preview's table measures `112/148/269/269` = **798px**, no scroll overflow,
  no body scroll; every cell's computed `font-weight` and `font-family` match its row and column; no page
  errors.

---

## (2026-08-01) — Responsive type sizing moves to Layout (#361)

**STATUS: web.** A relocation, not a behavior change: `minViewport`/`maxViewport` are viewport thresholds
in px — the same kind of number as the breakpoints — not semantic type decisions, so they left
Typography → Styles for the Layout page. Closes the "Also noted" paragraph of #328, which was the only
place this was tracked.

- **It became a split block, not a transplanted section.** Layout is built from `controlSplitPage`, whose
  unit is `{controls, paint}` — a control column beside a preview node that repaints on every `apply()`.
  Dropping the old full-width `palSection` onto that page would have been the smaller diff and the wrong
  shape. The split was already latent in the section: the viewport fields are the control, and the "what
  fluid does" list is *literally a preview of what they do*. **This fixed something on the way**: as a
  `paint` the list repaints while the number field keeps its DOM, so the field **holds focus** through a
  commit (verified `document.activeElement` is still the input after `change` → `apply()`). The old
  section rebuilt whole.
- **The #271 shared-across-modes note did not come with it, deliberately.** That note disclosed an
  anomaly — one section writing global state on a page where everything else is mode-scoped. Every
  control on Layout (`layout.breakpoints`, `.columns`, `.containerMax`, `.containerNarrow`) is already
  global, so on the new page there is no anomaly to disclose and the note would assert a contrast that
  does not exist. Its old text even said "unlike the faces and weights above", which are no longer above
  it. `.te-shared-note` is still used at `main.ts:3033`, so the CSS stays — no orphan.
- **A new empty state was required, not gilded.** The old code wrapped the list in `if (uniq.length)`,
  which was fine when the list sat under its controls — nothing scaling just meant a shorter section. In
  a two-column split, the same branch leaves a **blank half-page** beside populated controls. The preview
  now says why it is bare and how to populate it. Toggling fluid off → 90px of explanation; back on →
  11 rows again.
- **Moved `paintFluidPreview` into the layout-preview group** rather than leaving it 1,600 lines from its
  siblings: that group opens with a comment enumerating its members, so a fourth one sitting elsewhere
  would have quietly falsified the comment. The enumeration was updated with it.
- **No pointer left on Styles**, which #361 asked to decide. This repo has no "moved to X" pattern —
  cross-references live inside a section's own `sub` prose (`renderEasingEditor`, `renderShadowEditor`)
  and only where the reader needs the other thing to understand *this* thing. Nobody needs responsive
  sizing to understand semantic styles. One line to add if that reads wrong.
- **Trap for whoever re-verifies this**: on the Layout page `.cs-ctl-col .adv-num` is **not** the min
  viewport field — the breakpoint editor uses the same class, and `.first()` silently grabs breakpoint
  0. A first pass "verified" focus retention and live clamps against the wrong control and read a green
  result: the clamp string legitimately did not change, because a breakpoint had been edited. Scope the
  selector to the `.psec` containing "Responsive type sizing".
- **Verified**: Styles has zero responsive markup and zero `.fz-list`; Layout has four split blocks in the
  order Breakpoints → **Responsive type sizing** → Grid columns → Container caps; min viewport 360 → 480
  rewrites the clamps live (`1.9392rem + 1.326vw` → `1.8rem + 1.5vw`); responsive preview 492/492 with no
  overflow; no body scroll; no page errors. The Breakpoints preview overflows 492/501 — **pre-existing**,
  measured identical on `main` with the change stashed, so left alone.

---

## (2026-08-01) — The full type ramp gets one home, one direction, one specimen

**STATUS: web.** Three owner-directed changes to the generated ramp, all display-only. Branched from
`main` alongside the nudge-range PR; they touch different regions of `main.ts`.

- **One home.** The ramp came off the Styles aside — `renderScreen`'s fourth argument is now `() => []`
  on every typography tab. #358 kept it there on the doc-26 rule that a section carries its own
  specimen in context; the Preview tab satisfies that rule now, and a ~220px aside column was never
  an honest place to show a 160px display line beside five mode columns. Measured after: the content
  column is **unchanged at 850px**, so the aside was a separate region rather than a column stealing
  width — which means the 800px table budget the nudge PR was measured against still holds.
- **Largest first**, matching the size editors on Styles. The safety is in the sort being **stable on
  size alone**: rows sharing a size — the weight roles, and the italic/link variants — keep their
  existing relative order, so only the size progression reverses. Sorting on anything richer would
  have reshuffled them. Verified: display 160→48, and body's twelve rows come out
  `18,18,18,18,16,16,16,16,14,14,14,14` with each same-size run intact.
- **One specimen string.** `rampSample` shortened as the size climbed ("Type" at 80px+, "Typography"
  at 40px+) and swapped to `const token = 16;` for `code`, so no two rows compared the same
  letterforms — which is the whole reason to stack a ramp. Now `The quick brown fox` everywhere,
  including `code`. `.tr-samp` already clipped with an ellipsis, so the big rows show real letterforms
  cut off rather than a different, shorter word — which is what the owner asked for ("The quick brown
  fox... is for all"). **The `code` row is the one place to push back**: it no longer demonstrates the
  mono face doing its actual job. One line to revert if that reads wrong at size.
- **Verified**: 0 ramp blocks on Foundations, 0 on Styles, 7 on Preview; descending within every
  category; exactly one distinct sample string across all 38 rows; six `.mtbl` tables still
  `112/148/148/390`; no horizontal body scroll; no page errors.

---

## (2026-08-01) — Category leading/tracking nudges widened to ±2 rungs

**STATUS: web.** Owner-directed, UI only. The category setup table offered three nudges
(`tighter / default / looser`); the engine has always accepted `[-5, 5]`, so the UI was
under-offering what the system could already do.

- **Zero engine change, and that is the point.** `shiftRung` clamps at the ends of the ramp and the
  validator at `theme.ts:1032` bounds the shift to `[-5, 5]` — both already true. `test.ts` covers
  ±5 clamping and the fractional-shift throw. So this is five options where there were three, and
  ±2 rather than ±5 because both ramps are six rungs: past two steps the clamp makes further steps a
  no-op from most starting points, and offering a control that does nothing is worse than not
  offering it.
- **An out-of-range authored value no longer silently rewrites itself.** A hand-authored `3` matched
  no option, so the select displayed the first one and would have written `-2` on the next change —
  a pre-existing bug the old ±1 range had too. Fixed the way `renderPerModeSelect` already does it,
  except better: one `nudgeLabel` formatter serves every step, so `3` renders as "3 looser" — the
  same shape as "2 looser" — and needs no "(custom)" escape hatch at all.
- **The label wording was decided by measurement, after a visual regression the geometry check
  missed.** First pass used "much tighter" and widened the column cap 84px → 112px. Two failures,
  neither caught by `scrollWidth > clientWidth`: the label still clipped (the chevron padding eats
  into the box without growing `scrollWidth`), and the wider column pushed the table from 784px to
  840px inside an 800px pane, scrolling the LINK column out of sight. Measured the real budget —
  "much tighter" needs 118px, the table has ~8px of slack per nudge column — and numbered the steps
  instead: "2 tighter" needs 91px, cap is 92px, table lands at exactly 800px with no scroll.
  **The lesson is narrower than "assert what is on screen": a select's clipped text is invisible to
  scroll-width checks, and a control that grows can regress a NEIGHBOR that is nowhere near it.**
- **Verified** on the default demo brand: 5 options with the right per-field wording (looser vs
  wider), `+2` moves display leading `tight 1.05× → compact 1.25×` where `+1` moves it to
  `snug 1.15×` (two rungs vs one, not a bigger single step), an authored `3` seeded through
  `localStorage` renders as "3 looser" and stays selected, no clipped selects, no table scroll.

---

## (2026-08-01) — Leading & tracking split across the two tabs

**STATUS: web.** Not a restyle — the section was doing two unrelated jobs and one of them had become
unreachable. Stacked on the Preview tab (#358), which is still open and touches the same dispatch.

- **The bug that made this urgent.** `renderLeadingTracking` swapped itself for a per-mode re-point
  editor whenever `currentMode !== 'light'` (#296). #350 then hid the mode switcher on Foundations,
  because Foundations is primitives and primitives do not vary by mode. Both decisions are right;
  together they stranded the section. Measured on Foundations with the authoring context left in Dark:
  `{ switcherVisibleOnFoundations: false, leadingShowsRepointSelects: 12, leadingShowsNumericInputs: 0 }`
  — the numeric editor was unreachable without detouring to Styles, switching to Light, and coming
  back, and the switcher that put you in Dark was gone. Now: 12 numeric inputs, 0 selects, regardless
  of authoring context.
- **The split follows the tab line already drawn.** Rung VALUES are mode-invariant primitives, so they
  stay on Foundations and no longer branch at all. RE-POINTS are per-mode bindings, so they move to
  Styles as two `.mtbl-*` tables (line height, letter spacing) where the mode axis actually exists.
- **Selects, not steppers.** A re-point is an enum choice with an Auto state — doc 26 puts 3+ options
  in a select. Steppers would imply the rungs are an ordered scale you nudge along, which is the
  Foundations operation, not this one.
- **Light's cell is text, and that asymmetry is deliberate.** In the size and weight tables Light is
  editable because the table can write the brand-level field. Here it cannot: the value is a shared
  primitive, so the cell shows the number and its title points at Foundations. Reading a row —
  `tight | 1.05× | relaxed` — the baseline column is what the substitution is measured against.
- **A select's intrinsic min-width is its widest OPTION, and that silently broke column parity.**
  Measured 166px against the stepper tables' 148px token: the table is auto-layout, so `min-width` on
  the `td` is a floor the content can exceed. Two fixes, both needed — clamp the control to
  `calc(var(--tbl-col-mode) - 24px)` (24px being the cell padding), and cut the option labels down to
  bare rung names. Labels alone were not enough: a closed select renders the same text it lists, so
  `relaxed · 1.65×` ellipsised to `relaxed · 1...`, truncating the one thing a cell must always say.
  The values live one column to the left on every row, so nothing is lost. Six tables now measure
  `112/148/148/390` identically, asserted as a set-size-1 check rather than by eye.
- **Verified end-to-end on the "Start blank" brand with Dark added**, not just structurally: re-pointing
  `normal` → `loose` moved 21 of 38 ramp rows, and the diff is confined to the Dark column with Light
  byte-identical — which is what a per-mode re-point means. Zero clipped selects, no horizontal body
  scroll, no page errors.
- **Still stranded, same shape, out of scope here:** `renderTypefaces` on Foundations keeps its own
  `perMode` branch and its "Editing X's bindings" note. It is the next one, and it wants the families
  table the wireframe already sketched — one concern per PR.

---

## (2026-08-01) — Typography Preview tab

**STATUS: web.** Third tab on Typography — everything the system generates, at size, in every mode.
Stacked on the weight-roles table (#357) for a reason given below.

- **Read-only by design.** The editors live on Styles; giving a value two homes is how they drift.
  The tab exists because the ramp was squeezed into the Styles aside, where a 160px display line and
  five mode columns have nowhere to go.
- **It carries the specimens the tables cannot.** A weight number is meaningless as digits and the
  size tables show px rather than type. The tables are where you CHANGE a value; this is where you
  SEE it. Faces, weight roles, then the full ramp at width.
- **The mode switcher hides here, and it falls out of the existing rule rather than a new one.**
  #268 hides the switcher where no mode-varying CONTROL exists. Preview is read-only and shows every
  mode side by side, so it qualifies for the same reason Foundations does, reached from the other
  direction. The predicate became `typeTab !== 'styles'`.
- **The Styles aside keeps its ramp.** Doc 26 wants a section to carry its own specimen in context,
  and tabs are exclusive so it is never rendered twice at once. Removing it would be subtractive work
  nobody asked for; restoring it later is one line either way.
- **I tried to avoid stacking and the dependency turned out to be real.** #357 was still open, so I
  branched from `main` to dodge a stacked rebase — then wrote the tab against `.mtbl-*`, the class
  names #357 introduces. On `main` those rules do not exist, so the Faces table silently lost every
  table style: measured `min-width: 0px` where the token says 112, and a 393px table inside an 800px
  pane. Rebased onto #357 and it measures 112 immediately.
  **The tell was that `var(--tbl-col-name)` resolved to nothing** — an undefined custom property makes
  the whole declaration invalid rather than erroring, so the column just quietly collapsed. Worth
  remembering: a missing class and a missing custom property both fail silently and look like a
  layout bug.
- **Verified by asserting what should be ON SCREEN**, not just that clicks work — the lesson from the
  three visual regressions earlier today: 3 tabs; switcher visible on Styles and hidden on Preview;
  aside ramp still present on Styles; sections Faces / Weight roles / The full type ramp; 3 family
  rows; 5 weight rows rendering at 300/400/600/700/900; ramp at full width; **zero editable controls
  on the tab**; sticky columns 112px throughout. No page errors.

---

## (2026-08-01) — Weight roles converted to the per-mode table

**STATUS: web.** Second table in the format, and the first real test of whether it generalizes.

- **The constraint is axis-specific, and pretending otherwise would have invented a rule.** Sizes must
  stay strictly increasing — the engine *throws*. Weight roles need not: verified directly that
  `weightRoles: { default: 700, strong: 300 }` builds fine, and crossing is only a UI **warning**. So
  the weight steppers bound at the ends of the scale (100/900) and never on a neighbour, and the
  existing order warning is now the only thing reporting a crossing. A neighbour bound here would have
  looked consistent and been a lie about the system.
- **One stepper implementation, not two.** `stepCell` takes `canDown`/`canUp` from its caller, so the
  geometry is shared and only the rule differs. `sizeCell` now delegates to it — the alternative was
  two implementations that look identical until one drifts.
- **The `.szt-*` → `.mtbl-*` rename finally earned itself.** It was deferred deliberately when the
  wireframe raised shared widths, on the grounds that a second table did not exist yet. It does now,
  and reusing "size table" classes for weight roles would have been actively misleading. 51 renames,
  mechanical. The Customize toggle row keeps its `szt-head` naming — it belongs to the sizes section,
  not to the table.
- **Shared geometry, measured across all four tables:** exactly one distinct sticky-column width
  (112px) and one distinct mode-column width (148px) over display / title / eyebrow / weight roles.
  That is the down-page consistency the owner asked for, and it holds because both tables read the
  same `--tbl-col-*` custom properties.
- **A weak assertion, caught and strengthened.** The first pass "proved" a pinned cell holds while the
  baseline moves — but both landed on 200, so a *following* cell would have passed identically. Re-ran
  with the pin two steps above the baseline: dark held at 500 while the baseline went 300→200, then
  followed to 200 after reset. The `.pin` class was the only sound part of the original check.
- **The US-English gate caught a CODE COMMENT, and it was right to.** CLAUDE.md exempts comments —
  but this build does not minify, so JS comments survive into `web/dist/main.js`, which the gate scans
  because that is what ships. The gate cannot tell a comment from UI text inside a bundle, and should
  not try. **The practical rule for `web/src` is US English everywhere, comments included** — the
  exemption holds for engine code, which is never bundled. Worth knowing before the next surface moves
  into the bundle.
- **The specimen came back once the constraint was corrected.** I first dropped the per-row
  `The quick brown fox` sample, justified on ROW-HEIGHT parity across tables. The owner corrected that:
  **column-width parity is what matters down the page, row height is not.** With the justification
  void the sample returns — placed in the trailing FILLER column, which already absorbs leftover width,
  so the sticky and mode columns stay byte-identical to the size tables (measured: 112 / 148, one
  distinct value each across all four). With many modes the filler shrinks and the sample degrades
  instead of squeezing the cells.
  Worth noting how weak the original reasoning was: I invented a constraint, used it to justify
  removing something useful, and only the owner's correction surfaced it.

---

## (2026-08-01) — Type-size editor: fixes from the deployed build

**STATUS: web.** Owner reviewed #354 running on the preview and logged seven issues. Worth recording
that these were found by *looking at the deployed page*, not by any gate — every one of them passed
typecheck, tests and the browser assertions I wrote, because I asserted behavior and never measured
layout.

- **`[object Object]` in the display-ceiling select.** Lever `options` are `{value, label}` objects and
  I stringified the object. The manifest labels are also internal jargon ("display.sm (1 rung)"), so
  rather than use them the options are now priced — `2xl — 128px`. That needs ONE candidate build at
  the largest ceiling, because the live ramp is trimmed by the current ceiling and cannot price the
  options above it; the display base steps are not uniform on the ladder (48→64 spans two), so
  extrapolating would have been wrong.
- **Description stranded below the controls.** `knob` renders its description *after* the body, which
  reads fine under a single field and badly under a card grid — you reach the explanation after making
  the choice. A local `fieldBlock` puts label + description above the controls. Deliberately local:
  changing `knob` would move the description on every control on every page.
- **Toggle row read "switch · state · orphaned number".** The size now sits between the switch and its
  On/Off readout, by inserting before `.knob-val` rather than appending.
- **The baseline column was tinted** and the size column drifted right with one mode. Both came from
  the same root cause: `width:100%` with few columns hands all the slack to the last one. A trailing
  filler column absorbs it, so the size column (112px) and every mode column (148px) hold identical
  widths at one mode and at five — measured, not eyeballed.
- **Mode columns now scroll rather than compress.** 112 + 5×148 = 852 against a 798px pane, so the
  container scrolls at five modes and fits four. That is the threshold the owner asked for, and it
  falls out of the fixed widths rather than being hardcoded.
- **Both toggle rows now read the same way, and the second instance of the same coupling is fixed.**
  Range put its label INSIDE the toggle wrapper before the On/Off readout; Customize appended it
  after — so one row read "switch · what it is · state" and the other "switch · state · what it is".
  Alignment was off for a related reason: `.knob-body` carried `margin-top:8px`, spacing that belongs
  to the KNOB layout (where the body follows a label), not to the body component. Scoped it to
  `.knob > .knob-body`. Verified empirically rather than assumed: every `.knob-body` in the app is a
  direct child (3/3 on Elevation, 4/4 on Size & radius) and still computes 8px, while the two outside
  a knob now compute 0. Both rows measure 0px centre-offset on every sibling.
  **That is the same bug as the toggle selector, one commit apart** — container styling baked into a
  component, invisible until the component is used somewhere else. Worth watching for in the rest of
  the kit before the next table conversion moves more components around.
- **The two toggles had silently become native checkboxes — caused by the fix two bullets down.**
  The toggle styling was scoped `.knob input.toggle`, so `toggleField` renders as a plain checkbox
  anywhere outside a `.knob`. Moving this section from `knob` to `fieldBlock` (to get the description
  above the controls) therefore stripped both toggles without touching a line of toggle code. Fixed by
  unscoping the selector to `input.toggle`: a component's appearance must not depend on its container,
  and widening only ADDS matches so no existing toggle can regress. Every `input.toggle` in the app
  comes from `toggleField`, which always wants that styling.
  **The lesson is the coupling, not the typo:** container-scoped component CSS means any layout change
  can silently downgrade a control, and nothing in the type system or the tests will say so.
- **The "outside range" rows had silently vanished — a real regression, not a styling gap.**
  `headingRows` read `theme.typography.composites`, which contains only rungs that SURVIVED
  `displayCeiling` / `titleFloor`. A trimmed rung is not in there at all, so it could never render.
  On the deployed build a `md` ceiling showed two display rows and no sign of the four it had removed,
  which reads as "this brand has no lg display" rather than "lg is switched off". Fixed by taking the
  row list from a candidate build at the WIDEST possible range and marking anything missing from the
  live set. Three fallback attempts, because widening can legitimately fail: `titleFloor: 16` is
  incompatible with `typeScale: 'compact'`, and a pinned size can collide with a neighbour that only
  exists at the wider range — each fallback degrades to the previous behavior, never a broken one.
  **The wireframe had this and the build lost it**, which is the second time in two rounds that a
  behavioral browser assertion passed over a visual regression.
- **Column widths are tokens now, ahead of the other tables.** `--tbl-col-name` / `--tbl-col-mode` in
  `:root`, so weights / leading / tracking consume the same two values and the tables stack on one
  grid down the page. Worth doing *now* rather than later for a specific reason: the SIZE table is the
  widest of the four, so its numbers are already the binding ones — its stepper cell needs ~132px
  against ~90px for a weight select and ~130px for a leading select, and its row labels are the
  shortest (`2xl` ≈ 46px against `emphasis` ≈ 82px). The values are therefore very likely final, which
  is what makes a token honest rather than speculative. Deliberately NOT done: renaming `.szt-*` to a
  generic prefix or extracting shared table markup — that stays speculative until the other tables
  exist and their real structure is known.
- **Trap: backticks inside the CSS.** The stylesheet is a template literal, so a backtick in a CSS
  comment terminates it. `tsc` caught it as a stray syntax error two thousand lines away from the
  cause.

---

## (2026-08-01) — The type-size editor (shape · range · per-size table)

**STATUS: web.** The UI half of #353, designed across several wireframe rounds with the owner. Gives
`typography.sizes` and `modeLevers.*.typeSizes` their first editing surface.

- **Shape / range moved from Foundations to Styles.** `typeScale`, `displayCeiling` and `titleFloor`
  lived in `renderSizeLadder` on Foundations. They govern the table, so they moved to sit with it —
  which leaves Foundations holding *only* the ladder. That is a strictly better fit for #268: the tab
  is now genuinely primitive, which is the condition its no-switcher rule turns on.
- **Steppers, not selects, and this was the owner's idea.** A filtered dropdown silently omitted
  illegal values and never said why. `− 128 +` with the button disabled when the next ladder step
  would breach the floor or collide with a neighbour puts the constraint **in the control**. It also
  removed the need for the group-shift control that three rounds of wireframing could not make
  legible — deleted rather than rescued.
- **The claim that killed the shift was mine and it was wrong.** I argued cell-by-cell editing could
  not move a whole ramp, so a shift was load-bearing. The owner asked whether you could bump the
  bottom one and work up. You can: the smallest size has no lower neighbour, so each step opens the
  gap for the next. Verified against the engine before conceding — every intermediate state is legal.
- **Shape cards are trial-built, not blanket-blocked.** A pinned size is absolute (#353), so changing
  shape *can* collide. Rather than a dialog after the click, each card builds a candidate theme with
  the pins in place and disables **only** if it would actually throw. Verified: pinning title 2xl to
  36 disables Expressive alone and leaves Compact available. Blocking on "pins exist" would have
  over-refused in the common case.
- **No native dialogs.** The first draft used `confirm()` — the only one in the entire app, so a new
  pattern rather than an existing one. Replaced with the inline disabled-card + release affordance,
  which also matches how the steppers state their own limits.
- **Verified in a browser, every branch.** Tables hidden until toggled (0 → 3); dark 160→144 while
  light held; badge and pin styling correct; Foundations left with the ladder and no shape cards;
  shape switch moves the live ramp 48→56; the blocked path engages and clears on release. Zero page
  errors throughout.
- **Review follow-up.** The `as any` casts reaching `brandState.typography.sizes` /
  `modeLevers.*.typeSizes` were not covering a real type gap — both fields are properly typed in the
  engine. They were routing around `group`/`variant` being plain `string`. Narrowing the parameters to
  `PerModeSizeGroup` removed **every** cast on the new surface and restored compile-time checking on
  it for free. Also: this PR described itself as "web-only, no engine change" while the diff touches
  `theme.ts` — a two-line `const` → `export const` on `HEADING_SIZE_FLOOR` so the web layer reads the
  same floors rather than duplicating them. Behaviorally nothing, but the claim was imprecise.
- **Still open:** contrast. `--faint` on `--paper` is 2.31:1 and `--muted` on `--paper` 4.36:1 against
  AA's 4.5 — that is the `.pfk` convention and every `.psec-d`, so it fails app-wide rather than here.
  Owner's call to fix globally; worth its own issue.

---

## (2026-07-31) — Brand-level per-size overrides (`typography.sizes`)

**STATUS: engine + schema.** Owner-directed, out of the type-editor design sessions. Prerequisite for
the UI: the editing table's baseline column has nothing to write to without it.

- **The asymmetry ran the wrong way.** A heading size could be pinned per MODE (#328) but not at the
  brand level — the only baseline sizing levers were `typeScale`, `displayCeiling`, `titleFloor`. So a
  **single-mode brand, which is the common case, could not tune its ramp at all** while a multi-mode
  one could. Reserving the flexible path for the rarer setup is backwards.
- **Ordering: derive → typeScale shift → brand overrides → per-mode overrides.** Modes now deviate
  from the *customized* baseline rather than the derived one, which is what anyone would expect.
- **Pins are ABSOLUTE, and that has a consequence worth designing for.** A pinned size does not travel
  with `typeScale` — same as the per-mode map. So changing the scale with sizes pinned can collide,
  and the ramp check rejects it. That is correct (silently re-shifting a value the author fixed would
  be worse), but it means a UI cannot treat the scale preset and the per-size table as independent
  controls: changing the preset must say what will break and offer to release the pins.
- **The error now blames the pin, not the scale.** The existing ramp message sent you to `typeScale`
  for a collision `typeScale` did not cause. It branches on whether the rung is pinned.
- **A no-op override throws.** An override on a rung trimmed by `displayCeiling`, or on `title.2xs`
  when `titleFloor` omits it, is rejected rather than silently doing nothing — the #341 failure shape
  on a new axis. Tracked with a `consumed` set rather than a membership pre-check, so it stays correct
  as set-membership rules change.
- **`PER_MODE_SIZE_FLOOR` → `HEADING_SIZE_FLOOR`.** It governs both tiers now; the old name asserted
  something false.
- **Two traps this pass, both caught by tooling rather than by reading.** `tsx` does not typecheck, so
  1177 tests passed green while `group` (a `TypeGroup`, all seven) was indexing a heading-only map —
  only `tsc -p web` saw it. And the US-English gate rejected `neighbour` in a new *thrown error
  string*, which is user-visible text inlined into the web bundle. Both gates earned their place on
  the same commit that added the feature.
- **`out/` is byte-identical** — no brand fixture uses `sizes`, so this is covered by unit tests.

---

## (2026-07-31) — The type ramp shows every mode side by side

**STATUS: web.** Second piece of the UI phase, owner-chosen shape: all modes, every row.

- **What was wrong with the old ramp.** It rendered whichever mode `currentMode` happened to be, so a
  per-mode deviation was only visible if you already suspected one and went looking. That is the wrong
  default for an axis the engine can vary five ways (`families`, `weights`, `lineHeights`,
  `letterSpacings`, `typeSizes`) — and it is the specific reason per-mode SIZES (#328/#347) were
  invisible in the UI despite shipping. The mode axis is now a property of the table, not the session.
- **Every row shows every mode, including modes where nothing differs.** Confirming "identical
  everywhere" is usually the thing you actually want, and a table whose shape shifts as you edit is
  harder to read than a wider one that doesn't. No difference highlighting — deliberately the plain
  side-by-side of the two options offered.
- **The subtle bit is the fluid pair.** `sizePx` and `sizeMinPx` must be read from the SAME tier: take
  the size from the mode and the endpoint from the brand and you print an incoherent range — the exact
  incoherence #347 fixed in the engine, re-introduced at the display layer. The fallback is written so
  a mode that re-sizes without a recorded endpoint renders STATIC rather than borrowing the brand's.
- **This does NOT retire the switcher on Styles** (#268): the editors still resolve against
  `currentMode` and WRITE per-mode overrides. Seeing every mode removes the need to switch for
  READING, never for EDITING.
- **Verified end-to-end in a real browser, not just by rendering it.** The first pass proved little —
  the demo brand is light-only, so the table drew one column. So: enabled dark through the UI, switched
  the authoring context to dark, changed the `strong` weight role to 100, and confirmed **only the dark
  column moved** (700 → 100) while light held at 700, both visible at once, zero page errors. A
  single-column screenshot would have "passed" while proving nothing about the per-mode path.

---

## (2026-07-31) — Mode-switcher scope: hide it where nothing varies (#268)

**STATUS: web.** First piece of the UI phase, and it **closes #268** — a decision issue explicitly
blocked on "the primitive-vs-semantic audit, which supplies the per-page facts this decision needs."

- **The audit is the durable part.** Per-mode-capable axes are exactly the `ModeLevers` keys —
  `radius`, `families`, `weights`, `lineHeights`, `letterSpacings`, `tempo`, `shadow`, `density`,
  `typeSizes` — plus color. Cross-referenced against the pages, **two surfaces carry a switcher that
  can never do anything**: `layout` (nothing layout-related appears in `ModeLevers` or carries a
  `*ByMode` field — mode-invariant outright, not merely primitive) and `typography → Foundations`
  (ladder, faces, weight numerics and leading/tracking rungs are all primitives).
- **The rule needed no new taxonomy.** #268's candidate — *modes live in the semantic layer, so a
  primitive surface shows no switcher* — lands on a line the UI already draws: the Foundations/Styles
  split from #272. Implemented as a **predicate**, not a per-page flag, so placement is derived from
  what a page contains and a new page inherits the right answer instead of needing a decision.
- **Typography → STYLES keeps the switcher, and that is not an inconsistency.** I had claimed a
  side-by-side per-mode ramp would let Typography drop it entirely. Checking before building showed
  all three Styles editors resolve against `currentMode` and WRITE per-mode overrides
  (`renderWeightRoles` 4 refs, `renderCategorySetup` 2, `renderResponsiveEditor` 1). Showing every
  mode at once removes the need to switch for **reading**, never for **editing** — an editor still
  needs one mode to write into. The claim was wrong; the correction cost one grep.
- **Hidden, never disabled.** A greyed-out switcher still asserts the page has modes and merely
  refuses. `currentMode` is untouched, so leaving and returning restores the mode you were in.
- **The trap: the tab switch is header chrome, not just body.** Page nav repaints the strip free via
  `build()`, but the Foundations/Styles segmented control sits *below* the header and only called
  `renderWorkspace()` — so the strip would have gone stale on exactly the transition the rule governs.
- **Verified in a real browser, not by reading the predicate:** Palettes/Motion visible,
  Typography→Foundations hidden, Typography→Styles visible, Layout hidden, zero page errors.
- **Next in the UI phase:** the side-by-side per-mode ramp on Styles (owner-chosen shape: all modes,
  every row). `typeSizes` remains unexposed — no `modeLevers` lever is surfaced in the web UI yet.

---

## (2026-07-31) — US-English gate for shipped text

**STATUS: engine + web + CI.** Owner-directed: keep en-GB spellings tracked and fixed rather than
re-discovered. The rule has been re-derived by hand four times (#162 → #260 → #302 → #310) and three
of those passes missed something, which is the argument for a gate rather than another careful read.

- **The ad-hoc scan I ran first under-counted, in this very pass.** It deduplicated by word and
  reported 9 `colour` hits in the bundle; the gate found **8 distinct shipped hits** the dedupe had
  collapsed, including three separate `brand colour name` throws. Encoding the check found more than
  running it by hand — one iteration after I had already "checked."
- **Fixed at source, all user-visible:** five thrown error messages (`theme.ts` ×4, `color.ts` ×1 —
  these surface in the web UI), the Fonts help text (`Personalisation` → `Personalization`, which is
  also the correct US Windows label), and two shipped CSS comments. Two printed test names went with
  them for consistency. **Code comments stay exempt** — the carve-out is deliberate, and `scale.ts`
  already had `neighbours` long before this.
- **The last open decision is closed: everything shipped is now gated.** The gate first shipped with
  `theme-schema.json` (15 hits) and `engine/README.md` (31 hits) *reported but never fatal*, because
  CLAUDE.md recorded the first as an explicit open decision and the second is neither UI nor an
  emitted artifact. The owner then called it — convert both. 64 replacements later they are clean and
  **folded into the gated set** (91 files), the reporting tier is gone, and the CLAUDE.md carve-out is
  rewritten to point at the gate. A surface that is clean but ungated is only a surface waiting to
  regress quietly, so there was no reason to keep the tier once it was empty.
- **The schema conversion was verified as prose-only before it ran:** a walk confirmed every hit sat
  in a `description` field, never a key, enum value or `$ref` — so the contract itself is untouched
  and `regen --check` stayed at 88/88.
- **Scope is IMPORTED from `regen.ts`,** not restated. `SCHEMA_ARTIFACTS`/`ENGINE_ARTIFACTS` are now
  exported and consumed by the linter, so a new emitted artifact comes under the gate automatically.
  A copied list would have drifted, and a gate with a stale scope reports green because it stopped
  looking — the #281 shape.
- **Pattern scan, not a word list**, per the documented trap: `colour|grey|behaviour` misses
  `generalised`, `tokenisation`, `synthesising` (all of which the README actually contains). The
  linter scans `-is(e|ed|es|ing|ation)`/`-our` and subtracts a false-positive set, so it fails toward
  over-reporting. Adding to `NOT_EN_GB` is the correct fix for a false positive — never narrowing the
  pattern.
- **CI placement matters:** the step runs *after* `Build web`, because `levers.ts` prose is inlined
  into `web/dist/main.js` and a source-only grep calls that bundle clean.
- **Review caught a real bug in the import, and the evidence was on screen the whole time.** Importing
  `SCHEMA_ARTIFACTS`/`ENGINE_ARTIFACTS` from `regen.ts` ran a full `regenerate()` as a side effect,
  because that module's CLI dispatch sat unguarded at top level. So **every linter run silently
  rewrote every committed artifact**, discarding any in-progress local edit. Every run of the linter
  in this session printed `Regenerating committed artifacts…`; I noticed the anomaly, attributed it to
  the web build script, and moved on. Noticing and misattributing is worse than not noticing — the
  signal was there and I explained it away.
- **The repo had already solved this exact problem.** `materialise-to-figma.ts` carries the guard with
  the comment *"Run the CLI only when invoked directly — not when test.ts imports `aliasRows`"* — the
  identical shape (a module importing constants from a CLI script), identical fix. Three emitters use
  the same `isMain` idiom. `regen.ts` was the one module that never got it, so the fix is the repo's
  own pattern rather than the reviewer's suggested `file://` string compare, which is less robust
  (breaks on symlinks and path encoding).
- **Why it was worse than wasteful:** CI ordering *happened* to save it — `regen --check` runs before
  the lint step, so the side effect could not paper over a real drift regression — but that safety was
  incidental to step order and documented nowhere. Verified by tamper test: marker appended to a
  committed artifact, linter run alone, marker survives.
- **The invariant is pinned at the source level**, since the behavioral proof needs process isolation
  and cannot run in-process in `test.ts`.

---

## (2026-07-31) — Per-mode rung sizes (#328, PR C)

**STATUS: engine + schema.** The last and most substantive piece of #328. A mode can now re-size
heading rungs — `modeLevers.dark.typeSizes = { title: { '2xl': 36 } }` — while the rung **SET** stays
mode-invariant. Sizes vary per mode; membership never does, because the set is fixed once at brand
level by `displayCeiling`/`titleFloor` and is never re-derived per mode.

- **Reused the existing re-point mechanism, did not invent one.** `lineHeightByMode`/`trackingByMode`
  (#296) already had the exact shape: a per-mode alias swap emitted into
  `$extensions.prism3.modes.<m>.$value`, with the primitives themselves mode-invariant. `sizeByMode`
  is the third instance, not a new concept.
- **Why this axis names a NUMBER when leading/tracking name a RUNG KEY.** Not an inconsistency. A
  leading rung is a *named* primitive holding a brand-chosen value, so naming a number there would
  re-anchor rather than re-point. A ladder **step is itself the primitive**, and all 22 steps are
  always emitted — so any selection lands on a real leaf and no union mechanism is needed (contrast
  per-mode weights, #337, which did need one).
- **The bug this would have shipped, caught by design rather than by test.** A re-sized rung must
  recompute its **own mobile endpoint**. Inheriting the brand-level `sizeMinPx` pairs a mode's 36px
  title with the 36px floor derived from the 40px it replaced — a "fluid" pair that shrinks *upward*.
  One call to the existing `mobileEndpoint`, and invisible if skipped since both numbers look sane in
  isolation. Pinned by a test asserting **32→36**, not 36→40.
- **THE SHARP EDGE, worth knowing before authoring one: shrinking a top rung CASCADES.** The ladder is
  dense at the small end (…20, 24, 28, 32…), so `title.2xl: 32` collides with an untouched `xl` at 32,
  and fixing that collides with `lg`, and so on down. Compressing `title` meaningfully means rewriting
  the whole ramp. This is not hypothetical: **my first two fixture attempts were both rejected by my
  own guard**, which is the single most useful thing that happened in this PR. Both cases are now
  pinned as tests — the throw *and* the accepted full-cascade version.
- **Validation THROWS, never drops.** Rejects: a non-heading group (body/label/caption/code — refused,
  not ignored, in both the schema and `brandTheme`), a rung this brand doesn't ship, a non-ladder
  value, a value below the group floor, and a non-increasing **merged** ramp. Merged is the point: you
  collide with a rung you *didn't* touch, so checking overrides in isolation misses the real mistake.
  A silently dropped per-mode request would be worse than the #341 ramp drop it echoes — it would only
  be wrong in one mode's output.
- **Floors are absolute (display 32, title 16, eyebrow 11), each equal to the smallest value the
  brand-level machinery already produces for that group.** A cross-category rule (display ≥ title ≥
  body) was considered and rejected again here: `titleFloor` 16 deliberately overlaps `body.md`, so a
  relative rule would forbid a brand the engine already ships.
- **`out/*` is byte-identical.** No brand fixture uses `modeLevers` at all, so the feature is covered
  by unit tests rather than an artifact. Deliberate — adding a fixture that used it would have churned
  artifacts across a brand for a demo. Worth revisiting when a real brand wants per-mode sizing.
- **Not in this PR:** the web UI does not expose `typeSizes` (no `modeLevers` lever does). That waits
  on the owner's per-mode Typography table direction, which may also settle whether that page needs a
  mode switcher at all (#268).

---

## (2026-07-31) — `typeScale` shifts eyebrow too (#328, PR B follow-up)

**STATUS: engine + web.** Owner-directed after PR B (#344) merged. Closes the open question that PR
left flagged: eyebrow was a heading category for *fluid* and *per-mode* purposes but not for the
*scale preset*, so "heading category" meant two different things depending on which lever you asked.

- **The design argument, which is the real one.** A kicker sits **directly above** a display or title
  and is read as a pair with it. Leave eyebrow out of the shift and an `expressive` brand grows its
  titles a rung while the kicker stays put — breaking the very pairing that makes an eyebrow an
  eyebrow. Consistency was the weaker justification; the pairing is the actual reason.
- **Verified safe before building, not after.** Strictly increasing under all three scales with no
  collisions: compact `11/12/18`, default `12/14/20`, expressive `14/16/24`. That mattered because
  the monotonic guard now **throws** (#341) rather than dropping — a collision would have failed the
  build, not silently lost a rung.
- **"Shift it but floor it at 12" was never available.** Flooring `sm` at 12 under compact collides
  with the shifted `md` (also 12) and the guard rejects the build, breaking every compact brand
  starting with harbor. That is the `titleFloor` bug from #341 in a new costume. The choice was
  binary — accept 11px under compact, or don't shift — and the artifact churn is exactly two brands.
- **On the 11px.** Not a new smallest size: `caption.md` is 11px by default in every brand. But
  eyebrow is uppercase and tracked `wider`, which is harder at the same px than lowercase caption,
  and `compact` is an explicit opt-in to density. Recorded as a known tradeoff rather than a
  non-issue.
- **Correction to PR B's write-up.** That PR reported `main.ts:2372` as *still accurate* — it says the
  three levers never move eyebrow, which was true only because `typeScale` excluded it. This change
  makes it false, so the string PR B deliberately left alone is now fixed. The check was right at the
  time; the conclusion had a one-PR shelf life.
- **A claim from PR B that deserves narrowing.** The 12px eyebrow fluid floor was described as a
  legibility guard. It is **defensive only** — the static threshold (14) sits above it, so nothing
  that shrinks can land below 12 and the floor never binds. Still correct to keep; it was oversold.
- **Blast radius:** harbor (compact) `11/12/18` and aurora (expressive) `14/16/24`. NB and wendys run
  the default scale and are unchanged, so the regression target does not move.

---

## (2026-07-31) — Eyebrow becomes a heading category (#328, PR B)

**STATUS: engine + web + fixtures.** Stacked on PR A (#341). Eyebrow gains three sized rungs and the
fluid behavior of the heading system it belongs to.

- **What it was.** `eyebrow: [['', 12]]` — a single **sizeless** rung, and the only composite path in
  the system with no size segment (`type.eyebrow.<weight>`). Paths are now
  `type.eyebrow.<size>.<weight>`. That is a **breaking token rename**, taken deliberately while
  adoption is zero rather than deferred to when it costs something.
- **Why three rungs and not two.** `sm=12, md=14, lg=20`. An earlier draft proposed `sm=12, md=14`
  mirroring `label`, and that was wrong twice over: label is a UI-text category (eyebrow belongs to
  the heading system), and with only 12/14 **nothing ever clears the fluid threshold**, so the rule
  below would have been dead code and the hero-kicker case — the entire reason for the change —
  would not have been served.
- **Fluid is not a new mechanism and not an exception.** `title` already implements exactly
  "fluid above a threshold, static at or below it" (`desktopPx <= 20 ? static : one rung down,
  floor 20`). Eyebrow takes the same shape with its own numbers: static ≤14, else one rung down,
  floor 12. So `sm`/`md` never move across breakpoints and only the hero kicker does. The 12px floor
  is lower than title's 20 because the rungs are smaller, but it exists for a sharper reason —
  eyebrow is uppercase and tracked `wider`, which costs legibility that lowercase body text at the
  same px does not pay.
- **`typeScale` still does NOT shift eyebrow — deliberate, and worth a second opinion.** `isHeading`
  remains display + title. The argument for leaving it: `typeScale` tunes the heading *hierarchy*, and
  an eyebrow is an accessory label rather than a level in it; including it would also move every
  brand's eyebrow sizes under a non-default scale, which is beyond what #328 approved. The argument
  against: "eyebrow is a heading category" now means two different things depending on which lever
  you ask. Flagged rather than silently decided.
- **A prose claim that turned out to still be true.** Two web strings assert eyebrow never moves.
  `main.ts:1843` (responsive sizing) is now false and is fixed. `main.ts:2372` says the *three levers*
  never move eyebrow — and since `typeScale` still excludes it and ceiling/floor are display/title
  only, that one is **still accurate** and was left alone. Checking beat pattern-matching here.
- **Fixture honesty.** `fixtures/figma/nb/text-styles.json` is not hand-authored guesswork and not an
  independent source: its own metadata says *"Snapshot of the 36 text styles imported from
  `Prism3/engine/out/nb.tokens.json` into Figma"* — a round-trip of engine output, so it moves with
  the engine (same conclusion as the font fixture in #337, but stated in the file this time). **The
  three new eyebrow entries are derived from emitter output, not from an actual Figma import** — the
  ratios (`lineHeight` 1.15×size, `letterSpacing` 0.05×size) are reconstructed from the existing 12px
  entry, which is exactly what the test reconstructs them from. They should be refreshed on the next
  real Figma round-trip. `font-fluid.{mobile,desktop}.json` gain the one new fluid variable (18/20).
- **Next:** PR C — the per-mode rung-size axis over display/title/eyebrow, with per-category floors
  (title 16, display 32, eyebrow 12) and non-inversion validation. Scope: #328 comment 5143891943.

---

## (2026-07-31) — the CLI paste path could only write color (#342, items 1–2)

**STATUS: engine.** **No artifact changes** — `regen --check` still 88/88. This is wiring, not new
derivation: the pure plans already existed.

**Found while scoping #327 part 3.** The anatomy projection binds `size/*`, `radius/*` and
`icon/size/*`. None of them could be got into a Figma file, so the spike had nothing to run
against — the projection was verifiable against emitted JSON but not *materializable*.

**The actual shape of the gap**, which is worse than it first looked:

| axis | emitted | plugin executor | CLI paste pass |
|---|---|---|---|
| palette + color | ✅ | ✅ | ✅ 3 passes |
| floats (9 axes incl. `size`, `radius`, `icon`) | ✅ | ✅ since #108 | ❌ **none** |
| effect + paint styles | ✅ | ✅ | ❌ **none** |
| **text styles** | ✅ | ❌ **none** | ❌ **none** |

The two write paths are supposed to be **projections of one plan** (`write-plan.ts` says so in its
header, and that is the whole reason it was extracted). They had diverged by two thirds of the
axes, and **nothing asserted they agreed** — so the drift gate is as much the deliverable as the
passes are. It is the check whose absence let this open.

**Why it stayed invisible:** the plugin path *does* write floats, so anyone testing through the
installed plugin saw a complete file. Only an MCP-driven session — which can only paste — hits the
gap. A capability that works in the path you usually exercise and fails in the one you don't is
exactly the kind that no existing gate was shaped to catch.

**Reads the emitted files rather than rebuilding from a theme.** `buildFloatWritePlan` takes a
`Theme`, which would have been the shorter route, but every other pass here reads `out/figma/<brand>/`
— that JSON is what the docs/10 §3 contract is written against, and a theme-rebuilt plan could
silently disagree with the artifact `--check` verifies. Exporting `floatPlanFor` (already the
disk-shaped reshape, taking `FigmaCollectionFile[]`) gets both: the emitted-file property AND the
same pure function the plugin path uses, so the two still cannot drift.

**Float scopes get their own code map.** Floats and colors live in disjoint scope namespaces — a
float is `WIDTH_HEIGHT` or `GAP`, never `FRAME_FILL`. Sharing one map would let an unknown scope
decode to a color scope that happens to share a letter; separate maps make it decode to `?` loudly,
and `?` in a payload is asserted against because it reaches the Plugin API as `undefined` and throws
at paste time.

**One payload for all nine axes**, not nine. Floats total ≈120 variables against color's thousands
(10.6 KB, well inside the 45 KB budget), and a single pass keeps create-before-alias honest without
asking whoever pastes it to track nine separate steps.

**Tamper-tested, four ways, all bite:** dropping the `icon` axis (3 failures, including the #327
reachability check naming `icon/size/{sm,md,lg}` — the assertion that says the spike can run);
creating floats as `COLOR`; leaving a scope unmapped; and renaming every alias target
(`space/100 → space/100-typo`) to confirm the dangling check isn't reading its own output.

**One coupling fixed on the way.** The unmapped-scope tamper *also* broke the dangling-target check,
because the payload-parsing regex required a known scope alphabet. Widened to accept `?` so a bad
scope fails the scope assertion on its own rather than making a second, unrelated check fail for the
wrong reason — a false signal is worse than a missing one when you are reading a tamper result.

**Still open (#342 items 3–4):** **text styles are written by nothing, anywhere** — a real hole in
the plugin too, not just the CLI, and `#327`'s label binds `label/md/emphasis`. That needs a
`buildTextStylesPlan` + a plugin applier + a CLI pass, which is a different concern from wiring an
existing plan. The effect/paint style pass is the same wiring-only shape as this one.

**Verified:** 1078 → **1095** tests; nb-regression PASS; `regen --check` 88/88; web typecheck +
both builds clean.

---

## (2026-07-31) — Ceiling and floor become set membership; `compact` was deleting a title rung (#328)

**STATUS: engine + web.** PR A of the #328 typography rebuild. `out/*` regenerated — the entire
behavioral change is **harbor gaining a rung it should always have had**; every other brand moves only
in notes prose, and `nb.tokens.json` is byte-identical (the regression target never moved).

- **The bug, shipping on `main` until now.** `typeScale: 'compact'` silently deleted a title rung and
  left a **gap mid-ramp**: `xs, md, lg, xl, 2xl` — no `sm`. With `titleFloor: 16` it lost `xs` instead.
  `harbor.design.md` uses `compact`, so `out/harbor.tokens.json` shipped a 5-rung title ramp. The
  mechanism is a **size operation feeding a set operation**: compact shifts `title.xs` 18→16, the old
  `Math.max(sizePx, titleFloor)` pushed it back to 18, that collided with the shifted `title.sm`, and
  the monotonic guard resolved the collision by *dropping* one. Nobody chose that; it fell out.
- **Why no gate caught it.** The C1 test asserted `titleFloor: 16` yields a literal 16px `title.2xs`
  under every typeScale — it checked that one rung **exists** and never that the ramp was **complete**.
  Third instance in this cluster of a gate passing while the thing beside it is broken (#281; the
  vacuous weight-union assertion in #337). The new C1b counts the ramp and asserts distinct sizes, so
  the specific failure that shipped is now the thing under test.
- **The design fix that makes the class of bug unreachable.** `displayCeiling` is now a **rung name**
  (`'xl'`), not px. A px ceiling was compared against sizes `typeScale` had already shifted, so the
  same `96` kept 4 display rungs under compact/default but 3 under expressive — **a brand lever
  silently changing the type SET**, the per-mode defect in brand-level clothing. Corroboration that
  this was a known wart: `theme.ts` shipped a runtime note apologizing for it (*"requested ceiling
  Npx; effective top display is Mpx"*), and `web/src/main.ts` rendered the same disclaimer. Both are
  deleted — a rung-named ceiling cannot disagree with what ships. Trimming from the top also means no
  surviving rung is ever renumbered.
- **`titleFloor` is now pure set membership** — 16 includes `title.2xs`, 18 omits it, and it never
  clamps a size. `compact` + `titleFloor: 16` is **rejected** with an actionable message rather than
  silently resolved: compact already places a title at 16px, so `2xs` would duplicate `xs`.
- **The monotonic guard rejects instead of dropping.** `sizePx <= prev` was `continue`; it now throws.
  Dropping a rung is never right — it changes the type SET, which is the one thing the set/size split
  exists to hold stable. This single line covers three cases: the compact collision, the latent
  ladder-end shift collision (`shiftPx` clamps at the ladder ends, so two bases could land on one
  rung), and per-mode inversion when PR C lands.
- **A trap removed, not just a bug.** Five comments invited `typeScale` into `modeLevers`
  (*"typeScale/tempo/density slotting in the same map later"*). That plan was wrong: per-mode
  `typeScale` gives modes different type sets, exactly what this work exists to prevent. Left alone,
  a future agent would have implemented the bug **on the codebase's own invitation**. All five now say
  why `typeScale` is excluded.
- **Migration.** `aurora.design.md` moves `displayCeiling: 128` → `'xl'`, which is byte-compatible:
  128px under `expressive` already resolved to a 4-rung display tier topping at `xl`. Note the old px
  ceiling could zero out the display tier entirely (`displayCeiling: 18`); a rung name cannot, since
  the smallest choice is `'sm'` — one rung. The `dispSizes.length === 0` note survives because an
  unbound display family role still drops the group.
- **Next:** PR B (eyebrow as a heading category, rungs `sm=12/md=14/lg=20` + the title-shaped fluid
  rule), then PR C (the per-mode rung-size axis). Full scope and rationale: #328 comment 5143891943.

---

## (2026-07-31) — `anatomy`: the structural layer, and Button formalized against it (#327, parts 1–2)

**STATUS: engine.** **No artifact changes** — `regen --check` still 88/88. The component layer is
not emitted yet (it never was), so this is schema + definition + gates only. Worth stating plainly,
because "no `out/` diff" on an engine PR usually means something was forgotten.

**The gap docs/28 named.** `ComponentDef` carried the semantic contract (props/states/variants/a11y)
and the paint (`tokens`), but nothing structural. A binding like `size.medium.padding-x →
size.md.padding-x` says nothing about *what that padding is applied to*, whether the row is
horizontal, or which prop becomes an instance-swap. A materializer could not run on it.

**The load-bearing decision is where the line falls:**

    anatomy = structure + GEOMETRY   (tree, layout, padding, gap, height, radius, slot sizes)
    tokens  = PAINT                  (fill, border, ink, overlay — per intent x appearance)

Paint is variant-dependent in a way structure is not: a button's fill changes across nine
intent×appearance combinations while its box stays one row with one gap. **Folding color into
anatomy would force the part tree to be re-declared per variant** — exactly the combinatorial
blow-up the flat `tokens` map already avoids. Two layers, each saying the thing it is good at.

**Anatomy names BINDING KEYS, never raw token refs.** `size.{size}.gap`, not `size.md.gap`. The
`{size}` placeholder expands over `variants.size` and every expansion must exist in `tokens`. That
buys a property worth more than it costs: the existing binding gate already resolves every `tokens`
entry against two brands' trees, so **anatomy's resolution is covered by a check that already
existed** — one pass validates both layers, and a typo in anatomy fails before a tree is supplied.

**Button transcribed from KB `components/button.md` §2**, which is already an adjudicated
cross-system anatomy — so this is transcription into schema, not re-derivation. Two places the
brief resolves differently, both decisions rather than omissions:
- The brief's *"container/target"* and *"layout container"* are **one part**. Separate paragraphs in
  the brief because CSS lets them be separate concerns; in both Figma auto-layout and `inline-flex`
  they are the same node, and splitting them emits a redundant frame.
- **The focus ring is not a part.** The brief calls it "its own concern" — meaning it must not be
  the element border — but it is a stroke-with-offset on the target, not a node. Making it a part
  puts something in the child tree a materializer has nowhere to place.

**The projection is what settles the key names.** The issue said the exact keys "get settled here
against a real materializer," so `anatomy-figma.ts` deliberately copies `materialise-to-figma.ts`'s
shape — a **pure plan builder the suite asserts against, plus a thin shell emitting plugin JS** —
because that shape is what made the token round-trip verifiable without a live Figma. Property names
in the plan are Figma Plugin API property names on purpose; anything else would put a translation
layer between the gate and the thing it claims to verify.

**A plan is built per (size, leading?, trailing?), not per size** — because #326's padding is
slot-aware. At md with a leading visual: `paddingLeft → size/md/padding-x-visual`,
`paddingRight → size/md/padding-x`. With no slots filled both sides fall back to the label inset and
the button is symmetric again, which is what makes #326 additive rather than a redefinition.

**The bug this pass caught in its own work, recorded because it is the trap for the next tier.**
The first projection emitted the `label` node with an **empty `bound` map** — the composite type was
silently dropped, and every assertion passed while the label carried no typography at all. Cause:
composite type is a Figma **text style**, not a variable — different API (`setTextStyleIdAsync` vs
`setBoundVariable`), different namespace, and **a different name mapping**
(`type.label.md.emphasis` → `label/md/emphasis`, the `type.` root dropped, where variables keep
their full dotted path). Fixed with `textStyle` as its own field — not squeezed into `bound`, which
would imply a binding call that fails at paste time — a separate emitted-styles set in the
cross-check, and an assertion that the two name mappings **differ**, so a future "simplification"
to one function fails.

**The cross-check is the gate that makes the projection more than self-assertion:** bound names are
checked against the variables and styles actually read out of `out/figma/nb/*.json`. `tokens`
resolving in the DTCG tree does *not* imply the variable reaches a Figma collection — those are two
different emitters, and only this check spans them.

**`codeOnly` is required and asserted non-empty** — the component-tier version of the ceilings
discipline docs/14 §3 set for tokens. A schema claiming Figma carries everything is making a false
claim. Three entries: touch-target expansion (Figma has no hit area larger than the frame), the
`:focus-visible` *condition* (the ring geometry survives, the trigger does not), and the min-width
derivation (a frozen literal, not a live height×multiplier).

**Tamper-tested seven ways, all bite:** removing the asymmetry (3 failures); always materializing
optional slots; a wrong variable-name mapping; disabling the anatomy validator (all five negative
tests collapse to `got []`, proving they were not passing on some unrelated error); the text-style
mapping assumed identical to the variable mapping; and not projecting the text style at all — the
original bug, now a permanent regression test.

**Out of scope, deliberately:** the live Figma spike (part 3) — it needs a real file and creates an
asset, so it is a separate step; scaling past Button (docs/14 §6 wants Button / Text Field / Card
before the corpus); and the code outputs (WC / React / Storybook / Code Connect).

**Verified:** 1047 → **1078** tests; nb-regression PASS; `regen --check` 88/88; web typecheck +
both builds clean.

---

## (2026-07-31) — `size.*.padding-x-visual`: the label side and the visual side are not the same distance (#326)

**STATUS: engine.** `out/*` regenerated — strictly additive, one new leaf per size step (`60 0` on the
numstat for `nb.tokens.json`: sixty insertions, zero deletions). Artifact count **unchanged at 88**.

**Built stacked on `claude/325-size-gap`, not `main`,** because #338 (#325) was still under review and
both PRs restructure the same `SizeStep` shape and the same size-emit path. Once #338 squash-merged this
was rebased with `git rebase --onto origin/main <old-base>` and re-verified — recorded because a stacked
branch that nobody rebases is how a merge produces a diff nobody wrote, and because GitHub's squash
leaves the old base *not* an ancestor of `main`, so the rebase is mandatory rather than cosmetic.

**The gap.** `size.*.padding-x` was a single number applied to both ends of a control. But an icon's own
bounding box already carries apparent space inside it, so the *same* numeric padding reads as visibly
looser on the visual side than on the text side. Every control with a leading icon was therefore
slightly wrong, and no token existed to say so.

**Three independent systems converge here**, which is what makes it field consensus rather than one
vendor's house style: Material 3 (`leading-space` 24 vs `with-leading-icon-leading-space` 16),
Spectrum (`edge-to-text` and `edge-to-visual` on separate scales), Carbon (a 1px ghost nudge). Nobody
who has built this at scale ships one horizontal padding.

**Two open questions in the issue, both settled empirically rather than by preference:**

*Naming* — `padding-x-visual`, keeping the `padding-x` stem so the pair sorts adjacently in every
consumer that lists tokens alphabetically. `padding-x-icon` was rejected: the distinction is optical,
not "is this glyph an icon", and it applies equally to an avatar or a swatch.

*Ratio, not a fixed step* — Material subtracts a constant 8px. That **collapses at the small end**:
`padX` 8 − 8 = 0, no padding at all. Two-thirds **snapped to the space scale** holds its shape at every
size and every `spaceBase`, and snapping keeps the value ON the scale so the emitted token aliases
`space.*` like its siblings instead of minting an off-scale literal. At lg/comfortable this lands on
**24/16 — Material's own pair, arrived at independently**, which is the reassurance that the ratio
isn't a coincidence of one rhythm.

**The contract is an ordering, not three numbers.** The horizontal model, left edge inward, is
`[padXVisual][icon][gap][label][padX]`, and the whole optical story is one chain:

    gap  <  padXVisual  <  padX

tightest inside the group (proximity, #325), looser where a glyph contributes its own apparent space,
loosest against plain text. **It holds across all 45 cases** (3 `spaceBase` × 3 densities × 5 sizes),
and *that* is what `test.ts` locks — deliberately not the literal values, which would pass just as
happily if the ordering inverted and someone updated the expectations to match.

**Additive, and proven so rather than asserted.** `padding-x` keeps its exact prior meaning and values,
so no existing binding moves. Verified two ways: a test pinning the per-density `padX` ladders, and a
`git stash` diff of the emitted values before/after — identical.

**Tamper-tested (four ways, all bite):** `padXVisual = padX` breaks the chain at every step;
`padXVisual = gap` breaks the lower bound; `+1` off the snap breaks *both* the chain and the space-alias
assertion; and implementing it as a *mutation* of `padX` (the tempting shortcut) fails all three
additive assertions at once. Each tamper also trips the `design.md` byte-identity check, which is the
drift gate doing its job on a live-vs-committed comparison.

**Sequencing, same as #325:** this earns its keep when #327 (anatomy) binds it. Emitted and unbound it
is a loose token, and the honest framing is that #326 exists so #327 has something correct to bind to.

**Verified:** 1042 → **1047** tests; nb-regression PASS; `regen --check` 88/88; web + plugin typecheck
and builds clean.

---

## (2026-07-31) — Font weight primitives are minted from need (#328 items 3+8)

**STATUS: engine.** First of the settled #328 decisions to be built. Every artifact change is a
**deletion** — four dead `font.weight.*` leaves per brand, and the Figma vars that mirrored them.

- **The change is one expression.** `theme.ts` hardcoded `weightsRef: [100…900]` for every brand
  regardless of use; it now emits the distinct values the five weight **roles** actually point at.
  Because `weight-role.<role>` is the only thing that aliases `font.weight.<n>`, the role values *are*
  the complete referenced set by construction — there is no second referrer to miss. The per-mode union
  (`theme.ts:1649`) is unchanged and still layers on top, which is what keeps a mode's deviating numeric
  resolvable.
- **Verified per brand, not in aggregate:** emitted set ≡ referenced set with zero broken aliases for all
  four. The load-bearing case is **Aurora**, which mints `500` where the others mint `600` — it sets a
  custom `emphasis`, so it proves the set is brand-driven rather than a new hardcoded five. A test that
  only ran NB would not have distinguished those two outcomes.
- **The trap this walked into, and why the test changed.** The existing per-mode union test used
  `weights: { strong: 600 }` — but 600 is the `emphasis` default, so once weights are minted from need the
  primitive exists *anyway* and the assertion passes without testing the union at all. It is re-pointed at
  **500**, a value no default role owns, so it now fails if the union is ever dropped. This is the #281
  shape again in miniature: a gate that still passes after the thing it guards is removed.
- **On the fixture deletion — read this before assuming it was wrong.** `fixtures/figma/nb/font.json`
  loses four vars, and the block above it in `test.ts` calls the NB fixtures "the FROZEN real NB Token
  Press export", where `missing === 0` is the byte-repro guarantee. That comment describes the
  **color/palette** fixtures. The numeric 100–900 axis was never New Balance's: the legacy hand-built
  export under `Tokens/New Balance/` has *named* weights (`medium`, `regular`, `book-condensed`) and no
  numeric axis, and the font fixture's composition — 3 family roles + the engine's 22-step ladder + 5
  weight-roles named subtle/default/emphasis/strong/max — is pure engine structure. It is an engine
  snapshot, so it moves with the engine. Anyone re-checking this should verify against `Tokens/New
  Balance/`, not against the comment.
- **Not in scope, deliberately.** Numeric → Figma style-name resolution (`SemiBold` vs `Semi Bold`) stays
  an emitter/plugin problem — #237 resolves against the plugin's loaded-font list, #113 is the open
  research. This change only shortens the list that has to be resolved.
- **Next from #328, in order:** responsive sizing → Layout (item 2, agreed) and leading & tracking →
  semantic tab (item 4, agreed). Items 5/6 remain blocked on the set-shaping → size-clamping
  prerequisite, which has an unresolved sub-decision — see the entry below and #328.

---

## (2026-07-31) — Mode-switcher audit: the decisions live in issues, this is the thread to pull

**STATUS: no code change.** Investigation + decision record. Recorded here because the log is what a
fresh agent reads first, and this cluster has no other entry point.

- **What happened.** "Where should the mode switcher live?" (#268) turned into an audit of what actually
  responds to it, which turned into a typography tier review, which surfaced an engine validation gap.
  The decisions are captured on the issues; this entry exists so they can be found.
- **The measured result** (Light→Dark DOM diff per section, against `12364ab`): **Palettes and Layout are
  fully inert** — the mode bar changes nothing on either. Five of nine pages **mix** responding and inert
  sections (Surfaces, Interactive, Typography, Size & radius, Motion). **Elevation is display-only** and is
  the case #318 explicitly carved out. Full table: the #268 comment.
- **The finding that changes the rule.** Primitive-vs-semantic does **not** predict mode-sensitivity,
  because the UI groups controls by **subject matter, not by tier** — radius, density and tempo re-point
  semantics per mode, but their controls sit on pages named after the primitive. So a tier-based switcher
  rule cannot be derived from the current page structure without relocating controls. A rule keyed on
  *measured mode-sensitivity* works today and survives any later reorganization, since the reorg changes
  the data the rule reads, not the rule. **Page-level placement is settled; the specific treatment is not.**
- **Method note worth keeping: static analysis failed twice, in opposite directions.** Counting
  `currentMode` references per function **under-counts** (delegation hides it — `renderPerModeRadius` and
  siblings read as blind because the access lives in `renderPerModeSelect`). Resolving the call graph on a
  real TypeScript AST **over-counts**: it reported every page as mode-aware, including Palettes, because
  controls call `build()` to re-render, so the graph leaks back through the chrome and everything reaches
  everything. Switching the mode and diffing the DOM answered it in one pass. Don't re-derive this
  statically — it has now been attempted twice and been wrong both times.
- **A second blind spot, from the same week:** a closed dropdown is not in the DOM, so an overflow sweep
  cannot see it — #315 passed 38/38 while a menu sat 152px off-screen. And a 690px nav stack overflows
  nothing at all; it was found by a human on a phone. Green audits mean "no measured defect", not "good".
- **Where the decisions are:** #268 (audit + placement, open) · #328 (typography tier — font roles, weight
  primitives, ceiling/floor, what moves to semantics) · #329 (spaceBase / baseUnit levers) · #332 (invalid
  lever values accepted silently — `typeScale: 'gigantic'` builds a display composite with
  `sizePx: undefined`) · #334 (901–919px ramp-label overflow, pre-existing) · #333 + #267 (carry context
  contributed from this audit).
- **Two engine facts that surprised on inspection**, both now decisions rather than assumptions: all nine
  numeric font weights (100–900) are emitted for **every** brand regardless of use (`theme.ts:915`), and
  `displayCeiling`/`titleFloor` **change which composites exist** rather than only their sizes — so making
  them per-mode would hand different modes different type sets.

---

## (2026-07-30) — Typography WRITE: the plugin materialises core-font/type-sets + Text Styles (#237)

**STATUS: in review (branch `feat/237-write-typography`); static gates green, LIVE DRIVE DONE
(2026-07-31, Prism Test File v2).** The FINAL write axis. The plugin now writes the entire
generated system into Figma: colour (#108), FLOAT vars (#146/#148), shadow/gradient Styles (#151), and
now **typography** — `core-font`/`type-sets` variables + Text Styles.

- **Node-free extraction — `engine/emit-figma-font.ts`** (new): `buildFigmaFont` (→ `core-font` per-mode:
  STRING family + FLOAT size/weight + FLOAT weight-role aliased), `buildFigmaFontFluid` (→ `type-sets`
  mobile/desktop), `buildFigmaTextStyles` (→ Text Styles) moved out of the I/O-shell `emit-figma.ts`,
  which re-exports them (same pattern as color/dims/styles). `out/*` byte-identical; the #269/#276/#297
  typeface-tier retiering is engine-internal and didn't move the emit output. Dropped a now-dead
  `subNode` import from the shell.
- **Pure plans — `write-plan.ts`**: `buildFontVarPlan` (→ `VarCollectionPlan[]`; `core-font` mixes
  STRING+FLOAT+alias in one collection, so rows carry a per-row `resolvedType`) + `buildTextStylePlan`
  (→ `TextStyleRow[]`; named bound vars for fontFamily/fontSize/fontWeight + baked fontStyle/lineHeight/
  letterSpacing, plus `fontFamilyPrimary` resolved from the core-font family var for `loadFontAsync`).
- **Executors**: `write-figma.ts` — widened `VariablesApi` (`createVariable` adds `'STRING'`;
  `setValueForMode` adds `string`) + `applyVarCollectionPlan` (generalises `applyFloatPlan` to mixed-type
  N-collection, two-pass, alias-binding). New `write-text-styles.ts` — `TextStylesApi` port +
  `applyTextStylePlan`: **font fallback = SKIP-WITH-WARNING** (owner decision) — `loadFontAsync` in
  try/catch, on failure the style is skipped + recorded, never substituted, never a throw that aborts;
  bound props wired via `setBoundVariable` after the baked literal fallback. First write that must LOAD a
  resource (the #113 name-resolution concern made concrete).
- **Wiring**: `main.ts` runs the font vars then Text Styles after the styles write (order matters — bound
  targets must exist); summary widens + surfaces skipped fonts; skipped fonts don't flip `ok=false`. Light
  read-back: `font?`/`textStyles?` snapshot + `verifyTypographyReadback` (name-level; empty textStyles is a
  warning not a failure, consistent with skip-with-warning).

**Gates: engine +12 (font-plan + text-style-plan + verify cases, incl. italic) — 991→1003 as built,
1113→1125 after the 2026-07-31 rebase onto `608e078`; `regen --check` in sync over 89 artifacts; `out/*`
byte-identical; plugin two-context typecheck clean; plugin `npm test` write+read+persist+float+styles+
**typography** all green (the shim exercises BOTH the font-load-success AND the load-fail→skip paths — 38
styles created / 114 bindings when available, 10 skipped-with-reason / 28 created when one font is
withheld, no throw); web tsc+build clean; `dist/main.js`+`ui.html` 0 `node:` builtins. Independent code
review: "Ship it, no Critical/Important" — hardest on the mixed-type var executor + the font-load-skip
executor, both confirmed correct; two latent read-back nice-to-haves addressed (empty-textStyles is
non-punitive; per-mode-family path documented as unexercised).**

**The counts here are plan-derived, so a rebase moves them.** As built the plan was 45 vars / 36 styles /
108 bindings; rebasing onto #328 (eyebrow becomes a heading category) added an `eyebrow/lg` fluid row and
two eyebrow styles, making it 46 / 38 / 114. Nothing in the executors changed — but the live drive had to
be **re-run**, because a drive is evidence about a specific plan and the rebase replaced the plan. Worth
expecting on any write-lane branch that sits across a typography-shaped merge.

**LIVE DRIVE — 2026-07-31, Prism Test File v2 (re-run on the rebase onto `608e078`).** Driven with the
SHIPPED executors, not a re-implementation: `applyVarCollectionPlan` + `applyTextStylePlan` bundled by
esbuild (2.7KB, 0 `node:`) and run through `figma_execute` with the real `buildFontVarPlan`/
`buildTextStylePlan` output injected as JSON — the same pure-plan-over-a-serializable-boundary shape
production uses, and the same `textApi` wiring as `main.ts:83-88` verbatim. **Every live number matched
the shim exactly**: 46 font vars created (core-font 35 / type-sets 11), 5 alias bindings, 38/38 Text
Styles, 114 bound props, 0 skipped, 0 misses. Re-run: **+0 created on both passes**, no duplicate names,
`type-sets` still exactly 2 modes (the `addMode` loop doesn't accumulate). File restored to its exact
baseline afterwards (285 vars, 2 collections, 0 Text Styles, empty page).

The re-run tightened one assertion worth keeping: read-back now checks each binding against the
**variable name the plan asked for**, not merely that the id resolves to something — 114/114 correct.
Resolvability alone would pass even if two rows' bindings were transposed.

**What the live drive proved that the shim could not** — the reason this gate exists (#148 precedent):
- **The binding chain is real end-to-end.** Applying `display/lg/strong` to a real text node and flipping
  the frame's `type-sets` mode moved the RENDERED `fontSize` **40 → 80 → 40**, matching the plan's
  `[40, 80]`, with the binding still intact afterwards. That exercises plan → STRING/FLOAT var → per-mode
  value → `setBoundVariable` → rendered text in one observable step; the shim can only assert the call
  was made.
- **`modesDistinct` holds on the fluid axis** — `font-fluid/display/lg/strong` reads 40 (mobile) /
  80 (desktop) from the real API, so the #84 mode-collapse bug does not recur here.
- **`weight-role/*` is a genuine `VARIABLE_ALIAS`** to `font/weight/700` in the document, not a baked
  literal that merely happens to equal it. The STRING family var comes back correctly typed, scoped
  `FONT_FAMILY`, hidden, valued `"Inter"`.
- **The skip path against the REAL `loadFontAsync`**, including a case no shim was modelling: a *real*
  family with a *nonexistent style* (`Inter` / `Ultra Hairline Oblique`) skips just like an absent family
  and like an empty family string. 3 of 4 skipped with reasons, control style still written with all 3
  bindings, no throw, and the skipped styles are **absent** from the document — never a substituted
  wrong face.
- **Float32 storage, not a plan bug:** a written `lineHeight` of 115 reads back as
  `114.99999761581421` (105 → `104.99999523162842`). Worth knowing before someone "fixes" the emit; any
  exact-equality read-back assertion on PERCENT units will fail for this reason.
- **Eight styles applied to real text nodes + screenshot**: the weight ladder, the `strong-link`
  underline, `UPPER` on eyebrow, the 5% tracking, and `JetBrains Mono` on `code/inline` are all visually
  correct — the baked literals and the bound props agree on the canvas, not just in the API.

Three harness slips, all mine and all instructive for the next drive: the first attempt passed
`figma.getLocalVariablesAsync` (it lives on `figma.variables` — the shipped `main.ts` already had this
right, so the drive caught my harness, not the code); `layoutSizingHorizontal` was set before appending
to the auto-layout parent; and on the re-run I tried to serve the 28KB payload over `127.0.0.1` and
`fetch` it from the plugin sandbox — **the Desktop Bridge manifest has no `allowedDomains`, so the
sandbox cannot reach localhost at all.** The way through is a compact tuple encoding of the plan expanded
back inside the sandbox (46 rows + 38 styles fits in ~8KB that way, versus ~24KB as full objects), which
keeps the drive inside the `figma_execute` payload budget without splitting it into many calls. Zero
errors originated in the executors across every pass. This COMPLETES the plugin write scope (only
variable-linked gradient stops #236 remains, a minor fast-follow).

---

## (2026-07-30) — CI gates the plugin surface too (#298 follow-up)

**STATUS: CI only.** No engine, web, or plugin code changed.

`ci.yml` (#298) turned the CLAUDE.md principle-4 gate sequence into an enforced PR check — but only
covered engine + web; `Build plugin` was the only plugin step. CONTRIBUTING §3 documents three more
plugin gates that #298 didn't wire in: two-context `typecheck` (main thread has no DOM, UI iframe has
no `figma.*`), the shim test suite (write/readback/persist/float/styles against the in-memory Figma
shim), and confirming `dist/main.js` carries 0 `node:` builtins — load-bearing because that file runs
in Figma's sandboxed main thread, where a `node:` reference breaks the plugin at load, not at build.

Added all three as new steps (typecheck + test before build, matching CONTRIBUTING's own order; the
builtins check after build, since it inspects the built artifact). Verified against current `main`
before wiring in: `typecheck` clean on both tsconfigs, shim tests all pass, `dist/main.js` has zero
`node:` occurrences. Engine gates and the 85-artifact drift-coverage assertion are untouched.

**Also noted, not fixed here:** #298 itself has no `00-progress.md` entry — the exact gap CLAUDE.md's
"carry the entry in the feature PR" rule (added this same day, after #306/#312/#315 needed a catch-up)
exists to prevent. Flagging rather than backfilling it myself: the PR's own commit messages already
say why the work happened, and reconstructing that "why" as this log's voice risks putting words in
someone else's mouth. Worth a short catch-up entry from whoever's positioned to write it accurately.

---

## (2026-07-30) — The rail becomes a Pages menu below 900 (#144 follow-up)

**STATUS: web-only.** Engine untouched. Owner-directed after reviewing the deploy on a phone; the
alternatives were talked through before any code was written, which is why this entry records the
options not taken as well as the one taken.

- **The number that decided it:** collapsed, the rail was a static stack of nine destinations
  measuring **669–707px tall**, so page content began at **y=834–1013**. On a phone that is below the
  fold on every page load — you scroll past the entire navigation to reach anything. It now starts at
  **y=165–306**. This was the largest remaining responsive problem by a wide margin, and it survived
  #315 because a 690px stack overflows nothing: it is merely bad, and the audit only measured overflow.
- **Four options were weighed; three were rejected for reasons worth keeping.** A *horizontal scroll
  strip* is the intuitive answer and measures badly — the labels total ~880px, so at 393px you see
  about three of nine with the rest invisible, and it forces dropping the subtitles. It also inverts
  with width, becoming genuinely good at 640–900 where ~90% is visible. A *current-page select* has the
  same footprint as a menu and names the page in its closed state, but this app uses selects everywhere
  as **value editors** (`Auto · neutral 950`), so a navigating select sends the wrong signal.
  *Grouping nine into four* (Color / Type / Form / Preview) is the only option that shrinks the problem
  rather than repackaging it, and the rail-note's own ordering already implies those groups — parked as
  the right move **if the nine ever feel like too many on desktop**, since it is an IA change that
  touches every width, not a mobile fix.
- **The strip is blocked on the modes-bar rework, the menu is not** — two stacked horizontal strips
  would compete. That sequencing, not the design merits, is why the menu ships first; the strip is
  worth revisiting when the modes bar moves down and the vertical budget exists.
- **Right placement is nearly free, left is not.** `.bar-actions` is already the positioned containing
  block (from the previous fix), so the panel right-aligns to the gutter with no new positioning code.
  Left-of-logo needs a new positioned container and a **left**-anchored panel — new code, and a fresh
  instance of the bug class just closed. The convention argument for top-left nav was considered and
  overridden: this rail switches editor views of one document, which is closer to a control than to
  site navigation.
- **Nothing the sidebar showed is silently lost.** The panel renders from the same `NAV` data and
  reuses the rail's own `.stage-t` block, so the subtitles come across (they teach what each page is),
  along with the divider before the `view` destination and the ordering note.
- **A CSS-ordering trap, which the first measurement caught:** the base `.navbtn{display:none}` must
  be declared **before** the `max-width:900` rule that turns it on. A media query adds no specificity,
  so placed after it the `display:none` simply wins at every width — the control existed, was correct,
  and never appeared. Worth remembering for any "off by default, on at a breakpoint" control.
- **The audit had to change with the UI.** The page sweep navigated by clicking `.rail .stage`, which
  no longer exists below 900 — it now goes via whichever surface the width exposes. A harness that
  drives the thing it audits has to follow it.
- **Found while verifying, deliberately not fixed here:** a **pre-existing** ~10px overflow in the
  narrow 901–919px band, where the sidebar is back but the content column is too tight for the ramp's
  hex labels. Confirmed against unmodified `main`, so it is not from this change and is a separate
  concern — the `≤900` narrow-tier label rules stop just below it.
- **Verified** at 320/360/393/480/640/900/901/1280: exactly one of rail / Pages control visible at every
  width, panel fully on-screen with all nine destinations and the current one marked, single row
  throughout, zero overflow, no console errors. Page sweep 38/38; bar-menu and resize-grip checks
  unchanged; both surfaces typecheck and build.

---

## (2026-07-30) — `size.*.gap`: the token that answers "why not just use spacing?" (#325)

**STATUS: engine.** `out/*` regenerated (additive — one new leaf per size step); artifact **count
unchanged at 88**, so `ci.yml` needed no bump.

**The gap.** `size.*` carried `height` / `padding-x` / `padding-y` and nothing for the space between a
leading visual, the label, and a trailing visual — so a Button with an icon had no token for the one
measurement that makes it read as assembled rather than crammed. `preview.ts` sidestepped it by not
modelling slots at all.

**This was filed as a task and re-opened as a design question, correctly.** The owner's hesitation:
*"many design teams using this will find it confusing and want to just use standard spacing variables
for everything, and then you'll have some things as gaps and others as generic spacing."* That is the
real failure mode for component-scoped spacing, and it is also exactly the live disagreement in the
field — Spectrum ships a dedicated `text-to-visual-*` scale, Material a named `icon-label-space`,
**Carbon just uses `$spacing-03`**.

**What resolved it was structural, not rhetorical.** The component tier does not mint values — it
ALIASES the space scale (`size.md.padding-x` → `{space.200}`). So `size.md.gap` is `{space.100}`: a
named pointer into the scale the team already uses, not a competing 8px. A team that "just uses
spacing variables" is using the same variable either way; the token only says WHICH one belongs here at
this size. And the precedent was already accepted — nobody hand-picks `size.md.height`, the component
does, which is why that tier has never caused the confusion feared here.

The corollary, recorded because it governs sequencing: **the token earns its keep only once a component
binds it.** Emitted and unbound it IS the loose duplicate the owner described. It should land with or
just before #327 (anatomy), not sit unconsumed.

**Derivation: half the horizontal padding**, which encodes proximity rather than taste. Everything
inside the control must sit closer to its neighbours than to the control's own edge, or the icon and
label stop reading as one unit and start reading as two things sharing a box. So **`gap < padX` is the
contract and the exact fraction is a tuning knob** — that inequality is what `test.ts` asserts, across
every size × density × spaceBase, rather than the literal numbers. Half rather than a third: a third
rounds to 2px at the smallest step, which is a rendering accident, not a gap. Result at the default
rhythm: 4/8/8/12/12 → `{space.050/100/100/150/150}`, every value already a step on the scale.

**Rides the per-mode density seam** like padding does, so a mode at a different density re-derives its
ladder and its gap moves with it rather than freezing at the base value.

**A stale constant found on the way.** The Figma↔DTCG cross-check computed the expected `size`
variable count as `Object.keys(brand.size).length * 3` — *"3 props per t-shirt"*. Adding a fourth made
it report a Figma/DTCG mismatch that was really a stale expectation. Replaced with a count derived from
the tree, so the next sub-leaf is covered automatically rather than re-teaching the same lesson.

**Tamper-tested:** setting `gap = padX` fails the proximity contract at every step; a constant 8px gap
fails both proximity AND the non-constant bar the issue set itself (*"visibly proportionate across the
sizes, not a constant"*) — which is the precise failure the owner's objection predicted, so it is worth
having a test that names it.

**Filed upstream:** knowledge-base#6 — the vault asserts the container *"owns the gap"* and takes no
position on what governs its value, which is conspicuous next to `icon.md`'s detailed optical metrics.
The Spectrum/Material/Carbon divergence is a genuine practice question with no house answer; the
decision here was made on engine-shaped grounds and does not substitute for one.

**Verified:** 1034 → **1042** tests; nb-regression PASS; `regen --check` 88/88; web + plugin typecheck
and builds clean.

---

## (2026-07-30) — `icon.size.*`: the tier that is deliberately not parametric (#324)

**STATUS: engine.** `out/*` **regenerated** (new category); artifact count **85 → 88** (one
`figma/<brand>/icon.json` per emitting brand) — `.github/workflows/ci.yml`'s coverage assertion
bumped in the same PR, as its own comment requires.

**The gap.** There was **no `icon` category in the emitted tree at all**, so a component's
`leadingVisual` / `trailingVisual` slot had nothing to bind for size. `components/button.ts` binds ~60
token slots and could not bind an icon dimension. Of the three gaps in docs/28 §3, this is the one that
stopped the Button Figma round-trip outright rather than degrading it.

**What shipped.** `icon.size.{xs,sm,md,lg,xl}` = **16/20/24/32/40**, each an ALIAS into
`dimension.<px>`, plus a matching Figma `icon` variable collection.

**The issue asked for a DERIVED scale; the field research says the opposite, and the research won.**
KB `components/icon.md` §2 is unusually firm: *"The field standardises on a small fixed set — 16/20/24
(Carbon adds 32; Atlassian 12/16; Polaris 20) — and PROHIBITS arbitrary sizes. Off-grid scaling is the
first thing an icon system must forbid."* And on the API: *"`size` — ENUMERATED (sm/md/lg), mapping to
the fixed pixel grid, NOT arbitrary integers."* A brand-variable ramp would break the rule the research
exists to state. The obvious alternative was checked and is illusory anyway: the `typeScale` lever
*"shifts heading sizes; body/label/caption stay put"*, so a type-derived icon size would be constant —
derivation in name only.

So "derived, not copied" was re-read as being about **structure, not variability**: every step aliases
the dimension grid rather than carrying a literal, which is what makes this a tier instead of five
magic numbers — and that is the property the tests assert.

**The 5th step came from review.** Owner asked whether a 40 top end would hurt. It doesn't, and it
fixes a mismatch: 16/20/24/32/40 pairs **1:1** with `componentSizes`' xs…xl (32/40/48/56/64), so the
anatomy layer (#327) maps control size → icon size by identity instead of reconciling a 4-step scale
against a 5-step one. The ratio is 0.5 through `md` and eases to 0.57/0.63 above — deliberate; a 64px
control with a 32px glyph reads sparse. The KB's icon-vs-illustration line is about NARRATIVE content
(*"larger, narrative, its own component"*), not a pixel threshold, so 40 is still an icon.

**Invariant across mode AND density**, so it stays a primitive under #296 and carries no `modes`
overrides. Density is the live risk — it shifts `size.*`, and icon size co-varies with control size, so
it is the change someone would reasonably make; it is exactly what would push glyphs off 16/20/24.

**A dangling-alias trap, pre-empted.** The icon ladder is fixed, so at a non-default `baseUnit` (6, 8)
it lands OFF the grid and `icon.size.<k> → {dimension.<px>}` would dangle — #274's exact shape.
`buildDims` feeds icon px into the grid extras, the same fix space uses, and a `baseUnit: 6` brand is
in the test matrix specifically to cover it. At the default `baseUnit` 4 they are already grid members,
so nothing else moves.

**Figma included deliberately, though the issue scoped "token tier only".** The issue's own
justification is that the spike has *"no value to `setBoundVariable()` against"* — a DTCG-only token
would have left that blocker standing. `icon` is its own collection rather than a `size/` sub-branch:
an icon size is chosen independently of its control (a compact button can carry a large glyph), and the
Figma scopes differ (WIDTH_HEIGHT only, no padding sibling). Collections contract 8 → 9.

**Tamper-tested**, because a test that only restates the emitted px passes just as happily when the
tier stops aliasing: emitting literals fails the derivation + resolution assertions (9 failures);
making icon size follow density fails the invariance assertion.

**Verified:** 1015 → **1034** tests across nb / aurora / harbor / baseUnit-6; nb-regression PASS;
`regen --check` 88/88 byte-match; web + plugin typecheck and builds clean.

---

## (2026-07-30) — `solid-tint` gets a real token (#288)

**STATUS: engine + web.** `out/*` **byte-identical** — the default is `overlay-neutral`, so nothing
moves unless a brand opts in. Only `schema/lever-manifest.json` changes, and only its prose.

**The defect.** `outlineInteraction: 'solid-tint'` was selectable and emitted **nothing, for any brand,
ever** — behaviourally identical to `none`. Its own doc comment claimed it reused
`foreground.<color>-subtle`, but that role is only emitted for the five fixed `SEMANTICS` names
(brand/success/warning/danger/info), never keyed by an interactive COLUMN name. Those are different
naming spaces: `interactive.primary` follows `roleToPalette.action`, which for aurora is `accent`, not
`brand`. Surfaced as "the Opaque subtle tint option appears empty" in dashboard triage.

**The fix.** A `solid-tint` sibling branch to `overlay-neutral` in `modes.ts`, emitting
`interactive.<column>.subtle-fill.{hover,pressed,selected}` — an opaque step of the column's OWN
palette, so a destructive outline hovers red-tinted rather than gray. (Name follows the issue's own
suggestion; it is the first published shape, so it is the cheapest thing to change if a better one
appears.)

**Two constraints pull opposite ways**, and both are gated rather than assumed:

1. the tint must be **distinguishable from the page**, or the hover is invisible and the lever is inert
   — the failure this repo has now hit three times (#288 itself, #305, pre-#297 leading);
2. the control's label must **stay legible on it**.

**Pairing each tint with the ink of the SAME state is what makes both hold at once.** `iText` already
walks hover/pressed toward more contrast, so a darker pressed tint meets a stronger pressed ink and the
ratio IMPROVES rather than degrading. Measured across aurora + harbor x light/dark x primary/destructive:
worst ink-on-tint **4.90:1** (AA), worst tint-vs-page **ΔE00 5.81** (clear of the ~2.3 bar).

**The nominal step is not trusted to generalise.** It is a starting point; the pick then WALKS TOWARD
THE PAGE until the state's ink clears the text minimum. That walk is load-bearing, not defensive
decoration — tamper-testing it (take the nominal blindly) fails on the extreme brands: near-black
destructive at **4.03:1** and hot-yellow primary at **4.09:1**, both sub-AA. Two example brands would
have shipped a broken contract for real ones.

**`against` runs the other way here, deliberately.** It normally names the surface a role sits on, but
this role IS the surface; the tint is the variable being chosen and the ink is already fixed by
`iText`. So the published promise is "this tint keeps its own state ink legible", and the ink is what
it is measured against. Called out in the code so it doesn't read as a mistake.

**Two false statements removed** — both would have outlived the bug: the lever `description` still said
`solid-tint = opaque foreground.<color>-subtle` (the claim that caused this), and the dashboard still
carried "Opaque subtle tint has no token yet". The section blurb is now method-aware too; pointing at
the Overlay wash row under solid-tint would be the same species of wrong answer as the empty swatch.

**Verified:** 1009 → **1015** tests, including the contract and the visibility floor across **5 brands**
(nb, aurora, harbor, near-black, hot-yellow = 180 roles); `regen --check` 85/85 byte-match;
nb-regression PASS; Playwright confirms the three methods now render distinctly — overlay
`rgba(0,0,0,0.1)`, solid-tint opaque `rgb(204,222,233)` (aurora accent 100), none transparent.

**Author control over WHICH tint** — asked for during review, and it needed no new engine concept.
The `overrides` layer (A1) is generic over emitted roles, so the moment `subtle-fill` became a real
role it was already overridable; verified by probe before claiming it. The gap was UI-only, so the
Interactive page gained a `Subtle tint` row mirroring `Overlay wash`, self-hiding by method the same
way (each returns null when its role is absent, so exactly one is ever shown). Its step picker is bound
to the COLUMN'S OWN palette, not the neutral one the overlay row uses — picking which step of its own
ramp a control hovers to is the point of the method.

**The contract survives the override, and that is a consequence of the inverted `against`.** Overrides
apply-but-warn by design. Because the role is measured against its state ink, an author pick that costs
legibility is caught: `accent.200` warns at 3.76 < 4.5, `accent.400` at 2.04 < 4.5. Had the role been
gated against the page instead — the obvious choice — the warning would have checked the wrong thing
and a hand-picked unreadable tint would have passed silently. The row surfaces that verdict inline
rather than leaving it in an engine warning the designer never sees.

**Should the picker BLOCK a failing choice?** Asked in review; answered no, and the reasoning is worth
keeping because it is not obvious. A UI block would be **false assurance** — the same override is
authorable through `design.md`/`BrandInput`, which the engine accepts with a warning, so refusing the
option hides the capability from one surface without protecting the artifact. Only the engine can
guarantee, and the repo already has two deliberate and DIFFERENT precedents for that: the override
layer *warns and applies*, while the fill anchor *clamps to the nearest passing step and says so*.
Picking one for `subtle-fill` alone would make it behave unlike every other override, so the real
question — should the override layer clamp rather than warn? — is filed separately (#320) to be
answered once, layer-wide.

What landed instead is **pre-emptive marking**: contrast-gated override pickers show which steps satisfy
the role, so the problem is visible BEFORE the pick rather than only after. Applied at
`roleSourceSelect`, so every override picker gets it, not just this row. Contrast is symmetric, so one
comparison serves both directions — a role that IS a surface (`subtle-fill`, measured against its state
ink) and one that sits on a surface use the same formula.

**Marks the PASSING steps, not the failing ones** — and the first cut had it the other way. On a subtle
tint only 4 of 21 steps clear the label, so flagging failures put a warning on 17 of them: accurate and
useless, since a list that is nearly all warnings reads as noise rather than guidance. Owner called it
("17 of 21 is why I was considering limiting options"); inverting keeps the same information and makes
the short list the signal. **Auto carries the mark too** — it is the engine's contract-satisfying pick,
so leaving it bare in a marked list would make the one guaranteed-good option look like the failures.
The label states the number (`✓ 4.5:1`) rather than a bare tick, because the minimum is 4.5 for text
and 3 for non-text and a tick alone would hide which bar was cleared.

The helper returns undefined — not a no-op marker — when there is no contract to judge (`min` 0, role
absent, `against: self`). Under inversion that distinction is load-bearing: within a picker either
NOTHING is marked or the passing steps are, so an unmarked option is never ambiguous between "fails"
and "wasn't judged".

**Out of scope, still open:** nothing. #288's own "out of scope" note deferred the dashboard wiring,
but leaving it unwired would have kept the reported symptom on screen, so it is included.

---

## (2026-07-30) — #296 closes by NARROWING, not by tiering shadow (#301)

**STATUS: engine (source-only).** Zero artifact change — `regen.ts --check` 85/85 byte-match, alias
counts unchanged (872/871/865). Closes #301 and, with it, **#296** — the mode-invariance arc that ran
through #294 (leading/tracking) and #300 (motion).

**The decision.** Shadow was the last entry in what the guard called a "migration ledger", with "an
empty list is the finish line". It does not get a primitive tier. The invariant is amended instead:

> A **terminal composite** — one that neither references a primitive nor is referenced by anything —
> MAY swap raw sub-values per mode.

**Why, from evidence rather than preference.** The #301 spike aliased one field of one shadow layer at
a real primitive and walked every consumer. A `shadow` leaf's `$value` is an ARRAY OF OBJECTS, and
**no consumer resolves an alias inside it**:

| Consumer | Result | Exit |
|---|---|---|
| alias gate | ✅ sees it (872 → 874) | 0 |
| `emit-figma` | ❌ `radius: 0` — `pxToNum` NaN → `\|\| 0` | **0** |
| plugin `write-plan` | ❌ same, and it WRITES INTO FIGMA | 0 |
| `resolve-preview` | ❌ raw `{…}` into `box-shadow` → invalid CSS, shadow vanishes | — |
| `visualize` | ❌ raw `{…}` leaks into `tokens.html` | 0 |

Three exit 0 while emitting a wrong artifact. So tiering shadow is not "~80 tokens plus naming" — it is
~80 tokens **plus a nested-composite alias resolver in four consumers, one of which mutates a real
Figma file**, to buy mode-invariance on tokens nobody consumes individually (designers reach for
`shadow.md`, never a raw blur). Motion was cheap because it re-points a top-level `$value` string every
consumer already resolved; shadow is not the same shape of change.

**The exemption has teeth.** `TERMINAL_COMPOSITE_EXEMPTIONS` is not a pass-list — "terminal" is
**re-derived from the tree every run**. If a shadow leaf ever gains an alias, or anything ever aliases
into shadow, the premise is false and the test fails, naming the offending path and saying *re-decide
the exemption*. Plus a presence check, because a renamed group would make both directions vacuously
true. All three tamper-tested: an outgoing alias, an inbound alias, and removing the exemption
(which correctly re-exposes all 7 shadow leaves as violations).

**Revisit trigger, recorded so it isn't inherited as permanent:** if #305's tint work makes shadow
values expressive enough that consumers want to re-point them, that is the moment to revisit — not the
mere existence of the exemption.

**Also fixed: a latent alias-gate hole (#281's shape).** The gate validated aliases in a composite's
light `$value` array but **not** in `$extensions.prism3.modes.<mode>` arrays — that branch read only a
string `$value`, and per-mode composite values are arrays. So the light half of a leaf was validated
while its per-mode half was not: a future composite tiering would have shipped dangling per-mode refs
with the gate reporting clean. Nothing puts aliases there today, hence zero artifact change.

**The M-11 counter had the SAME hole**, and that is the more interesting half: the independent counter
that exists to cross-check the gate read only a string `$value` too. Two implementations of "count the
refs" sharing one blind spot agree — for the wrong reason. Both were fixed together so they match by
construction rather than by coincidence.

**Verified:** 1006 → **1009** tests; `regen.ts --check` 85/85; nb-regression PASS; web + plugin
typecheck and builds clean; alias counts unchanged, confirming source-only.

---

## (2026-07-30) — The top bar on mobile: one row, and menus that stay on screen (#144 follow-up)

**STATUS: web-only.** Engine untouched. Found by the owner on the live deploy after #315 shipped —
worth noting the finding came from *using* the thing, not from the audit that passed it.

- **A closed dropdown is not in the DOM, so an overflow sweep cannot see it.** #315's 38 green checks
  were real but blind: the brand menu opened ~152px off the left edge at every width below 640, and
  nothing measured it because the panel only exists while open. **The menu audit now opens each one.**
  Generalises past this PR: any conditionally-rendered surface — dropdown, modal, popover, toast — is
  invisible to a static sweep and needs its own pass.
- **Both the before and after states were broken, differently.** The panels are anchored `right:0` to
  their own wrapper, which is only safe while that wrapper sits at the viewport's right edge. #315 made
  the bar wrap so it stopped overflowing, and that moved the actions LEFT, taking the right-anchored
  panel off-screen. Before #315 the panel was nominally on-screen, but the bar itself overflowed 252px
  at 360px wide — so the button that opens it was unreachable. Measured both, rather than assuming the
  regression was purely mine.
- **Right-aligning the row was necessary but not sufficient**, which only showed up on re-measurement:
  the brand button is not the rightmost item, so its panel still began ~122px short of the edge and hung
  9px off at 360px. The wrappers drop to `position:static` so the actions ROW becomes the containing
  block, and both panels align to the one edge that is always flush with the gutter.
- **"Fits by one pixel" is not a fit.** Full labels need ~455px against 456 available at 480px. Below
  560 the "Theme studio" descriptor and the "Export" word are dropped — the ↓ and caret stay, and an
  `aria-label` carries the accessible name — which takes the row to ~278px and holds a single line down
  to ~312px of viewport. **Icon-only Export alone was not enough below 430px**; the owner sanctioned the
  icon change, and the descriptor had to go with it to actually reach one row.
- **The Export word is a nested span with the space inside it**, so wide layout still renders
  `↓ Export` byte-identically — splitting it into sibling spans would have added a 9px flex gap and
  quietly changed the desktop bar.
- **Verified on the web build specifically** — the plugin bundle carries an extra "Apply to Figma"
  button, so its bar is wider and measuring it would have overstated the widths for the deploy that
  actually has the bug. Menus fully on-screen and one row at 360/393/430/480/640/900; desktop unchanged
  (`.barbtn-lab`/`.studio` still inline/block at 640+, export 112px there vs 57px at 393). The #315
  responsive sweep still 38/38 with 0 console errors, grip checks still pass, both surfaces typecheck
  and build, `regen.ts --check` 85/85, `test.ts` 1006/1006.
- **Deliberately untouched:** the modes bar. It is due a revamp or relocation, so tightening it now
  would be work thrown away — the opportunity to improve it on mobile rides with that change.

---

## (2026-07-30) — Narrow viewports: the collapse rule never clamped (#144)

**STATUS: web + plugin.** Engine untouched, `out/*` unchanged. Closes #144; landed as PR #315.

- **The bug was the collapse rule, not the gutters** — which is why bumping the plugin window (#143)
  only masked it. `.shell` uses `minmax(0,1fr)` for its second column at desktop, but the `≤900px`
  override dropped to a bare `1fr`, and **a grid item's automatic minimum is min-content**, so the
  track never clamped. Measured at a 480px viewport: `.shell` itself was correctly 400px while *both*
  its children were 626px. Restoring the idiom fixes the bulk of the overflow at every width below 900.
- **Baseline was measured on `origin/main` before anything was touched** (the #307 discipline): 186px
  overflow / 285 clipped elements at 480px, 26px / 19 at 640px. The owner's independent re-measurement
  landed on 186/283 and 26/19 — close enough to treat the harness as trustworthy.
- **A trap for anyone re-verifying this later, found by the owner:** reverting *only* the
  `.shell{grid-template-columns}` line while keeping the rest of the narrow tier **does not reproduce
  the overflow** — the gutter/hero/table fixes independently keep content narrow enough. The bug only
  reproduces against the genuine pre-PR baseline. A partial revert will read as "there was never a bug
  here," which is exactly the wrong conclusion.
- **Sweeping every page mattered, and nearly didn't happen.** After the first fix the landing page
  measured clean at all four widths while **Interactive and Layout were still failing** — a single-page
  check would have shipped the regression. The audit covers 9 rail pages × 480/640/900/1280 plus dark.
- **Two things genuinely do not fit 456px and are handled rather than shrunk.** Ramp hex read-outs need
  ~45px × 10 steps against ~406px available, so below 480 the hex is dropped and the step number kept —
  labels stay 1:1 under their swatches, because a ramp is a continuous scale and wrapping or scrolling
  the row destroys the alignment that makes it readable. **This is an information tradeoff, flagged as
  vetoable at review and not vetoed.** The contrast + breakpoint tables become their own scroll boxes;
  `.ctable` was the worse of the two because it was *silently clipped by an ancestor* rather than
  pushing the page, so its cells were unreachable rather than merely off-screen — an overflow that no
  page-level scrollWidth check would ever have caught.
- **Plugin half:** a corner grip posting a new `resize-ui` over the existing typed bridge. `commit`
  splits the drag from the write — every pointer-move resizes so the window tracks the pointer, only
  pointer-up persists, so a drag is one `clientStorage` write rather than a hundred. **The clamp lives
  on the main thread, not the UI** (the UI does not get to decide the minimum usable size; 380×420).
  Boot restore reopens at the last size; `clientStorage` is async and `showUI` is not, so the window
  opens at the default and resizes a tick later — awaiting storage first would trade a visible resize
  for a visible delay.
- **A runtime host check does not tree-shake.** The grip was first gated on `commit.isFigma` with a
  comment asserting esbuild would drop it from the web bundle. It did not — esbuild cannot see through
  the call. Re-gated on the `PRISM3_HOST` define (which `write-adapter.ts` already calls *"the single
  BUILD-TIME swap point"*) and **verified by grepping both bundles**: `setPointerCapture` 0× in
  `web/dist/main.js`, 1× in `plugin/dist/ui.html`. The lesson generalises past this PR — `isFigma` is
  for *behaviour*, `PRISM3_HOST` is for *what ships*.
- **Not verified, stated rather than papered over:** the main-thread half (`figma.ui.resize`, the
  `clientStorage` round-trip) is typechecked but never live-driven — that needs the Desktop Bridge,
  down per #237. The UI half was driven for real: 10 live drag messages, exactly one commit, and no
  resize on hover after release.
- **Verified:** responsive sweep 38/38 clean with 0 console errors, re-run on the post-merge head after
  #314 landed in the same file (its new shadow-tint UI measures clean at narrow widths unaided);
  `test.ts` 1006/1006; `regen.ts --check` 85/85; nb-regression PASS, ΔE00 1.95 unchanged; both surfaces
  typecheck + build clean; `plugin/dist/main.js` still 0 `node:` builtins.

---

## (2026-07-30) — Shadow tint becomes perceptible (#305)

**STATUS: engine + web.** `out/*` **regenerated** — aurora/harbor/wendys shadow values change; **NB is
byte-identical** (it ships `tint.amount: 0` → pure black, so nothing moves and the NB regression is
untouched).

**The defect.** Owner reported the shadow tint hue/amount sliders as having no visible effect. They were
wired correctly and did change the emitted tokens — but the effect was **below perceptual threshold**.
Shadow alphas run 10–14%, so a hue shift on a near-black composited over a light surface moved
**~1.0–1.5 ΔE00 across the lever's ENTIRE range**, under the ~2.3 "just noticeable" bar. Third instance
of the same class in this repo (after `solid-tint` #288 and pre-#297 quantised leading): a control that
is *expressible* but has no perceptible effect. That trains distrust of every other control on the page.

**Why the obvious fix doesn't work.** Holding lightness and raising chroma cannot help: sRGB's chroma
ceiling at `l 0.13` is 0.023 (cyan) to 0.066 (blue) — essentially the flat `0.05` already in use.
Chroma capacity is a function of lightness, so **L has to rise with `amount`** for the hue to have
anywhere to go.

**New curve** (`theme.ts` `buildShadow`): `l = 0.13 + 0.17 × amount`, `c = maxChroma(l, hue) × amount`.
So `amount` now means "how far toward as-chromatic-as-this-dark-can-be", and the result is always in
gamut. `amount: 0` still returns exactly pure black (the NB dialect).

**Measured** at a mid-ramp 12% alpha over white, swept at 5° (spot-checking three hues is what produced
three wrong numbers in the first draft — the sRGB chroma floor is at yellow-green, not at either end):

| | before | after |
|---|---|---|
| worst-hue tint visibility @ amount 1.0 | ~0.6–1.5 ΔE00 | **2.88** (h≈70; warm/blue reach 3.8–4.6) |
| default (amount 0.15) drift | — | 0.86 ΔE00 (under the ~1.0 JND → invisible, but artifacts DO change) |
| shadow presence vs pure-black @ max tint | — | −8% … **+59%** |

0.17 is the smallest coefficient at which **every** hue clears 2.3; at 0.13 the worst hue stalls at 2.28.

**Two consequences, deliberately not hidden.** (1) A tinted shadow reads more *present*, not only more
coloured — inherent, since a saturated dark differs from white more than black does at equal alpha;
removing it would mean lowering alpha as tint rises, and alpha encodes elevation. (2) The default is not
byte-identical to the old curve.

**Web.** The Elevation editor gained a tint read-out beside the sliders: the base colour at 100% next to
the same colour at 12% over a checkerboard, plus a note explaining that shadows paint it at 10–14% so
the ramp reads subtler than the swatch. It refreshes **imperatively** (`refreshTintReadout`) — the
shadow editor lives in the doc-26 stable head, so the first cut computed its colour at construction and
froze. A browser check caught it; the fix for an inert control had itself shipped inert.

**Guarded.** `test.ts` locks the perceptual OUTCOME, not the formula — coefficients may be retuned, but
max tint must stay ≥2.3 ΔE00 on every hue (swept 15°), `amount 0` must stay exactly black, visibility
must rise monotonically above amount 0.3, and every base must be in sRGB. Tamper-tested: restoring the
old formula fails the guard at 0.59 ΔE00. 998 → **1004** tests.

**Not done here:** #301 (whether shadow gets a primitive tier) is a separate, still-open decision — the
spike found nested aliases in a `shadow` array are unresolved by every consumer and fail silently, so
tiering is not the cheap change it looked like. See #301 for the evidence.

---

## (2026-07-30) — US English actually completes (#302, #310) — and the log entry that broke it

**STATUS: web + engine.** `schema/lever-manifest.json` regenerated; `out/*` untouched. Closes #302
(PR #309) and #310 (PR #311), alongside #308 which added the #260 entry below. The standard is now
written into `CLAUDE.md` so it stops being re-derived from this log.

- **The root cause was a false claim in this very file.** The #164 entry (2026-07-17, far below) records
  that #162 applied US English *"across all visible UI text (main.ts + **lever labels/descriptions**;
  the token-`$description` prose that emits into out/\* is a separate deferred pass)"*. The parenthetical
  is wrong: **lever labels and descriptions were never touched.** Ten UK spellings sat in `levers.ts`
  from #162 until #311 today. Correcting here rather than editing the old entry, per this log's habit of
  recording corrections forward (cf. *"I filed #296 wrong and rewrote it"*).
- **That one sentence propagated for five months.** #260 was filed carving `levers.ts` out as
  already-covered *because the log said so*; #302 was scoped to `main.ts` alone for the same reason; and
  #302's own list then under-counted its own file. Four consecutive passes each inherited the previous
  one's assurance instead of re-checking. **The lesson is narrow and worth keeping: a completion claim in
  this log is a claim, not a receipt.**
- **What actually landed:** six string literals in `web/src/main.ts` (#309) — one of them, the Wireframe
  modes-menu tooltip, absent from #302's list — and ten in `Prism3/engine/levers.ts` (#311), two of which
  (`generalised`, and the `leverGroups` label `'Colour'`) appeared in *no* prior list.
- **The two methods that finally worked**, both cheap, both worth reusing: **scan patterns, not word
  lists** (`-is(e|ed|es|ing|ation)` and `-our`, then filter false positives like *source*/*precise*) —
  a fixed list of `colour|grey|behaviour` missed `generalised` three times running; and **grep the built
  bundle, not the source** — that is what revealed `levers.ts` prose is inlined into `web/dist/main.js`
  and therefore renders as live dashboard controls, which is what #260 had classified as artifact-only.
- **A correction to my own correction.** #310 was filed claiming the `leverGroups` `'Colour'` label
  renders as a dashboard section heading. It does not — `leverGroups` is **tree-shaken out of the web
  bundle entirely** (sibling label `Form factor`: zero occurrences in `web/dist/main.js`); the dashboard
  hardcodes its own sections. The fix stands on different grounds: `leverGroups` *is* emitted into
  `schema/lever-manifest.json`, the published contract any manifest-driven host renders from.
- **Deliberately still UK-spelled:** `Prism3/schema/theme-schema.json` (19 hits). It is **hand-authored,
  not emitted** — `regen.ts:51` splits `schema/` into emitted files it owns and hand-authored contracts
  it does not touch — so no regen will ever fix it and whether hand-authored contract prose follows the
  standard is an open call, not an oversight. `preview-spec.json` and `example-brands.json` are clean.
  Code comments and identifiers remain exempt, as every pass since #162 has held.
- **Verified:** 1000/1000 engine tests; `regen.ts --check` 85/85 byte-match; nb-regression PASS, aggregate
  ΔE00 **1.95 unchanged**; 432/432 mode contracts across all three brands; web + plugin `tsc` and builds
  clean; and on merged `main` the shipped bundle contains zero UK spellings in **UI-facing** string
  content — the split that motivated this (`subtle · light gray` in one control, `Subtle (light grey)`
  in another) is closed at both ends. *(Corrected at review: an earlier wording here said "zero UK
  spellings in string content" flatly, which is not literally true — thrown `Error(...)` templates such
  as `theme.ts:1339` and `color.ts:151` do ship in the bundle. They sit inside the carve-out this whole
  series made deliberately, so it was loose wording rather than a missed gap — but this entry is about
  a completion claim that outran its evidence, so it does not get to make one of its own.)*

---

## (2026-07-30) — US-English pass on emitted `$description` prose (#260)

**STATUS: engine.** `out/*` **regenerated** (prose-only — zero `$value`, alias or structural change).
Resolves #260; landed as PR #306.

- **The scope boundary came from `regen.ts`, not from grep.** A tree-wide `colour`→`color` replace is
  wrong in both directions at once: it rewrites strings no consumer ever reads, and it still misses
  prose that reaches an artifact by a non-obvious path. So every candidate was traced to its **sink**,
  using `regen.ts`'s own list of committed artifacts (`out/**`, the three emitted `schema/*` files,
  `modes-report.md`, `nb-regression-report.md`) as the in/out test.
- **Fixed** (each reaches a committed artifact): `ai-metadata.ts` (`.ai.json` prose), `tree.ts` (inline
  `$description` templates + Figma `note` extensions), `theme.ts` (`notes.push(...)` →
  `$extensions.prism3.decisions` via `tree.ts:667`, and `PaletteBuild.description` → `$description` via
  `primitiveLeaf`), `emit-dtcg.ts` (the one literal inside its own `md.push(...)` report builder),
  `fidelity.ts` / `classify-colors.ts` (the `why` / `title` strings rendered into
  `wendys-fidelity-report.md`), `visualize.ts` (the `html.push(...)` / page-template strings reaching
  `tokens.html`), `modes.ts` (`border.focus`, which flows to `$description` via `aliasLeaf`).
- **Deliberately left alone:** thrown `Error(...)` messages everywhere (validation/parse failures, not
  token prose), `console.log`-only strings — including `visualize.ts`'s parallel `txt.push(...)` block,
  which mirrors the HTML but is never written to disk — and `test.ts` / `mcp.ts` / `eval-run.ts`.
- **The one exception proves the boundary is about sinks, not files.** `test.ts` had an assertion
  hardcoding the *old* spelling of a note it checks (`'action colour defaults to the primary'`). It was
  updated because the note text it asserts genuinely changed — **not** because `test.ts` came into scope.
- **`levers.ts` is a real remaining gap, not a judgement call.** It still carries `grey` / `synthesise`
  in lever text that feeds `schema/lever-manifest.json` — a committed artifact, so by this PR's own test
  it is in scope for the standard. Left out to keep one concern per PR; **needs its own follow-up issue,
  unfiled as of this entry.**
- **That is the second "already covered" assumption to fail.** #260 was filed assuming #162's UI sweep
  was complete; it wasn't (→ #302, five visible strings still in `main.ts`). `levers.ts` is the same
  shape of gap. Treat "#162/#260 covered that" as a claim to re-check, not a fact.
- **Prose-only was verified mechanically, not by eyeball:** the full `out/*` diff with every
  description-shaped key excluded (`$description`, `description`, `intent`, `method`, `note`,
  `decisions`, `meaning`, `when_to_use`, `avoid_when`) leaves only `notes` array entries and HTML table
  cells carrying the same prose — zero `$value` / alias / structural hits anywhere.
- **Verified:** 1000/1000 engine tests; `regen.ts --check` 85/85 byte-match; nb-regression PASS with
  aggregate ΔE00 **1.95 unchanged** (the value-drift proof), 11/11 contrast contracts, 23/23 dimensions;
  aliases 872/872, 871/871, 865/865 resolve; 432/432 mode contracts across all three brands; web +
  plugin `tsc --noEmit` and builds clean. `Prism3/schema/*` diff empty, as expected — none of the fixed
  files feed it.

---

## (2026-07-30) — Long token paths elide from the left, not the right (#289)

**STATUS: web-only.** `out/*` untouched; engine tests and the 85-artifact drift gate unchanged. Landed
as PR #307. *(Backfilled entry — reconstructed from the commit record, not written at the time.)*

- **Measured, not eyeballed.** On `origin/main`: 12 pills wrap at 1280px and 43 at 1024px, 9 and 34 of
  those overflowing their parent box. `.sf-id` is a 168px grid column and the style-guide grid is five
  columns wide, so the wrap is structural rather than incidental.
- **The fix lands on `.tpill` itself**, not the two containers that happened to get reported. The pill
  is used in 17 places; a per-context rule would just wait for the next narrow column.
- **Left elision, and the data is the reason.** These paths share long prefixes and differ only in the
  tail — `color.foreground.brand` vs `color.foreground.brand-subtle`, or the six
  `color.interactive.destructive.on-inverse.{text,fill}.{rest,hover,pressed}` whose first 40 characters
  are identical. Cutting from the right renders all of them as the same stub; the discriminating
  information is at the end. The cost is that the namespace prefix is what hides when space is tight —
  `title` and the style-guide hover bubble both carry the full path, and the emitted path is unchanged,
  which is what doc-26's namespace rule actually governs.
- **Widening the column was rejected:** the longest emitted path is 53 chars
  (`color.interactive.destructive.on-inverse.text.pressed`), ~350px at the pill's 10.5px mono, and every
  new interactive role can extend the tail.
- **Two implementations were built and discarded, both caught by measurement rather than review.** An
  inline-flex head+tail sized correctly, but flex items are blockified, so selecting a pill returned
  `color\n.background.primary`. What shipped keeps the path a **single text node** and elides purely
  visually via `direction: rtl`, so a selection still yields the exact path.
- **`sgPill` no longer overwrites `title`** with the resolution string: `data-sgtip` keeps the resolved
  step/hex/ratio bubble and `title` carries the full path — which matters once a path can be elided.
- **Verified:** Playwright across 6 configurations (aurora/harbor × 820–1440px × light/dark), all nine
  rail pages, ~198 pills each — 0 wrapped, 0 inexact selections, 0 pills whose text node differs from
  its `title` (so bidi reordering is a no-op on these ASCII paths), 0 console errors. The audit was run
  against `origin/main` first to confirm it detects the wrapping it claims to fix. The `sg-failpill`
  "!" marker never renders in the live example brands, so its absolute positioning was exercised by
  synthesizing the fail state — the marker stays right, inside the box, on elided pills.

---

## (2026-07-30) — Validation-color borrow controls: two bugs were already dead, one was real (#157)

**STATUS: web-only.** One narrow fix (6+/1-) in `web/src/main.ts`. Landed as PR #303.
*(Backfilled entry — reconstructed from the commit record, not written at the time.)*

- **Two of the three reported bugs no longer reproduce** — borrow-leak across ramps, and wrong-color +
  dropdown revert on "Use accent". Both had been fixed by #228 (full borrowed-ramp render) and #233
  (`roleToPalette` resolution), which landed *after* #157 was filed. Verified live across five
  sequential multi-row scenarios on the `aurora` fixture rather than assumed stale — the check was
  cheap, and the alternative was re-fixing something already fixed.
- **The third was real.** `anchorStepFor` handled only `primary` / `neutral` / `brandColors`; a
  custom-hue-seeded status role has no case, so it always fell through to "derived" instead of exposing
  an anchor step like every other scale. Added the status-role branch, reading the same pinned lightness
  the other three cases use and reusing the existing `STATUS_ROLES` / `StatusRole` constructs rather
  than inventing new ones.
- **The fix rests on an assumption that was checked rather than assumed:** `roleToPalette` defaults
  every non-borrowed status role to its own name, so at the call site (`refresh()` in the status row)
  `srcName = borrowed ?? resolved` resolves to exactly `role` for a non-borrowed, non-reused status role.
- **Verified in the browser:** switching Danger's Source to "Custom hue…" moves the anchor badge from
  **derived** to **450**, matching the highlighted ramp step; Success/Warning/Info stay derived,
  confirming the fix is scoped to the custom-hue case alone.

---

## (2026-07-30) — Raw NUL bytes banned in source (#304)

**STATUS: engine + test guard.** Output byte-identical — the escape changed no behavior. Landed as
PR #304. *(Backfilled entry — reconstructed from the commit record, not written at the time.)*

- **What it was:** `tree.ts:548` held a literal `0x00` character where the escape was intended. Legal to
  the compiler, invisible in an editor, byte-identical at runtime — but it makes the file **binary** to
  the grep/ripgrep family, so content searches return "binary file matches" with no lines. The engine's
  largest source file was invisible to the tool used to navigate it. On `main` since 9f719e3 (#185).
- **Second instance of the class.** The first, in `web/src/main.ts`, also broke a Playwright
  `select_option`, because the option values no longer matched what was typed.
- **A total ban, not a judgement call.** The escape is always available and always equivalent, so there
  is no case where the literal byte is wanted — the guard scans the engine plus both bundled surfaces.
  Fixing without the guard would just wait for the third instance.
- **The guard was watched failing** on `tree.ts:548` before the fix landed, and its liveness assertion
  checks that every scanned root contributed files — a total-count threshold was tried first and
  rejected as brittle against ordinary file churn.
- **Verified:** 1000/1000 tests (998 + the two new assertions), nb-regression exits 0, `regen --check`
  in sync at 85 artifacts — byte-identical output confirms the escape changed no behavior, so CI's
  coverage assertion is untouched.

---

## (2026-07-30) — Motion gets a primitive ms tier (#296, motion half)

**STATUS: engine.** `out/*` **regenerated** (shape change). Closes the motion half of #296; only
**shadow** remains ledgered.

- **The typography fix could NOT be ported, and checking why mattered.** Tempo scales the whole ramp
  by a multiplier (snappy 0.8× / standard 1.0× / relaxed 1.3×), so `relaxed.normal` is **260ms — a
  value no standard rung holds**. Line-height worked because the mode's target *was* an existing rung.
  Here there is nothing to re-point at, so a rung-name map is not expressible.
- **RADIUS is the real precedent**, not typography: a scalar lever scaling a ramp, solved with a
  value-keyed primitive grid (`radius.md → {dimension.8}`). That's why per-mode radius was already
  correct with no special handling.
- **The KB settled the naming** — `18-motion-foundations.md` §Motion tokens prescribes exactly this
  three-tier shape: primitive is *"literal, not semantic"* and value-named (**`duration-200`**), while
  semantic *"names a use, not a value"* (`duration/short`). Checking the KB changed the answer: I had
  proposed a root-level `duration.<ms>` group, which would have collided conceptually with
  `motion.duration.<name>`.
- **Shape:** `motion.duration-ms.<n>` holds every reachable ms across the base tempo AND every
  per-mode tempo (union, so every alias lands on a real leaf). `motion.duration.<name>`,
  `motion.duration-reduced.<name>` and `motion.stagger` are now `role: semantic` aliases into it; a
  per-mode tempo re-points the alias. Named after `font.weight` / `font.weight-role` — a suffixed
  sibling primitive group, so **`motion.duration.*` keeps its path**. The KB's argument for the
  semantic tier is that it's the stable handle consumers bind to; renaming it would break the thing
  the tier exists to protect.
- **`easing` / `spring` are correctly out of scope** — untouched by tempo, separate primitive families.
- **Dead code removed:** `durWithModes` existed only to attach per-mode values to duration leaves.
  With the tier in place nothing needs it.
- **Also noted from the KB, not acted on:** *"A system needs four duration tokens, give or take one.
  More than six and consumers stop choosing meaningfully."* We ship exactly six — at the ceiling, not
  over it. A reason not to grow the ramp, and a reason the tier split matters more than adding rungs.
- **Verified:** 998/998 engine tests (up from 991; `D-motion(a)` inverted to the new contract plus new
  assertions that both ms endpoints exist as invariant primitives carrying no per-mode variant, and
  that stagger + duration-reduced ride the same tier); `regen.ts --check` in sync (85 artifacts, so
  CI's coverage assertion still holds); nb-regression exits 0; web `tsc` + both builds clean;
  Playwright swept nine pages × light/dark with zero console errors — including #292's new motion
  specimen, which reads durations and was the risk area.
- **#296 remaining: shadow only** (`role: composite`, zero refs in or out — needs decomposing before
  it can be tiered). Still ledgered so it can't be forgotten.

---

## (2026-07-30) — Motion specimen: trace the curve (#292)

**STATUS: web-only.** Landed as PR #299. *(Backfilled entry — reconstructed from the commit record, not
written at the time.)*

- **Replaces the stacked bar-fill list** with one large stage per semantic transition
  (default / enter / exit / emphasized): the resolved easing curve plotted as a ghost line, with a dot
  tracing it over the resolved duration. The bar-fill showed *that* something took time; the traced
  curve shows *the shape of* the easing, which is what the token actually encodes.
- **Playback control** (real · ½× · ¼× · ⅛×, defaulting to ¼× for legibility) uniformly divides all four
  durations. It never touches the displayed ms label — always the real resolved token value — nor the
  curve shape, and it preserves the ratio between transitions at any speed, so slowing the specimen down
  to read it cannot misrepresent what ships.
- **Downstream note:** this specimen reads durations, which made it the risk area for #300's
  `motion.duration-ms.*` tier landing immediately after — swept with Playwright there and clean.

---

## (2026-07-30) — Primitives are mode-invariant: the guard + leading/tracking re-point (#296)

**STATUS: engine + test guard + one UI note.** `out/*` **byte-identical** (no committed brand exercises
per-mode leading). Owner principle: *"any primitives should be mode-invariant."* Closes the
line-height/letter-spacing half of #296; motion + shadow remain, ledgered.

- **I filed #296 wrong and rewrote it.** First version claimed 6 of 8 per-mode axes mutate primitives.
  Real answer: **3**. I had read the READ-MODEL (`dims.radiusByMode`) as if it were the emitted
  contract. In the emitted tree `radius.md` is `role: semantic` moving `{dimension.4}` → `{dimension.8}`
  with **both primitives present and unchanged** — colour, radius and density were already correct. I
  had recommended building a fix that already existed.
- **The real diagnosis** is sharper: the violating axes are the ones that were **never given a
  primitive tier**, so a per-mode override has nowhere to land but the value itself. `font.weight-role`
  is the canonical correct shape (semantic name → `{font.weight.<numeric>}` primitive).
- **The guard (7c) is the thing #296 actually asked for.** A token may carry
  `$extensions.prism3.modes` only if it RE-POINTS: `$value` is an alias, or `role: semantic`, or — for a
  DTCG composite — every field the variant *changed* is an alias. That last clause is what separates
  `type.*` (swaps `{font.line-height.normal}` for `{…relaxed}` ✓) from `shadow.*` (swaps raw colour/px
  objects ✗). `KNOWN_VIOLATIONS` is a migration **ledger**, and a second assertion fails if an entry
  goes stale, so a fixed axis can't leave a dead exemption behind.
- **The guard found something the manual audit missed on its first run:** `motion.stagger`. I had only
  identified `motion.duration`. Also **proved it bites** — removing the line-height exemption makes it
  fail and name the offending group.
- **The fix:** rung primitives keep exactly one value across all modes; the per-mode change moves to
  the semantic composite, which re-points its `lineHeight` / `letterSpacing` alias at a different rung.
  `TypeComposite` gained `lineHeightByMode` / `trackingByMode`; `tree.ts` emits the variant on the
  composite and no longer on the rung.
- **The per-mode input NAMES A RUNG, not a value** (owner call, after I first shipped value-snapping):
  `modeLevers.dark.lineHeights: { normal: 'relaxed' }` reads *"in dark, styles that would use `normal`
  use `relaxed` instead"*. This is strictly better than the snapping model I built first and then
  replaced: **the silent-no-op class disappears entirely** rather than being warned about, there is no
  ambiguity about what a value resolves to, and it **separates two operations that were both numbers
  meaning different things** — `typography.lineHeights` (numeric, brand-wide, re-anchors what a rung is
  WORTH) vs the per-mode map (rung name, re-points WHICH rung is used). Different operations, now
  different types.
- **A number in the per-mode slot is REJECTED, not coerced,** with a message pointing at
  `typography.lineHeights` — coercing it would quietly reintroduce the mode-varying-primitive bug. That
  rejection immediately caught my own stale fixtures, which is how it should behave.
- **A self-map (`normal → normal`) is dropped** as no-diff, the same suppression the other axes use, so
  an inert declaration can't create a mode entry or a spurious composite variant.
- **The UI now has two different controls for the two operations:** Light edits the rung VALUE (number
  field); any other mode picks a TARGET RUNG (select, self excluded since it would be a no-op). The
  read-model fields were renamed `lineHeightRepointByMode` / `letterSpacingRepointByMode` — they are
  re-point maps, not per-mode ramps, and the old names asserted something untrue.
- **Two tests inverted deliberately.** `D-lhls(a)/(b)` asserted the retired contract (per-mode value ON
  the rung); they now assert the opposite — the rung carries NO per-mode override and is byte-equal to
  the no-per-mode build. `(c)` asserted the composite was *unchanged*; it now asserts the re-point, plus
  that only alias fields changed. `(d)` is new: the quantised no-op is asserted to be noted.
- **Verified:** 991/991 engine tests (up from 976); `regen.ts --check` in sync (83 artifacts);
  nb-regression exits 0; `out/*` byte-identical; web `tsc` + build clean; plugin build clean.
- **Still open on #296:** motion (`duration` + `stagger`, untiered — no `role` at all) and shadow
  (`role: composite`, zero refs in or out, needs decomposing). Both ledgered so they cannot be
  forgotten and cannot silently grow.

---

## (2026-07-30) — Disabled contrast: an absolute 3:1 floor, both branches gated (#290)

**STATUS: engine + schema + dashboard.** Resolves #290. Owner decision after the triage discussion:
**contrast-preserving means actually meeting 4.5:1**, and the other branch may go lower **but never
below 3:1**. So the dial moved OFF the compliant branch and onto the reduced one, and the system
stopped using the WCAG inactive-component exemption entirely.

- **What was wrong, measured.** The old pair was `accessible` (gated at `disabledMin`, dial 2–4.5)
  vs `conventional` (ungated, `pickClosest(..., 2)`, `min: 0`). At the bottom of the dial they
  **collapsed onto each other** — `accessible@2` and `conventional` both produced `disabled.on-fill`
  at 2.14:1, `disabled.text` at 2.32 vs 2.07 — while the first still called itself *accessible* and
  asserted a passing contract against a floor that is no WCAG threshold. The owner's instinct
  ("feels weird that I can pick a floor below contrast") was understating it.
- **Two further findings from the same probe.** (a) `conventional` **ignored high-contrast mode**:
  only the gated branch escalated, so a brand choosing it shipped 2.07:1 disabled text inside its
  HC theme. (b) `disabledMin` had **no `minimum`/`maximum` in the schema** at all — a hand-authored
  `design.md` could set `disabledMin: 0.5` and it validated and shipped.
- **The new model.** `'full'` = a fixed **4.5:1** (AA text), no dial — a promise, not a range.
  `'reduced'` (default) = a dialable **3–4.5** floor, default 3. Both branches now GATE; the ungated
  path is deleted. Both escalate to ≥4.5 in HC, closing (a). Schema pins `disabledMin` to `[3, 4.5]`
  and the engine clamps independently, closing (b) at both layers.
- **3:1 is not arbitrary** — it is the SC 1.4.11 non-text / SC 1.4.3 large-text threshold, and where
  Primer and USWDS sit. The schema already documented that ("field-rare — 0/12 surveyed systems
  guarantee it"); the owner's floor landed on the strongest available precedent.
- **Legacy aliases, accepted not dropped.** `'accessible'` → `'reduced'` keeping its `disabledMin`
  (clamped ≥3); `'conventional'` → `'reduced'` at 3, which **RAISES** its contrast from ~2:1 — a
  deliberate breaking improvement, called out rather than silent. Nothing in-repo set either lever,
  so no fixture needed migrating.
- **`out/*`: every resolved value is byte-identical.** Verified by grepping the whole regen diff for
  `$value` / hex / ratio changes — none. Only `$description` prose moved (3 disabled roles × mode ×
  brand, the `notes` line, and the mirrored Figma descriptions), because the retired word
  "accessible" had to leave the emitted text. Choosing `reduced@3` as the default is what preserved
  the values.
- **The affordance caveat is surfaced, not buried.** At 4.5:1 a disabled label is as legible as body
  copy, so "disabled" then reads only from fill / border / cursor / `aria-disabled`. The UI shows
  that inline when `full` is selected, and the engine note says it too — the KB's "colour is never
  the sole carrier" makes it defensible, but it should be a conscious choice.
- **A test guard had to be loosened deliberately, and narrowed to compensate.** The lever↔schema
  enum check was strict set-equality, which the back-compat aliases break. It now asserts the hard
  direction (UI options ⊆ schema enum — the UI may never offer a value the schema rejects) and
  allows schema-only values ONLY when the description marks them `LEGACY ALIAS`. Forgetting to
  surface a genuinely new option still fails.
- **Verified:** 976/976 engine tests (17 new in a `(7b)` block — the absolute floor swept across
  every strategy × min × mode, `full` ignoring the dial, clamping, both aliases, HC escalation on
  all three inputs, and schema rejection of 2); nb-regression exits 0; `regen.ts --check` in sync;
  web `tsc` + build clean; plugin build clean; the "every lever exercised" fixture repointed from a
  now-legacy alias to the live `full` branch; Playwright confirmed the dial appears only on
  `reduced`, the caveat only on `full`, the slider range is 3–4.5, and the disabled specimen tracks
  the branch live (fg `rgb(104,104,109)` → `rgb(79,79,84)`); nine pages × light/dark, no console errors.

---

## (2026-07-29) — Bug triage: Surfaces dark-mode text, outline-hover method, anchor clamp feedback

**STATUS: dashboard fixes + one real engine gap surfaced.** Owner dropped six UI reports; three were
real bugs (fixed here), one report resolved into an actual engine gap (filed, not silently patched
around), one was verified NOT a bug, and two are genuine design/layout decisions (filed for the
owner, not guessed at).

- **Fixed: Surfaces "Card on this surface" text invisible in dark / dark custom modes.**
  `sfExSurface` hardcoded ink to `invert ? '#f2f2f6' : '#191920'`, and both call sites for the
  Primary row always passed no fourth arg (`invert` defaulting `false`) — so on a dark surface the
  example rendered near-black text on near-black. Now reads the resolved `text.primary` /
  `text.on-inverse` role (each is measured against the exact surface it sits on), so it's always
  legible regardless of which mode's Primary is light or dark.
- **Fixed: "Opaque subtle tint" outline-hover method showed an empty/transparent swatch.** The
  preview always read `interactive.primary.overlay.hover` regardless of the selected
  `outlineInteraction` method — that role only exists for `overlay-neutral`. Tracing the *correct*
  fix surfaced a real engine gap: `solid-tint`'s own doc comment claims it reuses
  `foreground.<color>-subtle`, but that role only exists for the five fixed `SEMANTICS` names
  (brand/success/warning/danger/info), never for an interactive COLUMN name (primary/neutral/
  destructive/accent) — so `solid-tint` has never changed anything in the emitted tree, for any
  brand. Filed as #288 rather than faked with a wrong role read; the dashboard now shows an honest
  inline note instead of a color that doesn't mean anything.
- **Fixed: copy** — the `none` option read "No hover expression" (implies nothing changes at all);
  renamed "No hover fill" per owner ask, since text/border still exist, only the fill wash is absent.
- **Fixed: missing feedback when a fill-anchor pin gets contrast-floor clamped.** Reported as
  "the interactive states didn't update after I changed the base color" — verified via a standalone
  engine probe (`brandTheme` swept across anchor values) that this was **never a staleness bug**:
  the engine correctly re-derives hover/pressed from the EFFECTIVE anchor every time; the reported
  case (300 → still showing 550's hover) was two different requested anchors both getting
  floor-clamped to the *same* effective step, so nothing about the resolved theme actually changed.
  The real bug: the Source select shows the raw requested step with no indication a clamp happened,
  making a legitimate floor-gate read as unresponsive UI. `iRow` gained an optional `warn` slot
  (reused `.fz-warn` styling); `fillRestRow` now compares the requested pin against
  `stepKeyOf(r.path)` (the effective step) and surfaces the mismatch inline when they differ.
- **Verified NOT a bug: shadow tint hue/amount "not visibly changing the example."** A live probe
  (drag both sliders to their extremes, read `getComputedStyle(...).boxShadow`) confirmed the RGB
  genuinely shifts — `rgb(6,7,10)` → `rgb(1,6,27)` (amount→max) → `rgb(21,0,7)` (hue→0). The values
  are correct; the effect is real but subtle by nature (a few RGB units at 6–12% alpha on a soft
  shadow). No code change; flagged to the owner as a perceptibility question, not a wiring bug.
- **Filed, not built — genuine decisions/backlog, per owner's own uncertainty or explicit "can be a
  backlog item":**
  - #289 — token pills wrap awkwardly in narrow columns (Surfaces cards, Style guide); four layout
    options sketched, none chosen.
  - #290 — the disabled contrast-floor slider is attached to "Accessible," letting a pick dial below
    what "Accessible" implies; owner's alternate framing (attach it to "Conventional" instead, as
    "how far below AA") is at least as coherent — needs a call, not a guess.
  - #291 — interactive examples should show real hover/pressed on actual mouse interaction, across
    every slot row; real cross-cutting feature, not a one-line fix.
  - #292 — Motion specimen: a more expressive example than a dashing line (a dot on a curve or
    similar) — no direction chosen yet.
- **Verified:** engine 962/962; nb-regression exits 0; `regen.ts --check` in sync (83 artifacts,
  including the relabeled lever-manifest); web `tsc` + build clean; plugin build clean; Playwright
  swept all nine pages × light/dark with zero console errors; each of the four code fixes verified
  live (not just read) — dark-mode text contrast, all three `outlineInteraction` methods, the clamp
  warning appearing/disappearing correctly.

---

## (2026-07-29) — Web dashboard deploys as a static site on Vercel (#104)

**STATUS: deploy setup** (`web/build-site.mjs` + root `vercel.json` + docs; no engine change, `out/*`
byte-identical). Closes #104 — the dashboard was reachable only from a local esbuild dev server, so UI
review needed a running process, there was no link to send anyone, and PRs had no live surface.

- **Static by construction:** the engine runs client-side and `main.ts` has zero `fetch`/`XMLHttpRequest`/
  `pushState` — so no backend, no rewrites, no runtime data loading. Just files.
- **Root Directory is the REPO ROOT, not `web/`** — the load-bearing constraint. `web/src/main.ts` imports
  `../../Prism3/engine/*` and `../../Prism3/schema/example-brands.json`; a `web/`-scoped build can't resolve them.
  Only `web/src` + `Prism3/{engine,schema}` are READ BY THE BUILD; `plugin/`, `Tokens/`, `Prism3/engine/out/`
  are neither read nor served. **Install is a different matter** — it runs at the repo root and resolves both
  workspaces, so `node_modules` also holds the plugin's `@figma/plugin-typings`. Hence: the build needs
  devDependencies (`NODE_ENV=production` at install omits esbuild → `ERR_MODULE_NOT_FOUND`), and a
  `plugin/package.json` bump without a regenerated root lockfile can fail THIS deploy's install (`npm ci`
  rejects the mismatch) before the build command runs. The plugin surface is coupled through install, not
  through the bundle.
- **`build:site` → `web/public/`:** the deployable root must *contain* `dist/` (index.html loads
  `/dist/main.js` absolutely), and publishing `web/` as-is would expose `DESIGN-REVIEW.md`
  at the site root (the sourcemap ships source deliberately). `build-site.mjs` cleans, bundles with the same
  flags as `build`, and copies `index.html` **verbatim** — its absolute path resolves identically under the
  local dev server and the deploy root, so there's no host-conditional path logic. The script then **asserts
  the manifest** — unexpected or missing output exits non-zero, so adding e.g. a CSS import (esbuild emits
  `dist/main.css`, which the verbatim `index.html` never references) fails the build instead of deploying an
  unstyled site. `dev`/`build` untouched; `web/public/` gitignored.
- **Contract in git:** root `vercel.json` is two keys (`buildCommand`, `outputDirectory`). No
  `installCommand`/`rewrites`/`framework` — each would be a redundant override that can drift.
- **Verified:** the literal `vercel.json` `buildCommand` emits exactly 3 files; stale-file wipe confirmed;
  manifest guard proven by adding a real CSS import (exits 1, names `dist/main.css`); served headless on a
  throwaway port with a clean console + a live lever edit repainting.
- **Two manual steps (owner):** authorise the Vercel GitHub app and import `adamforrester/prism3`
  (Root Directory = repo root, then Deploy), then disable Deployment Protection in Settings — new projects
  default to `ssoProtection` enabled, which puts prod + preview URLs behind a login wall. Can't be granted by
  an agent. Prod URL to be added to `web/README.md` once it exists.
- **Spec/plan:** `docs/superpowers/specs/2026-07-29-web-vercel-deploy-design.md`,
  `docs/superpowers/plans/2026-07-29-web-vercel-deploy.md`.

---

## (2026-07-29) — Typefaces UI: the two tiers made operable (#269, web half)

**STATUS: dashboard.** No engine change, no artifact change — this wires the tier split #269 landed
in the engine to the Typography → Foundations page, which until now could not reach it.

- **The gap it closes.** The engine emitted `font.typeface.*` primitives, supported N faces, and made
  mono optional — but `renderTypefaces` still looped the fixed three roles and edited
  `families[role].stack[0]` in place. The primitive tier was invisible and the new capability
  unreachable from the UI.
- **Tier 1 — the library.** One full-width row per distinct face: name, `font.typeface.<slug>` pill,
  fallback stack, install status, which roles bind it, specimen. Rows rather than cards because the
  list grows with the brand and the fallback stack needs the horizontal room.
- **Tier 2 — the bindings.** Display / Text / Mono, each a select over the library plus *Custom face…*
  (the authoring path for a face not yet in it); mono also offers *None*, which drops the `code`
  category with it.
- **Authoring through the bindings, not the library.** The library is DERIVED — a face exists exactly
  as long as a role names it. So "add" is binding a new name and "remove" is re-pointing the last role
  that used it; there is no delete button and no cascade, which is the same conclusion the engine
  reached structurally. The section says this in as many words rather than leaving it to be inferred.
- **Availability is scoped to the authoring moment.** Install status is a property of the face, and
  the library already reports it per face — showing it on all three bindings as well repeated the same
  warning three times. It now appears on a binding only while its custom field is live.
- **Verified in a browser, not just by types.** Binding a fourth face grows the library and correctly
  re-computes the shared-face dedupe (Inter drops from "Display + Text" to "Text"); unbinding mono
  removes `typeface.jetbrains-mono` AND takes `type.code.*` from 1 composite to 0; rebinding restores
  it. Zero console errors across Light/Dark and every page.
- **Not a bug, recorded so it is not re-investigated:** on the HC modes the editor pages render an
  intentional "auto-derived — read-only" panel instead of their `.psec` sections. A `.psec` count
  reads as zero there; the page is correct.

---

## (2026-07-29) — One regen entry point + a drift gate over every committed artifact (#281)

**STATUS: engine tooling.** New `Prism3/engine/regen.ts`; no engine behaviour change, no artifact
change. Closes #281.

- **The hole.** `out/*` is committed so results are reviewable without running the engine — but
  nothing verified it still matched what the engine emits. Every existing gate (`test.ts`,
  `nb-regression.ts`, alias resolution, contrast contracts) runs the engine **live and compares it
  against itself**; none of them ever reads the committed file. So a stale artifact passes everything.
- **What had rotted.** Regenerating on pristine `main` (`b5627f2`) with zero source edits produced
  6,410 changed lines: `tokens.html` and all three wendys artifacts. Not formatting — the committed
  wendys fixture was many merged PRs behind (aliases 627→856, contracts 248→432, missing the `max`
  weight role, interactive overlays, neutral emphasis, inverse surface-context, `background.inverse.*`).
- **Root cause: regen was four commands and only one was habitual.** `emit-dtcg.ts` covers
  nb/aurora/harbor, so those stayed current; wendys goes through `cli.ts` (it is a *standard*-dialect
  brief) and `tokens.html` through `visualize.ts`, so both rotted unseen.
- **`regen.ts`** runs all seven emitters in dependency order (`visualize` last — it reads the
  `*.tokens.json` the others write). `--check` snapshots, regenerates, byte-compares, then **restores
  the snapshot**, so the gate never leaves the tree dirty whatever the answer — safe to run mid-edit.
- **Scope widened past the issue, deliberately:** the three emitted `schema/` contracts
  (`lever-manifest.json`, `preview-spec.json`, `example-brands.json`) are the same class of risk —
  committed, generated, unverified. They happen to be in sync today; nothing was keeping them so.
  `schema/` is compared file-by-file against a named list because it also holds hand-authored contracts.
- **Verified both directions:** green on this branch (83 artifacts byte-match) and on pristine `main`
  it names exactly the four drifted files and nothing else; tampering with an emitted value in either
  `out/` or `schema/` is caught and the tree is left clean afterwards.
- **Wired into the contract** — `CLAUDE.md` working principle 4 and the engine README now lead with
  `regen.ts`, and say plainly that `--check` is the only gate that reads the committed artifacts.

---

## (2026-07-29) — Font families become two-tier: typeface primitives + family-role semantics (#269)

**STATUS: engine.** `out/*` **regenerated** (shape change, see below). Closes #269.

Font families were a closed union of exactly three, each named after its *job* — so
`families.display` (a primitive) collided with the type category `display` (a semantic), and family
assignment read as though it happened in the primitive tier.

- **Two tiers, mirroring colour.** `font.typeface.<slug>` is the primitive, named after the face and
  carrying its fallback stack (`inter`, `clash-display`); `font.family.<role>` is the semantic,
  aliasing one. The role stays the **brand-invariant handle** a shared codebase binds to — swapping the
  face behind it leaves every consumer reference intact, which a direct `font.typeface.*` reference
  would not.
- **Multi-brand needs no more than the fixed three roles.** The typeface library is shared *across*
  brands and each brand binds its own members (`Brand A: display→poppins`, `Brand B: display→inter`),
  so N faces exist across the system while any one brand binds ≤3. A fourth *role* is only needed if a
  single brand wants four faces at once — deferred until a real brand does.
- **Slugs are derived** from the face name (`"Clash Display"` → `clash-display`), never user-chosen, so
  there is no arbitrary-rename churn: you either have that face or you don't.
- **Roles sharing a face share one primitive** — NB binds display *and* text to Inter and emits a single
  `typeface.inter`, with `variable` OR-ing across the roles.
- **Per-mode family override now RE-POINTS the alias** instead of re-valuing the primitive — the shape
  #176's decision 2 asks for, and directly relevant to #251's embedded lever-vs-token decision. Faces
  used only by a mode are unioned into the typeface set so every alias lands on a real leaf (the same
  contract `weightsRef` has for per-mode weight numerics).
- **Mono is optional.** `families.mono: null` opts out; `code` is the only category binding mono, so it
  disappears with it (36 → 35 composites on a default brand). Omitted still keeps the default face, so
  existing brands are untouched.
- **Figma emit is behaviourally unchanged by design** — the family variable still *binds* the primary face
  with the full stack in its description; the emit just resolves the alias first. The only diff in
  `out/figma/*/core-font.json` is the description wording (`font family — display (Inter)` →
  `font family role — display → Inter`); every `value`, `alias`, and `scopes` field byte-reproduces, so
  no Figma import changes.
- **The hand-rolled schema validator learned `type: "null"`.** Its CR-04 guard threw loudly on the
  unknown type rather than silently vouching for it — the guard working as intended.
- **Verified:** 953/953 engine tests (new coverage for both tiers, shared-face dedupe, alias resolution
  through `familyOf`, per-mode re-pointing, and the whole optional-mono path); nb-regression exits 0;
  every alias resolves + every mode contract passes for all three brands; web `tsc` + build clean.

**`out/*` regenerated — what changed:** each brand gains `font.typeface.*` leaves, and every
`font.family.<role>` `$value` moves from a literal face string to an alias into one. **Resolved values
are identical** — `familyOf` derefs the alias and reassembles the same stack. Consumers reading
`font.family.<role>` still resolve to the same face; consumers that read the raw `$value` expecting a
literal string now get an alias and must deref (the same contract every other semantic already has).

---

## (2026-07-29) — Fix #274: space.* dangling aliases at non-default spaceBase (engine)

**STATUS: engine fix** (`theme.ts` + a `test.ts` regression; `out/*` byte-identical). Upgrades what #274
(filed off the #265 spacing preview) turned out to be: **not** a read-model quirk but a real dangling alias
in the EXPORTED DTCG.

- **Root cause:** two uncoupled scales — the dimension grid is `baseUnit`-stepped (default 4), the space
  scale is `mult × spaceBase`. At a non-default `spaceBase` the half-steps (1.5×/0.25×/0.75×) land OFF the
  grid (spaceBase 12 → `space.150` = 18px, absent from a baseUnit-4 grid), and space is the ONE dimension
  family that emits its alias UNCONDITIONALLY (radius/size/border-width all guard `gridSet.has(px) ? alias :
  literal`). So `space.150 → {prism.dimension.18}` dangled — flagged by `buildTree` `stats.broken` (6 broken
  at spaceBase 12; 0 at the default 8, which is why every committed fixture and the earlier #265 check looked
  clean). `pxOf` then returned 0 for the dead target, which is what the preview surfaced.
- **Fix (`theme.ts` `buildDims`):** feed every space px into the dimension grid as `extras`, so each space
  alias resolves by construction. One place; repairs both the exported DTCG and the read-model.
- **Blast radius:** committed `out/*` **byte-identical** — all four fixtures use the default `spaceBase 8`,
  where space px already land on the baseUnit-4 grid, so the extras add nothing. Verified: regen → no diff.
- **Regression test:** new `#274` block asserts `stats.broken === 0` and `space.150`'s target exists across
  spaceBase 8/12/5/10, plus the default-8 byte-identity guard. Engine 934/934 (was 925 + 9).
- **Live:** at spaceBase 12 the spacing preview now shows `space.150 · 18px` (was `0px`).
- **Note:** the original #274 write-up said "emitted DTCG is correct" — that was wrong (only checked
  spaceBase 8). Corrected here; #274 to be closed by this.

---

## (2026-07-29) — Token list rendered from buildTree() — 1:1 with export, all tokens (#263)

**STATUS: dashboard change** (`web/src/main.ts` only; `out/*` byte-identical, no engine change). Last of the
PR #262 review follow-ups.

- **The token list now walks the SAME DTCG tree the export downloads** (`buildTree(theme).tree`), replacing
  the separate resolved-model rendering (`resolveAllModes` / `rp.dims` / `rp.type` / `rp.shadows`). So "what
  you see" IS "what you'd export" — there's no second code path to drift. A recursive leaf-walk
  (`collectLeaves`: a leaf has `$type`; groups are plain objects; `$`-keys are metadata — mirrors the
  generator's own walker) naturally shows **every** token, fixing the old subset gaps (typography + others).
- **All 16 categories now render** (was 4): Palette, Color, Opacity, Motion, Font, Type, Shadow, Breakpoint,
  Grid, Container, Dimension, Space, Radius, Border-width, Focus, Size — 526 tokens for a default brand.
  One `.psec` per top-level group under the brand root (generator order).
- **Per-`$type` value rendering** (the tree's asymmetries handled): color → swatch+hex per mode via a new
  `hexOfNode` (reads `$extensions.prism3.hex` on primitives; follows `{alias}` refs on roles; the base
  `$value` is the base/light mode, `$extensions.prism3.modes.<m>.$value` the overrides) — this correctly
  resolves BOTH raw-hex primitives and aliased roles (the first cut showed `—` for primitives because their
  `$value` is `rgb(...)`, not an alias; `hexOfNode` fixes it); typography → the full composite via the tree
  helpers (`familyOf`/`numOf`/`remPxOf`, primary face only); shadow → CSS box-shadow per mode (its per-mode
  override is a layer ARRAY, not a `{$value}`); dimension/number → resolved px/value, per-mode column only
  when a leaf carries overrides.
- **Presentation preserved (#262):** `subHead` (uppercase `.sub-t`) group heads, `.toktable` left-aligned
  value columns, `swatchCell`. Fixed a grouping edge: single-segment categories (opacity/shadow/breakpoint/…)
  render one flat table instead of a `subHead`-per-leaf.
- **Verified:** engine 925/925; `tsc` clean; build clean; 0 `node:` builtins; `out/*` byte-identical.
  Playwright: 16 categories / 526 rows; palette primitives + color roles resolve hex (with swatches);
  per-mode columns correct (added Dark → `text.primary` light `#0e0d0d` / dark `#f7f7f7`); type composites +
  dimensions render; flat categories no longer emit phantom per-value subheads. 1:1 with export is
  structural — the list literally iterates the export tree.
- **Batch complete:** #262 (Preview/Disabled/token-list display), #264 (Layout), #265 (Size & radius), #263
  (this) all landed/open. Remaining from the batch's spillover: #274 (`[engine]` resolve-preview space quirk).

---

## (2026-07-29) — Size & radius: controls-beside-previews + shared split scaffold (#265)

**STATUS: dashboard change** (`web/src/main.ts` only; `out/*` byte-identical, no engine change). Second of
the PR #262 follow-ups; reuses (and generalizes) the #264 Layout pattern.

- **Shared `controlSplitPage` scaffold.** Extracted the #264 controls-beside-previews mechanism into a
  reusable scaffold both Layout and Size & radius compose from: hero → derived-mode note (or) one `.cs-split`
  section per block (control column beside a preview node) → a page-local `paintVolatile` that repaints only
  the preview nodes on `apply()`. The `ly-*` control classes were generalized to a neutral `.cs-*` family;
  Layout was migrated onto the shared scaffold (mechanical — same structure, shared classes). Compact
  `csSlider`/`csPicker` helpers live here too.
- **Size & radius restructured** into three co-located blocks (was: three stacked control sections above,
  two specimens far below in `.stage-vol`): **Corner radius** (baseMd + radiusScale → radius ramp),
  **Density & size** (density → control-size ramp), **Spacing grid** (spaceBase + baseUnit → a NEW spacing
  ramp preview). `renderRadiusSpecimen`/`renderSizeSpecimen` → `paintRadiusPreview`/`paintSizePreview`
  (fill-a-node form). radius + density keep per-mode behavior — the controls reuse `leverControl(key,
  perMode)`, so lever semantics are unchanged.
- **New spacing preview** (`paintSpacingPreview`): the space.* ramp as proportional bars. Derives its steps
  from the ACTUAL resolved `rp.dims` keys (sorted by scale), NOT a hardcoded list — the resolved model only
  carries the steps the preview binds (same subset behavior as type/#263), so a fixed list showed phantom
  0px rows (caught in the live drive). Read-only from `rp.dims`, no engine change.
- **Verified:** engine 925/925; `tsc` clean; build clean; 0 `node:` builtins; `out/*` byte-identical.
  Playwright: 3 co-located blocks each with controls beside their preview; radius softness 1→2 doubled the
  ramp in place; density comfortable→compact shrank the size ramp; spacing bars proportional + live on
  spaceBase; the `.cs-split` survives each change.
- **Surfaced (out of scope, logged separately):** at `spaceBase=12`, `space.150` shows `0px` in the preview.
  Probed: the emitted DTCG is CORRECT (`space.150 → {prism.dimension.18}`); the gap is in the resolve-preview
  read-model (`resolve-preview.ts`) — it can't resolve the `dimension.18` primitive at that base (the fine
  grid doesn't mint an `18` step), so the alias dangles to 0 in the resolved view only. The new spacing
  preview honestly reflects `rp.dims`; filed as an `[engine]` finding on resolve-preview. Out of scope here.
- **Still open:** #263 token list from `buildTree()`.

---

## (2026-07-29) — Layout page: controls-beside-previews + curated columns + rename (#264)

**STATUS: dashboard change** (`web/src/main.ts` + a label-only lever change in `Prism3/engine/levers.ts` +
its regenerated `schema/lever-manifest.json`; `out/*` byte-identical). First of the three PR #262 follow-up
issues (#264/#265/#263).

- **Controls now sit BESIDE their live preview.** The Layout page dropped the generic `renderScreen`
  scaffold (all controls stacked above, one specimen block far below in `.stage-vol`) for a bespoke page
  built like Palettes: a `refreshers[]` array + a page-local `paintVolatile` repaints only the preview
  sub-nodes on `apply()`, so controls stay stable (never rebuilt mid-drag) and a change is visible without
  scrolling. Three `.ly-split` blocks (control column + preview): **Breakpoints** (px editor + ruler/table),
  **Grid columns** (picker + column strip), **Container caps** (two sliders + bars). `renderLayoutSpecimen`
  split into `paintBreakpointsPreview` / `paintColumnsPreview` / `paintContainersPreview`;
  `renderBreakpointsEditor` → `renderBreakpointsControls` (returns just the control node).
- **Grid columns is a curated step-picker** (`4/6/8/12/16/24`) — no odd/awkward counts. **UI-only curation**
  (owner call): the engine/schema stay permissive (any int 4–24 still validates), so a hand-authored
  `design.md` with `columns:10` isn't rejected — the dashboard just guides the common choice. No enum/schema
  change, so no manifest enum-drift.
- **"Narrow container" → "Content container"** (lever label in `levers.ts`, manifest regenerated via
  `emit-levers.ts`). The container sliders are compact, not full-width (owner: full-width was overkill).
- **Verified:** engine 925/925 (incl. the lever-manifest drift test — regenerated manifest matches); `tsc`
  clean; build clean; 0 `node:` builtins; `out/*` byte-identical. Playwright drove the page: 3 co-located
  blocks, columns picker offers only 4/6/8/12/16/24 and repaints the strip in place (12→24), the container
  sliders commit on release and repaint the bars in place (content container 720→480 shrank its bar), the
  co-located split survives each change, and "Content container" reads correctly.
- **Still open** (same review batch): #265 Size & radius controls-near-previews (reuses this pattern), #263
  token list from `buildTree()`.

---

## (2026-07-29) — Preview restructure + Disabled fixes + token-list display (review batch)

**STATUS: dashboard change** (`web/src/main.ts` + `web/src/write-adapter.ts` + one additive read-model field
in `Prism3/engine/resolve-preview.ts`; `out/*` byte-identical). A batch of owner review fixes; the bigger
reworks were split into GH issues (see below).

- **Preview → Style guide is now the first + default sub-view; the "UI preview" component gallery is
  removed entirely.** Owner call: button padding / badges / tags / nav aren't defined at this stage, so those
  specimens were placeholder — the style guide carries the real value. Dropped `renderPreviewGallery`,
  `renderChip`, `SLOT_ORDER`/`SLOT_LABEL`, the now-dead `colorVar`/`pageBg`/`hexOf`/`writeHost` +
  `makeWriteHost`/`typeVar`/`cssVarName` imports, and the `.preview`/`.pvcomp`/`.pvvar*`/`.chip` CSS. Tabs are
  now Style guide · Contrast contracts · Token list. Hero copy updated.
- **Disabled example now updates live (was a two-cause bug).** (1) The example read `background.tertiary` /
  `text.tertiary` (invariant to both controls) instead of the resolved `disabled.fill` / `disabled.on-fill`;
  (2) the floor slider's generic `apply()` repaints only `.stage-vol`, but the example lives in the
  non-volatile section — so it never refreshed. Fixed the data source + re-pointed the floor slider to commit
  on `change` (release) with `applyFull()` (not `oninput`, which would destroy the slider mid-drag). Also
  removed the orphan `.nested` left-indent on "Disabled contrast floor" (+ dead `.knob.nested` CSS).
- **Token list display fixes.** Group headers now use the shared doc-26 `subHead` (uppercase `.sub-t`), not
  the bespoke lowercase-mono `.tok-grouplab` (removed); value columns left-align via a `toktable` modifier
  (the shared `.ctable .mcol` centring stays for the contrast table); typography composites drop the font
  fallback stack (show the primary face only) and show the FULL composite — family · weight · size ·
  line-height · tracking. `ResolvedType` gained `fontFamilyStack` (CSS keeps the full stack via write-adapter)
  + optional `lineHeight`/`letterSpacingEm` (additive; no emit change).
- **Deferred to GH issues** (owner uses Issues for the backlog now): token list rendered *from `buildTree()`*
  for 1:1 export alignment + show-all-tokens; Layout controls-near-previews restructure (+ grid columns →
  curated `4/6/8/12/16/24`, "Narrow container" → "Content container"); Size & radius controls-near-previews.
- **Verified:** engine 925/925; `tsc` clean; build clean; `out/*` byte-identical; Playwright drove Preview
  (SG first + default, no UI tab), the token list (uppercase heads, left-aligned values, `Inter · 400 · 16px
  · 1.5 lh · 0em` composite), and the Disabled example updating live on both the strategy select and the floor
  slider (+ floor de-indented, hidden when conventional).
## (2026-07-29) — Typography: tier split + two new type levers (engine + web)

**STATUS: engine + dashboard.** Owner review of the Typography page turned into an architectural
pass. Two engine levers landed first (both no-ops at their defaults ⇒ `out/*` byte-identical), then the
page was rebuilt on the primitive/semantic tier line. Issues: #270, #271, #272 closed; #267/#268/#269
opened for the parts that are genuinely separate.

- **Brand-editable leading/tracking rungs (#270).** `TypographyInput` gains `lineHeights` /
  `letterSpacings`, re-anchoring what a named rung is WORTH without changing the rung set. Previously
  the twelve rungs were hardcoded constants no brand could touch, and the only way to move them was a
  per-mode raw-value override — the one shape #176's decision 2 rules out, and one that never reaches
  Figma (text styles bake leading/tracking). The per-mode merge now rebases on the brand's ramp rather
  than the const, so a brand re-anchor survives a mode that overrides a different rung.
- **Per-group leading/tracking nudge.** `leadingShift` / `trackingShift`, in rungs. The engine derives a
  size-sensitive rung per composite (`title` runs compact→snug→tight as it grows); the nudge SHIFTS
  that curve rather than replacing it, so the craft survives. This is the semantic re-point the page
  needed, and it stays inside "everything aliases a primitive".
- **The page (#272)** splits into **Foundations** (typefaces · size ladder · weight scale · leading &
  tracking) and **Styles** (weight roles · category setup · responsive · full ramp). Things that did not
  previously exist anywhere in the dashboard: the **22-rung size ladder** (rendered nowhere), the
  **displayCeiling / titleFloor** levers (advanced, no panel rendered them), the **generated `clamp()`
  and mobile floor**, and **font-availability detection**.
- **Font availability** is canvas text-metric based — no network — so it works identically in the plugin
  iframe under `networkAccess: none`. It closes a real trap: the dashboard loads no webfonts, so a
  correctly-spelled family the viewer lacks previewed silently as the fallback. (This is the pragmatic
  half of #113; enumeration/upload stay parked.)
- **#271 fixed** — Responsive sizing wrote global state from inside a mode with no signal at all.
- **Copy** — dropped "switch to a mode to retune leading/tracking there": true but misleading, since no
  global lever existed behind those ramps, "a mode" excluded Light *and* every derived mode, and
  per-mode leading never reaches Figma.
- **Surfaced, not hidden:** requested-vs-effective display ceiling (aurora asks 128px, gets 112px), and
  the fixed mobile curve MERGING sizes (aurora's `display.sm + display.md + title.2xl` all land on 40px —
  identical on a phone).
- **Verified:** 941/941 engine tests (15 new); nb-regression exits 0; every alias resolves + every mode
  contract passes for all three brands; `out/*` byte-identical; `tsc --noEmit` + esbuild clean; Playwright
  walk of both tabs in light and dark with no console errors.
- **Open, tracked:** the two-tier font-family model — typeface primitives + fixed family-role semantics,
  mono optional (#269); the mode-switcher scope question this exposed (#268); and the primitive/semantic
  audit across the remaining pages (#267), for which this page is the first worked example.

---

## (2026-07-29) — Preview: Style guide sub-view (web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`; byte-identical). Adds a fourth
Preview segment beside UI preview / Contrast contracts / Token list, per owner request for a view that reads
like real UI and shows every color role *in situ* — the evocative counterpart to the exhaustive Token list.

- **`renderPreviewStyleGuide`.** Seven `.psec` sections (via `palSection`/`subHead`): Background, Foreground
  (neutral / bold / subtle), Text color (a **Light | Inverse** side-by-side list keyed to the current +
  opposite mode; headers name the actual modes so they stay correct in dark/HC), Border, Icon, Disabled, and
  Interactive (each palette's filled/outline/inverse treatments walked across rest/hover/pressed as **button
  sets in rows**, sized to the Interactive page's `.chip`). Specimen layout is namespaced `sg-*`.
- **Reads live** from `resolveAllModes(theme)`, driven by the global mode picker (no local mode state) — it
  re-resolves on every edit and mode switch. Contract misses surface a small inline mark.
- **Pills carry the resolvable path** (doc-26 contract): the visible label is the semantic role in the real
  `color.*` namespace (`sgPill` prefixes it); the resolved primitive + hex + contrast reveal on hover. Short
  contextual leaf labels (`fill.rest`, `on-fill`) stay bare under a namespaced block header.
- **Verified:** `tsc --noEmit` clean; esbuild OK; Playwright drove Preview → Style guide (harbor) in light +
  dark — 7 sections, no console errors, inverse column flips polarity; all 71 `color.*` pills navigate
  `buildTree(harbor)`. `out/*` byte-identical. (First landed with bare pills; corrected to `color.*` per PR
  #261 review.)

---

## (2026-07-26) — Preview cleanup: thorough UI gallery, grouped token list, richer motion/breakpoint previews (web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`). A cleanup pass over the
Preview destination + two specimens, per owner request ("make the previews the best they can be; the big
UI preview thorough + elegant; a token name next to everything").

- **UI gallery rebuilt (`renderPreviewGallery`).** Each component is a titled group; **each variant is now
  its own card** — the live-rendered component on a mini page-surface, the variant name, the **full token
  breakdown** (every binding → a labelled pill: surface / text / border / radius / padding / type / shadow
  / icon …, so nothing on screen is untraceable), and that variant's own contrast receipts. Replaces the
  old chips row + aggregate 6-pill footer.
- **Token list grouped (`renderPreviewTokens`).** Within each category `.psec`, rows are sub-grouped by
  top-level path segment (Color → background / border / text / interactive / icon / foreground / disabled /
  field / …; Dimension → radius / space) with a labelled mini-table each, so the long Color list is
  scannable instead of one flat alphabetical run.
- **Motion specimen.** Each transition row now plots its **easing curve** (an SVG cubic-bezier, 0→1) beside
  the timing bar — the bar shows speed, the curve shows the shape of the acceleration.
- **Breakpoint specimen.** Added a proportional **min-width ruler** — the breakpoints on a shared axis, so
  the responsive steps read spatially (how far apart the jumps are), above the existing grid table.
- Dead gallery CSS removed (`.chips`, `.pv-paths`, `.pv-contrasts`, `.tpill.more`).
- **Verified:** `tsc --noEmit` clean; esbuild OK; Playwright light screenshots of the gallery, token list,
  Motion, and Layout show the new structure; no console errors. `out/*` byte-identical.
- **Open question logged:** whether/when to drive the dashboard *chrome* from engine-generated tokens
  (dogfood) + enable a dark tool-theme — recommended as its own arc; reverses doc-26's "chrome stays light"
  note, so needs an explicit decision.

---

## (2026-07-25) — Geometry & type pages rolled onto the doc-26 language (#72, web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`). Brings the five pages that
predated the shared design language onto it, so the whole dashboard reads as one system.

- **Shell.** Every editor section + specimen now sits in a `.psec` container with a `.psec-t/.psec-d`
  header (via `palSection`). Retired the three competing header styles — `sectionHead` (`.section-lab`),
  `subHead`-based `objEditor`, and the `.adv-obj`/`.adv-obj-h` bespoke editors — along with the now-dead
  `panelOfLevers` / `renderAdvancedPanel` helpers and their CSS.
- **Grouping.** **Size & radius** regrouped by *concept* — Corner radius (anchor + softness) · Density &
  size · Spacing grid — instead of the old advanced/not split that scattered radius across two boxes.
  **Motion** promoted Easing out of "advanced" into its own section beside Tempo. **Layout** split into
  Breakpoints + Grid & containers. **Typography** kept its (already good) grouping but each section is now
  a `.psec`.
- **Token pills.** Every ramp specimen row now shows its real, resolvable path (verified against
  `buildTree`): `radius.*`, `shadow.*`, `size.*.height`, `type.<group>.<size>.<weight>`,
  `motion.duration.*` + `motion.easing.*`, `breakpoint.*`, `container.*`. Clears the "ramp-page pills
  deferred" debt in doc 26.
- **Preview** was left as-is (its pills + master table already conform); only its token-list header
  cosmetic remains, noted in doc 26 as ◑.
- **Verified:** `tsc --noEmit` clean; esbuild OK; Playwright light screenshots of all five pages show the
  `.psec` shell, concept grouping, and live pills; no console errors. Engine untouched (`out/*` byte-identical).

---

## (2026-07-25) — Interactive page rebuilt as a per-palette matrix (#69, web-only)

**STATUS: dashboard change** (`web/src/main.ts` only — no engine, no `out/*`). Consumes the ENG-1/ENG-2
roles landed in #240 to rebuild the Interactive page to the owner-approved Prism2-model layout.

- **Structure.** Cross-cutting behaviours grouped at the top — **Outline button hover** (`outlineInteraction`),
  **Disabled** (`disabledStrategy` + nested `disabledMin`), **Icon colors** (`iconContrast`) — each a `.psec`
  with a lead select + a hand-built rest→hover / enabled→disabled / match→distinct example. Then **one section
  per action palette** (Primary / Neutral / Destructive / promoted accents + an add row), each a stack of
  full-width **slot rows**: Fill · rest, Fill · inverse, Text · rest, Text · inverse, Overlay wash, On-fill,
  On-fill · inverse.
- **Row anatomy (reuses the Surfaces atoms).** 56×56 swatch · mid (label + Source select + `color.interactive.*`
  token pill + description) · a 300px example locked right with its contrast receipt · (fill/text/overlay) a
  two-up Hover/Pressed states strip, indented to align with the title column, stretched to the right edge.
  Buttons carry a trailing arrow; the overlay wash paints honestly via rgba.
- **Binding (every control is real).** `fill.rest`'s Source is the column **fill anchor** (re-derives the
  family; per-mode via `modeAnchors` outside Light); **every other slot + every state** is a surgical **A1
  per-mode override** (`overrides[mode][role] = {palette, step}`, reusing `setFillOverride`) — "Auto" clears
  it back to the derived value. Primary leads with the **Action palette** choice; Neutral leads with the
  **Button emphasis** (subtle/strong `neutralEmphasis`).
- **Retired.** The standalone `renderInverseSpecimen` + `renderIconSpecimen` (and the old `renderCard` shell /
  `renderInteractiveCard` / `renderGroupedPanels` path) — the on-inverse family is now first-class rows and
  the icon payoff is the Icon-colors example; dead CSS removed with them.
- **Verified:** `tsc --noEmit` clean; esbuild bundle OK; Playwright screenshot (light) shows every slot
  resolving with live contrast receipts (fill 6.42:1, inverse 14.09:1, …); engine tests 925/925 (unchanged).

---

## (2026-07-25) — Interactive token family expanded: per-state text + full inverse column (PR #240, ENG-1/ENG-2)

**STATUS: engine change** (behavioral generation change to the `interactive.*` family), backing the
Interactive-page dashboard rebuild (#69, follow-up). Two gated increments:

- **ENG-1 — per-state text.** `interactive.<color>.text` (single ink) → `interactive.<color>.text.{rest,hover,pressed}`.
  rest is the gated pick; hover/pressed **walk the palette toward more contrast** (mirroring the fill states,
  so an outline/text control "comes forward" on engage). Neutral has no palette position to step, so its
  states collapse onto rest. Downstream rebindings: `button.ts`/`icon-button.ts` maps, `preview.ts` spec,
  `read-back.ts` slot-scope contract. The emit-figma scope map already keys on the slot segment, so
  `text.{state}` inherits `TEXT_FILL` unchanged.
- **ENG-2 — full inverse column.** `interactive.<color>.on-inverse` (single ink) →
  `on-inverse.{fill.{rest,hover,pressed}, text.{rest,hover,pressed}, on-fill}`, each generated + contrast-
  verified against `background.inverse.primary`. The inverse **fill** is anchored at the light/dark extreme
  (reads as an inverted CTA; keeps its `on-fill` ink clean, not a pure-black fallback); inverse states walk
  toward **more** contrast on the dark band — `walk` gained an optional direction override (`-dir`) for this.
  `emit-figma-color.ts` `colorScopes` reads `seg[4]` when `seg[3]` is `on-inverse` (text→`TEXT_FILL`,
  fill/on-fill→paint). `button.ts` on-inverse label → `on-inverse.text.rest`; `main.ts renderInverseSpecimen`
  re-pointed to the new ink leaf (PR-review catch — the old single leaf is gone).

- **Decisions of record:** (1) the inverse column is *generated + gated*, not a hand-mirrored twin
  (consistent with the existing on-inverse stance); (2) the *derived* inverse fill is a gated light/dark
  palette step (not forced white) — the dashboard's per-slot source select lets a practitioner override to
  white/any step; (3) `border` was **not** expanded to per-state (the approved layout has no border row).
- **Blast radius:** additive under `interactive.*` only — palette/background/foreground/text/gradient leaves
  are byte-unchanged; per brand +30/−6 leaves (3 colours × [3 text states + 7 inverse-column slots]); the
  336→432 contract bump is all-passing. NB regression unaffected.
- **Verified:** engine tests 925/925; nb-regression exit 0; emit-dtcg 432/432 mode contracts pass, aliases
  resolve per brand; regenerated `out/*.tokens.json`, `out/*.ai.json`, `out/figma/*`, `modes-report.md`,
  `schema/preview-spec.json`. (PR #240 also bundles the Surfaces & fills row-layout overhaul (#68), the
  neutral palette-row alignment fix (#67), and the doc-13 Southleft/Zinnia inspiration reviews — web/docs
  only, no `out/*` impact.)

---

## (2026-07-23) — Status snapshot: plugin write scope + typography now unblocked

**STATUS: orientation note (no code change).** Consolidating where the Figma-plugin write scope stands
and correcting a stale "typography is decision-blocked" framing that no longer holds.

**Plugin write scope — what materialises into a live Figma file today:**
- ✅ **Colour** (#108) — `core-palette` + `color`, per-mode alias-bound.
- ✅ **FLOAT variables** (#148) — `core-dimension`/`space`/`radius`/`size`/`border-width`/`focus`/
  `opacity`/`layout`, cross-collection aliases + per-breakpoint layout modes.
- ✅ **Shadow + gradient Styles** (#151) — Effect Styles (`shadow/*` + `shadow-dark/*`) + Paint Styles
  (baked-RGBA gradient stops + angle→`gradientTransform`, web-parity verified).
- ⏭ **Typography** — the LAST unwritten axis. **No longer decision-blocked:** #112 (type model) is
  owner-resolved, #115 (Token Press round-trip) is closed, and **#105 (engine type-model expansion) is
  closed AND implemented** — `theme.ts` carries the italic axis (`italic` on composites → `fontStyle`),
  the extensible weight-role set (`WEIGHT_ROLE_DEFAULT` incl. `max: 900`), and per-category weight/italic
  selection. The engine *generates* full typography and the emit builders exist (`buildFigmaFont` →
  `core-font`, `buildFigmaFontFluid` → `type-sets`, `buildFigmaTextStyles` → Text Styles). The only gap
  is the **plugin write executors** (font/type-sets variables + `createTextStyle`). Filed as **#237**.
  New risk surface there: `loadFontAsync` is async + can fail if a family/style isn't available in that
  Figma (the #113 name-resolution concern made concrete).
- ⏭ **Variable-linked gradient stops** — #151 bakes resolved RGBA; binding stops to `palette/*` so
  gradients re-theme live is a small fast-follow. Filed as **#236**.

**Health check (verified on `main` @ this date, off the Google-Drive move):** `plugin/` untouched since
#151, but the ~150 tests of web/engine work since (componentization arc #211–#218, Palettes/Backgrounds
card rework, danger-palette #234, neutral-Auto #231) did NOT break it — the shared-UI/engine seam held:
plugin two-context typecheck clean, build clean, **0 `node:` in `dist/main.js` + `dist/ui.html`**, all 5
test suites pass. Web improvements flow into the plugin iframe for free.

**Decision issues #112/#113:** their CORE is resolved (shipped via #105) — but each retains a genuinely
*deferred* sub-item (#112: per-(category,size) link designation; #113: font-availability research /
upload). Left open on purpose, annotated to reflect "core done, tail deferred."

---

## (2026-07-23) — Danger always mints its own palette (stable re-pointable namespace)

**STATUS: engine change.** Fixes a token-architecture coupling in the red-primary Auto path. Previously,
when the brand primary was a saturated red (`inRedTerritory`), the engine set `roleToPalette.danger =
'primary'` and minted **no** danger palette — so every semantic danger token (`foreground.danger`,
`interactive.destructive.*`, `icon.danger`, `on-danger`, `-subtle`; ~39 leaves, verified in a generated
red brand) aliased **directly** to `{palette.primary.<step>}`. There was no `palette.danger.*` seam, so
switching danger to a distinct colour later would force re-aliasing every consumer.

- **Fix (`theme.ts`, red-reuse branch only):** mint a first-class `danger` palette whose steps are a
  **deep copy** of the primary ramp, and leave `roleToPalette.danger` at its default `'danger'`. Semantic
  danger tokens now alias `{palette.danger.<step>}` in *all* auto paths (reuse / greige-carve / non-red
  carve). The resolved danger *colours* are unchanged (byte-identical to before — danger already resolved
  against the primary ramp); only the alias **target** moves `primary → danger`. Re-pointing danger later
  is now a one-ramp re-seed, zero consumer churn. The redundancy (danger ≈ primary while shared) is the
  deliberate, owner-confirmed price for the stable contract, and it makes the red case consistent with the
  carve case that already minted `danger`.
- **Scope guard:** explicit `roleColors: { danger: 'primary' }` (a deliberate user coupling) is untouched —
  only the engine's *silent* red-territory reuse changed.
- **Blast radius:** no committed fixture output moved (aurora/harbor aren't red-Auto; Wendy's uses an
  explicit `error:` = brand-supplied branch). NB regression unaffected (`nbTheme()` doesn't take this path).
- **Verified:** engine tests 925/925 (M-05 updated + 3 new assertions: danger palette minted, steps
  duplicate primary, deep copy not shared refs); NB regression PASS; a generated red brand now emits 76
  `palette.danger` aliases (was 0) with danger primitives byte-identical to primary.
- **Relation to PR #233 (web):** #233's `roleToPalette` resolution becomes a harmless `danger→danger`
  no-op after this; its "via primary" anchor note simply stops firing. Independent PRs.

---

## (2026-07-23) — Palettes page: neutral lock direction + danger-reuse render fix

**STATUS: web-only, no engine change** (`out/*` byte-identical). Two Palettes-page bugs surfaced while
driving the latest UI:

- **Neutral source lock was inverted.** The padlock sat on the **Pinned color** swatch — the one source
  whose swatch is an editable color *picker* — while **Auto** and **Custom tint** (both read-out swatches
  derived from the scale) had none. Moved the lock onto the two read-out sources and dropped it from Pinned,
  so the padlock now marks "not directly editable," matching what the swatch actually does. Also removed the
  dead `locked` class (no CSS ever targeted `.prow.locked`).
- **Danger ramp collapsed to a white swatch under a red brand primary.** When the primary is a saturated
  red the engine *reuses* the primary palette for danger (`roleToPalette.danger = 'primary'`) and mints **no**
  standalone `danger` palette (theme.ts branch 3, `inRedTerritory`). The web `statusRow` looked up the palette
  by the literal role name (`'danger'`), missed, and rendered empty bands + a white swatch. Fixed by resolving
  the Auto source through `theme.roleToPalette[role]` (the same mapping the Interactive page's Destructive
  column already uses) — the ramp now paints the reused red and the anchor reads **"via primary"** so the
  reuse is legible. Explicit borrow and Custom hue paths are unchanged. Verified headless: red primary →
  all four status ramps render 20 steps; neutral lock present on Auto/Custom, absent on Pinned.

---

## Latest (2026-07-21) — Dashboard componentization arc (C1–C6, PRs #212–#218)

**STATUS: web-only, no engine change.** A systematic pass giving every repeated dashboard control/atom a
single definition, so a styling or behavior change lands in one place (owner's driver: "tweak the
select/dropdown styling in one spot"). Full ranked audit + per-item detail + the (empty) UI fix log live
in **`docs/24-ui-components-and-fixes.md`** — this is the summary.

- **C1 `selectEl` + `.select`** (#212) — the dropdown: 5 styling paths across 16 sites → one base + `sm`/`fill`/`cap` modifiers. (The one consolidation with intentional normalization; verified by drive-through, not DOM-parity.)
- **C2 `numberField` + `.num`** (#213) — 7 sites, 4 classes → base + deltas.
- **C3 `toggleField`** (#214) — unified `renderControl` + the gradient section's duplicated switch (#210).
- **C4 `tokenPill` / `addButton` / `removeButton`** (#215) — the repeated display atoms.
- **C5 `stepPicker` convergence** (#216) — interactive card onto the shared picker (numeric-anchor ↔ key-string bridge).
- **C5b `rangeInput`** (#217) — the range element factory (construction only; readouts stay per-site).
- **C6 `objEditor`** (#218) — the object-editor section scaffold.

Every PR verified (tsc + esbuild + drive-through) and merged with a clean independent review. **Scoped-out
as non-gaps** (documented in doc 24): `colorField` (intentional per-context well sizing), knob-routing
(bespoke structures), neutral/background pickers (different shapes). No bugs surfaced during the arc — the
doc-24 fix log is intentionally empty.

**Next:** UI fix log stands ready for findings; the `style-guide-generator` assessment (Token Press
external, `assess/token-press-external`) is the active investigation.

---

## (2026-07-21) — Gradient editor (edit the definition, not just on/off)

**STATUS: web-only, no engine change.** Closes PR-3. The gradient axis was on/off only (the toggle wrote
`gradients: true|false`); this edits the **definition** — kind, geometry, interpolation, and the
ramp-aliased stops — writing an explicit `GradientInput[]` to `brandState.gradients`.

- **`renderGradientsSection`** replaces the generic `gradients` lever panel on the Surfaces page with a
  bespoke on/off toggle (its own `applyFull` so the editor mounts/unmounts — it lives in the sections
  layer, not the volatile specimens) plus, when on, one editor card per gradient and an **+ Add
  gradient** button (fresh linear gradient, auto-unique slug name).
- **`renderGradientCard`** — live preview (`inputGradientCss`, resolved through the ramp) · **Kind**
  (linear/radial) · **Angle** slider (linear) or **Shape** + **Center X/Y %** (radial) · **Interpolation**
  (OKLCH/sRGB) · a **Stops** list. Each stop aliases the ramp — a palette select → a step select (the
  step list re-homes to the new palette's nearest step) → a position % — with add/remove (kept ≥2).
- **`true` materialises** to the engine's default single brand gradient (`primary` 600→350, 135°) for
  display; the first edit writes the explicit array. An empty array collapses back to `false` (off) so
  toggle + specimen agree. Stops always alias the ramp (palette + step), never raw hex — the engine's
  themeable model.

**Verification:** `tsc` + esbuild clean. Playwright: aurora's **two** gradients round-trip (`brand`
linear + `glow` radial, centre `[0.5,0.4]` → 50/40); editing a stop's step repaints the preview;
kind linear→radial swaps the angle field for shape + centre; add-stop 2→3; add-gradient 2→3 and the
engine-resolved specimen shows 3 (so the emitted array validates); on a no-gradient brand (harbor) the
toggle On materialises the default `brand` gradient and the engine resolves it. No console errors.
Screenshot reviewed. No engine files touched.

**Next:** PR-2 arc + gradient editor complete. The Figma-plugin / Output work is the next focus per the
owner. Progress entry rides in this PR.

---

## (2026-07-21) — Backgrounds on the reusable card (docs/23 §2)

**STATUS: web-only, no engine change.** Closes PR-2d: the per-mode page-surface editor
(`renderSurfacesEditor`, "Backgrounds") now renders on the shared `renderCard` shell, so Backgrounds /
Foregrounds / Interactive / Text&ink are one visual system — change the card once, it changes
everywhere.

- **Each surface mode (Light / Dark) → a card.** Swatch = the resolved page background for that mode
  (`rp.colors['color.background.primary'][mode]`, so it repaints live); the `Base surface` picker is the
  white/black/neutral-step select; token pill = `background.primary`. Laid out in the same `.fill-grid`
  as the fill cards, `compactSwatch`.
- **Contrast floor kept as a secondary control** — appended below the card body (`.bg-floor`, a
  top-bordered row mirroring the interactive card's states row) rather than hidden. Auto unless pinned.
- **`apply()` → `applyFull()`** on both selects: the card carries a swatch now, so the base change has
  to re-render the workspace to repaint it (the old select-only editor could get away with the lighter
  `apply()`). Same rebuild the fills/text cards use.

**Verification:** `tsc` + esbuild clean. Playwright on Surfaces: 2 cards `[Light, Dark]`, both token
pills `background.primary`, both floor labels present; **base swatch repaints across values** (default
`rgb(233,233,234)` → Neutral 300 `rgb(167,167,170)` → Neutral 850 `rgb(33,33,36)` → White
`rgb(255,255,255)`); base + floor selections hold; no console errors. Screenshot reviewed — visually
matches the fill cards. No engine files touched.

**Next:** the gradient editor (PR-3). Progress entry rides in this PR.

---

## (2026-07-21) — Remove all "Advanced" disclosures, expose the UI uniformly

**STATUS: web-only, no behaviour change.** Owner decision (code-review finding #2, expanded): drop the
progressive-disclosure "Advanced" affordance entirely — every control is shown at the same level, so a
lever's `advanced` flag in the manifest no longer hides it behind a click.

- **`renderAdvancedPanel`** no longer wraps its levers in a `<details class="adv"><summary>Advanced</summary>`.
  It renders the same `.adv-panel` (manifest-`advanced` scalar/enum controls + the optional bespoke
  object editors) directly into the host as a normal always-visible panel. Signature and call sites
  unchanged — only the wrapper disappeared.
- **CSS removed:** `.adv`, `.adv-sum` (+ `::-webkit-details-marker`, `::before`, `[open]` marker). Kept
  `.adv-panel{margin-top:12px}`. Two stale comments (responsive-editor docstring, breakpoints `commit`
  closure) that reasoned about "the disclosure snapping shut mid-edit" rewritten — the concern is moot
  now, but `commit` still uses `draw()`+`apply()` (not `applyFull()`) to avoid rebuilding the editor
  under the user's cursor.

**Verification:** `tsc` + esbuild clean. Playwright across Typography / Size&radius / Motion / Layout:
`advanced-disclosures = 0` everywhere (was ≥1 per page); previously-hidden levers now visible in a
second panel (e.g. Size&radius shows Radius anchor / Spacing rhythm / Fine grid base); bespoke obj
editors present; no console errors. Screenshots reviewed. No engine files touched.

**Next:** Backgrounds on cards (PR-2d), then the gradient editor. Progress entry rides in this PR.

---

## (2026-07-21) — Neutral as an interactive card (docs/23 §2, retires the specimen)

**STATUS: web-only, additive.** The neutral / default button is now a proper interactive card alongside
Primary / Destructive (owner request #2A), replacing the disconnected standalone "Neutral emphasis"
specimen.

- **`renderNeutralCard`** — same `renderCard` shell + interactive-states section as the other columns,
  but its control is the (global) `neutralEmphasis` toggle (subtle grey vs bold fill) rather than a
  per-mode anchor step. Appended after Primary/Destructive in `renderInteractiveCards`.
- **`neutralEmphasis` moved off the panel onto the card** — removed from `INTERACTIVE_GROUPS` **and**
  filtered out of `leversFor('interactive')` so `renderGroupedPanels`'s catch-all doesn't re-surface it
  under "More" (caught in verification).
- **Removed** the dead `renderNeutralSpecimen` + its `.ne-*` / `.neutral-spec` CSS.

**Verification:** `tsc` + esbuild clean. Playwright drive-through: interactive cards are now
`[Primary, Destructive, Neutral]`; the standalone neutral specimen is gone (0); `neutralEmphasis` no
longer appears in any panel; flipping the card's emphasis re-derives the fill (grey `rgb(206,206,208)` →
bold `rgb(44,44,47)`); no console errors. Screenshot reviewed. No engine files touched.

**Next:** Backgrounds on cards (PR-2d), then the gradient editor. Progress entry rides in this PR.

---

## (2026-07-21) — Foregrounds editor (fills as cards) on the reusable card

**STATUS: web-only, additive feature.** Closes the "Foregrounds" gap from the `docs/23` §2 IA (the fill
roles had no UI control — they were engine-derived only). Owner confirmed exposing **both** families.

- **`renderForegroundsEditor`** on the Surfaces page (between Backgrounds and Text & ink): a grid of
  compact `renderCard`s, one per fill role — the bold semantic fills (`foreground.brand` /
  `.success` / `.warning` / `.info` / `.danger`) and the neutral surface tiers (`foreground.primary` /
  `.secondary` / `.tertiary`). Each card = swatch · an **Auto + palette-step picker** (`stepPicker`,
  audit §8 candidate #3) · the `foreground.*` token pill · a contrast badge (bold fills only; the
  surface tiers aren't contrast-gated so they omit it).
- **Overrides via the A1 layer, no engine change.** The picker writes `brandState.overrides[mode][role]
  = { palette, step }` keyed to each role's own palette (`roleToPalette`), pruning back to Auto — same
  mechanism as Text & ink. Customizable modes only; derived modes stay the read-only note.
- **`renderCard` gained `compactSwatch`** (72px) for the denser fill grid; `stepPicker` is the shared
  Auto+steps select.

**Verification:** `tsc` + esbuild clean. Playwright drive-through: 8 fill cards render with the right
labels/palettes; **overriding Brand to step 950 re-derived the fill** (swatch `rgb(94,75,195)` →
`rgb(13,3,45)`) and the picker held the selection — the override round-trips end-to-end; no console
errors. Screenshot reviewed. No engine files touched.

**Next:** PR-2c — Backgrounds on cards + Neutral as an interactive card; then the gradient editor.
Progress entry rides in this PR.

---

## (2026-07-21) — Reusable color card (foundation) + componentization audit (`docs/23` §8)

**STATUS: web-only, DOM-identical refactor + docs.** First slice of the color-card work (owner request to
reuse the interactive-card styling for fills). Extracts the card into a reusable component and records the
component inventory so later extractions build against an agreed list.

- **`docs/23` §8 — component inventory + componentization audit.** Living list: what's extracted (control
  kit, screen scaffold, rail-as-data, table renderers) and the ranked next-tier candidates
  (`contrastBadge`, `swatch`, the override step-picker, `tpill`, a specimen frame, an obj-editor wrapper).
  Rule: extract only at ≥2 real callers. Feeds Phase 5 self-theming.
- **Card component extracted.** New `renderCard(opts)` shell (header · big swatch · picker + token pill ·
  optional example · desc + optional badge) + shared `contrastBadge(ratio, min, label?)` and
  `swatch(hex, cls?)`. `renderInteractiveCard` now composes through `renderCard` (appending its own
  interactive-states section) instead of hand-rolling the DOM.

**Verification:** `tsc` + esbuild clean. A Playwright DOM-parity harness rendered the **Interactive** and
**Preview** pages on `origin/main` vs. this branch — **byte-identical** (25,872 / 21,456 chars), so the
migration changes nothing visible. No engine files touched.

**Next:** PR-2b — the **Foregrounds** editor + **Backgrounds** on cards + **Neutral** as an interactive
card, all on `renderCard` (the `foreground.*` fills are engine-derived; the A1 override layer repoints
them, no engine change). Then the gradient editor. Progress entry rides in this PR.

---

## (2026-07-21) — UI polish: toggle switch + code-review nits

**STATUS: web-only, additive polish.** First of a UI-refinement series (owner feedback after the reorg):

- **Toggle → switch.** `.knob input.toggle` was a native checkbox; it's now a proper switch (pill track +
  sliding thumb, ink when on) via `appearance:none` + `::after`. Kit-level, so it upgrades every toggle
  lever (gradients + inverse) at once.
- **Rail sticky offset now measured** (code-review nit): `.rail{top:calc(var(--chrome-h,120px)+10px)}`;
  `renderModeStrip()` sets `--chrome-h` from the actual header height. A brand whose mode chips wrap to a
  second row no longer tucks the rail under the sticky header (was a hardcoded `top:130px`).
- **Dead `.stage-view` class removed** (code-review nit) — it was applied to the Preview rail item but had
  no CSS rule after the ordinal was dropped.

**Verification:** `tsc` + esbuild clean; Playwright drive-through confirmed the switch renders + toggles in
both states (grey/thumb-left off, ink/thumb-right on), `--chrome-h` measures live (145px on the example),
no console errors. No engine files touched.

**Next in the series:** PR-2 — a reusable color-card component with the Foregrounds editor + Backgrounds on
cards + Neutral as an interactive card (owner request; the `foreground.*` fills are engine-derived today
with no UI control — the A1 override layer supports repointing them, so no engine change needed). PR-3 —
a gradient editor (stops / angle / kind; UI currently only toggles gradients on/off). Progress entry rides
in this PR.

---

## (2026-07-20) — Dashboard Phase 4b: Preview segmented sub-views + token list (`docs/23` §7)

**STATUS: web-only, additive.** The Preview destination gains a **segmented view-switcher** with three
views, completing the `docs/23` §7 Preview shape:

- **UI preview** — the component gallery (extracted from the old `paintPreview`; unchanged).
- **Contrast contracts** — the full all-modes master table, now a first-class view (was a closed
  disclosure inside the gallery). Reuses `contractTableEl`.
- **Token list** — NEW: the resolved token set, category-grouped (**Color · Dimension · Typography ·
  Shadow**) with values per mode. Colour = every resolved semantic role (`resolveAllModes`) as a
  swatch + hex per mode; Dimension = the px scale (`rp.dims` + per-mode `dimOverrides`); Typography =
  resolved composites (family · weight · size, mode-invariant); Shadow = the elevation ramp's CSS
  `box-shadow` per mode. Built entirely from the resolved read-model — no engine change.

`paintPreview` was split into `renderPreviewGallery` / `renderPreviewContracts` / `renderPreviewTokens`;
`renderPreviewPage` renders the `.pvseg` switcher (state `previewView`, defaults `ui`) and dispatches;
a segment click re-renders the page. Ramp primitives stay on Palettes; the token list is the semantic +
dimension/type/shadow layer.

**Verification:** `tsc` + esbuild clean. Playwright drive-through on Preview: three segments switch with
correct active state; UI preview shows 8 components, Contrast 32 rows (the master table), Token list the
four category sections (4 tables, per-mode swatches); no console errors. Token-list screenshot reviewed.
No engine files touched. This completes Phase 4. Progress entry rides in this PR.

---

## (2026-07-20) — Contrast-table follow-up: token-path labels + exhaustive partition

**STATUS: web-only, refines #201.** Two small changes to the per-section contrast tables:

- **Token-path pair labels (owner request).** The per-section tables now lead with the raw `fg on bg`
  token path (mono, e.g. `text.primary on foreground.primary`) with the human description as a faint
  subtitle — the component context is obvious next to the controls, so the path is the useful primary.
  `contractTableEl(contracts, paths?)` gained the flag; the Preview **master** table keeps its
  descriptive `component · variant — label` (verification-of-record).
- **Exhaustive partition (review nit on #201).** Replaced the two hard-coded component lists with one
  `SURFACE_CONTRACT_COMPONENTS` set + an Interactive catch-all, so the surfaces/interactive split covers
  every contract **by construction** — a component added to the preview spec later can't silently vanish
  from the local tables; it lands on Interactive automatically.

**Verification:** `tsc` + esbuild clean; drive-through unchanged (Surfaces 7 + Interactive 25 = 32 =
master; Motion none; no console errors); screenshot of the token-path table reviewed. No engine files
touched. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard Phase 4a: per-section contrast tables (`docs/23` §3)

**STATUS: web-only, additive.** The "local proof" half of the hybrid contrast model: each colour page
now carries a scoped **Contrast on this page** table — the same authoritative contracts the Preview
master table shows, re-sliced to the components that page governs.

- Extracted `contractTableEl(contracts)` (the Pair · per-mode dot+ratio table) from `paintPreview`; the
  Preview master table now calls it too — one renderer, two callers.
- `PAGE_CONTRACTS` maps colour pages → their components (`surfaces`: typography + card; `interactive`:
  button / button-secondary / input / nav-item / badge / alert); `renderSectionContrast(page)` re-slices
  `rp.contracts` and renders a collapsed disclosure in the page's volatile region (repaints on edit).
- Only the two colour pages govern contrast pairs, so only they get a table; non-colour pages get none.

**Verification:** `tsc` + esbuild clean. Playwright drive-through: Surfaces shows **7 pairs**, Interactive
**25 pairs**, and **7 + 25 = 32 = the Preview master table** exactly — every contract on precisely one
page's scoped table, none orphaned; Motion (non-colour) has none; no console errors. Screenshot of the
Surfaces table reviewed (card + typography pairs, all four modes, green). No engine files touched.
Progress entry rides in this PR. **Next (4b):** Preview segmented sub-views (UI / contrast / token list).

---

## (2026-07-20) — Dashboard Phase 3b: focused pages + rail-as-data (`docs/23` §7)

**STATUS: web-only, visible reorg (part 2 — completes the Phase 3 IA split).** Splits the two catch-all
editing stages into **focused, single-concern pages** and makes the rail **data-driven**.

- **Rail-as-data.** `STAGES`/`stageOfLever` → a `NAV` config + `pageOfLever`. The rail renders from
  `NAV` (nine destinations), **no ordinals** (top-to-bottom order carries the compose sequence), a
  divider before the `view` destination (Preview).
- **Focused pages.** The old *Semantic* → **Surfaces / fills** (backgrounds · text & ink · gradients)
  + **Interactive** (action colour · states · a11y). The old *Form* → **Elevation** · **Size & radius**
  (size · density · radius) · **Layout** (breakpoints + containers, promoted from Advanced on a
  dedicated page) · **Motion**. *Palettes* (was primitives), *Typography*, *Preview* carry over. Each
  page's facets are **sections within it**, not rail rows.
- **Screen scaffold.** One `renderScreen(host, key, sections, specimens)` all editing pages compose
  through (hero → sections, or the read-only note on a derived mode → the volatile contextual specimens);
  `renderAdvancedPanel` factors the per-page Advanced disclosure. `pageOfLever` routes every lever to a
  page (status hues stay inline on Palettes; the `color`/`advanced` groups split by key). The double
  section headings on Surfaces were resolved (the bespoke editors self-head "Backgrounds" / "Text & ink").

**Verification:** `tsc` + esbuild clean. A Playwright drive-through walked **all nine pages** (example
brand, 1360×1050): rail shows the nine focused labels with one divider before Preview and **no numbers**;
every page renders its hero + controls/editors + contextual specimens (asserted knob/editor/specimen
counts per page — nothing orphaned); a header mode switch on Interactive re-renders in Dark; **no console
errors**. No engine files touched. Screenshots reviewed for Surfaces / Interactive / Size & radius. This
completes the `docs/23` §7 IA; Preview's segmented sub-views + per-section contrast tables are the next
follow-up. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard Phase 3a: global header + Preview tab (`docs/23` §7)

**STATUS: web-only, visible reorg (part 1 of the Phase 3 split).** Delivers the headline of the reorg —
the overall UI preview moves to **its own destination**, and the mode selector becomes a **persistent
global-header tier** — without yet re-partitioning the editing pages (that's 3b).

- **Two-tier global header.** `build()` now wraps a sticky `.chrome`: tier 1 = the brand bar (identity +
  Export); tier 2 = the mode-context strip, promoted out of the per-stage workspace (#171) into the header
  via a new `modeStripHost` + `renderModeStrip()`. `currentMode` persists across navigation; the strip
  shows on every page (inert where mode doesn't apply). `apply`/`applyFull` refresh it so its per-mode
  contrast ✓/✗ marks track edits; the menu/mode handlers repaint the strip in place.
- **Preview is its own tab.** New `renderPreviewPage` owns the component gallery + contrast contracts
  (the `paintPreview` that used to be **duplicated at the bottom of Semantic / Typography / Form**). The
  editing stages now render **only their contextual specimens** — the 3× duplication is gone. Preview sits
  in the rail after a divider, with no ordinal (a destination, not a build step).
- Deferred to follow-ups: Preview's segmented sub-views (UI / contrast / token list) + a per-section
  contrast table; the focused-page split (3b) and rail-as-data.

**Verification:** `tsc` + esbuild clean. A Playwright drive-through (example brand, 1360×1000) screenshotted
every page + a header mode switch: two-tier header renders, rail shows the 4 numbered stages + un-numbered
Preview after a divider, the Preview page shows the full gallery, **`.pvhost` count on an editing page = 0**
(duplication removed), and switching to Dark in the header re-renders the page in dark. No console errors
(favicon 404 only). No engine files touched. Progress entry rides in this PR.

---

## (2026-07-20) — `docs/23` Phase 3 interaction model (addendum, decided)

**STATUS: docs-only.** Adds §7 to `docs/23` recording the settled Phase 3 interaction model, so the
build runs against a spec. Decisions:

- **Rail** stays a flat clickable list, just re-grouped to the §2 groups (~9 items). Each item is one
  focused page; a page's facets are **sections within the page**, not separate rail rows; long pages may
  get anchor links. **No accordion/collapse** — the catch-all stages splitting across focused pages
  already removes the long-scroll problem.
- **Global header** (the "brand bar", promoted) is **two-tier**: identity + quick Export (tier 1), the
  persistent **mode selector** (tier 2). `currentMode` is global and persists across navigation. Chips
  exposed by default; overflow → active-pinned `More ▾` menu (never scroll), **deferred** until a brand
  needs it.
- **Rail vs header rule:** canvas destination → rail (authoring pages, **Preview**, future **Output**);
  quick action/menu → header (brand, mode, **Export**). **Preview is a rail leaf** with **segmented
  sub-views** (UI / contrast / tokens) in one screen.
- **No numbering**; a section-complete ✓ is **deferred** (needs a real save/done model — a false "done"
  is worse than none). Per-mode contrast ✓/✗ on mode chips stays (accuracy ≠ completeness).
- **Output / Style guides** is Figma-only and an **active canvas write** — it draws a real style-guide
  table onto the Figma canvas with live variable values (an existing owner-built plugin to be brought in
  and finished). Split as **channel-gated** functionality (present in the plugin host, hidden in web).

Phase 3 builds **rail-as-data** + the **screen scaffold** to this spec — now with real callers, per the
Phase 2 decision that shipped the control kit first. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard control kit (foundation refactor, `docs/23` Phase 2)

**STATUS: web-only refactor, DOM-identical.** First foundation stone of the `docs/23` reorg: a small
reusable **control kit** in `web/src/main.ts`, so a control (or a whole screen in the IA split) composes
from shared primitives instead of re-deriving the same DOM. Three primitives:

- `knob(label, body, desc)` — the `div.knob` scaffold (`label.knob-label` · body · `p.knob-desc`) every
  control shares. `renderControl`, `renderPerModeSelect`, and the read-only type-scale knob now build on it.
- `knobBody(...kids)` — the `div.knob-body` input+readout row (slider / toggle).
- `optionEl(value, text, selected)` — one `<option>` builder replacing the ~9 near-identical local
  `opt`/`optE`/`mkOpt` closures + inline loops (renderControl, per-mode select, interactive card, status
  ramp, surfaces, foreground, add-accent, mode-set base select, typography family select).

Deliberately **minimal** — no rail-as-data or screen-scaffold generalisation yet; those get real callers
only when the IA actually splits (Phase 3), so building them now would be abstraction ahead of use
(root `CLAUDE.md` §3 surgical / §2 no speculative abstraction). This ships the vocabulary Phase 3 clones.

**Verification:** `tsc --noEmit` + esbuild build clean; a Playwright DOM-snapshot harness rendered the
example brand across **all 4 stages × every mode (13 snapshots)** on `origin/main` vs. this branch and
found them **byte-identical** — the refactor changes nothing visible or behavioural. Bundle shrank ~840 B
(duplication removed). No engine files touched; `out/*` untouched. Progress entry rides in this PR.

---

## (2026-07-20) — Dashboard IA + component-system plan (`docs/23`, direction)

**STATUS: docs-only.** Captures a design-session decision to reorganise the web dashboard
(`web/src`) from four broad stages into **focused, single-concern sections** with the overall UI
preview promoted to **its own Preview tab** (today `paintPreview` is duplicated on Semantic /
Typography / Form). New doc `23-dashboard-ia-and-component-system.md` pins:

- **The target IA** — grouped rail: Palettes · Surfaces (Backgrounds / Foregrounds / Text / Gradients)
  · Interactive (colours / Disabled / Focus) · Typography · Elevation · Size & radius (Size / Density /
  Radius / Border-width slot) · Layout · Motion · Preview (UI gallery / all-modes contrast table /
  token list) · Output (Figma: Style guides / Components — deferred, own discovery).
- **Two control patterns** — free-colour screens vs **derived/contrast screens** (Text/ink, Focus):
  Text ink is neutral-ramp-derived with a per-mode **neutral-step override** (never an arbitrary hex),
  kept + flagged when below ratio; Focus is derived from the action palette (independent focus lever =
  net-new, not in scope); border-width has no lever (documented slot only).
- **Facts pinned** — density scales the component-size tier only (→ lives under Size, not Layout);
  contrast anchors (`text.primary`→`background.primary` 7:1, secondary/tertiary→floor surface); the
  engine already **re-derives on every edit and preserves+flags overrides** (behaviour to surface, not
  build); per-section contrast tables are a near-free re-slice of already-authoritative data.
- **Build underneath** — introduce an internal **component system** (screen scaffold + control kit +
  rail-as-data) so the reorg is declarative config, and eventually self-theme the dashboard from Prism3
  tokens (light/dark toggle). Sequencing: this note → foundation refactor (byte-identical) → IA split +
  Preview tab → per-section contrast tables → self-theming (later).

Process note: the `#189/#192/#194` progress entries were backfilled by `#191/#193/#195`; **go-forward,
the `00-progress.md` entry rides in the feature PR** (this entry included) rather than a follow-up round-trip.

---

## (2026-07-19) — Phase D code-review fixes (engine correctness + UI)

**STATUS: MERGED** (#194). Fixes from two independent code reviews of the per-mode override arc.

**Engine (`theme.ts` / `tree.ts`).**
- **Dark-based custom modes now inherit their base's reduced dark shadow** even without a `modeLevers.shadow`
  override. Built-in `dark` gets `modes.dark` unconditionally, but a `customModes: [{base:'dark'}]` mode had
  no such default — so it fell back to the light `$value` (a light shadow under a dark surface). `brandTheme`
  now seeds a `shadowByMode` entry from the global dark layers for every dark-based custom mode lacking an
  override (byte-equal to `modes.dark`; guarded so an explicit lever still wins) → they also emit their own
  `shadow-<mode>/*` Figma effect styles. (This closes the gap noted in the #190 consolidation entry: the
  earlier claim that "dark custom modes keep their entry" only held when they carried an explicit override.)
- **`modeLevers.light` is now rejected** — light IS the global baseline for the non-colour levers, so a
  `modes.light` override would shadow the canonical `$value`. The error points to setting the global levers.
- **Line-height / letter-spacing gained the map-level no-diff suppression** every other axis already had (a
  per-mode ramp equal to the global now leaves `modeLevers` off the Theme → byte-identical).
- Cleanup: one shared `gridStepOverride` (the two grid-override helpers were byte-identical) and one
  `diffAssign` for the JSON-compare no-diff suppression across radius/family/weight/LH/LS.

**Web (`web/src/main.ts`, net −63 lines).**
- The **breakpoints editor no longer collapses the Advanced disclosure** on each edit (`draw() + apply()`
  instead of `applyFull()`, which recreated the `<details>`).
- A shadow slider dragged to **exactly the global** value now prunes the override (no redundant `== global`
  entry); a hand-authored **non-discrete** per-mode value (e.g. `radius 0.7` from import) surfaces as its own
  `"0.7 (custom)"` option instead of misreading as Auto.
- Cleanup: `renderPerModeRadius/Tempo/Density` → one `renderPerModeSelect`; the duplicated per-mode
  `modeLevers` read/write/prune → one `getModeLever` / `setModeLever` / `pruneModeLevers` trio (the UI analog
  of the engine's `diffAssign`; the recursive prune generalises the old bespoke shadow-tint clearing).

Engine tests **909 → 917** (+8: dark-shadow seeding, `modeLevers.light` rejection, LH/LS suppression); NB
regression green; **`out/*` byte-identical** (no example brand exercises a dark-based custom mode or
`modeLevers.light`); web/plugin tsc + builds clean.

---

## (2026-07-19) — lever-UI completeness + interactive-accent manifest reconcile

**STATUS: MERGED** (#192). Closes out the lever-UI-coverage audit: **every manifest lever now has a working
UI control and every axis has a live specimen.**

**Web — remaining specimens + object/list editors.** Adds a **Layout specimen** (breakpoint / column / gutter
/ margin table + base-column strip + container-cap bars, reads `theme.layout`) and a **type-variants strip**
per group (the weights it ships rendered at weight, italic/link samples when shipped, and the size range so
`titleFloor` is visible). The advanced **object/list** levers that `renderControl` could only show read-only
get bespoke editors nested in the Advanced disclosure: **Responsive type** (`typography.responsive` fluid +
min/max viewport), **Breakpoints** (editable `layout.breakpoints` min-width list, dedup+sort+floor), and
**Emphasized easing** (`motionPersonality.easingEmphasized` cubic-bezier). All three write real `BrandInput`
paths (verified flow-through to resolved output).

**Manifest — reconcile the interactive-accent surface split.** The manifest advertised `accentPalette`
(control `palette-ref`) as the interactive-accent control, but it had **no live UI**, while the more capable
`interactivePalettes` (what the interactive cards edit + the preview renders) was **absent from the manifest**
— so the control contract read by the Figma plugin + MCP pointed at the wrong, UI-less lever. Fixed: the
manifest now lists **`interactivePalettes`** (control `list`, advanced) and drops the `accentPalette` lever.
`accentPalette` **stays a valid back-compat input** — its engine field, schema, accent≠action guard, and
byte-identical-to-`interactivePalettes` test are untouched; it's simply no longer advertised as a form control
(`interactivePalettes` wins when both are set). No web double-render (`interactivePalettes` is advanced+list →
excluded from both the lean and Advanced panels; the cards remain its editor). `levers.ts` ↔
`lever-manifest.json` kept in lockstep by the byte-drift guard test.

Engine tests **909/0** (incl. `accentPalette` back-compat + manifest-drift); **`out/*` byte-identical** (no
generation change); NB regression green; DTCG 336/336 + aliases resolve; web/plugin tsc + builds clean.

---

## (2026-07-19) — Phase D: per-mode density lever + Advanced-lever disclosure

**STATUS: MERGED** (#189). Two changes closing out Phase D's non-colour axes.

**Per-mode density (engine + web).** `ModeLevers` gains `density?` — a mode may run a different
component-density tier (`compact`/`comfortable`/`spacious`), re-deriving its `size.*` control heights +
paired padding via the same `componentSizes(density, spaceBase)` the baseline uses. The dimension analog of
the tempo enum. The `space.*` reference scale is **density-free by design**, so it's untouched — only the
`size.*` tier varies. Same seam as radius: a size sub-leaf (`height` / `padding-x` / `padding-y`) whose
per-mode px differs from light carries a `$extensions.prism3.modes.<mode>` override (height aliases the
dimension grid on-grid else literal; padding aliases the space scale on-scale else literal). No-diff
suppression (`lev.density !== density`) composes with the #190 suppression on the other axes → byte-identical
when unused. Validation is engine-side (`brandTheme()` throws on an invalid density or a density on a
generate-only mode); the schema documents it. Web: a per-mode density select (Auto-follows-global, like
tempo) + a new mode-aware **Control-size specimen** so the change is visible.

**Advanced-lever disclosure (web only).** The lean-default lever panels drop every `advanced` manifest
lever, which left eight scalar/enum levers with no UI control at all (`baseMd`, `spaceBase`, `baseUnit`,
`typography.displayCeiling`, `typography.titleFloor`, `layout.columns`, `layout.containerMax`,
`layout.containerNarrow`) — reachable only by hand-editing the brand input. Added the progressive-disclosure
affordance the manifest always intended: a collapsed **"Advanced"** panel per stage rendering that stage's
advanced slider/enum levers via `renderControl` (Form gets 6, Type gets 2). The lean panel (`!l.advanced`)
and the Advanced panel (`l.advanced`) are disjoint on the same filters, so nothing double-renders. Object/
list advanced levers keep their bespoke editors.

Engine tests **897 → 909** (+12 density: seam, density-free `space.*`, validation throws, design.md
round-trip, `validateBrandInput` acceptance, no-diff suppression); NB regression green; **`out/*`
byte-identical**; DTCG 336/336 contracts + all aliases resolve; web/plugin tsc + builds clean.

---

## (2026-07-19) — Phase D consolidation: no-diff suppression across all non-colour mode levers

**STATUS: MERGED.** Follow-up to the per-mode non-colour lever arc (#177–#188). The motion **tempo** lever
(#187) already suppressed its per-mode map when a mode's value equalled the global baseline (`tempo !==
baseTempo` → no `motionByMode` entry → byte-identical output). This extends that same **no-diff suppression**
to the four axes that shipped without it — **radius (#184)**, **font families + weight-roles (#185)**, and
**shadow (#188)** — in `theme.ts`:

- **radius:** an entry is populated only when the mode's re-derived `radiusScale(value, baseMd, 128)` ramp
  differs from the global `radiusScale(rScale, …)` baseline. `radius: 1` on a scale-1 brand now emits no
  redundant per-mode `radius.<mode>.json`.
- **families / weight-roles:** populated only when the merged-then-derived stacks / weight-role numerics
  differ from the global. A mode re-declaring the global family emits no `core-font.<mode>` set; and the
  `extraWeights` union (which mints `font.weight.<num>` leaves) only takes a mode's weights when the entry is
  actually kept.
- **shadow:** a **light-appearance** mode whose re-derived ramp equals the global inherits the canonical
  `shadow/*` styles → no redundant `modes.<mode>` DTCG entry or `shadow-<mode>/*` effect-style set. **Dark-based
  custom modes always keep their entry** — the reduced dark layers are emitted no other way (there's no
  `shadow-dark` default for custom modes), so suppression is scoped to light appearance only.

Pure consolidation — no new behaviour, no schema change. **`out/*` byte-identical** (no example brand sets a
per-mode lever); engine tests **897/0**, NB regression green, DTCG **336/336** contracts + all aliases resolve
per brand. Verified by probe: a mode overriding every axis to exactly the global value now produces empty
`*ByMode` maps (byte-identical), while a genuinely divergent mode still populates all four, and a dark custom
mode keeps its shadow.

---

## (2026-07-18) — extensible interactive palettes (engine → web) + UI polish

**STATUS: MERGED** (#163 engine · #166 + #168 web · #164 + #167 polish). The interactive color model is now
**extensible and directly editable**: a brand can ship the built-in primary/neutral/destructive interactive
columns PLUS N opt-in "accent" columns, each promoting a defined palette to a full `interactive.<name>.*`
family with an optional fill step — surfaced as per-column cards on the Semantic stage (the #161 pass).

- **Engine — #163: `interactivePalettes` (generalises `accentPalette`).** `BrandInput.interactivePalettes?:
  {name?, palette, anchorStep?}[]` — each promotes a *defined palette* (primary or a brandColors name) to a
  full `interactive.<name>.*` column (fill+states / on-fill / text / border / on-inverse / overlay); `name`
  defaults to the palette, validated (slug, unique, no collision with the primary/neutral/destructive
  built-ins). Plus `actionAnchorStep?`/`destructiveAnchorStep?` — optional fill-step overrides for the
  built-ins (unset = today's placement). On-fill inks stay **auto-derived + contrast-gated**; the
  **accessibility floor wins over the step override** (a too-light pick is nudged to the darkest passing
  step). `accentPalette` kept as **byte-identical back-compat**. `docs/20` updated (§3a). *out/\* byte-identical
  (no example brand sets the new fields); engine tests + NB regression green.*
- **Web — #166 → #168: the interactive-color cards (owner reference, #161 inc 1+2).** One card per column:
  big fill swatch · palette/step picker (writes `actionAnchorStep` / `destructiveAnchorStep` /
  `interactivePalettes[i].anchorStep`) · token path · live button example (fill + on-fill) · floor-gated
  contrast badge · hover/pressed sub-cards. Plus an **"add interactive color"** promote flow (a brand color →
  a new column, with a remove ×) — reserved names filtered so the auto-name can't collide (the #168
  should-fix). Neutral is deliberately not carded (it's `neutralEmphasis`-driven). Web-only, reads the
  resolved model.
- **Model:** interactive color = **palette + step (primitives only)**, never a raw color; a bespoke action/
  accent hue is a *named brand color* the whole system aliases. This resolved the owner's "can we pick the
  interactive color?" question — palette+step, not a floating picker.
- **Polish — #164 + #167.** #164: swatches fill their container at 40×40 (native color-input inset stripped),
  darker page bg so cards read as elevated, brand-color count badge removed, section-label + label→select
  spacing, and **US English** (`colour`→`color`) across all *visible* UI text (main.ts + lever labels/
  descriptions; the token-`$description` prose that emits into out/\* is a separate deferred pass). #167:
  replaced the oversized native `<select>` caret with a small consistent chevron across every select.

**Open backlog (captured #155–#162, #165 — most polish/US-English done):** #157 validation-color borrow bugs
(could NOT reproduce on main via headless — awaiting repro), #158 primitives layout (pair the neutral cast /
brand-color cards with the palettes they drive — the cast is invisible today because its greyscale is
off-screen), #159 brand bar (horizontal, replacing the overflowing dropdown), #160 design.md import (post-setup
+ startup upload + validation/error-handling), the remaining #161 sectioning (accessibility/features controls),
and the US-English token-`$description` pass (changes out/\*, so its own PR). **Next up: docs sweep (this), then #158.**

---

## (2026-07-17) — web UI reaches feature-complete: refinement pass, first-run, typography B, icons

**STATUS: MERGED** (#142, #145, #147, #149, #150, #152, #153). The web dashboard is now demo-ready and
feature-complete bar deploy — every lever is editable AND has a live preview, a real first-run experience,
and the typography editor is done. All in shared `web/src`, so the plugin iframe inherits it post-#110.

- **UI refinement pass (polish + light restructure).** #142 collapsed the full all-modes contrast table
  (which repeated on every stage) into a closed disclosure — the per-component badges stay as the
  point-of-edit check, and each lower stage dropped ~25%. #145 added an **animated motion specimen** on the
  Form stage (the semantic transitions fill at their resolved duration + easing; plays on tempo change,
  Replay button, `prefers-reduced-motion` honoured) — resolving the motion half of #114 (a static preview
  couldn't show the tempo lever's effect). #147 grouped shadow softness + tint under one **Shadow** heading.
- **First-run / default-state (#149 + #150).** The silent-demo boot was the bug hiding inside "what's the
  default state?". #149 added **localStorage persistence** — a thin `web/src/persist-local.ts` port over the
  pure `persist-input.ts` core (#131), so web remembers the working brand across reloads (plugin still uses
  Figma shared-data; the path is web-gated via `PRISM3_HOST`). #150 added the **start screen**: on a true
  first run (nothing persisted) the app shows a start moment — start from your colour (one primary bootstraps
  a full theme via `seedFromColor`), a neutral default, or explore an example — instead of the demo. Examples
  reframed as examples; "+ New brand" re-invokes it (web only). Plugin fresh-file start moment deferred.
- **#99 closed — icon specimen (#152).** The final #99 axis: a Kind-B icon specimen (on surface + reversed on
  fill, dependency-free inline SVG) so the `iconContrast` floor lever has a live payoff. All 7 per-axis
  specimens now shipped.
- **#103 closed — typography editor complete.** Phase A (#137/#139: font pool + weight-role map + per-category
  table) + **Phase B (#153): advisory weight availability** — a curated `KNOWN_WEIGHTS` map mutes/flags (⚠)
  weight roles a category's family likely doesn't ship, refreshed live on font/weight/family edits. Advisory
  per the #113 model (never a hard gate; unknown fonts never false-flagged).

**Gates across the arc: web tsc + build clean each PR; plugin both-context build clean where shared `web/src`
changed (0 `node:` builtins, web-only paths runtime-inert in the plugin); no engine/token/`out` change on any
(all reuse the read-model / pure persist core). Each verified live headless (Playwright).**

**Open (web):** a direct **interactive-colour** affordance — action colour is a `palette-ref` (`actionPalette`
→ primary or a named brand colour), so a bespoke action hue today needs the two-step add-brand-colour →
repoint; a picker that creates/updates a brand colour under the hood would close the gap without breaking the
named-palette model (owner deciding). Also: the "set your brand colour" provenance nudge for untitled brands;
#104 static-site deploy (owner not ready). **Cross-lane:** plugin fresh-file start moment; the
`brand-skills` extraction → `BrandInput` as a fourth start path; #111 components-as-data.

---

## (2026-07-17) — shadow/gradient: plugin write scope reaches Figma Styles

**STATUS: MERGED (#151).** The #146 follow-up, and the last write
axis before typography. Shadow + gradient are Figma **Styles** (Effect + Paint), not variables — a
different API (`createEffectStyle`/`createPaintStyle`) — which is why they were carved out of #146.
This lane adds them, so an apply now writes colour + FLOAT vars + shadow/gradient styles. Only
typography remains (its own Styles-based lane, blocked on #112/#113).

- **Node-free extraction — `engine/emit-figma-styles.ts`** (new): `buildFigmaShadow` (→ Effect Styles)
  + `buildFigmaGradient` (→ Paint Styles) + their types/helpers moved out of the I/O-shell
  `emit-figma.ts`, which re-exports them (same pattern as color/dims). `out/*` byte-identical.
- **Pure plan — `write-plan.ts` `buildStylesPlan(theme)`**: reshapes both builders into a
  `StylesPlan` (`effects: EffectStyleRow[]` + `paints: PaintStyleRow[]`). Shadow → BOTH sets
  (`shadow/*` light + `shadow-dark/*` dark, verbatim — Effect Styles can't hold modes). Gradient
  stops → **BAKED resolved RGBA** (owner decision; variable-linked stops are a fast-follow), and the
  emit's `angle`/`center` → Figma's 2×3 `gradientTransform` via a new `gradientTransformFor` helper
  (the one bit of new math: 0°=identity horizontal, rotates about centre).
- **Styles executor — `plugin/src/write-styles.ts`** (new, the FIRST non-variable write): a minimal
  `StylesApi` port (`createEffectStyle`/`createPaintStyle` + the two getters); `applyStylesPlan` does
  idempotent find-by-name → reuse+overwrite, else create. Runs after the FLOAT write in `main.ts`;
  summary widens (`…styles N effects (+M) / K gradients (+L)`).
- **Read-back (light) — `read-figma.ts` + `read-back.ts`**: reads local style NAMES into the snapshot
  (`styles?` field, optional styles-API arg) + a name-level `verifyStylesReadback` (light shadow set
  present, dark set iff brand ships dark, gradients iff brand opts in).

- **Review fix (parity):** the gradient angle is the SAME CSS `linear-gradient(<deg>)` angle the web
  renderer uses, so the two surfaces must agree. The first cut rotated by `angleDeg` directly (0°=
  horizontal), which was 90°-off + endpoint-swapped vs. CSS (0°=to-top). Fixed: `gradientTransformFor`
  now uses `φ = 90 − angleDeg`. Verified LIVE that CSS 90° renders red→blue L→R in Figma (the
  asymmetric check a symmetric 135° render can't distinguish), and 135° puts the start stop top-left as
  CSS does. The `gradientTransformFor` unit cases now encode the CSS convention.

**Gates: engine 767→776 (styles-plan + transform cases); `out/*` byte-identical; plugin two-context
typecheck clean; plugin `npm test` write+read+persist+float+**styles** all green; web tsc+build clean;
`dist/main.js` 0 `node:` builtins. LIVE-DRIVEN via the Desktop Bridge: created Effect Styles
(`shadow/*` + `shadow-dark/*`, multi-layer, DROP/INNER) + Paint Styles (linear + radial gradients);
applied `gradient/brand` + `shadow/md` to a rect and screenshotted — gradient + shadow render correctly
and the angle matches the web preview (CSS 90° → red-left/blue-right); re-apply idempotent (+0, no
duplicate styles); scratch styles + probe rects cleaned up.** Out of scope: typography (#112/#113);
variable-linked gradient stops (fast-follow).

---

## (2026-07-17) — #146: plugin write scope expands to the FLOAT-variable axes

**STATUS: MERGED (#148).** The plugin's live write adapter (#108)
materialised **colour only**. Verified live it still did: an apply wrote `core-palette` + `color` but
nothing geometric. #146 extends the write path to the **FLOAT-variable axes** — `core-dimension`,
`space`, `radius`, `size`, `border-width`, `focus`, `opacity`, and `layout` — so an apply now
materialises the dimensional layer too. Out of scope (own follow-ups): typography + shadow/gradient,
which are Figma *Styles* (a different API), and typography is decision-blocked on #112/#113.

- **Node-free extraction — `engine/emit-figma-dims.ts`** (new): `buildFigmaDims` + `buildFigmaLayout`
  (+ `pxFromValue`/`aliasFigName`/scope maps/`LAYOUT_MODES`/`FigmaDimsCollections`) moved out of the
  I/O-shell `emit-figma.ts`, which now re-exports them — the SAME pattern as `emit-figma-color.ts`.
  Pure functions of `Theme`; **`out/*` byte-identical** after regen (behaviour-preserving).
- **Pure plan — `engine/write-plan.ts` `buildFloatWritePlan(theme)`**: reshapes both builders into a
  uniform `FloatCollectionPlan[]` (create-all-then-alias, one target per mode — the same collapse-safe
  shape as the colour plan). Single-mode dims axes; `radius` 1–2 modes (Default [+ wireframe]); `layout`
  one mode per breakpoint the brand ships.
- **Executor — `plugin/src/write-figma.ts` `applyFloatPlan`**: widened `VariablesApi` (`createVariable`
  `'COLOR' | 'FLOAT'`, `setValueForMode` accepts `number`); two passes generalised over N collections,
  binding aliases against ONE global name map (cross-collection: space→dimension, size→dimension/space,
  radius→dimension, layout grid→space). Idempotent find-by-name. Runs after the colour write in
  `main.ts`; the `apply-result` summary widens (`…dims/layout N collections (+M), K aliases bound`).
- **Read-back (light) — `read-figma.ts` + `read-back.ts`**: reads the FLOAT collections into the
  snapshot (`float?` field, keeps colour-only reads valid) + a modest `verifyFloatReadback` (collections
  present, aliases resolve, dimensions hidden, radius wireframe-mode iff opted in). `ReadValue` widened
  with `number`; `isAlias` hardened for primitives.

- **Review fix (critical):** `getLocalVariablesAsync('COLOR')` returns ONLY COLOR vars — using it for the
  FLOAT idempotency map (`upsertCollection`) + the FLOAT read-back would have made re-apply DUPLICATE every
  FLOAT var and the read-back come back EMPTY. The in-memory shims hid it (they ignored the `type` arg).
  Fixed: both sites fetch UNFILTERED (`getLocalVariablesAsync()`, still scoped by `variableCollectionId`);
  the three test shims now HONOR the type filter so the regression can't hide again.

**Gates: engine 754→767 (float-plan + verify cases); `out/*` byte-identical; plugin two-context
typecheck clean; plugin `npm test` write+read+persist+**float** all green; web tsc+build clean;
`dist/main.js` 0 `node:` builtins. LIVE-DRIVEN via the Desktop Bridge with the REAL semantics: wrote the
FLOAT collections, re-ran → second run created +0 (idempotent, no duplicate vars), unfiltered read saw the
FLOAT vars while a `'COLOR'`-filtered read did NOT (confirming the bug + fix), cross-collection aliases
resolve (space→dimension, grid→space); scratch file cleaned up after.** Out of scope: typography
(#112/#113), shadow/gradient Styles — own issues.

---

## (2026-07-17) — editor lane completes: typography editor + holistic radius + object-value editors (#102, #103 A, #97)

**STATUS: MERGED** (#102 → #136, #103 A1 → #137, #103 A2 → #139, #97 → #140). The web dashboard now has
**no read-only levers left** — every knob in the manifest is editable, and (all in shared `web/src`) the
plugin iframe inherits every one of these post-#110.

- **#102 — holistic radius specimen (Form stage).** A dedicated `renderRadiusSpecimen` reading `rp.dims`
  across the radius steps (none/sm/md/lg/round) on representative component sizes, so the "Corner softness"
  slider has a visible payoff beyond the single component chip. (The slider is a 0–2 softness dial, not an
  enum — the specimen shows the ramp it reshapes.)
- **#103 — typography editor, Phase A (A1 + A2).** The type model is now fully editable on the settled
  engine (post-#105). **A1:** the font *pool* (three family roles → editable primary faces, single name
  auto-pads the fallback stack) + the global weight-role→numeric map (`subtle/default/emphasis/strong/max`).
  **A2:** the per-category assignment table — for each of the 7 groups (display/title/body/label/caption/
  eyebrow/code): family role · which weight-roles ship · italic · link. List writes read LIVE checkbox
  state (never a captured snapshot), so successive toggles stay staleness-free. Writes only existing
  `TypographyInput` fields → no `PERSIST_VERSION` bump. **Phase B (availability-aware weight pickers) is
  parked on #113** (font availability/resolution research).
- **#97 — object-value editors.** `renderControl` could only show `object` levers read-only as "configured".
  Bespoke sub-forms now edit the two that were still stuck: **page surfaces** (`surfaces.<mode>.{base,
  floorStep}` — white/black/neutral-step ground + optional contrast floor, on the Semantic stage) and
  **shadow tint** (`shadow.tint.{hue,amount}` hue-shifting the shadow base off pure black, on the Form
  stage). The third object lever (`typography.families`) is covered by the #103 editor. Each reads
  brandState (falling back to the engine default), writes via `setPath`, re-resolves.

**Gates across the three PRs: web tsc + build clean each time; 0 `node:` builtins; no engine/token/`out`
change (all reuse the read-model). Each verified live headless (Playwright): the typography table renders
7 category rows with family selects + weight/italic/link checkboxes matching resolved state; the surfaces
editor moves the preview ground; the shadow-tint sliders recolour the elevation ramp.**

**Open editor backlog:** #99 icon row (needs icon rendering in the preview — the one remaining #99 specimen;
the other six shipped in the sweep), #103 Phase B (blocked on #113), #104 static-site deploy (platform TBD —
owner not ready). **Decisions pending:** #113 (font availability — gates Phase B), #114 (gradients + motion
tab placement). **Plugin/MCP lane:** #111 (build Prism3 components in Figma from ComponentDefs via MCP) is
the next unstarted spike; the plugin itself is functionally complete through #110 + persist (#131/#138).

---

## (2026-07-17) — #131: persist `BrandInput` in shared-data → true knob round-trip

**STATUS: MERGED (#138).** The #110 follow-up, and the last open
plugin phase. #110's boot seed was *informational only* — a `ReadbackSnapshot` is resolved colour
values, so the `BrandInput` knobs can't be reverse-engineered from it; re-opening a themed file always
reset the UI to the default `aurora`. #131 closes the loop: the plugin now persists the exact
`BrandInput` alongside the variables it writes, and rehydrates the UI from it on boot.

- **Pure core — `engine/persist-input.ts`** (node-free, engine-tested): `PERSIST_VERSION = 1`,
  `serializeBrandInput` → `{ v, input }` JSON, `deserializeBrandInput` → the input or **`null`** on
  parse error / version drift / missing input. `null` is the single "start from defaults" signal, so
  absence and drift are indistinguishable to the caller (both → the unthemed path).
- **Plugin port — `plugin/src/persist-figma.ts`** (main-thread, shim-testable): a minimal
  `SharedDataPort` (`get/setSharedPluginData`) that `figma.root` structurally satisfies; `persistInput`
  / `restoreInput` under namespace `prism3` / key `brandInput`. Same pure-core-behind-thin-port split as
  `write-plan.ts`←`write-figma.ts`.
- **Wiring:** `plugin/src/main.ts` calls `persistInput(figma.root, input)` after a successful
  `applyWritePlan`, and `restoreToUi()` on `ui-ready` (independent of the #109 seed). New `restore-input`
  message on the `MainToUi` union; `web/src/write-adapter.ts` widens `HostCommit.onHostMessage` to carry
  it; the shared UI handles it via the existing `loadBrand` (wholesale replace + rebuild).
- **Restore repopulates KNOBS ONLY** — it does not re-write `figma.variables` (they already live in the
  file; auto-writing on boot would be redundant/surprising).

**Gates: engine 745→752 (7 persist cases — round-trip + garbage/drift/absence → null); plugin
typecheck clean (two-context split holds); plugin `npm test` write+read+persist green; web tsc+build
clean; `plugin/dist/main.js` 0 `node:` builtins. LIVE-DRIVEN against real `figma.root` shared-data via
the Desktop Bridge: unset key → `''`, persist→restore exact, v-drift + corrupt blob → null, scratch file
left untouched (the one thing the in-memory shim can't prove).** Out of scope: schema-v2 migration
(a future `PERSIST_VERSION` bump); pre-#131 files (none exist).

---

## (2026-07-17) — editor lane sweep: the web dashboard becomes demonstrative (#96–#101)

**STATUS: MERGED** (#96, #98, #99×5 slices, #100, #101; the `#122` type nit). Batched here because these
web-lane entries were deliberately deferred while the plugin lane held the shared log — now captured. The
dashboard went from a mostly read-only preview to genuinely *showing what each control does*, and — since
it's all in the shared `web/src` — **the plugin iframe inherits every one of these post-#110**.

- **#96 — controls live + toggle renderer.** Liveness is now by control TYPE (`slider/enum/palette-ref/toggle`),
  not a 3-key allowlist; added the missing `toggle` renderer. Every atomic lever now edits `brandState` and
  re-runs the engine (a bad value surfaces the error bar, never crashes). Object/list editors stay for #97.
- **#98 — box-shadow in the preview + `shadows` in the read-model.** `ResolvedPreview` gains `shadows`
  (`resolve-preview.ts`): each shadow → a per-mode CSS `box-shadow` string, dark = the reduced lift-primary
  override, folded through the write-adapter seam. Done via the seam so the plugin inherits shadow rendering.
- **#99 — per-axis specimens (5 slices).** Elevation ramp (Form) + on Semantic: outline hover/pressed,
  inverse hero band, neutral subtle-vs-strong comparison, gradient swatches. **A/B split (owner-approved):**
  genuine *missing preview states* (outline hover/pressed) went into the shared `previewSpec` (contrast-gated,
  plugin inherits); *axis-isolating comparisons* (inverse/neutral/gradient) are dashboard-only Kind-B specimens
  reading `resolveAllModes`/`theme` directly. The icon row is deferred (needs icon rendering).
- **FOUNDATIONAL (in #99 2a) — translucent roles now render.** Overlay washes resolved to their OPAQUE base
  hex (the wash alpha was computed for the contrast gate but never stored), so *any* translucent role rendered
  solid black. Fix: `modes.ts` records `alpha` on the overlay roles (additive, optional — `hex` unchanged, so
  contracts still gate on the opaque base); `resolve-preview` folds `hex+alpha` into an 8-digit hex for
  `colors`. Unblocks overlays, the inverse band, and any future translucent role. **`out/*` untouched — alpha
  stays in the read-model/contrast path, never the emitted DTCG.**
- **#100 — contrast-at-point-of-edit.** Per-component contrast badges (active mode) + token-path pills under
  each preview component. The badge ratio is DERIVED/gated at the core (not hand-typed — the design-review
  divergence: borrow the v2-plugin presentation, keep our derivation). Full all-modes table stays below.
- **#101 — Semantic tab regrouped** into Interactive colour / Accessibility policy (disabled floor nested under
  strategy) / Features; stale "override status hues" lede fixed (that moved to the Primitives per-ramp control).
- **`#122` nit cleared** (landed with #130): `gradients?: true | GradientInput[]` → `boolean | GradientInput[]`,
  so a UI toggle's `false` is type-honest (already schema-aligned + runtime-safe; no output change).

**Gates across the sweep: engine tests grew 723→745 (specimen + alpha + ramp assertions), nb-regression exit 0,
DTCG 336/336 per brand, `out/*` byte-identical on every web PR (all reuse the read-model — no emitted-token
change), web tsc + build clean each time. Each slice verified live headless (Playwright).**

**Open editor backlog:** #102 (holistic radius view), #103 (typography editor — unblocked by #105), #104
(static-site deploy — platform TBD), #97 (object-value editors), #99 icon row. **Cross-lane follow-up owed:**
persist a *versioned* `BrandInput` in Figma shared-data for true knob round-trip (generation is lossy — #109's
snapshot can't rehydrate knobs; engine-lane owns the version contract).

---

## (2026-07-17) — #110: one build, two outputs (shared `web/src` UI → plugin iframe)

**STATUS: MERGED (#132).** Phase 5, the CAPSTONE of the plugin lane and
the proof of its thesis: **one UI, one engine, no fork.** The plugin iframe now runs the SAME
`web/src/main.ts` the standalone web app does — not a second UI. Only the write adapter + manifest
differ per host, selected at BUILD time.

- **Host selection is a build-time constant.** New `PRISM3_HOST` (`web/src/prism3-host.d.ts`, esbuild
  `--define`); `makeWriteHost` returns `cssVarAdapter` for BOTH hosts (the iframe is a full DOM context,
  so the preview paints CSS vars identically). What differs is the COMMIT seam (`hostCommit` in
  `write-adapter.ts`): web → the export bar (download design.md / tokens.json); figma → `figmaCommit`
  posts the live `BrandInput` to the main thread. esbuild dead-code-eliminates the unused branch (web
  bundle: 0 `parent.postMessage`; plugin bundle: bridge present).
- **`plugin/build.mjs`** now bundles `../web/src/main.ts` (host=figma) into `dist/ui.html`, retiring the
  placeholder (deleted `plugin/src/ui/ui.ts` + `bridge-ui.ts`). `tsconfig.ui.json` repointed at the shared
  UI — so the no-plugin-typings DOM-clean check runs on what's actually bundled.
- **Write path reuses #108 verbatim** — only the theme SOURCE changed (bundled NB → the live UI knobs):
  `apply-theme` now carries a `BrandInput`; `main.ts` runs `buildWritePlan(buildFigmaColor(brandTheme(input)))`
  → `applyWritePlan`. On boot it runs #109 read-back → an informational `seed-info` panel.
- **Read-SEED is informational only (deferred).** A `ReadbackSnapshot` is resolved values; the knobs
  (`BrandInput`) can't be reverse-engineered from it, so full rehydration needs `BrandInput` persisted in
  Figma shared-data — filed as a follow-up. #110 reports the existing theme's contract, doesn't repopulate.

**Gates: engine 745/745 (untouched); web tsc+build clean, cssVarAdapter only (bundle has 0 bridge refs);
plugin both-context tsc clean, build inlines the SHARED UI into `dist/ui.html` (0 `node:` builtins,
figma bridge present); `npm test` write+read shims green. Validated LIVE: served `dist/ui.html` in a
headless browser — the full Theme studio renders from the plugin bundle (4-stage nav, generated aurora
ramps, knobs), and the brand menu shows the "↳ Apply to Figma variables" commit action that appears
ONLY in the figma build (screenshot `110-shared-ui-in-plugin.png`). The write/read executors themselves
were proven live against a real document in #108/#109; #110 changed only the theme source.**

---

## (2026-07-17) — #109: plugin read-back (`getLocalVariablesAsync` → snapshot + verify)

**STATUS: merged (#127, `e179324`)** — Phase 4 of docs/22, the read leg complementing
#108's write leg. The plugin now READS the current file's colour variables back into host-neutral
plain data and verifies the materialisation contract live — the same checks the `materialise-to-figma`
`verifyPass` string-emitter has always encoded, now a live executor + a pure verify.

- **`engine/read-back.ts`** (NEW, pure/node-free) — `ReadbackSnapshot` (plain-data mirror: collections
  + palette rows + colour roles whose per-mode value is the alias TARGET NAME or a literal) +
  `verifyReadback(snapshot)`. Ports the verify contract: `modesDistinct` (background/primary distinct
  per mode — the collapse-guard), `aliasesResolve`, slot `scopes`, `fieldFamilyPresent`,
  `retiredRolesAbsent`, `renamedRolesAbsent`, `bareDangerPresent`, `primitivesHidden`. The snapshot is
  what #110's UI will consume to SEED itself from an existing themed file.
- **`plugin/src/read-figma.ts`** (NEW) — `readFigmaVariables(figma.variables)`, the inverse of
  `applyWritePlan`: reads `core-palette` + `color` via the async getters, resolves each alias to its
  target var NAME (id→name map). Shares the `VariablesApi` port with the write executor (widened with a
  `ReadVarValue` superset of Figma's `VariableValue` + a `valuesByMode` field, so `figma.variables`
  still structurally satisfies it).
- **Bridge + trigger** — `read-theme` / `read-result` variants; a "Read current file" placeholder-UI
  button. The full snapshot stays main-side until #110 hands it up to seed the UI.

**Gates: engine 742/742 (735 + 7 new `verifyReadback` tests incl. a NEGATIVE collapse test — a
snapshot with background/primary collapsed to one target per mode fails `modesDistinct`); the read-back
round-trip harness (`plugin/test-readback.ts`, `npm test`) drives write→read→verify on the shim — 122/122
palette + 123/123 colour round-trip, 492 alias targets matched, contract `ok:true`; both plugin contexts
`tsc` clean; build 0 `node:` builtins. Validated LIVE in Figma via the Desktop Bridge: read the doc #108
wrote → verify `ok:true` (8/8 checks). En route it EARNED ITS KEEP — the first live read flagged a real
stale `color/field/border` (a pre-#86 flat leaf the idempotent writer correctly left untouched), exactly
the drift the verify contract exists to catch; removing it → clean pass.**

---

## (2026-07-16) — #108: plugin main-thread write adapter (live `figma.variables`)

**STATUS: merged (#125, `59f7ef4`)** — Phase 3 of docs/22. The plugin now WRITES: same
pure colour-materialisation core the CLI paste-path uses, driven by a real executor against
`figma.variables.*` on the main thread instead of emitting plugin-JS strings. Colour only
(`core-palette` + `color`), matching `materialise-to-figma` today. API re-verified current against live
Figma docs (Context7 `/websites/developers_figma`) before building — no drift from docs/18 §3.

- **`WritePlan` — the host-neutral write contract** (`engine/write-plan.ts`, pure/node-free).
  `buildWritePlan({palette, color})` reshapes the already-resolved `buildFigmaColor` collections into the
  three passes as DATA: palette rows (scopes + literal RGBA + hidden), colour create-rows (one literal
  value per mode), colour alias-rows (**one target per mode** — the collapse-guard). It is the SINGLE
  source of truth both write paths consume, so they can't drift.
- **`materialise-to-figma.ts` routed through it.** The disk-read shell + the four CLI string passes +
  `aliasRows` all now project `buildWritePlan(collections)` instead of re-deriving rows inline. All four
  CLI passes verified **byte-identical** to pre-refactor; the `aliasRows` collapse-guard tests stay green.
- **The live executor** (`plugin/src/write-figma.ts`): `applyWritePlan(plan, figma.variables)`, async,
  **idempotent** (find-by-name → update in place via `getLocalVariablesAsync` /
  `getLocalVariableCollectionsAsync` — the async getters required under `documentAccess:"dynamic-page"`).
  Three passes: palette (Default mode, hidden primitives) → colour create (rename mode[0] + addMode the
  rest; literal per-mode fallbacks) → colour aliases (per-mode `createVariableAlias`, targets resolved
  across BOTH collections). Depends only on a minimal `VariablesApi` port, so it's unit-testable with an
  in-memory shim.
- **Node-free extraction** (the flagged risk, resolved). `buildFigmaColor` + the shared pure helpers
  (`figName`/`parseColor`/`desc`/`leaves`/`stripNs`) + the Figma var types moved to a new node-free
  **`engine/emit-figma-color.ts`**; `emit-figma.ts` re-exports them (every existing importer + the
  documented CLI unchanged, output byte-identical). Lets the plugin bundle `buildFigmaColor` with **zero
  `node:` builtins** in `dist/main.js`. The theme is the bundled NB fixture: `nbThemeFrom(nbMeasured)`
  (JSON inlined by esbuild) — #110 swaps that one call for the shared UI's live knobs.
- **Bridge + trigger:** two message variants (`apply-theme` / `apply-result`); a placeholder-UI button
  fires the write (whole UI is still #110's to replace).

**Gates: engine 735/735 (728 + 7 new `buildWritePlan` tests incl. the plan-level collapse probe); all
four materialise CLI passes byte-identical + `emit-figma` output unchanged (NB regression intact); both
plugin contexts `tsc` clean; build emits main.js + inlined ui.html with 0 `node:` builtins; the executor
harness (`plugin/test-write.ts`, in-memory `figma.variables` shim) drives `applyWritePlan` twice — 245
vars stable (idempotent), 492/492 aliases bound, 0 misses, primitives hidden+scoped, background/primary
distinct per mode. Live-in-Figma validation via the Desktop Bridge is the one manual step (see PR).**

---

## (2026-07-16) — #107: Figma plugin scaffold (two-context split + typed bridge)

**STATUS: merged (#120, `0c5442b`)** — Phase 2 of docs/22. Vanilla scaffold under a new **`plugin/`** workspace
(`@prism3/plugin`); no `figma.variables` writes yet (that's #108) and the placeholder iframe UI is what
#110 swaps for the shared `web/src`. Manifest verified against the current Figma plugin docs (2026-07,
via Context7) — no drift from the docs/18 §2 grounding.

- **The two contexts are split by TYPE, not convention** (docs/18 §1): `tsconfig.main.json` gives the
  main thread `@figma/plugin-typings` but **no `dom` lib**; `tsconfig.ui.json` gives the iframe DOM but
  **no plugin-typings**. Proven load-bearing — a `document` ref in `main.ts` fails **TS2584** and a
  `figma.*` ref in `ui.ts` fails **TS2304**. `src/figma-env.d.ts` declares the `__html__` sandbox global.
- **Typed postMessage bridge.** `src/messages.ts` is the pure shared wire contract — two discriminated
  unions (`UiToMain` / `MainToUi`) + an `assertNever` exhaustiveness guard, compiling under both tsconfigs.
  `bridge-main.ts` / `bridge-ui.ts` are thin typed wrappers over the raw channel; the skill's React
  `usePluginMessage` hook is adapted to a vanilla `addEventListener` wrapper (returns an unsubscribe), per
  docs/22 §3.
- **Manifest:** `documentAccess: "dynamic-page"`, `networkAccess.allowedDomains: ["none"]` (engine bundled,
  zero runtime network — a real trust win), `editorType: ["figma"]`, `api: "1.0.0"`.
- **Build (`build.mjs`, esbuild):** `main.ts → dist/main.js` (iife); `ui/ui.ts` bundled and **inlined into
  a single `dist/ui.html`** (a plugin iframe has no server to fetch a separate JS from, and we ship
  no-network). `dist/` is gitignored alongside `web/dist/`.

**Gates: both plugin contexts `tsc` clean; split-enforcement proven (TS2584 / TS2304 on deliberate
violations); build emits main.js + inlined ui.html; a Node harness stubbing the two contexts drove the
real bundled bridge end-to-end — `ui-ready → main-ready` handshake + `ping → main-pong` nonce match both
PASS. Web tsc clean + engine 723/723 (both untouched).**

---

## (2026-07-16) — #106: write-adapter seam (`apply(model)`)

**STATUS: merged (#119, `37a485b`)** — landed on fresh `main` (`264f579`); Phase 1 of docs/22 complete.
The single-UI prerequisite: the shared UI reused verbatim in the Figma plugin iframe hinges on a swappable
**write surface**, so the UI computes a resolved token model and hands it to **one `apply(model)` interface**,
implemented per host.

- **`WriteAdapter` contract** (`web/src/write-adapter.ts`): `apply(model: ResolvedPreview, mode)`. The model is
  reused as-is — no new engine type. Two implementations: **`cssVarAdapter`** (web → sets CSS custom properties
  on a scope element from `model.colors[ref][mode]` / `model.dims` incl. per-mode overrides / `model.type`),
  and **`figmaVarAdapter`** — a **stub** with the same signature that no-ops with a `console.warn` until the
  plugin phase, proving the interface is host-swappable today.
- **The load-bearing rule:** the UI **references tokens by `var(--…)` name and never writes resolved values**.
  `renderChip` + the page background assign `var(--…, <resolved fallback>)`; the active host fills the vars in.
  Shared `cssVarName`/`typeVar` name helpers keep the setter and the references from drifting. The host is
  re-scoped to the **fresh** preview surface each paint, so a mode switch can't leak stale vars.
- **Scope (deliberately tight):** token-valued writes only (chip `bg/fg/border/radius/pad/type` + surface bg).
  Pure-layout inline styles (picker show/hide, brand-menu dots, ramp swatch fills) are not tokens — left as-is.

**Gates: engine 723/723 (untouched); web tsc + build clean; 0 `node:` builtins in the bundle; drove the dev
server — 65 adapter-set CSS vars on the surface, Light→Dark repaint with no leakage, live action-palette edit
re-projects through the adapter.**

---

## (2026-07-16) — #105.3: single-family `$value` + `fallbackStack` extension

**STATUS: MERGED (#118)** — re-landed on fresh `main` after #117/#105.2 merged (`c22f22e`), so the
merge-base is linear and the golden movement was re-verified on the clean base. Third and final brick of #105.

- **Family primitive `$value` is now the SINGLE brand family** (`stack[0]`, a string) — the DTCG- and
  round-trippable form Token Press / Figma consume directly, instead of the baked `string[]` fallback
  stack. (`tree.ts` `fontFamilyLeaf`.)
- **The curated fallback stack moved to `$extensions.prism3.fallbackStack`** (the tail after the primary).
  A consumer reassembles the CSS `font-family` value as `[$value, ...fallbackStack]` — a Style Dictionary
  consumption transform (TP ships the shorthand in its SD starter; **the engine's half is the extension +
  the documented reassembly rule**). The engine applies the same reassembly itself in two places so nothing
  downstream regressed: `familyOf` (the resolved-preview font-family — byte-identical) and the Figma family
  emit (variable value = primary, description = the full reassembled stack — NB fixture byte-identical).
- **⚠️ Token-shape change:** this drops the `string[]` stack from every family primitive's `$value`. The
  `out/*.tokens.json` family leaves move (array → string + `fallbackStack`); **no Figma output moved** and
  no fixture moved (reconstruction keeps them stable).

**Gates: test 723/723, nb-regression exit 0, emit-dtcg all aliases resolve + 336/336 contracts per brand,
emit-figma (byte-identical) + web tsc clean; out/* regenerated.**

**Open cross-lane loop (before finalizing #105):** confirm the engine's canonical forward-emit weight
spellings resolve in TP's `FONT_WEIGHT_MAP` (100 Thin · 200 ExtraLight · 300 Light · 400 Regular · 500
Medium · 600 Semi Bold · 700 Bold · 800 ExtraBold · 900 Black; italic → `<Weight> Italic`, 400→`Italic`).
To be posted on #105 for the TP agent.

---

## (2026-07-16) — #105.2: italic axis (weight-paired modifier)

**STATUS: MERGED (#117)** — built on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`, post-#116).
Second brick of #105; the DTCG encoding is the one Token Press locked on #115 (closed).

- **Italic modelled as an orthogonal modifier PAIRED with each weight** (`strong` + `strong-italic`),
  not a weight role. It's a hyphenated suffix on the weight, in a fixed order
  `type.<group>.<size>.<weight>[-italic][-link]`, so italic and link cross cleanly (a role that ships
  both gets bare / italic / link / italic-link). (`theme.ts` `buildComposites`.)
- **Emits `fontStyle: 'italic'` on the composite `$value`** — off-core-DTCG but the shared Token-Press
  contract (#115). Omitted when normal. (`tree.ts`.) The Figma text style names the italic named-instance:
  `fontStyleName(role, numeric, italic)` → `Bold Italic`, and `400 → Italic` (not `Regular Italic`) per
  Figma's convention. (`emit-figma.ts`.)
- **Opt-in per role via `typography.italics`** (parallel to `links`), **default `[]`.** Italics are a
  deliberate brand choice, so default output ships **zero** italic composites — goldens stay byte-identical
  (same lean-default discipline as `max`). Surfaces: `levers.ts` (`typography.italics`), `theme-schema.json`,
  `ai-metadata.ts` (fontStyle in `resolves_to`).

**out/* impact:** the only default-output change is the reworded per-composite `fontStyle` note in
`$extensions.prism3.figma.note` (36 lines in NB — metadata text, no value/structure change). Italic
composites appear only when a brand opts in. End-to-end verified: a `italics:['body'],links:['body']` brand
emits the full 8-way `body.md.*` cross with correct Figma style names.

**Gates: test 717/717, nb-regression exit 0, emit-dtcg all aliases resolve + 336/336 contracts per brand,
emit-figma + web tsc clean; lever-manifest.json + out/* regenerated.**

---

## (2026-07-16) — #105.1: extensible weight-role set + `max`

**STATUS: MERGED (#116)** — built on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`, post-#95).
First brick of the #105 typography type-model expansion; self-contained, no Token-Press round needed.

- **Data-driven role set.** The four hardcoded weight-role names became one ordered canonical array
  `WEIGHT_ROLE_ORDER` (lightest→heaviest); `WeightRoleName` now *derives* from it (`typeof […][number]`),
  the defaults map keys off it, and the build emits one `font.weight-role.*` primitive per entry. Adding a
  role later is a one-line array edit + a default value — no consumer hardcodes the old four names
  (`tree`/`emit-figma`/`emit-dtcg`/`ai-metadata`/`test` all already iterate the array). (`theme.ts`.)
- **`max` added (default 900).** The canonical heaviest slot — a black/display hero weight brands bind to.
  It stays **defined-but-unused by default categories** (exactly like `subtle`), so default output is
  byte-identical bar one additive `font/weight-role/max` primitive; a brand opts in via
  `weights: { display: ['strong','max'] }`. Owner-requested (the "optional 5th — Max" decision on #105).
- **Surfaces updated:** `theme-schema.json` (weightRoles + per-role `weights` enums gain `max`),
  `levers.ts` description, the NB figma fixture (`font.json` → 39 vars / 5 weight-roles), docs/10 table.

**Gates: test 707/707, nb-regression exit 0, emit-dtcg 753/753 aliases + 336/336 contracts per brand,
emit-figma (font 39) + web tsc clean; lever-manifest.json + out/* regenerated.**

---

## (2026-07-11) — housekeeping: #63 resolved (Option 3) + PR-review audit

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`, post-#91).

- **Audited all 29 merged PRs (57–90)** for missed should-fix / unresolved review items → **clean**: zero
  outstanding, zero unresolved threads. The one #90 should-fix (stale `field.border` sidecar ref) was already
  fixed (`4528982` + the sidecar-reference gate). Deferrals were all tracked as issues, not silently merged.
- **#63 resolved — Option 3 (owner-decided).** nb's hand-authored semantic text on the `-subtle` tint lands
  ~4.0–4.2:1 in LIGHT (under AA 4.5) for 4 banner/badge pairings. **Investigation ruled out Option 1**
  (large-text 3:1): measured, the alert text is body **16px regular** and the badge is label **12px** — neither
  qualifies. This exists ONLY in the hand-authored NB reproduction (the regression fixture); engine-GENERATED
  brands (aurora/harbor) clear 4.5. Option 2 (re-target the inks) would move NB tokens + the regression baseline.
  Owner chose **accept as a documented NB-source divergence** — the engine is already correct. Formalized: the
  loose `L-10` characterization (`nbLightFails.length > 0`) is now a **can't-drift KNOWN-outliers gate** pinning
  the exact 4 labels + a `[4.0, 4.5)` band, so a NEW shortfall (regression) or a VANISHED known one (fixed →
  re-review/close) both fail the suite. `test.ts (10b)`. **Closes #63.**

**Open issues remaining:** #79 (opacity hidden from Figma consumers — emit-figma lane, next), #67 (token-press:
did the #66/#73 collection rename break ingestion — cross-lane, needs the Token-Press lane / owner).

**Gates: test 702/702, nb-regression exit 0, emit-dtcg 336/336 per brand, web tsc clean.** No token/out change.

---

## (2026-07-11) — `status.info` + orphan-ramp pruning (validation-colour completeness)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). Completes the
validation-colour override set so a designer can change all four (red/green/orange/blue) directly.

- **`status.info`** — info was synthesise-only (canonical blue, the docs/21 §2 gap); now it takes a direct hue
  override like `success`/`warning`/`danger`. Symmetric: a measured hue seeds a vivid ramp, contrast re-gates.
  Exposed as a `status.info` colour lever. (`theme.ts` type + `status()`, `levers.ts`, `theme-schema.json`.)
- **Orphan-ramp pruning** — `success`/`warning`/`info` are minted unconditionally, so a `roleColors` rebase left
  the now-unused ramp shipping as a dead one. It's now pruned (keyed off the final `roleToPalette` + `accentPalette`
  so a ramp survives if `action`/`accent` still point at it) — symmetric with the danger carve's no-orphan behaviour.

**Why:** the two validation-colour mechanisms now cover all four colours cleanly — `status.*` sets the raw hue,
`roleColors.*` borrows another ramp (a red brand's red for danger, a blue brand's blue for info), and a borrowed
status ramp no longer duplicates. This is the engine half of the "change validation colours contextually per-ramp"
UI vision; the contextual per-ramp dashboard control (own-hue + borrow-from-a-ramp-above, deferred "lock") is the
UI-lane follow-up (the `status.*` levers are still `advanced:true`, so unsurfaced until that lands).

**Gates: test 700/700, nb-regression exit 0, emit-dtcg 336/336 per brand, emit-figma + web tsc clean;
lever-manifest.json + out/* regenerated.**

---

## (2026-07-10) — the Text Field FAMILY: `field.border` hover split + three ComponentDefs

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). Scoped the
**Text Field** grounded in `knowledge-base/components/text-field.md`, and the owner-confirmed shape is a small
**field family**, not one monolith — the KB's "composed slots" hybrid expressed in the data model.

**One engine change:** `field.border` became the one **stateful** field slot, nested `field.border.rest` +
`field.border.hover` (same shape as `interactive.*.fill.<state>`). Rest is the perceivable boundary (gated 3:1
vs the page); hover is a subtly *stronger* boundary (gated 4.5, asserted ≥ rest) — a perceptible, never-sole
state cue (KB §4). All other field states still compose (focus→`border.focus`, error→`border.danger`,
disabled→`disabled.*`). This is a flat-leaf → nested rename: `modes.ts`, `emit-figma` (scope keys on `seg[2]`,
unchanged), `test.ts` (scope + shape + a hover≥rest gate), `preview.ts` (rebound + a new `hover` variant),
`materialise-to-figma` verify (field-family names + the old flat leaf asserted gone).

**Three ComponentDefs (the family):**
- **`components/field-label.ts`** — the accessible name: `size` {small, medium} + required/optional indicator +
  disabled dim. A shared part reused above every field control (static top-aligned; floating out of favour).
- **`components/field-message.ts`** — the **Prism2 "Helper message" successor**: a `tone` axis
  {default, error, warning, success}, each tone re-pointing **both** caption ink + status icon at the matching
  role (`text.<role>` + `icon.<role>`) — icon + text, never colour-only. Presentational; the host owns the
  `aria-describedby` + `aria-invalid` wiring.
- **`components/text-field.ts`** — the HOST. Composes the two parts (`composesWith`) and binds **input chrome
  only** — so label/message tokens live in the parts and Select/NumberField reuse them. Encodes the KB's live
  edges: read-only ≠ disabled (read-only stays full-contrast `text.primary` + `border.secondary`, not dimmed);
  error is a **border-only** swap; validation is **presentational** (form lib owns timing); base field only
  (NumberField separate, Search/Password thin specialisations, email/url/tel = `type`+attrs).

**Decisions (owner-confirmed):** base-only (credit-card field is a compose-of-fields *pattern*, out of scope);
add the `field.border.hover` token (owner leaned yes); error = border-only; read-only = full-contrast. The
nested-component question resolved to: shared **parts** are their own defs when state/tone-bearing + reused
(FieldLabel, FieldMessage); truly-primitive parts (Icon) stay **slots**, not defs.

**Gates: test 691/691 (+16: field hover-gate, +3 def validations × 2 brands, family assertions), nb-regression
exit 0, emit-dtcg 336/336 per brand, emit-figma clean, web tsc clean.** `out/*` + `preview-spec.json` regenerated.

---

## (2026-07-08) — `roleColors`: general semantic-role rebasing (docs/21)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). A general lever
that lets a brand **re-base any semantic role on a declared palette** — the client-driven need: a red brand
reuses its brand red for `danger`, a blue brand its blue for `info`, or any role points at a custom colour.

**The lever:** `roleColors?: Partial<Record<Role, string>>` on `BrandInput` (value = a palette name: a status,
`primary`/`neutral`, or a `brandColors` entry). It's the **general form of `actionPalette`** (which stays as an
ergonomic alias for `roleColors.action`). Covers `success`/`warning`/`danger`/`info`/`action`; `brand`/`neutral`
are rejected (they define the surface model). `accent` is unchanged — it's an *added* interactive column, not a
rebasable role, so it keeps `accentPalette`.

**Why it existed as four special cases before:** `action`/`accent` had their own levers; `danger` had an
auto-carve *heuristic* (a saturated-red brand already reuses `primary` for danger — `test.ts` M-05); and
`success`/`warning` could hue-tune via `status` but `info` had **no override at all**. `roleColors` unifies them
— the explicit danger override wins over the heuristic (and mints no orphan danger ramp), and info rebasing is
finally possible.

**Guarantees:** contrast **always re-gates** on the target ramp (verified: a rebased brand clears every contract
in all four modes; `text.info` resolves onto the primary ramp and still passes). Semantic-signal appropriateness
is the user's call but **flagged** — a hue mismatch (danger not red, info not blue) pushes a design.md `CONFIRM…`
note rather than blocking. Validation: unknown target palette throws; `brand`/`neutral` rebase throws.

**Wiring:** `theme.ts` (input field + a general rebasing pass after the danger carve, with `paletteHue` +
hue-mismatch note), `schema/theme-schema.json` (the `roleColors` object). **Additive + optional** — NB/aurora/
harbor declare no overrides, so `out/*` is byte-identical. Not exposed as a dashboard lever (it's a structured
map, not a scalar toggle — `lever-manifest` unchanged).

**Gates: test 671/671 (+8 roleColors: gap-closer, explicit-danger-no-orphan, action-alias, the all-modes contract
guarantee, hue-mismatch flag, both guards), nb-regression exit 0, emit-dtcg 332/332 per brand, web tsc clean.**

---

## (2026-07-07) — the `field.*` category (form-element chrome, docs/20 §17)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (fresh from `main`). Field research on
the Prism2 input tokens (`surface.input.*` / `border.input.*`) confirmed most of them are already covered
*better* by the generated families — so `field.*` is deliberately **minimal**: three roles, everything stateful
composed from existing gated families (per docs/20 §15: the field's states come from `interactive.*`).

**Generated `field.*` (three roles):**
- `field.fill` — the field fill (a subtly inset neutral, tracks the page tier so `text.primary` clears). Surface, min 0.
- `field.border` — the **resting** boundary, **gated `nonTextMin` (3:1) against `background.primary`** (SC 1.4.11). This is the improvement over Prism2, whose resting input border sat sub-3:1 and leaned entirely on focus. NB: neutral.400, 3.27:1.
- `field.placeholder` — placeholder ink, **gated `secondaryMin` (4.5) against `field.fill`** — a *readable* hint, not the sub-AA placeholder Prism2/most systems ship. NB: neutral.550, 4.52:1.

**Composed, NOT re-authored:** focus → `border.focus`; validation → `border.<semantic>` + `foreground.<semantic>-subtle`;
disabled → `disabled.{fill,border,on-fill}`; hover → `interactive.*` overlays; value ink → `text.primary`;
inverse → the generated inverse surface-context (no hand-mirrored `field.*-inverse` twins — Prism2's biggest spend).

**Taxonomy decision (owner) — a control's fill is `.fill`, the ink on it is `.on-fill`, everywhere.** Introducing
`field.surface` surfaced an inconsistency: the retired top-level word `surface` (Prism2's `surface.*` → `foreground.*`)
had quietly survived as a slot in `disabled.surface` (#83), while the interactive family used `.fill` / `.on-fill`.
Resolved to the interactive convention: **`field.surface` → `field.fill`**, and the merged disabled family aligned
(**`disabled.surface` → `disabled.fill`**, **`disabled.on-disabled` → `disabled.on-fill`**). No `.surface` token
segment remains anywhere. (We considered flattening `interactive.<c>.fill.*` to bare states, but per-colour overlay-tint
means `fill` + `overlay` are both stateful slots, so the `.fill` segment is load-bearing — kept as-is.)

**Wiring:** `modes.ts` generates the three roles; `ai-metadata.ts` describes the `field` group; `emit-figma.ts`
gets `FIELD_SLOT_SCOPES` (fill→paint, border→stroke, placeholder→text); the eval-preview `input` component is
rebound onto `field.*` (+ `border.focus` / `disabled.*` for its states). `test.ts` allow-lists `color/field/` out
of the figma `extra` check, gates the field slot scopes, and pins the family contracts (border ≥3:1 on the page,
placeholder ≥4.5 on the fill). A formal Text Field `ComponentDef` (like Button) is a **follow-on**, not in this increment.

**Gates: test 663/663, nb-regression exit 0, emit-dtcg 332/332 contracts per brand (was 324 — +2/mode for the
gated field border + placeholder), web tsc clean, `out/*` regenerated.**

---

## (2026-07-07) — legacy colour-role removal + NB figma-fixture reconciliation (task #14)

**STATUS: in progress** on branch `claude/prism3-e2e-integration-8fwul4` (reset from fresh `main` after PR #83
merged). The cleanup increment that #83 deliberately deferred: now that components bind `interactive.*` /
`disabled.*`, the superseded legacy scaffolding is **removed**.

**What was removed (engine):**
- `action.*` (the top-level interactive fill + states) → `interactive.primary.*`.
- The **stateful** `foreground.danger.*` fill → `interactive.destructive.*`. **`danger` is now a bare bold
  `foreground.danger` fill** like `brand`/`success`/`warning`/`info` (its `on-danger` ink pairing resolves
  cleanly against it). `foreground.danger-subtle` is unchanged.
- Per-colour `interactive.*.fill.disabled` → the cross-cutting `disabled.*` is the SOLE disabled family.
- `text/icon.{disabled, on-action, on-disabled}` → `disabled.text` / `disabled.icon`,
  `interactive.<c>.on-fill`, `disabled.on-fill`. Preview `input.disabled` rebound to `disabled.text`.
- ai-metadata branches, the emit-figma `action` scope entry, and the test suite retargeted off the removed roles.

**NB-fidelity reconciliation (the fixture re-baseline).** Removing those roles deletes vars from the frozen
real-NB figma fixture (`fixtures/figma/nb/color.*`), so the fixture was **modernised to the engine's evolved
layer** (owner-approved: "modernise the reference"): dropped the **17 retired vars/mode** and renamed
`foreground/danger/default` → bare `foreground/danger` (**95 → 78 real vars/mode**). The DTCG colour-fidelity
gate (`nb-regression`, ΔE) is **unaffected** — only the Figma variable *naming* changed. The figma name-match
gate keeps `missing === 0` on the real families + the `interactive/` / `disabled/` allowlist for engine-added
families.

**⚠️ The "#67" mislabel — corrected.** Earlier progress/docs called this "the #67 NB-fidelity reconciliation."
**GitHub #67 is actually the unrelated Token Press *collection-rename* question** (`palette`→`core-palette`,
tied to #66). There was never a dedicated issue for this legacy-var fixture re-baseline; it's simply task #14.
(docs/10's `#67` note about the `$collection` label rename is a genuinely different concern — left as-is.)

**Gates: test 655/655, nb-regression exit 0, emit-dtcg 324/324 contracts per brand (was 384 — the removed
roles carried contracts), web tsc clean, `out/*` regenerated.** Also parked (unchanged): `overlay-tint` lever.

---

## (2026-07-06) — interactive colour family (docs/20), increments 1–4 + component rebind

**STATUS: shipped as [PR #83](https://github.com/adamforrester/prism3-tokens/pull/83)** (branch `claude/prism3-e2e-integration-8fwul4`,
8 commits `f1d8804..73dbcbd`, base `main`). Independent reviewer **approved** increments 1–4 + rebind — both prior
findings (fixture character, intent tests) implemented; verdict "correct, additive, fully gated, no blocking/should-fix."
A second reviewer pass is in progress; not yet merged. Gates: **test 655/655, nb-regression ΔE00 1.95, emit-dtcg 384/384
contracts per brand, web tsc clean, out/\* regenerated + committed.**

**The one open thread (tracked, task #14) — the legacy-role removal.** The PR is deliberately additive: `action.*` /
`foreground.danger.*` (stateful) / per-colour `interactive.*.fill.disabled` / `text.disabled` / `icon.disabled` +
their `on-disabled` still coexist beside the new `interactive.*` / `disabled.*` families. Components have rebound, so
the clean-up increment (drop the legacy roles + contracts + ai-metadata branches, full `action`→`interactive` doc
sweep) is all that remains — but it **deletes `color/action/*` + `color/foreground/danger/*` vars present in the frozen
real-NB figma fixture**, so it MUST land with the **#67** NB-fidelity reconciliation (update the fixture to the engine's
evolved semantic layer). Also deferred: `overlay-tint` (needs per-colour alpha ramps). Do NOT remove the legacy roles
without doing #67 in the same change — the fixture `missing===0` gate will fail otherwise.

**Component rebind (Button / IconButton / eval preview).** Rebound to the reconciled two-axis model —
appearance `{filled, outline, text}` × intent `{primary, neutral, destructive}` — bound to `interactive.<intent>.*`
+ cross-cutting `disabled.*`. **This closes the v1 HIGH finding**: neutral (was the stateless
`foreground.secondary`) now carries hover/pressed/on-fill like every colour, so the default button is no
longer hover-less; the matrix is uniform. `ghost`/`secondary`/`solid`/`plain` retired to the reconciled
vocabulary; default intent = neutral, appearance = filled. `preview.ts` rebound too (removing the
`brand.*`-on-buttons leak docs/20 §1 flagged); outline/text hover uses the overlay wash. Component defs
still validate against both nb + aurora; web tsc clean. test 654→**655**.

**Increment 4 — inverse surface-context + `neutralEmphasis` + opt-in `accentPalette` (additive).**
- `interactive.<color>.on-inverse` (docs/20 §9): the ink for an outline/text control on a dark hero /
  inverse section — a light CTA on dark, generated + contrast-verified against the inverse surface (not a
  hand-mirrored twin). Gated by the `inverse` lever (default on). NB: primary/destructive 5.05:1, neutral 18:1.
- `neutralEmphasis` lever (`subtle` default / `strong`): strong gives a bold near-black/near-white neutral
  fill (neutral.800 light) that clears the non-text floor; on-fill still gated.
- Opt-in `accentPalette` lever (docs/20 §3): names a declared palette (≠ action) → a full `interactive.accent.*`
  column (fill/on-fill/text/border/on-inverse/overlays), all gated. Rejected if it equals the action palette
  (never falls back to primary). Absent by default. All wired through input/Theme/schema/lever-manifest/.ai.json.
- Contract count 372→**384** per brand (inverse inks). test 648→**654**. Fixtures untouched (all under the
  `color/interactive/` allowlist).

**Increment 3 — cross-cutting `disabled.*` (additive).** One disabled treatment regardless of intent
(docs/20 §7): `disabled.{surface, on-disabled, text, icon, border}`, governed by `disabledStrategy`.
`disabled.on-fill` is gated against `disabled.fill` (accessible: 3:1). Contract count 360→**372**.
Kept **additive** — the scattered `action.disabled` / `foreground.danger.disabled` / `interactive.*.fill.disabled`
remain generated so NB byte-repro holds; components rebind to `disabled.*` in the migration step. `color/disabled/`
is a new engine-added family, added to the figma fixture allowlist. **Important scoping note:** removing the
legacy `action.*` roles (the docs/20 §11 rename) would delete `color/action/*` vars that ARE in the frozen
real-NB fixture — that's the NB-fidelity reconciliation the review tied to **#67**, so this PR keeps the legacy
roles and defers their removal there. test 646→**648**.

**Increment 2 — overlays + composited-contrast gate + `outlineInteraction` lever (additive).**
- `interactive.<color>.overlay.{hover,pressed,selected}` — translucent washes that composite over
  ANY surface (page, dark hero, image): the outline/text-appearance hover + rows/menus/cards story.
  `overlay-neutral` (default) uses the mode-adaptive neutral alpha ramp (black-alpha light / white-alpha
  dark), hover 10% / pressed 20% / selected 20%.
- **Composited-contrast gate (docs/20 §13):** each overlay is a real contract — `text.primary` must stay
  ≥ AA on the page *once the overlay sits on it* (`color.ts` gains a `composite()` alpha-over helper).
  This can fail (a too-heavy lightening wash in dark mode) so it genuinely constrains the alphas; all hold
  (NB ratios 12–16). Contract count 324→**360** per brand.
- **`outlineInteraction` lever** (`overlay-neutral` | `solid-tint` | `none`) wired through the input model,
  schema, lever manifest, and `.ai.json`. `solid-tint`/`none` emit no overlays (opaque `foreground.<color>-
  subtle` / no hover). `overlay-tint` (per-colour hue at alpha) is scheduled — it needs per-colour alpha ramps.
- Figma: `overlay` slot scoped FRAME/SHAPE_FILL, aliases the alpha ramp. Fixtures unchanged (overlays are
  `color/interactive/*`, already allow-listed). test 644→**646** (overlay presence/gate/mode-adaptive + lever opt-out).

Gates: test 646/646, nb-regression ΔE00 1.95, emit-dtcg 360/360 per brand, web tsc clean, `out/*` regenerated.

### Increment 1 — the `interactive.<color>` family (additive)

Building the redesign specced in `docs/20-interactive-color-system.md` as gated increments on
`claude/prism3-e2e-integration-8fwul4` (one PR when the family is complete). **Increment 1 (this
checkpoint): the generated `interactive.<color>.<slot>` family**, ADDITIVE alongside the legacy
`action.*` / `foreground.danger.*` roles so no contract goes red mid-migration.

- **`modes.ts`** now generates `interactive.{primary,neutral,destructive}` with slots `fill`
  (+ the six fill-states), `on-fill`, `text`, `border`. `primary` walks the action palette,
  `destructive` the danger palette, `neutral` a subtle grey (emphasis lever comes in inc-4).
  Fill-states lead with **`rest`** (the interactive family's own convention, docs/20 §2:
  rest/hover/pressed) — `default` stays only on the non-interactive roles (`action.default`,
  `text.link.default`), no systemwide rename.
  The load-bearing neutral pair (`neutral.on-fill` on `neutral.fill.rest`) is now a
  **generated + gated contract** — the historical miss (docs/20 §12) can't ship silently.
  Contract count rises automatically (tree.ts counts every `min>0` role); nb/wendys/aurora/harbor
  all hold (e.g. harbor 324/324).
- **`emit-figma.ts`** — `interactive` is scoped by its SLOT (fill→FRAME/SHAPE_FILL, on-fill→+TEXT_FILL,
  text→TEXT_FILL, border→STROKE_COLOR), not the family.
- **Fixture-character decision (2026-07-06, post-review; pairs with #67):** the NB figma colour
  fixtures stay the **frozen real Token Press export** (95 vars/mode) — engine-invented families
  (`interactive.*`) NB never shipped are **allow-listed** out of the exact-match gate (`missing===0`
  keeps the byte-repro; a spurious var inside a *real* family still fails). The interactive family's
  shape/scopes/gating is pinned in a dedicated `test.ts` block instead (test 639→**644**), so the
  fixture doesn't quietly become an engine snapshot.
- **`ai-metadata.ts`** — a depth-aware `describeInteractive` for the 4-segment keys (the generic
  `[group, variant, state]` split dropped the state); every `interactive.*` token now carries proper
  `when_to_use` / `avoid_when` / `paired_with` / `contrast_with`.

Gates: test **639/639**, nb-regression ΔE00 1.95, emit-dtcg contracts hold per brand, `out/*` regenerated.
Accent is deferred to inc-4 (opt-in `accentPalette` lever). Next: inc-2 overlays + composited-contrast
check + `outlineInteraction`; inc-3 cross-cutting `disabled.*`; inc-4 inverse surface-context +
`neutralEmphasis` + `accentPalette`; then rebind Button/IconButton (§16.3).

## 2026-07-03 — E2E integration arc

Since the token layer completed, work has been the **designer↔developer↔agent E2E pipeline**
(`07`/`08`/`09`/`10`). Shipped to `main`, newest first (see the decisions log for the why):

### Fresh-agent brief — pick up here

Two threads are live: the **Figma-emitter agent** (owns `emit-figma.ts` + its `test.ts`
gates; materialises axes into Figma via MCP) and the **generator thread** (everything
else — engine core, web dashboard, docs). Coordinate via committed artefacts (docs/10 §6).

- **emit-figma today:** colour + typography + dims + shadow + gradient + **layout**
  axes shipped (#28, #31, #33, #35, #46). Mode-opt-out fix landed (#49) — a light-only
  brand no longer emits dark files with light values. **Generalise** landed (#50) —
  aurora + wendys emit through every axis (aurora's alias-driven gradient Paint Style
  is live). **Wireframe mode** landed (this PR) — `'wireframe'` is now materialised on
  the two axes it touches in the DTCG tree: colour gets a fifth mode (greyscale, every
  role's `$extensions.prism3.modes.wireframe.$value` routes to a `palette/neutral/*`
  step), and **radius becomes the first mode-varying non-colour/shadow axis** —
  `buildFigmaDims` returns `radius: FigmaCollectionFile[]` (per-mode, same shape as
  `color`); a non-wireframe brand ships a single Default-mode `radius.json`
  (byte-identical to the pre-1b world), a wireframe-opted brand ships two files where
  non-zero radii alias `dimension/0`. Fully specified in `docs/10-figma-materialization.md`.
- **emit-figma next (docs/10 §7 queue post-this-PR, 2026-07-04):**
  1. **Motion — STILL DEFERRED.** Re-probed the Figma Plugin API 2026-07-04 (via
     WebFetch of the current VariableScope docs): FLOAT scopes are
     `ALL_SCOPES / TEXT_CONTENT / CORNER_RADIUS / WIDTH_HEIGHT / GAP / OPACITY /
     STROKE_FLOAT / EFFECT_FLOAT / FONT_WEIGHT / FONT_SIZE / LINE_HEIGHT /
     LETTER_SPACING / PARAGRAPH_SPACING / PARAGRAPH_INDENT` — no `TIME` scope,
     no motion/duration/animation scope. Config 2026 hasn't surfaced it. Recheck
     when it lands. easing/spring/transition composites have no Figma variable
     primitive — emit as `motion-styles.json` reference metadata only.
  2. **Follow-ups parked (typography #31):** fix 3b bindable form — `font-tracking`
     FLOAT collection (6 tokens: tighter/tight/snug/normal/wide/wider); rebind
     `letterSpacing` on all 36 text styles.
  3. **Follow-up parked (aurora + wendys full-materialise, from #50):** import the
     full aurora + wendys variable-artefact set into the Prism3 Test File via
     Figma MCP so their palette / color-×4-modes / typography / dims / layout /
     shadow / gradient collections all render live (structural gates already
     prove correctness; this is end-to-end visual confirmation). Separate PR —
     scope is heavier than a doc update.
- **Test file:** the Figma-MCP thread's target is "Prism3 Test File" (fileKey
  `Zrn9YDqrFiwjs2IfKInNY0`). It has 4 specimen pages already (Colour, Typography, Dims,
  Shadow, Gradient) + all the corresponding variable collections + styles imported live.
- **Run commands:** `npx tsx Prism3/engine/emit-figma.ts` writes `out/figma/{nb,aurora,wendys}/*.json`;
  `npx tsx Prism3/engine/test.ts` gates everything (400/400 today).

### Discussion backlog (2026-07-04) — owner-raised, awaiting decisions

Five items surfaced by the owner once the code-review sweep (HIGH+MED+LOW, generator/web lane)
closed. Logged so they survive context loss; **none is a commitment** until it lands as a decision
here or a merged PR. Test count is **542/542** as of the sweep close.

1. **Motion-in-Figma — what it unlocks (deferred, low urgency, NOT on the critical path).**
   Motion is **doubly** blocked in Figma, not just once: (a) the Variable API has no `TIME`/duration
   FLOAT scope (re-verified 2026-07-04), so a duration could only be a scope-less FLOAT; and (b) even
   if it existed, Figma has **no binding consumer** — prototype transitions / smart-animate don't read
   variables for duration or easing, so a motion variable would drive nothing. So the "unlock" is
   currently theoretical. *When both land* it unlocks: the last generated axis (duration/easing/spring)
   materialising into Figma → "every axis in Figma" complete; a **`reduced-motion` mode** (durations→0,
   the motion analogue of wireframe — a `prefers-reduced-motion` accessibility win); and motion
   round-tripping like colour/dimension. **But motion already flows to CODE consumers** (CSS
   transitions/animations) through the DTCG / `design.md` layer, where it's actually consumed — Figma is
   only a viewer, so this gap affects Figma-side *completeness*, not the E2E code pipeline. **Decision:**
   keep deferred; recheck when Figma ships a `TIME` scope AND a prototype/animation binding target
   (watch Config announcements). Already parked in the emit-figma-next queue (item 1 above) — this entry
   adds the "what it unlocks" rationale. **Verified 2026-07-04** against the *live* Figma developer docs
   (`developers.figma.com/docs/plugins/api/VariableScope`): the enum still has 14 FLOAT scopes, none for
   time/duration/motion. `VariableScope` is **platform-defined** (returned to the auto-updating plugin
   runtime), so updating the local Figma desktop app does NOT surface a missing scope — it's a genuine
   Figma-platform gap, not a stale local install.

2. **Independent emitter review (offered — owner to greenlight; Figma-emitter lane).** A *broad* re-read
   would largely re-surface what the code review already catalogued (M-07/08/09 + L-13/14 are the known
   emit-figma findings). Higher-value and non-duplicative: the **targeted adversarial pass docs/16
   gate-blind-spot #2 already names** — run a *second brand* (aurora/harbor + the extreme white-label
   fixtures: non-5-breakpoint, narrowed modes, gradients) through *every* emit-figma axis and diff the
   output against docs/10–11 spec + expectations. That catches CR-08 / M-07/08/09-class bugs by
   *generation*, not code-read. Would be **read-only** (produces findings handed to the Figma-emitter
   thread; no edits to `emit-figma.ts`/`out/figma`), coordinated so it doesn't collide with in-flight
   emitter work. **Open:** owner to greenlight scope (targeted second-brand pass vs full review).

3. **`core/` prefix on primitive Figma collections (open decision — Figma-emitter lane + web export).**
   Owner prefixed the primitive collections in the NB example with `core` to scan primitives-vs-semantics
   at a glance. **Assessment:** it touches **only `$collection` names in the raw-figma format** — the DTCG
   token paths, the `nbds.pds.*` / `prism.*` namespace, and the `{a.b.c}` aliases are all unchanged — so
   it's low-risk and does **not** move the token taxonomy (owner's read confirmed). It's a sound, common
   convention (Tokens Studio / many systems group `core`/`global`/`primitive` apart from `semantic`).
   Today the emitter names primitive collections `palette`, `dimension`, `font`(family/size/weight) and
   semantics `color`, `space`, `radius`, `size`, `border-width`, `focus`, `layout`, `opacity`, etc.
   **Recommendation: adopt it** — but decide it as a convention so the *generated* output matches the
   hand-authored NB file (else they drift). **Empirically resolved from the NB example** (`Tokens/New
   Balance/**/raw-figma`, 2026-07-04): the owner used **hyphen**, `core-<axis>` — primitives are
   `core-color`, `core-dimension`, `core-typography`, `core-breakpoint`, `core-motion`; semantics are bare
   (`color`, `radius`, `space-size`, `layout`, `motion`). So the form question is settled (hyphen, matches
   the file already tested importing into Figma). **The bigger implication:** this is a RENAME, not a bare
   prefix — the engine currently names its primitive collections `palette` / `dimension` / `font`, so
   adopting the convention means the emitter renames them to `core-color` / `core-dimension` /
   `core-typography` (+ `core-breakpoint`, and `core-motion` when motion lands). There's also deeper
   taxonomy divergence to decide separately (engine `space`/`size`/`border-width` vs NB `space-size`;
   engine `text-styles` vs NB `typography`) — align the whole Figma collection taxonomy onto NB, or just
   the `core-` primitive grouping? **Confirmed by owner:** `font-fluid` is SEMANTIC (not `core-`), and the
   primitive set = `palette`/`dimension`/`font` → `core-color`/`core-dimension`/`core-typography`. **Still
   open:** whole-taxonomy-align vs core-grouping-only; and the emitter's `variableId` round-trip must be
   verified name-insensitive (expected — IDs are per-variable). **Implementation is the Figma-emitter
   thread's** (emit-figma + out/figma), with a matching web-export tweak in the generator lane so the
   playground and CLI/engine agree. The emitter review now running will report the exact current collection
   names per brand to scope the rename.

4. **Interactive-state DIRECTION rationale (settled — now documented).** *Q: do hover/pressed go darker
   in light mode and lighter in dark mode?* **Yes** — `dir = family==='light' ? +1 : -1` (`modes.ts`):
   light steps to higher step numbers (darker), dark steps to lower (lighter). **Thought process:** an
   interactive state moves the fill toward **more contrast with the page it sits on** — light page →
   darker fill, dark page → lighter fill — so as the user engages (rest→hover→pressed) the control grows
   more prominent ("comes forward"), and the *same* move keeps the on-fill label legible (a darker fill
   lifts a white label's contrast; a lighter fill lifts a dark label's). Matches the step-based source
   systems (NB/Prism2) and mainstream convention (Carbon/Material darken-on-light). **The top-of-scale
   case the owner solved before** — action colour at the far end, so hover/pressed must step *down*
   instead of up — is now the **generalised L-01 fix (#60)**: on overshoot `walk` reflects inward,
   keeping the states distinct; the trade-off at the extreme is that distinctness (a soft goal) wins over
   the contrast-direction preference, while each state's hard contrast *contract* is still gated. Code
   comment enriched in `modes.ts` alongside this entry. **No open question** — captured for the record.

5. **Inspirations (`docs/13`) follow-through (tracked there; promote on decision).** Reviewed the
   owner-supplied research: **Astryx** (Meta's agent-first DS — CLI-as-agent-surface, typed component
   doc objects), **ds-brain** (a practitioner's DS×AI stack map — the *consumption-side eval harness* is
   the genuinely new idea for us), **Specs CLI** (DirectedEdges — extraction-only; the read-back verifier
   seat for a component-tier regression). `docs/13` already holds the convergence table + the "steal
   becomes a commitment only when it lands in `00-progress`" rule, so the actionable candidates are
   logged there, not duplicated here. **Candidates worth promoting when the agent-surface work starts:**
   a `cli.ts query` subcommand over `.ai.json` (retrieval surface before MCP), an `.ai.json` *discovery*
   layer (the sidecar is only useful to an agent that knows it exists), token-budget *tiers* for
   `.ai.json`, and a **consumption eval** (rubric + invented-token rate) built alongside the MCP adapter.
   **Open:** owner to say which (if any) to promote into the next-steps queue now vs. hold for the
   component/agent-surface phase.

6. **LLM skills in the agentic workflow (owner-raised, note for future discussion — 2026-07-04).**
   *Would building Claude/LLM "skills" (packaged SKILL.md instruction bundles, like the `brand-skills`
   repo ships) help the Prism3 agentic workflow?* **Take: yes, at two points, and they're complementary
   to — not a replacement for — the MCP surface.** The MCP adapter is the callable *tools*; a skill is the
   *instructions + discovery* layer that teaches an agent WHEN/HOW to drive them. (a) An **authoring skill**
   (`prism3-theme`) — teach an agent to brief a brand → drive `theme_brand`/the CLI → read the contract
   results → emit `design.md`. (b) A **consumption skill** (`prism3-consume`) — teach a *downstream* agent
   to use the generated tokens well: semantic roles not primitives, respect modes, honour `avoid_when`.
   Two nice ties: **(i)** a consumption skill's value is directly **measurable by the eval we just built** —
   add a "with-skill" arm and see if it moves invented/leak/contract-compliance (the same differential shape
   as with/without-surface); **(ii)** a skill fills the exact **docs/13 gap** — Astryx's `agent-docs`
   injection + the `.ai.json` "no discovery layer; the sidecar is only useful to an agent that knows it
   exists" note. And it slots into the existing chain: `brand-skills` (extract → `design.md`) → Prism3
   (tokens) → a `prism3-consume` skill (tokens → compliant UI). **✅ BOTH BUILT (2026-07-05):**
   `prism3-consume` (a) — measured by the eval's with-skill arm (100% compliance, see the decisions log +
   docs/17 §5); `prism3-theme` (b) — verified by the cold-agent compile loop (two fresh briefs compiled
   first-try clean, all 248 contracts holding). Skill placement (this repo vs. distributable) remains open.**

7. **Mode editing has two patterns, and the author of both was fooled by it (owner-raised, 2026-08-03).**
   The typography work introduced **on-page, side-by-side mode columns** (the rung/composite tables show
   every mode at once). Every other page keeps the original model: the **global mode switcher** selects a
   mode and the controls edit *that* mode. Coming back to Size & radius after the typography arc, the owner
   expected the typography pattern, read the single set of controls as mode-invariant, and concluded that
   per-mode radius/density/shadow were **unbuilt** — they have all existed since Phase D (#184/#188/#329),
   and `modeLevers` carries ten per-mode fields today. Verified live: switching off Light turns Corner
   softness, Density and the shadow softness/tint sliders into "Auto — follows global" per-mode selects.
   **Nothing is missing; the affordance is invisible from the mode you land on.**

   The split is not arbitrary — **read surfaces went multi-mode, write surfaces stayed single-mode**, and
   those are genuinely different jobs (comparing wants every mode at once; editing wants one). The defect
   is that nothing signposts it: in Light, a per-mode axis and a mode-invariant one look identical. The
   Interactive page already prints a mode note (`.ic-modenote`); the geometry/elevation pages do not.

   **The most useful datum is who it fooled.** If the person building it mis-reads the capability after a
   few weeks on an adjacent surface, no note in a doc will save a new user — which argues for fixing the
   affordance rather than documenting the convention.

   **Not a proposal to unify by making everything side-by-side** — that multiplies every control by the
   mode count. The likely resolution is to make the mode context unmistakable at the point of *editing*,
   which composes with the owner's plan to move the mode switcher down onto the page rather than being
   thrown away by it. **Open:** whether the disclosure is a per-page note, a per-control marker, or falls
   out of the switcher move; and the mode editor rework the owner wants to resolve soon. Deferred once
   already when typography took priority.

---

- **Figma plugin & host architecture grounding (`docs/18-plugin-and-host-architecture.md`, 2026-07-05).**
  A capability-grounding doc ahead of the plugin build (owner deferred the build itself past the long
  weekend; wants the web UI QA'd + the architecture pinned first). Sourced from the current Figma Plugin
  API docs. Nails: the **two-context execution model** (sandbox main thread = `figma.*` + document but no
  DOM/network; UI iframe = DOM/network but no `figma.*`; message-passing between) and how it maps onto our
  hosts — the engine core + control UI + preview run in the **iframe** (same code as the web dashboard),
  the **main thread is a thin variable/node writer** (the only plugin-specific tier), so `08 §3`'s shared
  layer lands exactly on the thread boundary. Documents the writable API surface (variables: create /
  addMode / setValueForMode / alias / bind; components: createComponent / combineAsVariants /
  `SLOT` property = the KB §15 slot contract) and the hard boundary (behaviour / a11y / motion / non-visual
  config are **not canvas-representable** — they live in code, which is what "lossy" actually meant; the
  canvas *build* from data is reliable). **Offline `.fig` ruled OUT** (closed format, no reliable writer) —
  the only reliable route onto the canvas is the Plugin API / Figma MCP. Adds the primitive-token vs.
  headless-primitive terminology guard. Cross-ref added from `08 §5`. Pure docs — no code, `out/*`
  untouched, `test.ts` unchanged (626). Complements `14` (component layer) — this is the *host capability*
  half, `14` is the *component-data* half.

---

- **`prism3-theme` authoring skill + cold-agent compile verification (`Prism3/skills/prism3-theme/SKILL.md`,
  2026-07-05).** Backlog #6 **(b)** built and verified — the *authoring* counterpart to `prism3-consume`,
  completing the two-skill story. A portable SKILL teaches an agent to turn a brand brief into a compiling
  `design.md`: the input contract (required `id`/`primary`(OKLCH)/`neutral`; the lever table with schema
  enums), the **discipline** (pin the brand's exact anchors in OKLCH and let the engine derive
  ramps/modes/contrast — never hand-author steps; omit a lever → its default = the plain-spec guarantee;
  adjective → lever mapping), and the **compile loop** (run `cli.ts`, read the contract results
  `aliases N/N | contracts M/M` + the notes, fix the *input* on a failed contract, re-run). Grounds itself
  in `schema/theme-schema.json` + the two example briefs (aurora maximal / harbor minimal) rather than
  duplicating them. **Verified with a hard pass/fail:** two cold `general-purpose` subagents, each given
  only the skill + the referenced examples/schema, authored a `design.md` from a fresh brief (**ember** —
  warm red-orange food-delivery, action-on-hero, one gradient; **sage** — muted-green wellness, tinted
  warm canvas, brand-supplied status, system fonts). Both **compiled first-try clean via `cli.ts`, exit 0,
  all 248 mode-contrast contracts holding** (ember 651/651 aliases, sage 640/640). Notably ember's warm
  red-orange landed in red territory so the engine folded `danger` into the primary palette + noted it —
  the "declare identity, engine derives system" contract working without the agent needing to know.
  **Pure docs/skill — no engine code, `out/*` byte-identical, `test.ts` unchanged (626).** The ember/sage
  briefs were throwaway verification (not committed as gated examples — that'd be a separate scope change
  to `emit-dtcg`; aurora/harbor already gate the CLI). **Placement OPEN** (same as #6a, flagged in the PR):
  the skill lives in `prism3-tokens` for now. Closes backlog #6 (both skills built); a larger multi-brand
  eval sample + wiring the authoring loop into a measured harness remain the refinements.

---

- **`prism3-consume` skill + the with-skill eval differential (`Prism3/skills/prism3-consume/SKILL.md`,
  `eval-run.ts`, docs/17 §4/§5, 2026-07-05).** Backlog #6 (a) built and measured — the agent-facing
  *consumption* layer of the four-layer stack. A portable, **brand-agnostic** SKILL packages the
  consumption discipline (semantic-role-not-primitive, respect modes, the decorative-border /
  disabled-exempt edges, the ink-on-surface pairs self-check) as instructions for any downstream agent —
  MCP or not. Wired into the eval as a `skill` arm (`buildPrompt(…, guidance, skill)` / `runEval({ skill })`),
  the portable sibling of the per-brand `guidance` (`.ai.json`) arm; the two **compose** (the skill teaches
  an agent to *read* the sidecar's `avoid_when`). **Measured (aurora, 4 tasks, 2 cold subagents/arm, pairs
  mode):** catalogue-only 93/86% compliance (always leaks `palette.success.050`); +`.ai.json` 94/97%;
  **+skill 100%/100%, 0% invented, 0% leak** — the portable skill matches-or-beats the per-brand sidecar,
  fixing both the leak (→`foreground.success-subtle`) and the two compliance edges (on-disabled→`ui`,
  decorative border dropped) that the raw metadata didn't reliably close. Honest limits: n=2, one brand,
  four tasks — directional. **Placement is an OPEN question** (flagged in the PR): the skill lives in
  `prism3-tokens` for now (co-located with the eval that proves it + the `.ai.json` it packages); whether it
  eventually ships as a distributable skill (its own repo / into `brand-skills`) is undecided — moving a
  markdown file later is cheap. Gates: `test.ts` **621→626** (skill embedded / absent / composes-with-guidance /
  back-compat byte-identity / threaded through runEval). Purely additive — `out/*` byte-identical, DTCG
  untouched. Closes the consumption-eval arc's final layer; the authoring skill (`prism3-theme`, backlog #6b)
  and a larger multi-brand sample remain the obvious next refinements.

---

- **emit-figma: the MED batch — M-08 silent-black + M-09 space-alias guard (`emit-figma.ts` + `out/figma`,
  2026-07-05).** Taken by the generator thread (emitter thread paused, owner-authorised); the two emit-figma
  MED findings the review named, each a *silent-degradation → loud-fail* hardening. **M-08 (a real shipping
  bug):** `parseColor` returned a silent `{0,0,0,1}` (opaque BLACK) for anything it couldn't parse, and it
  had **no 8-digit-hex branch** — so for `colorFormat:'hex'` brands the entire `black-alpha`/`white-alpha`
  transparency ramp (`#0000000d`…) and the shadow colours (`#060411xx`) were shipped to Figma as opaque
  pure black: the alpha ramp flattened, shadow colour wrong (black, not the brand navy) *and* opaque. Now
  it expands 3-digit hex like CSS (`#f00`→`#ff0000`), carries the alpha byte on 8-digit `#RRGGBBAA`, and
  **throws** on genuinely unparseable input (incl. the `parseColor(undefined)` unresolvable-alias path)
  rather than degrading to black. Regenerating corrected **aurora + wendys** `out/figma` (both hex-format);
  **nb** (`colorFormat:'rgb'`) untouched — the rgba path never regressed. **M-09 (latent):** `buildFigmaDims`
  emitted the `space` alias UNCONDITIONALLY, unlike every sibling axis (radius/size/border-width/focus),
  which guard with `isAlias ? {…} : null`. A space leaf carrying a raw px value (not a `{…}` ref) would ship
  `alias: { name: '' }` — a dangling empty-named binding Figma drops the link for. Space now matches the
  sibling contract; byte-identical for engine brands (space always aliases into dimension), so `out/figma`
  is unchanged by M-09. Two commits (one finding each). Gates: `test.ts` **600→614** (M-08: hex forms +
  alpha + rgb()/rgba() no-regress + the throw on undefined/unresolved-alias/garbage; M-09: no empty-named
  alias, every space aliases `dimension/*`, alias is null-or-nonempty), nb-regression exit 0, DTCG aliases
  647/647, mode contracts 248/248. `out/*.tokens.json` untouched. Closes the emit-figma MED tier; L-13/L-14
  (emitter LOW) still queued for that thread.

---

- **emit-figma: CR-08 layout-breakpoint fix (#65; `emit-figma.ts` + `out/figma`, 2026-07-05).** Taken by
  the generator thread (emitter thread paused, owner-authorised) — a real *shipping* bug the emitter review
  surfaced. `buildFigmaLayout` iterated a hardcoded `LAYOUT_MODES` (sm..2xl, 5) and read `gridNode[mode]`
  by name, so aurora's **six** breakpoints (xs..2xl) silently **dropped the base `xs` grid** (0px, 4-col
  mobile-first) on every regen — while still emitting `breakpoint/xs` as a constant, an internally
  inconsistent artifact; a ≤3-bp brand would have read `undefined` and crashed. **Fix:** derive the layout
  modes from the brand's actual grid keys (`Object.keys(gridNode)`, already ascending), not the hardcoded
  set. `LAYOUT_MODES` stays exported as the default breakpoint-name set. `out/figma/aurora/` now carries
  the previously-missing `layout.xs.json`; nb/wendys unchanged (5 bp). **Gate (the emit-layer blind spot
  the review named):** a new aurora (6-bp) block asserts one layout mode per breakpoint incl. `xs`, the xs
  grid carries the real base column count, every alias resolves across all 6 modes; the nb + generalise
  assertions are now breakpoint-derived (aurora 6 / wendys 5), not hardcoded 5. `test.ts` **595→600**,
  DTCG untouched. Closes #65; #67 (Token Press) still for that thread.

---

- **emit-figma: `core-` collection rename (#66; `emit-figma.ts` + `out/figma`, 2026-07-05).** Taken by the
  **generator thread while the emitter thread was paused** (owner-authorised). The Figma PRIMITIVE
  collections now carry a `core-` prefix for at-a-glance scannability in Figma's collection list:
  `palette→core-palette`, `dimension→core-dimension`, `font→core-font`, and `font-fluid→type-sets` (the
  responsive fluid-size collection). **Label-only, by design:** changed the four `$collection` labels, the
  text-style binding `collection` fields, and the output filenames (now `$collection`-derived). **Unchanged:**
  the DTCG tree, the `<root>.*` namespace, and every Figma **variable name** (`palette/red/550`,
  `font/family/*`, `font-fluid/*`) — they still mirror the DTCG paths, so the `variableId` round-trip and
  all cross-collection aliases resolve exactly as before (verified: **0 dangling** across nb/aurora/wendys,
  369/408/428 vars). Semantic collections keep bare names. `out/figma/*` regenerated (files renamed
  `core-*`/`type-sets`, old ones removed). **Fixture stance (#67):** `fixtures/figma/nb` keeps the OLD
  `$collection` labels — the byte-repro gate compares variable names/scopes/aliases/values (unchanged), NOT
  the label; the fixture is the Token Press byte-repro target and stays put until Token Press confirms the
  new labels. Deliberately did NOT adopt NB's `core-color`/`core-typography` base words nor merge
  `space`/`size` — the engine keeps its scope-per-collection split (better than the hand-file), per the
  narrow-scope decision. docs/10 carries a rename callout for the emitter thread to fold through on resume.
  Gates: `test.ts` **595/595** (text-styles collection assertion updated to `core-font`/`type-sets`),
  0 dangling aliases. `out/*.tokens.json` untouched (DTCG unchanged). Coordination: #66 (this), #67 (Token
  Press), #65 (CR-08 still queued for the emitter thread).

---

- **Consumption eval — the `.ai.json` guidance differential: 95% → 100% (`engine/eval-run.ts`, docs/17 §5,
  2026-07-04).** The experiment the pairs-mode gap called for, and the payoff of the whole arc. Added a
  `guidance` arm to the harness (`buildPrompt(..., guidance)` / `runEval({ guidance })`): the cold agent
  gets the catalogue AND each colour role's `.ai.json` `when_to_use | avoid_when | contrast`. **Live result
  — the three-arm differential:** WITHOUT surface → 48% invented; WITH catalogue (names) → 0% invented /
  **95%** compliance; WITH catalogue + `.ai.json` (semantics) → 0% invented / **100%** compliance (68/68).
  The guided agent did exactly what the metadata directed — **dropped** the decorative `border.primary`
  from its contrast pairs (its `avoid_when`: *"not a 3:1 target"*), **reclassified** `on-disabled` to the
  3:1 it declares, and moved to proper surfaces. **Each layer earns its keep as a number:** names kill
  hallucination (48→0), the `.ai.json` semantics kill mis-classification (95→100) — the four-layer stack
  (raw hex → names → metadata) demonstrated, one metric per layer. Directly motivates a **consumption
  skill** (backlog #6): it would package the same guidance portably, measured the identical way. Gates:
  `test.ts` **592→595** (guidance embedded / absent / threaded through runEval). Purely additive — `out/*`
  byte-identical. *This closes the consumption-eval arc: three metrics, the full with/without-surface AND
  with/without-guidance differentials, live.*

---

- **Consumption eval — pairs-mode harness + first live compliance number (`engine/eval-run.ts`, docs/17
  §4/§5, 2026-07-04).** Wired contract-compliance onto real agent output: passing a `theme` to `runEval`
  flips the prompt to **pairs mode** (`buildPrompt(..., wantPairs)`) — the agent returns
  `{task:{refs,pairs}}`, `extractPairs` pulls the `{fg,bg,kind}` pairings, and `runEval` scores
  `complianceByTask`/`complianceAggregate` alongside consumption (back-compat: no `theme` → refs-only).
  **First live run** (cold subagent, WITH catalogue, `atlas`): invented **0%** / leak **0%** / contract
  compliance **72/76 = 95%**. The 4 failures are the *interesting* part — **semantic-intent edges the token
  names can't carry**: `text.on-disabled` on `action.disabled` (3.05:1, the agent didn't know disabled is
  WCAG-exempt) and `border.primary` on `background.primary` (1.4:1, it used the *decorative* border as a
  3:1 `ui` element). Both are where the raw surface is insufficient and the agent needs `.ai.json`
  `avoid_when` / a consumption skill (backlog #6) — so the 5% gap is a measured argument for the metadata
  layer + the natural next differential (with vs. without `.ai.json`). Implies two metric refinements: a
  `disabled`/exempt kind, and honouring decorative-vs-functional role intent. Gates: `test.ts` **585→592**
  (pairs prompt/extractPairs/runEval-compliance/back-compat). Purely additive — `out/*` byte-identical.
  Rubric layer still deferred (docs/17 §4).

---

- **Consumption eval — contract-compliance metric (`engine/eval.ts` `scoreContractCompliance`, docs/17 §4,
  2026-07-04).** The third consumption metric, and the docs/04 contrast differentiator turned on the
  *agent's* output: for the fg/bg colour pairs an agent pairs on screen (`UsedPair { fg, bg, kind }`),
  resolve both roles per mode (`resolveAllModes`) and check the **raw** contrast (CR-01) clears the kind's
  floor — text 4.5, `ui`/`large-text` 3 (WCAG 1.4.11 / 1.4.3-large). Returns `{ checked, pass, rate,
  failures[], unresolved[] }`; fails if below floor in *any* mode where both roles resolve, a non-colour
  role lands in `unresolved` (not scored), no pairs → vacuously compliant (rate 1). Pure — reuses the
  existing mode/colour core, no new deps. Gated in `test.ts` (**578→585**: pass/fail/kind-floor/mixed/
  unresolved/empty). **Still to wire (docs/17 §4):** eliciting the pairs from the agent — the harness
  extracts a flat ref list today; a `pairs` output mode is the next harness step (mirrors how
  `scoreConsumption` preceded `runEval`). Rubric layer still deferred. Purely additive — `out/*` byte-identical.

---

- **Consumption eval — harness + first measured run (`engine/eval-run.ts`, docs/17 §3/§5, 2026-07-04).**
  The agent-in-the-loop harness on top of the scoring core: `SAMPLE_TASKS` (4 fixed component briefs),
  `buildPrompt` (WITH-catalogue vs WITHOUT-guess arms), `extractRefs` (JSON `{task:[refs]}`, tolerating
  ```json fences + prose fallback), and `runEval(tree, root, runner, {catalog})` → per-task + aggregate
  `ConsumptionScore`. **Pure orchestration — the model call is an INJECTED `ModelRunner`**, so the whole
  pipeline (prompt → model → extract → score) is deterministic + gated with a mock; a keyed environment
  swaps in a real Claude client (no script-usable API key exists in the dev sandbox — Claude access is the
  harness's managed OAuth, so real runs use the injected runner or, as here, subagents). **First measured
  run** (two cold `general-purpose` subagents, `atlas` brand): **WITH** the token catalogue → **0% invented
  / 0% primitive-leak** (53/53 valid); **WITHOUT** → **48% invented** (21/40 valid). The surface eliminated
  token hallucination — "MCP-first > screenshot-first" as a number (48%→0%). Invention concentrated where
  Prism3's names diverge from generic convention (`color.feedback.*`, `color.surface.raised`,
  `typography.heading.md`); the agent guessed the guessable `color.action.*` states unaided. Caveat noted
  in docs/17 §5: the WITHOUT baseline is partly stacked (denied the catalogue it was told to target) — the
  honest headline is the *elimination*, and a screenshot→CSS→map-back baseline is a later refinement.
  Deferred still: contract-compliance + rubric metrics (docs/17 §4). Gates: `test.ts` **567→578** (prompt/
  extract/mock-run/arm-selection). Purely additive — `out/*` byte-identical.

---

- **Consumption eval — scoring core (`engine/eval.ts` + `docs/17`, roadmap C follow-on, 2026-07-04).**
  First increment of the ds-brain steal (docs/13 §2): measure whether an agent handed the MCP surface
  produces *compliant* output — the consumption side the engine never measured (it verifies generation
  exhaustively but had no read on consumption). Built the **pure, deterministic scoring half**:
  `scoreConsumption(refs, tree, root)` → **invented-token rate** (refs to token paths that don't exist —
  the hallucination metric; cheap because the name contract is locked, docs/11) + **primitive-leak rate**
  (valid refs reaching past the semantic layer into `palette`/`dimension`/`font` — `PRIMITIVE_TIERS`,
  exactly the `core-*` grouping). `normalizeRef` accepts brace / root-qualified / relative forms; rates are
  occurrence-based, reported lists unique+sorted. **Pure — no `node:`, no LLM** — the agent-in-the-loop
  runner (drive a model on sample tasks against the MCP server, extract its refs, score them) is a deferred
  **edge shell** using the Claude API (docs/17 §3), opt-in, never the pure core. Contract-compliance +
  rubric metrics deferred to that phase (§4). The eval's payoff is *differential* — same tasks with the MCP
  surface vs. without, showing the surface moves the numbers (the four-layer thesis, measured). Gated in
  `test.ts` (558→567; clean/invented/leak/normalise/occurrence-rate/empty). Purely additive — `out/*`
  byte-identical. Design in `docs/17-consumption-eval.md`.

---

- **MCP adapter — layer C, "an agent themes Prism3" (`engine/mcp.ts`, docs/08 §5 / roadmap C, 2026-07-04).**
  The agent-callable surface over the pure core is live: a **dependency-free JSON-RPC 2.0 server over
  stdio** — deliberately NO `@modelcontextprotocol/sdk` (MCP is JSON-RPC + a 3-method core; owned the
  transport like the YAML parser + colour math, keeping the no-`npm install` invariant). It's an **I/O
  shell** (`node:` allowed; the pure core is imported, never touched) — the request handler
  `handleRpc`/`callTool` are pure + unit-tested directly, only the stdio loop behind `isMain` touches the
  process. **Three tools:** `list_levers` (returns the lever manifest verbatim — the knob catalogue the
  plugin + playground also render from, so the agent surface can't drift from them), `theme_brand`
  (a `BrandInput` → the DTCG token tree + `.ai.json` metadata + per-mode contract results + decisions
  log — the generate-and-verify payoff in one call), and `validate_brand` (schema pre-flight). **Design
  split:** the knob *catalogue* derives from the lever manifest (`list_levers`); the input *shape* is
  `theme-schema.json` (the precise, OKLCH-aware validation half — a `control:'color'` lever is an OKLCH
  object, not a string, so the manifest alone would be lossy). **Gates (`test.ts` 542→558):** the
  handshake (`initialize`/notification-silence/`-32601`), the tool catalogue, `list_levers` ≡ the manifest
  (drift gate), a full `theme_brand` round-trip (248/248 contracts + 647/647 aliases on the probe brand),
  and error paths (invalid brand → `isError`, unknown tool/method). **Live stdio smoke-tested** end-to-end.
  Purely additive — `out/*` byte-identical, pure core untouched. Run: `npx tsx Prism3/engine/mcp.ts`.
  *Next candidates (deferred): richer tools (`preview_brand` → resolved colours + overlay; `describe_token`
  → `.ai.json` query), and the consumption-eval harness (docs/13 ds-brain steal) alongside it.*

---

- **Code-review fixes L-10 — visualiser honesty + a surfaced nb gap (batch C, closes my LOW lane)**
  (`visualize.ts`, `docs/16` LOW tier). Three visualiser fixes: (a) the semantic-role table + preview
  render the modes the tree ACTUALLY carries (derived from `$extensions.prism3.modes`, canonical order)
  instead of a hardcoded four — a narrowed-modes brand no longer draws empty columns; (b) a failing light
  contract now prints its ACTUAL relation (`4.22<4.5` + a `no` class) instead of the literally-false
  `4.22≥4.5` the old code always printed; (c) the brand-controlled palette name is `esc`-ed
  (defence-in-depth — CR-03/L-06 already constrain it to a slug, so byte-identical for a valid brand).
  `out/*.tokens.json` + `out/figma` byte-identical; only `out/tokens.html` regenerated (which also picked
  up ~6 lines of pre-existing staleness — the committed html was behind the committed tokens.json on main).
  **Surfaced finding (flagged, NOT fixed here):** making the visualiser honest revealed 4 pre-existing
  light-mode shortfalls in **hand-authored nb** — `text.{success,danger,info}` and `badge info-subtle` on
  the `-subtle` tint surface land ~4.0–4.2:1, under AA 4.5. It's a CR-02-sibling (the role is contracted
  against the floor but used on a specific tint surface) and/or a preview-spec min-calibration question
  (alert body text is often large-text 3:1). Engine-GENERATED brands (aurora/harbor) clear it all-green;
  only the hand-authored NB reproduction shows it. Captured as a tested fact (test §10b) — a colour/spec
  fix would move nb token values + the regression baseline + is a design decision, so it's left for a
  follow-up call, not folded into this LOW visualiser PR. **L-12 was already resolved** during CR-06
  (`nb-regression` looks contracts up by palette name via `rampByPalette`, not positional `specs[0]/[3]`).
  **L-17 documented, not implemented:** the web rebuild runs `brandTheme`+`buildTree`+DOM synchronously per
  input event with no debounce — the review verified it has NO re-entry bug (all synchronous); a debounce
  is an optional perf enhancement with a small UX behaviour change and no web test harness, so it's left
  deferred rather than gold-plated. Gates: `test.ts` **542/542**, nb-regression exit 0, `out/*.tokens.json`
  + `out/figma` byte-identical. This **closes the LOW tier in the generator/web lane**; remaining LOW work is
  L-13/L-14 (`emit-figma`, the Figma-emitter thread's lane).

---

- **Code-review fixes L-06/07/08/09/11/15/16 — theme/parser/CLI LOW (batch B)** (`theme.ts` / `design-md.ts`
  / `cli.ts` / `standard-design-md.ts` / `resolve-preview.ts` / `web/main.ts`, `docs/16` LOW tier; second
  LOW batch). Seven input-boundary hardenings — token *values* unchanged everywhere; the only `out/*` delta
  is two lines of harbor's **decisions-log prose** (L-07, additive rationale, same class as the M-03/05/06
  notes) + the regenerated `modes-report.md`; `out/figma` untouched. **L-06** — gradient names now get the
  same slug charset + uniqueness guard palette names got in CR-03 (a dotted/spaced gradient name would break
  the `{a.b.c}` alias convention, caught only at emit if at all); RESERVED_PALETTES doesn't apply (gradients
  live in their own namespace). **L-07** — a brand-supplied status override seeds a **vivid, unanchored**
  ramp from its hue+chroma (not pinned at its measured lightness, unlike a brandColors accent). This is by
  design (a status role needs a full accessible ramp, not one swatch) but wasn't said; the note now flags
  that the measured swatch may not appear verbatim (harbor's success/warning notes gained the clause — the
  only shipped-brand output delta). **L-08** — two `design-md` parser gaps: the closing frontmatter fence is
  now an **exact** `---` line (the old `indexOf('\n---')` prefix match let a `--- x ---` value line close the
  block early and silently truncate the rest), and a **duplicate key** at one level now throws instead of
  silently last-winning. **L-09** — `--out` no longer swallows a following flag (`--out --fidelity` used to
  create a directory literally named `--fidelity`); a flag-like value fails loud. **L-11** — the web `slug()`
  string-coerces `id`, so a design.md pasted with a bare numeric `id:` no longer crashes both exports on
  `.trim()`. **L-15** — an unquoted `#hex` colour in a standard design.md (read as a YAML comment → null) now
  throws an actionable "quote it" error at the reader instead of a baffling `invalid hex 'null'` two layers
  down. **L-16** — `resolve-preview`'s `colors`/`byMode` are now typed `Partial<Record<ModeName,…>>` (matching
  the existing `dimOverrides`), so a consumer can't assume `.dark` exists on a narrowed-modes brand; every
  consumer already guarded with `?.`, so it's a type-honesty fix (web `tsc --noEmit` clean). Gates: `test.ts`
  **540/540** (528→540), emit-dtcg 647/646/640 aliases resolve + 248/248 contracts, nb-regression exit 0,
  web tsc clean, `out/figma` byte-identical, L-09 verified by driving the CLI both ways.

---

- **Code-review fixes L-01/02/03/05 — engine-core LOW (batch A)** (`modes.ts` / `color.ts` / `scale.ts` /
  `tree.ts`, `docs/16` LOW tier; starts the LOW-tier sweep after the MED tier completed at #59). Four
  silent-degradation guards, each byte-identical on the shipped brands (only `test.ts` gates + the four
  source files change; `out/*` untouched). **L-01** — the interactive-state `walk` clamped an overshoot
  to the ramp's terminal step, so at a ramp end hover(+1) and pressed(+2) collapsed onto the SAME step:
  visually indistinguishable states (each state's contrast was gated, their mutual distinctness never
  was). It now reflects inward on overshoot, preserving the step-count separation; a new invariant asserts
  default≠hover≠pressed for every fill/action/link group across all extreme brands × modes — only the
  near-black `t-dark` brand's HC modes actually saturated, and reflection kept every contrast contract
  green. **L-02** — `dualContrastWindow(r)` returned an inverted `[min>max]` window for r>√21≈4.58 (the
  max ratio any single luminance clears on BOTH extremes); it now throws, so a future HC-7:1 caller
  fails loud instead of reading an empty range as valid. **L-03** — `radiusScale` gained a weak-
  monotonicity tripwire (none≤sm≤md≤lg); equality stays legal (scale=0 collapses to sharp by design, small
  scales quantise onto the 2px grid), but a future non-monotone ladder edit throws. **L-05** — `pxOf` is
  now rem-aware (a `1.5rem` leaf scales ×16 instead of `parseInt`→1px), and `deref` returns `undefined` on
  a cyclic/runaway alias chain (reports missing) rather than a mid-chain alias node. Gates: `test.ts`
  **528/528** (452→528, +76 mostly the cross-brand distinctness invariant), nb-regression exit 0, `out/*`
  + `out/figma` byte-identical. **L-04 deferred (documented):** semantic borders' SC 1.4.11 contract is
  against `background.primary` only (narrower sibling of the fixed CR-02) — extending it to the worst-case
  tinted surface would change emitted border colours and touch `out/figma` (the Figma-emitter thread's
  surface), so it's left as a documented gap, consistent with the byte-identity + coordination discipline.

---

- **Code-review fixes M-10/M-11 — metadata / gate completeness** (`ai-metadata.ts` / `tree.ts`, `docs/16`
  MED tier; **completes the code-review MED tier in the generator/web lane**): two "the index/gate doesn't
  see non-`$value` refs" blind spots. **M-11** — buildTree's alias-resolution walk validated `$value`,
  composite sub-values, and mode-override `$value` refs, but NOT a fluid composite's
  `$extensions.prism3.responsive.{min,max}.ref`, so a ladder edit could ship a dangling
  `{root.font.size.NN}` while the alias gate reported clean. The walk now collects fluid refs too (alias
  totals rose to nb 647 / aurora 646 / harbor 640, all resolve); gate: an independent full-tree ref-count
  must equal `stats.aliases`. **M-10** — the `.ai.json` `aliased_by` reverse index was built from `$value`
  refs only, so a primitive consumed SOLELY by a dark/HC override showed zero consumers (contradicting the
  sidecar's own "cannot drift" note). An `allRefsOf` now collects `$value` + mode-override + fluid refs;
  purely additive (new `aliased_by` ⊇ old for every primitive — 0 dropped, 53 grew on nb). First tests of
  the previously-ungated sidecar. Gates: test **452/452**, nb-regression exit 0, token colours +
  `out/figma` byte-identical (M-11 validation-only; M-10 enriches `*.ai.json` only).
- **`emit-figma` — hide primitives from library consumers + thread DTCG
  descriptions into every Figma variable** (`engine/emit-figma.ts` +
  `engine/test.ts` block 23, 2026-07-04). Primitives (palette + dimension +
  opacity + font/family + font/size + font/weight — 217 variables in NB)
  now carry `hiddenFromPublishing: true`, so a file that subscribes to this
  as a design-token library only sees the SEMANTIC layer in the picker
  (color/space/radius/size/border-width/focus/layout/font-fluid/
  font/weight-role — 349 variables in NB). Scopes stay at their real
  role-family targets across every tier — Figma's Plugin API rejects
  non-matching scopes ("Invalid scope for this variable type" if you try
  `TEXT_CONTENT` on a COLOR/FLOAT var), and `scopes: []` is documented +
  probe-verified as ALL_SCOPES (setBoundVariableForPaint succeeds on a var
  with scopes=[]), so there is NO scopes-based mechanism to hide primitives
  from LOCAL pickers in the definer file. Production discipline: publish
  tokens as a library, author components in a separate consumer file, and
  hidden-from-publishing narrows the picker end-to-end. Also **threads
  `$description`**: every emit-figma variable's `description` now reads
  from the DTCG leaf's `$description` (the source-of-truth prose that
  already lived in `nb.tokens.json` + `nb.ai.json`). Font/family
  descriptions retain the fixture's stack line (fix #4) and append the
  DTCG description. Semantic-tier bytes are unchanged except the new
  descriptions; primitive-tier bytes gain `hiddenFromPublishing: true` +
  descriptions. Fixture-match gates hold (scopes match the frozen Token
  Press export exactly; the fixture never carried hide/description fields,
  and emit-figma now adds them separately-tracked). New block 23 gates
  the intent: 217 primitives hidden + 349 semantics not hidden + zero
  empty descriptions + spot-check descriptions equal their DTCG source +
  emit determinism. **Materialised to Figma via MCP (2026-07-04):**
  re-imported `wireframe-demo/*` with the new policy — palette flagged
  hidden, all 18 vars carrying prose descriptions — and re-rendered the
  two-column light↔wireframe specimen (screenshot at
  `Prism3/docs/assets/hidden-primitives-specimen.png`). Gates: test
  **621/621** (rebased onto the emitter-thread merges — #73 `core-*`
  collection rename, #74 CR-08 layout-per-breakpoint, #75 M-08/M-09
  parseColor + space-alias — so the primitive collections read
  `core-palette`/`core-dimension`/`core-font`, the aurora layout keeps its
  `xs` breakpoint, and the hex-brand alpha ramps stay correct; block-23's
  7 intent gates union with the consumption-eval blocks);
  nb-regression clean (ΔE00 1.95); emit-dtcg 248/248 contrasts per brand,
  every alias resolves; `out/figma/*` regenerated from scratch on the new
  baseline (primitives gain `hiddenFromPublishing` + descriptions; semantics
  gain descriptions), byte-identical on regen.
- **`emit-figma` wireframe axis — materialise-to-verify** (`Prism3/docs/assets/
  wireframe-specimen.png`, 2026-07-04): closes the parked visual-verification
  follow-up from #53 (Pillar 1b wireframe axis). Motion re-probed first —
  `TIME` still absent from the Figma FLOAT-var scope enum
  (`ALL_SCOPES / CORNER_RADIUS / WIDTH_HEIGHT / GAP / OPACITY / STROKE_FLOAT /
  EFFECT_FLOAT / FONT_WEIGHT / FONT_SIZE / LINE_HEIGHT / LETTER_SPACING /
  PARAGRAPH_SPACING / PARAGRAPH_INDENT / TEXT_CONTENT`); motion stays deferred.
  Materialised the wireframe axis into the Prism3 Test File via figma-console
  MCP on a specimen slice (7 palette primitives + 6 role vars × 2 modes + 5
  radius vars × 2 modes, namespaced `wireframe-demo/*`). A two-column frame
  flips the SAME structural layer tree between `light` and `wireframe` via
  `setExplicitVariableModeForCollection`, and Figma's alias engine resolves
  the flip live: `color/foreground/brand` violet → grey,
  `color/action/default` azure → grey, `radius.md/lg/round` positive → 0. The
  neutral roles (`background`, `text/primary`, `foreground/primary`, `border/
  primary`) stay identical in both columns as expected (Pillar 1b passthrough
  rule). This is the first end-to-end visual proof of the wireframe axis —
  the structural gates (test.ts block 22) prove the artefact shape, the
  specimen proves Figma's runtime resolves them. Docs-only: `docs/00` +
  `docs/10` updated; screenshot added under `docs/assets/`; engine untouched
  (test **448/448**, `out/*` byte-identical). The aurora + wendys
  full-materialise from #50 remains parked (separate PR — heavier scope).
- **Code-review fixes M-15/16/17 — web failing-state robustness** (`web/src/main.ts`, `docs/16` MED tier):
  three UX defects when a live edit doesn't resolve. **M-15** — exports ran off the live `brandState`, so
  tokens.json re-ran `brandTheme` uncaught (a failing edit threw in the click handler → no download, no
  feedback) and design.md serialized a brief its own importer rejects; both now export the **last-good**
  input/theme (always valid, re-importable, and exactly what the ramps already show). **M-16** — ramps
  paint from the last-good theme but the anchor badge computed from the live (maybe-failing) state → wrong
  swatch flagged; now a `lastGoodInput` (cloned on each successful rebuild) drives `anchorStepFor`.
  **M-17** — an import error rebuilt the menu with a fresh empty textarea (and a mode-toggle mid-paste did
  too), wiping the paste; `importText` now survives re-renders, cleared only on a successful load.
  **Verified headless** (forced failing state = accent renamed to reserved `neutral`): both exports
  download without crashing, the accent ramp keeps its anchor badge, a garbage paste shows the error +
  retains the text across a re-render; web typecheck + build clean, 0 page errors. No automated gate — the
  honest gate is a headless web-smoke harness, still the pending infra task first flagged for CR-07.
- **Code-review fixes M-12/13/14 — parser/CLI hardening** (`classify-colors.ts` / `color.ts` / `cli.ts`
  / `standard-design-md.ts` / `emit-dtcg.ts`, `docs/16` MED tier): three silent-crash / silent-drop paths
  in the standard-`design.md` ingest. **M-12** — the colour classifier lowercased for *classification*
  (`roleOf`) but extracted anchors with literal lowercase keys, so `{ Primary: … }` / `{ Error: … }`
  classified right yet dropped the anchor (or threw "no primary"). Now a lowercase-role→hex map (with the
  original token kept for mark/log) drives extraction — case-insensitive end to end. **M-13** — `hexToRgb`
  rejected 8-digit alpha hex (`#C8102EFF`, common in real extractions) as "invalid hex", and `cli.ts`'s
  `standardToBrandInput` call sat outside any try/catch → raw stack trace. Now `hexToRgb` accepts
  `#RGBA`/`#RRGGBBAA` and drops the (opaque-anchor-irrelevant) alpha, and the CLI wraps the classify call
  → readable diagnosis + exit 1 (verified: a no-primary brief prints "✖ could not classify …" and exits 1).
  **M-14** — `Number('soft')` → NaN passed `typeof === 'number'` + every min/max compare → NaNpx radius.
  Rejected at ingest (specific message) *and* hardened the validator's number/integer branch to require
  `Number.isFinite` (backstop for any number field). Gates: test **448/448**, nb-regression exit 0, `out/*`
  byte-identical (all three are CLI-ingest paths, not the committed brands).
- **Code-review fixes M-05/M-06 — theme-layer semantics** (`theme.ts`, `docs/16` MED tier): two
  brand-semantic defects in the danger/action carve. **M-05** — `inRedTerritory` was hue-only, so a
  warm greige primary (`c:0.03, h:30`) counted as "red" and `danger` reused the near-grey primary ramp
  → destructive signalling collapsed to a near-neutral (and `h:47` vs `h:47.5` flipped the strategy with
  no note). Fix: `inRedTerritory(hue, chroma)` now also requires `chroma ≥ RED_CHROMA_FLOOR (0.08)` — a
  red-ish-but-desaturated primary carves a real saturated red; the two carve reasons + a knife-edge
  boundary note are logged. **M-06** — `roleAnchorStep.action` was `primary ? anchorStep : 500`, so a
  non-primary `actionPalette` (a named accent) got the hardcoded 500 pivot, never its own pinned shade,
  while `nbTheme` anchors action at 550 (its accent step) — the white-label path diverged from the
  regression's own semantics. Fix: a brandColor `actionPalette` anchors the action at that accent's own
  step (`autoPlaceStep` of its L); `pickBrand` still nudges to clear AA, so a11y is preserved. Investigated
  the finding's "needs an owner ruling" flag → **byte-identical for committed brand colours** (aurora's
  accent coincidentally pins at 500; only decisions notes added), no a11y downside, aligns the engine with
  itself — a strict improvement, applied. Gates: test **439/439**, nb-regression exit 0, `out/*` colours
  byte-identical.
- **Code-review fixes M-01/02/03 — adversarial-anchor ramp hardening** (`ramp.ts`/`theme.ts`,
  `docs/16` MED tier): three ramp-generation edge cases where a pathological anchor produced silent
  garbage. **M-01** — `chromaForL` divided by `(lMax−peakL)`/`(peakL−lMin)`; an anchor L at lMax pinned
  at a non-top step made the top steps hit 0/0 → `#NaNNaNNaN` (10 steps in the probe). Guarded both
  spans; added a hex-shape gate (every step is `#rrggbb`). **M-02** — the anchor L is written verbatim
  *after* the knot monotonic-clamp, so an anchor whose lightness disagrees with its step (e.g. L=0.985 at
  step 50) left the ramp non-monotonic (step 50 lighter than 25), which the mode pickers misread. Added a
  post-generation guard that throws on any light→dark inversion (a consistent anchor via autoPlaceStep
  never trips it). **M-03** — an out-of-gamut anchor can't render exactly; `oklchToRgb`'s independent
  channel clamp silently shifts L *and* hue (aurora accent drifts h 2.5°, L +0.04), and the old
  anchor-ΔE gate compared two identically-clipped values (tautological). Fixed **coordination-safe**:
  `brandTheme` now surfaces every out-of-gamut pinned anchor in the decisions log (aurora `accent`,
  harbor `primary`) — rendering unchanged, no colour or `out/figma` ripple, only the note added; gate
  measures real rendered-vs-requested drift. **Deferred upgrade:** a constant-hue chroma *projection*
  (preserve L+hue, project C to the boundary) is the stronger fix but changes those brand colours and
  needs an all-emitter regen incl. `out/figma` — the Figma agent's surface with #53 in flight — so it's
  held for a coordinated change. Gates: test **414/414**, nb-regression exit 0, `out/*` colours
  byte-identical.
- **`emit-figma` — wireframe axis** (`engine/emit-figma.ts` + `test.ts` block 22, 2026-07-04):
  first mode-varying materialisation post-#50; unlocks Pillar 1b end-to-end in the Figma
  target. **Colour:** `'wireframe'` added to `COLOR_MODES` (canonical position: last); the
  existing intersection with `theme.modes` picks it up and the per-role alias comes from
  `$extensions.prism3.modes.wireframe.$value` — zero extra adapter body. **Radius:** first
  non-colour/shadow axis to be mode-varying — `buildFigmaDims` returns
  `radius: FigmaCollectionFile[]` (per-mode files, same shape as `color`). A non-wireframe
  brand emits a single `radius.json` (byte-identical to the pre-1b world); a
  wireframe-opted brand emits `radius.Default.json` + `radius.wireframe.json`, non-zero
  radii aliasing `dimension/0` and `radius.none` unchanged. No example brand opts in
  today; gated against a synthetic wireframe brand (same pattern as blocks 18 + 20).
  Gates: **400/400** (+16 wireframe: five colour-axis + eleven radius-axis + one drift
  fence), nb-regression ΔE00 1.95, emit-dtcg 248/248, default `out/figma/*`
  byte-identical (verified). Load-bearing precedent for any future mode-varying geometry.
- **Code-review fix CR-05 — design.md parser silently dropped misindented lines** (`design-md.ts`): the
  YAML-subset parser's `map`/`seq` loops run `while lines[pos].indent === indent`, so a line whose indent
  doesn't fit its block (one stray space) — or a no-colon/prose line (`if (ci < 0) break`) — ended the loop
  early and left that line **and everything after it** unparsed, with **zero diagnostics**: a designer's
  lever (or a whole trailing section) just vanished, and if the dropped key was optional the engine emitted
  defaults silently. Fix: track a 1-based source line per `Line`, and after parsing **throw if any line was
  left unconsumed**, naming the offending line number + content ("unparseable frontmatter at line N …").
  Loud failure instead of silent drop. Verified: the finding's exact probes now throw — a `chroma:`
  over-indented one space (drops `chroma` + trailing `radiusScale`) and a stray prose line (truncates the
  rest) — while the correctly-indented equivalents still parse byte-identically. The web import already
  try/catches `parseDesignMd`, so it now surfaces the error and keeps the working brand (better UX, no web
  change). Gate: adversarial parser suite (over-indent / stray-line throw with a line number; valid parses
  clean). test **368/368**, `out/*` byte-identical. **This clears the engine/web HIGH tier** (CR-01/03/04/
  05/06/07); CR-08 + the emit-figma MEDs remain with the Figma-emitter agent.
- **Code-review fix CR-04 — hand-rolled schema validator ignored keyword classes** (`emit-dtcg.ts`
  + `theme-schema.json`): the validator (the boot check for the CLI *and* the sandbox hosts) had no
  `boolean` branch (so `{type:boolean}` matched anything — incl. inside a `oneOf`, which is why
  `gradients:"banana"` passed → `brandTheme` then crashed on `.map`), checked `enum` only under
  `type:string` (numeric `titleFloor:[16,18]` unenforced), and never checked `minItems`/`maxItems`.
  So `[schema] ✓ conforms` actively vouched for inputs the schema rejects. Fix: added `boolean` +
  `integer` branches, moved `enum`/`const` to a **type-independent** check, added `minItems`/`maxItems`,
  and a **loud-fail guard** — an unhandled `type` now throws instead of silently passing, so the
  silent-ignore class can't recur. **The stricter validator immediately exposed a real schema↔engine
  drift** (the finding's 2nd probe): `families.variable` was declared `boolean`, but the engine's
  `BrandInput` accepts `boolean | Partial<Record<'display'|'text'|'mono', boolean>>` and **aurora uses
  the per-face object** — so the schema was mis-describing the contract. Corrected the schema to the
  real `oneOf[boolean, per-face-object]`; all three example brands conform again. Gate: adversarial
  validator suite (`gradients:"banana"` / `titleFloor:17` / short `easingEmphasized` / `variable:"yes"`
  all rejected; valid forms incl. the per-face object accepted). test **364/364**, `out/*`
  byte-identical (validation-only; no token change). *A stronger validator also backstops CR-03/CR-05.*
- **Code-review fix CR-06 — the NB regression can now fail** (`nb-regression.ts`): it was a pure report
  generator — ΔE00 outliers, contract failures, and dimension mismatches rendered as ⚠️/❌ markdown rows and
  it **always exited 0**, so a ramp-math regression shipped green (only a human reading the report noticed),
  and its ≤3 verdict was a *mean-of-means* (a single ΔE-15 step hides under a good aggregate). Fix: a real
  gate that sets `process.exitCode = 1` on any of — (1) a **per-step ΔE00 ceiling** (3.5 bar) with the NB
  hand-nudges enumerated in a `KNOWN_OUTLIERS` allowlist (each with its own ceiling, so a *new* regression at
  those steps still trips; replaces the static "known kink" prose that would have masked a fresh bug with the
  same signature — finding (c)); (2) a **covered-count assertion** (20 steps/palette — a truncated/renamed
  fixture → 0/0 NaN can no longer slip through — finding (a)); (3) any **contrast contract** fail; (4) any
  **dimension** mismatch. Also hardened `specs[0]`/`specs[3]` → lookup-by-palette (L-12) so a spec-order
  change can't point the contract gate at the wrong ramp. **Verified both directions:** current engine PASSES
  (exit 0 — every step within ceiling, 4×20 covered, 11/11 contracts, 23/23 dims); a simulated regression
  (amber.600 ceiling forced below its real 9.15) FAILS with exit 1 and a precise per-step message. test
  355/355 (unaffected — test.ts doesn't run this), `out/*` byte-identical.
- **Code-review fix CR-03 — brandColors palette-name guard (reserved / charset / duplicate)** (`theme.ts`):
  brand-colour names were unvalidated, and the palette map is last-wins (`new Map(palettes)` /
  `palette[name] = node`) — so a brandColor named `neutral`/`primary` silently **replaced** the engine
  ramp the whole surface model builds on, a status name (`success`/`danger`) was itself replaced by the
  later-pushed status ramp, and dotted/spaced/symbol names broke `{root.palette.…}` alias paths; contrast
  picks then recomputed against the corrupted map and passed self-consistently (green gates, nonsense
  output). Fix: `brandTheme()` now validates each `brandColors[].name` up front — rejects the 10 reserved
  engine palette names (`primary`/`neutral`/`success`/`warning`/`info`/`danger`/`white`/`black`/
  `*-alpha`), enforces the `^[a-z][a-z0-9-]*$` slug (also closes CR-07's XSS vector at the source — an
  HTML-metachar name can't validate), and rejects duplicates. Matches the existing `root`/`actionPalette`
  throw-at-boundary pattern, so the web import/rename path inherits it (rebuild fails → last-good kept).
  Added a schema `pattern` on the name (belt-and-suspenders; enforced by `validateBrandInput`). Gate:
  adversarial-name suite in the namespace block (reserved/dotted/spaced/symbol/duplicate all throw; a
  valid slug is accepted; schema half agrees). Gates: test **355/355**, `out/*` byte-identical (aurora's
  `accent` is valid — no valid brand changes), nb-regression clean. *L-06 (gradient names) is the adjacent
  LOW finding — same class, left for its own pass.*
- **Code-review fix CR-07 — web XSS: brand palette name reached `innerHTML`** (`web/src/main.ts:146`):
  the ramp anchor label built its markup with `meta.innerHTML = \`anchor <b>${name}…\``, and `name` is a
  brand-controlled `brandColors[].name` (pasted `design.md` / accent rename, no charset validation — CR-03).
  A name like `x</b><img src=q onerror=…>` executed on the next ramp paint. Fix: build the label with
  `el()`/`textContent` + a text node (the idiom the rest of the file already uses), never `innerHTML`.
  **Verified headless:** added a 2nd accent named with a tag-breaking `<img onerror>` payload (so the theme
  rebuilds cleanly), confirmed it reaches line 146 and renders as **literal text** — `<b>`.textContent is the
  raw string, 0 `<img>` elements in the doc, `window.__xss` never set, no dialog. Web typecheck + build clean.
  *Gate:* the honest gate is a headless web behavioural-smoke harness (gate blind-spot #8, also covers
  M-15/16/17); the repo has no web test runner yet, so that harness is a separate infra task — noted, not
  built here, to keep the fix surgical. The `readout.innerHTML` at `:283` is NOT a sink (`<input type=color>`
  value is browser-constrained `#rrggbb`); `visualize.ts` `esc()` gaps are the separate LOW finding L-10.
- **Code-review fix CR-01 — `contrast()` rounded before threshold comparison** (`color.ts` + emit
  boundaries; first of the project code-review backlog in `docs/16-code-review-findings.md`):
  `contrast()` did `Math.round(x*100)/100` *inside* the function, so every
  WCAG pass/fail compared the rounded ratio — a role at raw 6.9948 read 7.00 and **false-passed** a
  7:1 HC contract. Fix: `contrast()` returns the **raw** ratio; `ResolvedRole.ratio` holds raw (gates
  now compare un-rounded); rounding moved to the emit boundaries only (`tree.ts` role `contrast`/
  `contrastOnWhite`/gradient a11y, `ai-metadata.ts` `contrast_with`/gradient prose, `resolve-preview`
  splits raw-for-pass from rounded-for-display). Caught real shipped false-passes: **harbor** `hc-light`
  `success.700 @ 7.00` (raw 6.99) → corrected to `success.750 @ 8.43`; `on-success` cascaded 9.67→11.65.
  NB roles unaffected → `nb.tokens.json` + emit-figma NB output **byte-identical**; aurora byte-identical
  after the display-round fix. Added a regression gate (raw `#007ea1`/black = 4.4990 must read < 4.5;
  `contrast()` must not be pre-rounded). Gates: test **349/349**, nb-regression clean, emit-dtcg 622/622
  + 248/248, web typecheck clean. *One concern per PR + its gate, per the review's own guidance.*
- **Project code review — findings documented, nothing fixed** (`docs/16-code-review-findings.md`,
  2026-07-03): full-codebase review (engine + web + regression harness), baseline green first
  (336/336, out/* byte-identical). 8 HIGH + 18 MEDIUM + 17 LOW findings, headline: `contrast()`
  rounds before threshold comparison → WCAG false passes structurally invisible to the gates
  (probe-verified: raw 4.49898 reported as 4.50-pass); the contrast floor is two steps shallower
  than the shipped surface ladder; duplicate palette names silently hijack engine ramps; the
  schema validator ignores boolean/enum-on-number/minItems; the YAML parser silently drops
  misindented lines; nb-regression cannot fail (exit 0 always); web XSS via brandColors names;
  emit-figma layout crashes on non-5-breakpoint brands. Four cross-cutting themes: self-referential
  verification, NB-only structural gates, silent degradation over loud failure, validator weaker
  than schema. §5 lists the gate blind spots to close as fixes land — **one fix + its gate per PR**.
- **Pillar 1b — wireframe mode** (`modes.ts`/`theme.ts`/`tree.ts`, docs/11 Pillar 1b): `'wireframe'`
  is now a generated opt-in mode — a mechanical greyscale. `VALID_MODES` (five) splits from `ALL_MODES`
  (the default four, unchanged → four-mode golden byte-identical); wireframe is opt-in only, never a
  default. **Colour:** every *chromatic* role resolves on the **neutral** ramp at the position its colour
  pick would land, then re-nudged to clear the *same* min on neutral — so the greyscale still holds every
  contrast contract (verified: e.g. `foreground.brand` primary.550 → neutral.600, nudged one step to keep
  its 4.5:1 fill contract). Neutral/text/background/white/black roles pass through. **Geometry:** non-zero
  `radius.*` leaves gain `$extensions.prism3.modes.wireframe → {root.dimension.0}` — the *first* mode-varying
  geometry (same override shape colour/shadow use); `radius.none` stays override-free. Emit-figma
  coordination noted in the fresh-agent brief (radius collection needs a wireframe mode). Gates: test
  **344/344** (+8 wireframe: greyscale remap, radius→0, every wireframe contract holds), nb-regression +
  emit-dtcg `out/*` **byte-identical** (no example brand opts in), web typecheck clean.
- **Pillar 1b web — wireframe toggle + per-mode preview geometry** (`web/src/main.ts`,
  `resolve-preview.ts`): the brand menu gains a **Wireframe** toggle beside Dark/HC (`setModes`
  now takes a third flag, appends `wireframe` last = the engine's canonical mode order); the
  preview's mode selector extends to Wireframe automatically. Geometry is now per-mode:
  `resolvePreview` exposes **`dimOverrides`** (sparse — only refs/modes that differ from the
  canonical baseline, mirroring the tree's `$extensions.prism3.modes`), and `renderChip` reads
  `dimOverrides[ref]?.[mode] ?? dims[ref]` so wireframe squares off corners live. Verified
  headless: default 4 modes → enabling wireframe → 5 (Wireframe appended); a saturated Light
  chip `rgb(0,97,136)` collapses to the neutral `rgb(92,92,97)` (chroma spread 136 → 5) with
  radius 8px → 0px; 0 page errors. Gates: test **347/347** (+3 `dimOverrides`), web typecheck
  clean. No engine-value change (dims baseline untouched → nb-regression + `out/*` still
  byte-identical). Completes 1b end-to-end (engine + UI), mirroring the 1a #42→#43 split.
- **Deployment-target neutrality captured** (`docs/15-deployment-neutrality.md`): the owner named the
  likely *delivery* of the north star — an **AWS / Bedrock hosted E2E service** using **LLMs as needed**
  but with the **core staying pure deterministic code**. Recorded as an architectural *constraint*, not a
  build task: three layers (pure core / assistive-LLM edge / host+state edge), and the rule that hosting,
  persistence, auth, transport, and model calls live *outside* the core — LLMs propose inputs to and
  narrate outputs from the engine, never compute a token value inside it. AWS is just the next I/O shell;
  it validates the portable-core bet rather than changing it, and adds a *third* option for the export
  core (a hosted service Token Press calls, vs. a vendored package) — another reason the `12` vendoring
  call is safely deferrable. **The standing review check from here on: does a PR add I/O, state, or a
  model call to a pure module? If yes, it belongs in a shell.** Nothing to build; the line to hold.
- **Component-layer contract locked** (`docs/14-component-layer.md`, 2026-07-03): the owner's
  question — store components as data and build them in Figma on the fly, LLM-free, like
  variables — answered YES and captured as the architecture: definitions as type-checked data
  **seeded from the KB's ~40 component briefs (§15 schemas)** and **bound to the locked token
  names (docs/11)** so structure is brand/mode-invariant; write leg = an `emit-figma` component
  artifact executed by the B2 plugin via the Plugin API (REST can't create nodes; same two-route
  pattern as 08 §5); verify leg = **extraction diff** (Specs CLI verified extraction-only —
  its seat is the component-tier nb-regression, not the builder); ceilings incl. the
  **Figma Motion revision** (timing/easing variables now exist — the "transition = code-only"
  disposition in 05/10 is stale; KB 18–21 flagged for update). Build sequence: schema → 3
  components (Button/Text Field/Card) → artifact → materialize (MCP first, plugin after) →
  round-trip gate → scale. Doc-only; nothing built.
- **Inspirations log started** (`docs/13-inspirations.md`, 2026-07-03): reviews of external
  agent-first DS work — Astryx (Meta; CLI-as-agent-interface, typed `ComponentDoc` data files,
  `agent-docs` index injection, `--compact` tiers), the "ds-brain" practitioner stack map
  (docs-package-as-brain, generated skills/rules/indexes, **consumption-side evals**: rubric +
  invented-component rate + contamination-controlled trials), and Specs CLI (verified
  extraction-only). Convergence table at the end tracks patterns with multiple witnesses;
  identified gaps for us: `.ai.json` discovery layer, retrieval surface (CLI `query` / MCP),
  consumption evals. Doc-only change; no engine code touched.
- **Export-contract sequencing + Token Press eval** (`docs/12-token-press-monorepo-eval.md`): before
  building Pillar 4, two calls settled the order — (1) let the Figma-emitter agent **finish emit-figma**
  so the collection structure is stable (the shared `collections.ts` partition must mirror a settled
  reality), and (2) **decide whether the export *format core* moves into the monorepo** as a shared pure
  `@prism3/tokens-export` module both `emit-dtcg` and Token Press import — killing format drift by
  construction (recommended: **Option B**). `docs/12` is the hypothesis (from the Token Press handoff
  go/no-go. **Repo review complete (§9/§9c, 2026-07-03):** a Token-Press-side agent validated §7 against
  the real v2.3.1 source — Option B is *yellow* (separability/purity/presets ✅; composite *parity*
  ❌ refuted, the two outputs disagree today). Resolution: **pick the canonical shape first** — all five
  §9a shape decisions confirmed expressible against TP's source, with six refinements folded in
  (per-family format options, shared filename sanitizer, Prism3-side unfolder, `propertyAliases` option,
  core-owned `generator` block, +2–3d on the TP migration). Revised effort ≈ 2 weeks + 2–3d. Pillar 4's
  first line of code is gated on this (it sets the module boundary) + emit-figma + the owner's move
  decision; author it *at the shape boundary* regardless. Meanwhile **Wireframe (1b)** is independent and
  proceeds. *Next: build Pillar 4 at the shape boundary once emit-figma clears; Token Press move is a
  deferred, evidence-gated call.*
- **Pillar 1 web toggle — Dark/HC in brand setup** (`web/src/main.ts`): the brand menu gains a
  **Modes** control — `Light` fixed, `Dark`/`HC` toggles that write `brandState.modes` (HC adds
  hc-light, + hc-dark only when dark is on); `New brand` starts light-only. The engine re-resolves
  and the preview's mode selector narrows automatically (it iterates `rp.modes`); a dropped selected
  mode falls back to light. Verified headless: aurora 4 modes → Dark-off 2 → HC-off 1; New brand 1;
  0 page errors. No engine change; completes Pillar 1a end-to-end (engine + UI).
- **Pillar 1a — mode opt-out** (`theme.ts`/`modes.ts`/`tree.ts`, docs/11 Pillar 1): `BrandInput.modes`
  lets a brand decline dark/HC — `light` is the required base, `dark`/`hc-light`/`hc-dark` opt-in.
  `resolveAllModes` filters to `theme.modes`; the DTCG tree emits per-mode colour overrides only for
  opted-in modes (a light-only brand emits none); `resolvePreview`/the web mode switcher narrow
  automatically. Omitted → all four (back-compat, `out/*` byte-identical). Guards: must include light;
  unknown mode rejected (wireframe not yet a mode — that's 1b, spec in docs/11). Gates: test 323/323,
  nb-regression 1.95, emit-dtcg 248/248. *Next: the web toggle UI (Dark/HC in brand setup, light-only
  New-brand default) + wireframe (1b) + the export contract (Pillar 4).*
- **Multi-brand / mode-configurable VISION captured** (`docs/11-multi-brand-vision.md`): the
  enterprise north star — many brands over one *locked token-name contract* (names are the API;
  brands & modes are value-columns over it, swappable at runtime), modes the user can decline
  (light always; dark/HC/wireframe opt-in) or customize (light/dark accept an override layer, incl.
  a different dark CTA; HC/wireframe generate-only), and a **single export contract** so every exit
  (engine package / Figma emit / Token Press) yields the same by-collection × by-mode × by-brand
  artifact. Four pillars, phased: **mode config → export contract (pending Token Press eval) →
  override layer → brand families**. Not built yet — this is the plan. **Next: Pillar 1 (mode
  configurability).**
- **Web dashboard — preview on every stage + type specimen** (`web/src/main.ts`): the live
  component preview + contrast overlay (with the per-mode selector) now render on Semantic,
  Typography, AND Form — each reflects that stage's axis. Typography also gains a **type-scale
  specimen** (one composite per group at its resolved size, from `theme.typography`) so a
  `typeScale`/family/weight change is visible where the small component chips can't show it; the
  whole preview region is volatile so it repaints live. Stages 3–4 are now first-class. Engine
  untouched (312/312); web typecheck + build green; verified headless (specimen updates across
  compact/default/expressive, form preview present, 0 page errors).
- **Web dashboard — export** (`web/src/main.ts`): the brand menu gains an Export section —
  **design.md** (`toDesignMd`, #39) and **tokens.json** (resolved DTCG tree via `buildTree`,
  namespaced under the brand's `root`), both Blob-downloaded. Closes the E2E loop with the #38
  importer: verified in-browser that an exported `design.md` re-imports as the same brand (0 errors).
  Engine untouched (312/312); web typecheck + build green.
- **Web dashboard — brand setup** (`web/src/main.ts`): the brand selector is now a menu —
  switch example brands, **New brand** (minimal known-good starter), **Import design.md** (pasted
  `design.md` → `parseDesignMd` → loaded, guarded by a `brandTheme` accept-check; the working brand
  is untouched until it passes), and per-brand **Name** + **Namespace (`root`, #34)** fields (root
  validated inline). Lights up the `design.md` *import* leg of the E2E loop and gives #34's namespace
  a UI. Engine untouched (307/307); web typecheck + build green; verified headless (menu, new, import,
  namespace-valid/invalid — 0 page errors).
- **Web dashboard — staged four-stage shell + Stage 1 redesign** (`web/src/main.ts`): the approved
  design direction ported to the live app. Build order primitives → semantic → type → form; Stage 1
  is bespoke (scalable brand-colour list, generated ramps off `brandTheme().palettes`, and a neutral
  **Derive⇄Pin** toggle that surfaces the engine's `neutral.anchor`). Contextual per-mode selector on
  the Semantic stage; colour edits repaint only the volatile region. Engine untouched (307/307).
- **`emit-figma` — shadow + gradient** (`engine/emit-figma.ts` + `test.ts` block 14): styles,
  not variables (docs/08 §5 variable-type ceiling). **Shadow emits TWO style sets per step**
  (`shadow/xs..2xl + shadow/inset` for light-mode canonical; `shadow-dark/xs..2xl +
  shadow-dark/inset` for the reduced-alpha dark surface-lift pattern) — Figma Effect Styles
  don't support modes natively, so a plugin/component swaps the pair at mode transition.
  Every effect layer parsed to Figma primitives: DROP_SHADOW / INNER_SHADOW, {r,g,b,a} float32,
  offset/radius/spread, blendMode NORMAL. NB → 14 Effect Styles. **Gradient is opt-in**: NB has
  none (empty styles[], consistent shape), aurora emits 2 Paint Styles (brand + glow), each
  with 2 canonical alias-driven stops + 5 `sampledStops` (sRGB pre-sample of the OKLCH curve,
  since Figma interpolates in sRGB only) + a11y worst-on-white/black ratios (text-on-gradient
  contract). **Materialised to Figma via MCP** — 14 Effect Styles rendered on a two-row
  (light/dark) shadow specimen; 2 Paint Styles rendered as violet-azure linear + violet-glow
  radial swatches (aurora palette not yet imported, so demo uses sampledStops hex values —
  alias-driven form lands with the generalise pass). 14 new gates → `test.ts` **295/295**.
- **`emit-figma` — dims axis** (`engine/emit-figma.ts` + `test.ts` block 13): seven FLOAT
  variable collections (`dimension` primitives + `space`/`radius`/`size`/`border-width`/
  `focus`/`opacity` semantics — 94 vars total, 45 aliases). No fixtures (§2 covers only
  colour + typography), so gated structurally: variable counts match the DTCG tree, every
  alias resolves within the emitted collections, scopes narrow per family (space→GAP,
  radius→CORNER_RADIUS, etc.), opacity as PERCENT 0–100 (Figma OPACITY scope), focus's
  `strokeStyle` leaf skipped (no Figma variable primitive). **Materialised to Figma via MCP**
  — all 7 collections created, 45/45 aliases bound (incl. 3-level chains size→space→dimension);
  dims specimen renders geometry bindings on cornerRadius/width/height/padding*/opacity/
  strokeWeight; container fills bound to `color/background|foreground/*`. 16 new gates →
  `test.ts` **281/281**.
- **`emit-figma` — typography axis** (`engine/emit-figma.ts` + `test.ts` block 12): the
  `font` (38 vars) + `font-fluid.{desktop,mobile}` (10 vars/mode) variable collections
  byte-reproduce the NB fixtures, and 36 text styles apply the six §4 fixes (no `text/`
  wrapper, prescribed collection names, lineHeight PERCENT, letterSpacing PERCENT baked,
  primary family bound + full stack in description, fontStyle derived from weight-role via
  a named-instance table). Corrected the pre-fix `px-from-ratio`/`px-from-em` directive
  notes in `tree.ts` so an ad-hoc reader gets the current contract. **Materialised to Figma
  via MCP** — all 36 corrected styles bind fontFamily/fontSize/fontWeight to the real font
  vars, verification specimen renders on a fresh page with container fills bound to real
  `color/background|foreground/primary` (spike lesson). 25 new gates → `test.ts` **265/265**.
- **`emit-figma` — colour axis** (`engine/emit-figma.ts`): DTCG tree → Figma import artifact
  (`out/figma/nb/`), byte-reproduces the NB Figma fixtures (names/scopes/aliases exact). **Now
  handed off** — the Figma-emitter agent owns the rest (typography → remaining axes); see
  **`10-figma-materialization.md §6–7`** for that agent's remit.
- **Figma materialization contract + fixtures** (`10` + `fixtures/figma/nb/`) — the emit-figma
  spec + regression corpus, from two hand-run Figma-MCP import spikes.
- **Web dashboard** (`web/`, the monorepo's first host): renders knobs from the lever manifest +
  live preview + contrast overlay from `resolvePreview`; **colour + radius + type knobs are live**.
  *This thread's next work: deepen the dashboard, then the MCP adapter.*
- **Pure `tree.ts`** (buildTree extracted from the emit shell) → the browser hosts + emit-figma
  resolve the tree with no `node:`. **Lever manifest, preview spec, resolved-preview** — the shared
  contracts the surfaces render from.
- **`design.md` interchange + CLI** (dual-dialect) + the colour-role classifier + fidelity report.

Engine gates as of 2026-07-04: `test.ts` **430/430** (240 colour + 25 typography + 8 namespace + 16 dims + 14 shadow/gradient + 4 pin-a-neutral + 5 design.md-round-trip + 19 mode-config/wireframe + 13 emit-figma-layout + 3 dim-overrides + 10 emit-figma-mode-opt-out + 27 emit-figma-generalise + 21 code-review-HIGH-fixes CR-01/03/04/05 + 16 emit-figma-wireframe + 9 code-review-MED ramp-hardening M-01/02/03);
`emit-dtcg` 248/248 contracts per brand; `nb-regression` now a real gate (per-step ΔE ceilings + KNOWN_OUTLIERS, exits 1 on a fidelity regression — CR-06). The snapshot below is the
2026-07-01 token-layer baseline.

## Current status (2026-07-01)

**Every token category NB and Prism2 ship is now generated** — colour, dimension,
typography, motion, shadow/elevation, layout, and (opt-in) gradients — proven
against a real brand and proven white-label. From a ~7-input schema the engine generates gamut-aware
OKLCH ramps, places steps by contrast role, generates four contrast-verified
appearance modes, generates the space + radius scales from a primitive grid, and
emits consumable DTCG. It validates all of this against New Balance, and runs a
*second, synthetic* brand (`aurora`) end-to-end — synthesising status palettes,
carving a dedicated danger red the brand never specified, and applying a distinct
form factor (soft corners + compact density). Status, space, and radius
generation are all brand-input-driven, not NB-specific.

Headline numbers (regenerate with the commands below):

| Check | NB | Aurora (white-label) |
|---|---|---|
| Aggregate ΔE00 vs real NB (color) | **1.95** | n/a |
| Tonal-band contrast contracts | **11/11** | (same engine) |
| Cross-mode contrast contracts | **248/248** | **248/248** |
| **Dimension axis, exact** (Prism2 space + NB radius) | **23/23** | n/a |
| DTCG semantic aliases resolve (color + dim + size + type + layout + gradient) | **627/627** | **628/628** |
| Engine unit tests (colour math + extreme brands + typography + fluid + shadow + layout + gradient + surface-model + harshness + typography-weights/links + design.md-parser/CLI + standard-dialect/classifier/x-prism3 + lever-manifest↔schema drift + preview-spec binding-validity + resolved-preview contrast invariants) | **215/215** | (same engine) |
| Color primitives / dim grid emitted | 122 / 37 | 162 / 36 |
| Brand palettes / action source | red / **action = brand** (red) | primary+accent+… / **action = accent ≠ brand** |
| Form factor | comfortable / radius 1 (sharp) | compact / radius 2 (soft) |
| Emit profile | `nbds.*` / rgb | `prism.*` / hex |

Work now ships as **one PR per feature branch off `main`** (confirmed workflow).
All work through 2026-07-01 is merged to `main`.

**Structural work since the token layer completed (2026-07-01):**
- **`design.md` + CLI adapter shipped (build step A — the first adapter over the
  portable core).** A brand brief authored as YAML frontmatter (`engine/design-md.ts`,
  a dependency-free block-style YAML-subset parser + frontmatter/prose split)
  compiled by `engine/cli.ts` (`tsx cli.ts <design.md> [--out <dir>]`): parse →
  schema-validate → `brandTheme` (the pure core) → reuse the existing emit. No new
  token logic — `emit-dtcg.ts` now exports the reusable core (`buildTree` /
  `emitTheme` / `validateBrandInput`) and its two example brands are compiled
  **from** `examples/*.design.md`, so those files are the single source of truth.
  Two examples exercise complementary corners of the input space: `aurora.design.md`
  (**faithfulness** — reproduces the golden `out/aurora.tokens.json` **byte-for-byte**)
  and the net-new `harbor.design.md` (**coverage** — deep-teal, `action = primary`,
  warm-neutral greys + tinted page, measured status, comfortable/sharp, system
  stack + compact scale, gradients off; validated behaviourally: schema-conforms,
  622/622 aliases resolve, 248/248 contrasts hold). See `07-e2e-journey.md` §6.
- **Portable pure core.** The theming brain (`theme.ts` + `color`/`ramp`/`scale`/
  `modes`) is now Node-free — the only filesystem coupling (the NB fixture) moved
  to an I/O shell, `nb-fixture.ts`. Precondition for running the engine inside a
  Figma plugin sandbox, an MCP server, or a CLI. See `07-e2e-journey.md` §3.
- **Colour two-tier naming + mode-flattening.** Primitives `color.*` → **`palette.*`**;
  the semantic role layer `semantic.*` → **`color.*`** (the word "semantic" no
  longer appears in any path). Each role is now **one mode-agnostic token**: light
  canonical in `$value`, dark/hc modes as overrides in `$extensions.prism3.modes`
  (same shape as `shadow`; maps 1:1 to a Figma colour variable with modes). Locked
  convention in `06` §7b.
- **Space fidelity fix.** Restored Prism2's `space.150` (12px) and `space.250`
  (20px) — the engine had silently dropped them; dimension axis 21/21 → **23/23**.
- **E2E journey mapped** (`07-e2e-journey.md`): the designer↔developer↔agent
  pipeline, the portable-core architecture, `design.md` authoring brief, and the
  component-library layer (components-as-data + Code Connect) as layers 2–3 of the
  practice's four-layer AI stack.

---

## What exists

```
Prism3/
├── docs/
│   ├── 00-progress.md              ← this file (status + decisions + next steps)
│   ├── 01-token-architecture.md    ← the architecture spec / Theme Schema contract
│   ├── 02-nb-regression-pass.md    ← the NB regression: method + measured results
│   ├── 03-open-questions.md         ← semantic-layer decision backlog (elevation, scrim/opacity, disabled, white/black)
│   ├── 04-theming-playground.md     ← direction note: live theming dashboard / preview surface (web + Figma)
│   ├── 05-token-coverage-roadmap.md ← build backlog: remaining token categories (type, motion, shadow, layout, …)
│   ├── 06-surface-and-content-color-model.md ← the surface/content colour model + §7b as-built naming (palette/color) & mode encoding
│   ├── 07-e2e-journey.md            ← the designer↔developer↔agent pipeline; portable-core architecture; design.md; component layer (layers 2–3 of the AI stack)
│   ├── 08-theming-interfaces.md     ← the customization surfaces (plugin/playground/CLI/MCP/Figma-MCP); new-plugin + shared-lever-manifest decisions; two-route materialization; revised build sequence
│   ├── 09-architecture-and-repos.md ← platform architecture + repo/packaging (monorepo grown from prism3-tokens; web-dashboard-first); which of the owner's other plugins get absorbed vs stay downstream
│   ├── 10-figma-materialization.md  ← the emit-figma contract: exact Figma variable/style shape (proven by import spikes), colour + typography materialization rules, thread split; fixtures/figma/nb is the regression target
│   ├── 11-multi-brand-vision.md     ← the enterprise north star: many brands over one locked token-name contract; mode config → export contract → override layer → brand families
│   ├── 12-token-press-monorepo-eval.md ← the shared-export-core hypothesis (Option B: pure `@prism3/tokens-export` both emit-dtcg and Token Press import) + the §7 repo-review checklist → go/no-go gates Pillar 4
│   ├── 13-inspirations.md           ← field notes on external agent-first DS work (Astryx, ds-brain map, Specs CLI, …) — takeaways, gaps identified, convergence table
│   ├── 14-component-layer.md        ← the component-layer contract: components-as-data (seeded from the KB briefs, token-name-bound) → deterministic Figma materialization (plugin) + extraction-diff regression; LLM-optional by design
│   ├── 15-deployment-neutrality.md  ← deployment-target neutrality: pure core / assistive-LLM edge / host+state edge; the standing "no I/O, state, or model call in a pure module" review check
│   └── 16-code-review-findings.md   ← 2026-07-03 full-codebase review: the fix backlog (8 HIGH / 18 MED / 17 LOW, per-finding failure scenarios + gate coverage) + the gate blind-spot list (§5)
├── fixtures/
│   └── figma/nb/                    ← the NB import: palette + color×4 modes + font + font-fluid×2 (byte-reproduce targets) + text-styles (as-imported snapshot) — emit-figma's regression corpus (docs/10)
├── schema/
│   ├── theme-schema.json           ← the white-label BrandInput contract (JSON Schema; validated on every emit)
│   ├── theme-schema.example.json   ← a worked BrandInput (aurora) that conforms to the contract
│   ├── lever-manifest.json         ← generated: the shared-control contract (from levers.ts)
│   ├── preview-spec.json           ← generated: the shared live-preview spec (from preview.ts)
│   ├── example-brands.json         ← generated: parsed BrandInputs (aurora/harbor) the browser hosts boot from (from emit-brandinput.ts; the node-only design.md parser can't run in the sandbox)
│   └── nb-measured.json            ← NB regression measurement fixture (reverse-engineered anchors; a DIFFERENT shape, consumed only by nbTheme)
├── examples/                      ← authored brand briefs (design.md front door)
│   ├── aurora.design.md           ← faithfulness example (compiles to the aurora golden, byte-exact)
│   └── harbor.design.md           ← coverage example (net-new brand; behavioural acceptance)
└── engine/                         ← dependency-free TypeScript prototype
    ├── color.ts                    ← sRGB↔OKLCH, CIELAB, CIEDE2000, WCAG contrast, gamut-aware max chroma
    ├── design-md.ts               ← design.md parser: block-style YAML-subset → BrandInput + prose (pure, no I/O)
    ├── cli.ts                     ← CLI adapter: tsx cli.ts <design.md> [--out] — parse → validate → core → emit (I/O shell)
    ├── ramp.ts                     ← color ramp generation: exact anchor, 20 steps, chroma arc, 5 bands, contrast-role placement
    ├── scale.ts                    ← dimension axis: 4px grid + numbered space scale (8px rhythm) + radius + component sizes
    ├── theme.ts                    ← Theme builder: nbTheme() (measured) + brandTheme() (white-label: open brandColors[], action role decoupled from brand, status synthesis + danger carve + form factor)
    ├── modes.ts                    ← light/dark/hc-light/hc-dark, roles resolved by contrast target, brand-agnostic
    ├── nb-fixture.ts               ← I/O shell: reads the NB fixture off disk + defers to the pure core (keeps theme.ts Node-free / portable)
    ├── nb-regression.ts            ← diffs generated vs real NB, checks contracts → nb-regression-report.md
    ├── tree.ts                     ← the PURE DTCG token-tree builder: buildTree(theme) → full token tree (colour primitives + per-mode semantic aliases, dims, typography, shadow/gradient/motion) + contrast results + stats; also the shared PURE tree accessors (at/deref/pxOf/subNode/numOf/remPxOf/familyOf). No node:* (extracted from emit-dtcg so the browser hosts + emit-figma can resolve the tree without the I/O shell; docs/09)
    ├── emit-dtcg.ts                ← I/O shell over tree.ts: emits out/<id>.tokens.json per theme (NB + aurora + harbor, the last two compiled from examples/*.design.md) + modes-report.md; re-exports buildTree; EXPORTS emitTheme/validateBrandInput; validates aliases, mode contracts & BrandInput schema conformance
    ├── cli.ts                      ← CLI adapter: dual-dialect (engine-native + standard brand-skills design.md, auto-detected) → the core; --fidelity writes the report
    ├── standard-design-md.ts       ← reader + classifier→BrandInput (standardToBrandInput) + x-prism3 lever mapping for the STANDARD design.md dialect
    ├── classify-colors.ts          ← colour-role classifier: flat colors: hex map → engine anchors by naming convention
    ├── fidelity.ts                 ← full-parity fidelity report builder (observed vs generated; cli.ts --fidelity)
    ├── levers.ts                   ← the LEVER MANIFEST (PURE, no node:*): presentation contract for the BrandInput knobs (grouped/labelled/typed/ranged; 35 levers, 20 advanced); rendered by plugin/playground/MCP (docs/08 §4)
    ├── emit-levers.ts              ← I/O shell: writes schema/lever-manifest.json from the pure levers.ts (sandbox-portable split)
    ├── preview.ts                  ← the PREVIEW SPEC (PURE): sample components bound to semantic token paths + contrast pairs; plugin + playground render the same live preview from it (docs/08 §7 B1a)
    ├── emit-preview.ts             ← I/O shell: writes schema/preview-spec.json from the pure preview.ts
    ├── resolve-preview.ts          ← the RESOLVED-PREVIEW projection (PURE, docs/08 §7 B1b): resolvePreview(theme) → concrete colours per mode + live contrast overlay + dims (radius/space → px) + type (composite → family/weight/size, via the pure tree.ts buildTree); the runtime read-model surfaces consume
    ├── emit-brandinput.ts          ← I/O shell: writes schema/example-brands.json (parsed aurora/harbor BrandInputs) so the browser hosts boot from a VALIDATED brand without the node-only design.md parser (docs/09)
    ├── emit-figma.ts               ← I/O shell (docs/10): DTCG tree → Figma import artifact (out/figma/<id>/). COLOUR axis built — palette + color×4 modes, aliased, scopes derived from role family; reproduces fixtures/figma/nb exactly (names/scopes/aliases; values to float32 tol). Typography next
    ├── test.ts                     ← unit tests: colour-math invariants + 5 extreme-brand contracts + typography/shadow/layout/gradient/surface-model + harshness + typography + design.md-parser/CLI + standard-dialect/classifier/x-prism3 + lever-manifest↔schema drift + preview-spec binding-validity + resolved-preview contrast invariants + resolved dims/type validity + example-brands drift & all-green + emit-figma colour↔fixture reproduction (240 checks)
    ├── ai-metadata.ts              ← generates the AI-readable metadata sidecar (meaning/when/avoid/paired_with/contrast_with/mode_overrides) for the semantic layer
    ├── README.md                   ← how the engine works / how to run
    ├── nb-regression-report.md     ← generated (committed for review)
    ├── modes-report.md             ← generated, covers both themes (committed for review)
    ├── out/{nb,aurora}.tokens.json ← generated DTCG output per theme (committed for review)
    └── out/{nb,aurora}.ai.json     ← generated AI-readable metadata sidecar per theme (the agent surface)
```

### How to run

```bash
# Node ≥ 20. No npm install — color math is self-contained.
npx tsx Prism3/engine/nb-regression.ts   # regression vs real NB
npx tsx Prism3/engine/emit-dtcg.ts       # emit DTCG + modes, validate (+ schema conformance) — NB + aurora + harbor
npx tsx Prism3/engine/test.ts            # unit tests: colour math + extreme-brand contracts + design.md/CLI + lever-manifest drift
npx tsx Prism3/engine/emit-levers.ts     # (re)emit schema/lever-manifest.json — the shared-control contract
npx tsx Prism3/engine/emit-preview.ts    # (re)emit schema/preview-spec.json — the shared live-preview spec
npx tsx Prism3/engine/emit-brandinput.ts # (re)emit schema/example-brands.json — the browser hosts' validated boot brands
npx tsx Prism3/engine/emit-figma.ts      # (re)emit out/figma/<id>/ — the Figma import artifact (colour axis; docs/10)
npx tsx Prism3/engine/visualize.ts       # regenerate the style-guide HTML (out/tokens.html)

# Web dashboard adapter (the monorepo's first rendering host — docs/09). NEEDS npm install (esbuild).
npm install && npm run -w @prism3/web dev     # esbuild dev server on http://127.0.0.1:5173
npm run -w @prism3/web build                  # bundle to web/dist/

# CLI adapter — theme an arbitrary brand brief:
npx tsx Prism3/engine/cli.ts Prism3/examples/harbor.design.md [--out <dir>]   # engine-native dialect
npx tsx Prism3/engine/cli.ts Prism3/examples/wendys.design.md --fidelity      # standard brand-skills dialect + fidelity report
```

---

## Decisions log (why things are the way they are)

- **`toDesignMd` — the `design.md` serializer (inverse of `parseDesignMd`) (2026-07-02).**
  Export needed a `BrandInput → design.md` direction; the module only had parse. Added `toDesignMd`
  to `design-md.ts` (pure, node-free — same portable-core fence as the parser, so the web bundle can
  import it). It emits each **defined** top-level key as a **one-line flow value** (`primary: { l, c, h }`,
  `brandColors: [{ name, oklch: {…} }]`), which the existing flow parser reads straight back — so
  `parseDesignMd(toDesignMd(x)).input` deep-equals `x`. Only own defined keys are emitted, so an omitted
  optional (no `root`) stays omitted (exact round-trip, no phantom keys). Strings are emitted bare unless
  they'd mis-type (numbers/bools/null) or carry structural chars, in which case quoted. Gated (test.ts
  block 17): round-trip identity for aurora + harbor + a synthetic brand (custom root + `neutral.anchor` +
  `brandColors` + `actionPalette`), omitted-optional stays omitted, prose survives the fence. This is the
  engine half of **export**; the web download UI (design.md + DTCG via `buildTree`) is the paired web PR.
  Pure addition — `out/*` byte-identical. Gates: test 312/312, nb-regression ΔE00 1.95, emit-dtcg 248/248.

- **Pin-a-neutral — a pre-defined brand grey can anchor the neutral ramp (2026-07-02).**
  The white-label neutral was *always* derived from a hue + peak chroma cast (`brandTheme` built it
  with no anchor, unlike primary/brand-colours which pin their exact OKLCH). Some clients ship a
  pre-defined neutral, so `BrandInput.neutral` now takes an optional `anchor: OKLCH`: when set, the
  ramp is built AROUND it — pinned verbatim at `autoPlaceStep(anchor.l)`, hue/chroma taken from the
  anchor — reusing the exact `generateRamp({ …, anchor })` mechanism the brand palettes already use
  (zero new ramp math). `neutral.hue`/`chroma` stay required (the derived readout / the UI's Derive
  mode); the anchor drives when present. `roleAnchorStep.neutral` stays 500 — that's the semantic
  neutral *role's* preferred step for contrast resolution, independent of where the pinned *primitive*
  lands. Surfaced as an optional advanced colour lever (`neutral.anchor`, "Pin a neutral") so the web
  UI can render a Derive⇄Pin toggle. Gated (test.ts block 16): the pinned grey is reproduced at its
  step (ΔE < 1), the derived ramp genuinely differs, and the pin flows through to the DTCG neutral
  primitive. Default output byte-identical (no example sets an anchor; `out/*` unchanged). *Deferred
  outlier:* a neutral kept as its OWN separate palette — expressible today via `brandColors`, no engine
  work, so not built. Gates: test 307/307, nb-regression ΔE00 1.95, emit-dtcg 248/248.
- **Namespace is a customizable lever — `root` on `BrandInput`, default placeholder `prism` (2026-07-02).**
  The emit namespace was hardcoded to `prism` in `brandTheme` (only the NB fixture used its own
  `nbds`). It's now `BrandInput.root` (optional, default `'prism'`): a single, mode-invariant token
  namespace, one segment only — every token emits under `<root>.*` (primitives `<root>.palette`,
  semantics `<root>.color`). Threaded through the one place that had leaked past `theme.root`
  (gradient stop aliases were hardcoded `prism` — fixed) and gated: a custom root re-homes **every**
  alias to `{<root>.…}` with zero `prism` leakage (test.ts block 15), a dotted/spaced root throws at
  the engine boundary *and* fails schema (added `pattern` support to the hand-rolled validator so the
  schema's `^[a-z][a-z0-9-]*$` is enforced, not decorative). `root` joins `id` in `identityFields`
  (host-supplied identity, not a lever-form knob). Default output is **byte-identical** (out/* did not
  change). *Rationale:* `prism` is a placeholder every engagement should override; making it a lever is
  the minimum change and keeps the single-brand-root invariant fully intact (see the "no two-segment /
  no removal *yet*" note below). Decisions: (A) **single segment, no two-segment** namespaces
  (`nbds.pds.*`-style) — the user's call; the legacy two-segment convention is not reproduced.
  (B) **Namespace is forced** — always present. Removing it entirely (un-prefixed `color.*`) is a
  *deferred* option, NOT built. When we revisit, the clean method is an **emit-time flatten**: keep the
  tree namespaced internally (so `Object.keys(tree)[0]`-as-root, the alias resolver, emit-figma, and
  resolve-preview all keep working unchanged), and drop the wrapping key + rewrite `{prism.x}`→`{x}`
  in every alias **at the `emit-dtcg`/`emit-figma` boundary only**. Do *not* model "none" as an empty
  `root` — that yields a `{ '': … }` key and malformed `{.palette.x}` aliases across ~8 sites. Tradeoff
  to weigh then: a namespace prevents collisions and preserves provenance when a brand's tokens are
  consumed alongside others (the multi-brand case this engine serves), and DTCG/Figma consumers expect
  a top group — so "none" is a deliberate, informed opt-out, never a default. (C) UI to set/change the
  namespace is a later web increment (brand-setup surface, alongside `id` — not the primitives page).
- **`emit-figma` colour axis built — byte-reproduces the NB Figma fixtures (2026-07-02).**
  First increment of the materialization adapter (`10 §5`): `engine/emit-figma.ts`, an I/O shell
  over the pure `tree.ts`, walks the DTCG tree → the Figma import artifact
  (`out/figma/nb/{palette,color.<mode>}.json`) — `palette` (122 primitives) + `color` (95
  semantics × 4 modes), every semantic a name-based `VARIABLE_ALIAS` into `palette`. The split
  the contract calls for holds in code: the DTCG carries the *semantic* facts (per-mode
  `aliasOf`), the adapter owns the *Figma-target rendering* (role-family→scopes, name transform,
  `rgb→{r,g,b,a}` via `Math.fround` for Figma's float32, two-pass alias-by-name; ids omitted,
  Figma assigns them). A `test.ts` gate reproduces `fixtures/figma/nb/` exactly — names, scopes,
  and every per-mode alias target (0 mismatches, all 4 modes), values to float32 tol (~5e-7);
  240/240. Scopes are derived in the adapter (the DTCG doesn't emit them) — correct per the
  contract, not a directive gap. *Rationale:* the colour axis was the spike-proven byte-target;
  now owned once + gated. Next: typography (`font`/`font-fluid` vars + text styles with the six
  §4 fixes), then the remaining axes + generalize.
- **Freeze the `emit-figma` contract + NB Figma fixtures as the regression target (2026-07-02).**
  Two hand-run Figma-MCP import spikes (colour, then typography) proved the engine's
  `$extensions.prism3.figma` directives are directly usable, so the DTCG→Figma translation is
  mechanical — the job is to *own it once* (`emit-figma`) rather than re-derive per agent (the
  `09` drift trap). Captured the real NB import as `fixtures/figma/nb/` (Token Press raw export:
  `palette` + `color`×4 modes; `font` + `font-fluid`×2 modes; a Plugin-API `text-styles` dump) and
  wrote the contract in `10-figma-materialization`. Two fixture classes: **byte-reproduce**
  (palette/color/font/font-fluid) and **reference-with-known-deltas** (`text-styles` is the
  *as-imported*/pre-fix snapshot — the six typography fixes are intentional deltas, so gate against
  the *corrected* expectation, not that file). Verified the engine reproduces the colour aliases
  exactly (action 550/450/700/300; background.secondary neutral.050/900) — a genuine
  byte-comparable target, same discipline as `nb-measured.json`. `emit-figma` reads the semantic
  facts (aliases, per-mode values, fluid modes, weight-role numerics) and **derives** the
  Figma-target rendering (scopes from role family, collection/style names, line-height %,
  letter-spacing binding, fontStyle→named-instance); the engine directives don't yet emit per-leaf
  `scopes`/`collection`, which is `emit-figma`'s to own. *Rationale:* the spikes' findings +
  owner's Token Press exports. Full contract + thread split in `10`. PR #27.
- **Platform packaging: monorepo grown from `prism3-tokens`, web dashboard first (2026-07-02).**
  Owner-locked answers to the "one engine, two hosts" packaging question (full shape in
  `09-architecture-and-repos`). (A) The web dashboard and Figma plugin are **two adapters over one
  core** — both import the same engine module and render from the shared lever manifest + preview
  spec + `resolvePreview`; continuity is structural, not a sync. (B) They live as packages **in this
  repo** (`web/`, `figma-plugin/` beside `Prism3/engine/`), not a fresh repo and not three published
  repos — one version, a lever change lands everywhere in one commit; `brand-skills`/`knowledge-base`
  stay their own repos. The "no build" invariant holds for the core (tsx); the *adapters* get a
  bundler (a browser/Figma bundle is a packaging step, not a port). (C) **Web dashboard first** —
  fastest loop, no sandbox constraints, cleanest proof the shared contracts drive a real UI; the
  Figma plugin then reuses the same renderer. **Plugin consolidation:** the three separate Figma
  plugins (theming, text-style, style-guide-generator) get their *function* absorbed into the new
  B2 plugin (never their code — each carries a separate brain); the **style-guide generator lays
  tokens out as frames on the Figma canvas** (canvas documentation — a distinct capability the
  `visualize.ts` HTML preview does *not* replace, so it's a B2 feature, not a retirement). Token
  Press (different org) + the CLI templating system stay **downstream, contract-connected** via DTCG
  output, never merged. *Rationale:* owner decisions — "grow prism3-tokens into a monorepo," "web
  dashboard [first]," + the style-guide-generator correction. Resolves the packaging question `08`
  raised but didn't settle. **Scaffold BUILT the same day:** root `package.json` (workspaces
  `["web"]`, `type: module`) + a `web/` esbuild + vanilla-DOM adapter that imports the pure
  engine modules and renders 15 manifest knobs + 22 preview chips + a 4-mode contrast overlay
  from `resolvePreview`; boots all-green (verified headless). New `emit-brandinput.ts` →
  `schema/example-brands.json` supplies the browser a validated boot brand (test-gated). Engine
  stays buildless (218/218); only the adapter bundles. Full layout in `09 §3`.
  **Interactive loop landed (PR #24):** the colour-axis knobs are LIVE — primary (colour
  picker → OKLCH anchor) + neutral hue/chroma + actionPalette mutate the in-memory `BrandInput`,
  re-run `brandTheme` + `resolvePreview`, and repaint the preview + overlay; a non-resolving
  combination is caught and surfaced.
  **Geometry/type-from-tree landed (PR #25 + B):** `buildTree` extracted to the pure `tree.ts`
  (PR #25); `resolvePreview` now also returns `dims` (radius/space → px) + `type` (composite →
  family/weight/size), resolved from the tree via shared pure accessors (also lifted out of
  `visualize.ts`). The chips render real radius/padding/type, and **`radiusScale` + `typeScale`
  are now live too** (6 live knobs). Density/motion/shadow stay read-only — the current chips
  don't render those axes. A `test.ts` gate asserts every dim → positive px and every type →
  family + positive size (220/220).
- **Dogfood the shared preview model in `visualize.ts` before building the hosts (2026-07-02).**
  Rather than take the leap straight from the B1a/B1b portable model to two new live hosts (DOM
  playground + Figma-node plugin) in a fresh repo, the static style-guide generator was made the
  first consumer of `previewSpec` + `resolvePreview(theme)` — it renders each component/variant from
  the resolved role colours + token-tree dims + resolved type composite, with the per-mode contrast
  overlay driven by the same `byMode.pass` results. *Rationale:* prove the "define once, render
  everywhere" contract composes a real UI + live overlay from one source **in-repo, behind the
  existing gates**, so the host renderers (B1c/B2/B3) start from a validated binding+overlay pattern
  instead of an unproven one. Additive and output-scoped (only `visualize.ts` + regenerated
  `out/tokens.html`; pure core untouched, tokens byte-identical, 215/215). PR #22.
- **Theming interfaces: new plugin + shared lever manifest (2026-07-01).** The customization
  surfaces (Figma plugin, web playground, CLI, MCP, Figma MCP) are five adapters over one core,
  not five products (`08-theming-interfaces`). Decisions: (A) the Prism3 Figma plugin is a **new**
  build on the engine core, not an evolution of the existing theming plugin — the core is reused
  (never re-implemented, the KB round-trip drift trap), the plugin is a fresh materialization +
  control shell that inherits every engine option and dissolves the existing plugin's namespace/
  options/font-weight pain points; (B) the web playground and Figma plugin aim for **near-continuity**
  — one shared **lever manifest** + live-preview model, not two hand-maintained UIs (two visual
  editors = two surfaces of drift). The manifest is the *presentation* half (labels/groups/UI
  ranges/knob type) that `theme-schema.json` (validation half) lacks; the plugin, playground, and
  MCP tool schema all render from it, so continuity is structural, not a manual sync. Materialization
  has two routes over the same output — plugin knobs (manual) and Figma MCP (agentic) — within the
  Figma variable-type ceilings (COLOR/FLOAT/STRING; typography→atoms+Text Style; shadow→Effect/code).
  *Rationale:* owner decisions — "build new on the new engine"; "strive for near-continuity, a lot is
  possible inside a Figma plugin." Resolves `07 §8` open decision #3. Full shape + build sequence in
  `08`; next increment is the lever manifest.
- **`design.md` is the E2E interchange contract; adopt the open spec (2026-07-01).**
  The pipeline tools (all owner-built: `brand-skills` extractor, this engine, Token Press,
  three *separate* Figma plugins, the CLI templating system) connect through **one shared
  format — `google-labs-code/design.md`** — which we follow, not fork. Decisions: (A) the
  engine **regenerates from anchors + emits a fidelity report** (NB-regression pattern) and
  does not trust extracted ramps as final; **one generator** — `brand-skills` *describes*
  (stays standalone-complete, so a brand-skills-only user still gets usable colours), the
  engine *generates* the verified system; the base file stays pure spec, engine-only levers
  via **defaults + an optional `x-prism3:` extension**; **align `brand-skills` type-role names
  to the engine's semantic vocabulary**. The one new parser piece is a **colour-role
  classifier** (flat `colors:` map → anchors by naming convention). Full contract in
  `07-e2e-journey.md` §11. Validated (real Wendy's `design.md`) that every anchor the engine
  needs is present. Next: a Wendy's spike before any step-A rework.
- **`design.md`: block-style YAML frontmatter + hand-rolled parser; the CLI reuses
  the emit core; examples are the single source of truth (2026-07-01).** The locked
  plan called for YAML frontmatter + a minimal parser; on build, a *block-style*
  subset (indentation nesting + `- ` sequences + flow `{}`/`[]` leaves) beat a
  flow-heavy minimal parser because the whole point of `design.md` is human- *and*
  agent-authorability, and the doc's own example uses block-at-top + flow-for-leaves
  (owner chose "what do you recommend"). Rather than let the CLI duplicate the emit
  pipeline, `emit-dtcg.ts` was made the home of the reusable core (`buildTree` /
  `emitTheme` / `validateBrandInput`) behind an `isMain` guard, and its example
  brands are compiled **from** `examples/*.design.md` — so "faithfulness" is
  structural (the golden IS generated from the brief) and the explicit byte-diff
  test is belt-and-suspenders. Harbor uses **warm-neutral greys** (neutral hue ~65)
  against its cool teal brand (owner decision) so the brief's "warm off-white page"
  is honest, not aspirational — the neutral ramp hue is independent of the brand
  hue, a real teal-brand-with-warm-greys pairing, and it genuinely exercises the
  surface floor-shift lever. *Rationale:* user decisions after surfacing both forks
  before building.
- **Portable pure core, not a plugin/CLI (2026-07-01).** The engine is a
  dependency-free *library* wrapped by thin adapters (Figma plugin / CLI / MCP /
  API), not a single app. Kept the core I/O-free so it can run in a Figma sandbox;
  the NB fixture read lives in `nb-fixture.ts`. Same brain everywhere → the plugin
  inherits every engine option, and no forced LLM (knob-turning, a `design.md`
  file, or an agent all feed the same core). Rationale in `07-e2e-journey.md` §3–4.
- **Colour: `palette` primitives + `color` roles, mode as a value (2026-07-01).**
  "semantic" is a tier concept, not a name segment — it left the paths. The tier
  designers use got the intuitive `color.*`; the reference tier got `palette.*`
  (ref-vs-sys split). Mode is no longer nested in the name: one token per role,
  light canonical in `$value`, other modes in `$extensions.prism3.modes` (matches
  `shadow`; maps 1:1 to a Figma colour variable with modes). Rejected mode-in-name
  because it breaks "same name, different value per mode" and fights the Figma
  round-trip. Full note: `06` §7b.
- **Space scale reproduces Prism2 in full (2026-07-01).** An audit for a requested
  12px spacer found `SPACE_KEYS` had silently dropped Prism2's `150` (12px) and
  `250` (20px). Restored both — the "reproduces Prism2's full space scale" claim is
  now true, not aspirational (dimension axis 21/21 → 23/23).
- **Build a real prototype, validate against NB.** The thesis ("a brand is a
  small input set the engine expands") is only credible if the engine can
  reproduce an existing hand-built brand. NB is the regression target.
- **TypeScript / Node, dependency-free.** Color math is owned in `color.ts` so
  the engine runs without a network install and the math is auditable. Run via
  `tsx`/`ts-node`; no build step.
- **Keep our intent grammar** (tonal bands, contrast roles) rather than copying
  a vendor's ramp shape. The engine generates from intent, not from NB's hexes.
- **OKLCH generation with exact-anchor preservation.** The brand value is a
  *pinned* step, never shifted (verified: NB `red.550` reproduced at ΔE00 0.05).
- **Chroma arc, not a flat plateau.** First cut held chroma constant and the
  light tints blew out (green.050 ΔE00 20); the regression falsified it. A
  chroma arc that tapers toward both ends dropped green's mean 6.23 → 1.88.
- **Contrast-role-targeted step placement (gap 1).** Steps are *placed* at the
  luminance their role needs, not on an even-L curve. The Mid-Tone 500 sits at
  the dual-side AA pivot (Y≈0.18, clears 4.5:1 on white *and* black). Took the
  contrast contracts to 11/11 and, because NB is Univers-derived, also tightened
  the perceptual fit (aggregate ΔE00 2.14 → 1.95).
- **Modes are derived, not hand-mapped.** Primitives are shared across modes;
  each semantic role re-resolves to a primitive step by contrast target against
  the mode's surface. The brand anchor is preserved where it can be and
  auto-adjusted where it can't (a dark-mode action lightens when the anchor can't
  clear AA on a near-black surface).
- **Surface & content colour model (2026-06-29 — SUPERSEDES the property-led
  vocabulary entry below).** A UI-designer review of the generated style guide
  reworked the semantic layer (full spec: `01` §4.1 As-built + `06-surface-and-
  content-color-model.md`). `background` = the thin page **canvas** (`primary/
  secondary/tertiary` **tonal in both modes** — light is no longer all-white +
  an `inverse.*` ladder); `foreground` = the **surfaces/fills** on it (Prism2's
  `surface`, renamed: tonal ladder + `inverse.*` + bold semantic + `-subtle`
  tints + stateful `danger`); `text`/`icon` = **ink**; `action.*` = the
  interactive fill (now **top-level**); `border` = `primary/secondary/inverse/
  {semantic}/focus`. Dropped the `elevation.*` colour group (elevation = a
  foreground tier + a shadow), `background.subtle`/`sunken`/`quaternary`. Renamed
  `on-emphasis→on-inverse`, `interactive→action`. Fixed the incoherent
  `foreground.primary=950`/`secondary=200` (now a real tonal ladder; the dark
  fill is `foreground.inverse.primary`). HC carries elevation by **border**.
- **Semantic vocabulary: PROPERTY-LED — `background` / `foreground`(fill) /
  `text` / `icon` / `border`, with per-property interactive states.** *(Historical
  — superseded by the surface & content model entry above.)* Decided
  against a nine-system field survey (M3, Carbon, Atlassian, Fluent, Polaris,
  Primer, Spectrum, Radix, Tailwind/shadcn) cross-referenced with the practice KB,
  and aligned to New Balance's actual taxonomy. Top level is the *property* you're
  colouring; `foreground` is the element **FILL** (NB's meaning — not text).
  Interactivity is a per-property `interactive` variant carrying STATES (the
  applicable subset of default/hover/pressed/focused/visited/selected/disabled),
  not a parallel duplicated tree. `background.*` = inert container surfaces (+
  semantic tints); `foreground.*` = fills (neutral tiers + semantic + `interactive`
  + stateful `danger`); `text.*` = text (tiers + semantic + `on-*` pairs + `link`
  via `interactive`); `icon.*` = a full peer group that for now MIRRORS `text`
  (a future toggle relaxes icons to the 3:1 non-text floor so they diverge — see
  03-open-questions); `border.*` = neutral + semantic validation + `interactive`
  (focus ring = `.focused`). `info` palette newly synthesised. ~96 semantic roles
  × 4 modes. Field evidence: property-led is the field *majority* (Atlassian,
  Polaris, Primer, Carbon, NB all split text/bg/border/icon as peers); `on-*`
  pairing universal. *Rationale:* user decision after research — match NB's real
  structure (foreground=fill; text/icon/border as peers) rather than the
  role-led/content-grab-bag shape an earlier pass shipped. Semantic intents are
  static except `danger` (destructive fills carry states); inverse is modest
  (one `inverse` per property, leaning on per-mode resolution). Text on a vivid
  fill targets AA (gamut-bounded — 7:1 unreachable on a saturated mid), everything
  else escalates in HC.
- **Surface ladder + scrim/opacity primitives (backlog Items 1/2/4).** Decided
  against a 10-system field survey + KB §4. Elevation tiers renamed to an ordinal,
  use-case-neutral ladder `background.{primary,secondary,tertiary,quaternary}`
  (page→floating), plus `subtle`/`sunken`/`inverse` + semantic tints. The
  `overlay` tier name is GONE (it's overloaded across the field — floating surface
  vs scrim); component→tier mapping is documentation, not baked into the name.
  Light tiers converge in colour (elevation = shadow, a deferred effects axis);
  dark tiers step lighter (M3 lift). New primitives: an `opacity.*` scale and
  `black-alpha`/`white-alpha` ramps (composite over any surface — Radix/Fluent),
  and a `scrim.default` semantic token (alpha-based, heavier in dark per
  Spectrum/Fluent/Radix). White/black policy: pure primitives kept, surfaces route
  through the tinted neutral; a white page converges (shadow-carried), a tinted
  page (aurora `neutral.50`) lets cards step to white. *Rationale:* user decision
  after research — numbered ladder honours prior practice + the field's
  use-case-neutral camp; shadows deferred to an effects pass (KB lift pattern).
- **Motion axis — generated from a `tempo` personality lever (backlog roadmap §motion).**
  Decided against a 7-system survey + KB `18-motion-foundations`. The motion analog
  of the density/radius levers: `motionPersonality.tempo` (snappy/standard/relaxed)
  scales a non-linear duration ramp; easing roles (`standard`/`enter`=decelerate/
  `exit`=accelerate/`emphasized` + a `calm` accessibility curve) ship field-verified
  beziers (Carbon/M3); springs (`snappy`/`gentle`/`bouncy`) carry M3 spatial params
  by perceptual outcome; **composite `transition.*` tokens** bundle duration+easing
  (Atlassian model — the AI-trustworthy layer); reduce-motion is a **derived**
  output (Apple "substitute, don't delete": informational preserved/floored,
  vestibular → 0), not a hand list. Where we beat NB's fixed ramp: the personality
  lever, composites, the `calm` a11y curve, and derived reduce-motion. Aurora demos
  `snappy` (ramp compresses 50/100/200… → 40/80/160…). Motion is mode-invariant
  (sibling of the dimension axis), not per-mode colour.
- **AI-readable metadata sidecar — `out/<id>.ai.json` (prototype).** Per KB
  `31-color-systems §9` + `00-principles` ("descriptions = highest-ROI; avoid_when
  > when_to_use"): a generated agent surface for the semantic layer, peer to the
  DTCG `tokens.json`. Each of the 89 semantic roles gets `$description`, `meaning`,
  `when_to_use`, `avoid_when`, `paired_with`, `contrast_with`, and `mode_overrides`
  — all **generated** (prose from a deterministic role→intent model; the relational
  fields reshaped from data the engine already computes: the on-* pairings, the
  floor contract `against`/`min`/`ratio`, and the per-mode resolution). The point:
  *contract-true* metadata that regenerates every build, vs the field's hand-authored
  metadata that rots. `tokens.json` stays DTCG-pure (no non-standard sibling keys);
  the sidecar is the natural input for the planned MCP server + theming playground.
  `avoid_when` correctly redirects (e.g. `foreground.interactive` → "use
  foreground.danger for destructive"). Also fixed a `$description` redundancy bug
  ("…band — Mid-Tone"). `$description` ("what it is") and `meaning` ("what it
  signifies / is for") are distinct — e.g. `text.danger` → "Destructive / error
  text." vs "Destructive / error signalling." A refinement pass made state variants
  informative ("…on pointer hover") and differentiated the neutral-fill tiers.
  **Primitive tier added** (planned-for, not assumed away): every primitive
  (colour ramps, white/black, alpha, opacity, dimension grid, motion) gets a
  simplified set — `$description`, `meaning`, colour-scale **`intent`** (the
  Univers/NB contrast-role of each ramp step, from its band — e.g. 500 = "the
  dual-side AA pivot", anchor steps flagged), `tier`, `consume` (private vs
  consumable per family), and **`aliased_by`**, the reverse index of *which tokens
  resolve to it*. `aliased_by` makes the sidecar a bidirectional graph for impact
  analysis across all families (e.g. `dimension.8` ← `radius.md` + `space.100`;
  `color.accent.600` ← the interactive/link roles) — and it **cannot drift**: it's
  recomputed from the token tree on every build (authoritative at build time, never
  hand-maintained), and re-aliasing in this engine is a recompute, not a manual
  edit. Sidecar now `{ semantic, primitives }` (~89 + ~194–233 entries/brand).
- **Contrast is validated against the floor surface, not the pure extreme.**
  Saturated, contract-bearing foregrounds (action + states, vivid semantic text,
  secondary/tertiary text) clear
  their ratio against the most-tinted supported surface — light/hc-light →
  `neutral.50` (a step off white), dark/hc-dark → `neutral.950` (a step off
  black) — not pure white/black. Pure white is the *most forgiving* light
  background; a colour that only just passes there breaks the moment it sits on a
  `neutral.50` card. Validating against the floor builds in headroom so the
  colour holds across the elevation range, and is symmetric with the dark side
  (which already used `neutral.950`). Without it, a saturated colour that only
  clears 4.5:1 on pure white drops below AA the moment it sits on a `neutral.50`
  card. *Rationale:* user direction — "actions need to meet contrast on surfaces
  that sit on top of white, not just pure white; otherwise it breaks with other
  light neutrals."
- **The primary surface — and therefore the floor — is configurable.** A brand
  can declare a non-white/black page surface per mode via `surfaces` (base =
  `white` | `black` | a neutral step); the contrast floor moves with it (a
  tinted base defaults its floor one step further toward mid), and the engine
  **flags a non-default surface in notes for confirmation**. Defaults reproduce
  the white/`neutral.950` behaviour exactly, so brands that don't set it are
  unaffected. Proof: aurora declares its light page as `neutral.50`, the floor
  auto-moves to `neutral.100`, and `foreground.interactive.default` resolves to `accent.600`
  (4.95:1 on the tinted page) — two steps off the naive white-only pick.
  *Rationale:* user direction — "we may need to allow a user to confirm the
  primary surface colour that's not white, and that would change the floor."
- **Disabled is a selectable strategy; default is contrast-preserving.** A
  `disabledStrategy` input chooses `accessible` (default — disabled text/icon/
  border clears `disabledMin`, default **3:1**, on the floor; escalates to 4.5:1
  in HC) or `conventional` (intentionally sub-AA, leaning on the WCAG 1.4.3/1.4.11
  inactive-component exemption). `disabledMin` is tunable per engagement. Disabled
  *fills* stay a muted neutral (non-text, uncontracted) under both. Decided
  against a 12-system field survey: **0/12 meet 4.5:1 on disabled text**, only
  Primer (~3.45) / USWDS / Tailwind-opacity-50 (~3.5) clear ~3:1, and **none ship
  a selectable accessible-vs-conventional toggle** — so this is a genuine
  differentiator and matches the usability literature (NN/g, Adam Silver, Adrian
  Roselli, GOV.UK: *exempt ≠ unreadable*). Mechanism is flat resolved values, not
  opacity — opacity can't guarantee a floor (it stacks and is non-deterministic
  over colored fills) and would break the engine's computed-contract model.
  Reconciles the KB (`31-color-systems §3`), which already prescribed shipping
  both `inactive` (preserved) and `disabled` (exempt) and defaulting to the
  former — the engine just hadn't implemented it. *Rationale:* user decision after
  research — "an option where disabled just barely meets contrast minimums," as a
  user selection.
- **Status palettes are engine-supplied; danger is carved (white-label).** A
  brand supplies primary + neutral; the engine synthesises success/warning from
  canonical hues. If the primary is in red territory the brand red *is* the
  danger red (NB); otherwise the engine carves a dedicated danger red the brand
  never specified (aurora). Proven by running a second, non-red brand end-to-end.
  *Rationale:* status-from-anchors only worked because NB happened to supply
  them; a real white-label brand won't, and `danger == primary` for a red brand
  is a coincidence that breaks for everyone else (review finding).
- **Open brand-palette set + action decoupled from brand.** The white-label
  input takes `primary` + `neutral` + an arbitrary `brandColors[]` (secondary /
  tertiary / accent — any number), and `action` is now a FIRST-CLASS semantic
  role mapped independently of `brand`. Many brands' hero colour is a poor or
  reserved interactive colour, so `actionPalette` points action wherever the
  brand needs; it defaults to `primary` but the engine **emits a note flagging
  the decision** so it's confirmed, never silently assumed. Proven on aurora: a
  violet hero brand whose `foreground.interactive.default` resolves to a separate azure
  `accent.500`, while NB keeps `action = brand` (red) by design. *Rationale:*
  user direction — "action is not always the primary brand colour; needs
  flexibility built in, and the system should confirm which colour drives
  actions."
- **Two emit profiles, one engine.** `nbds.*`/rgb for the NB regression
  (byte-comparable to real NB) and `prism.*`/hex for product output
  (DTCG-aligned, Style-Dictionary-ingestible). Resolves the namespace + value-format
  review notes without losing NB comparability.
- **NB's per-step hue kinks are NOT reproduced, by design.** Per-step hue drift
  would be a brand input the schema deliberately resists ("resist the seventh").
  The `amber.600`/`red.300` outliers characterise NB's hand-authoring; they are
  not an engine gap (review finding — reframed from an earlier "opt-in feature").
- **Dimension axis mirrors the color architecture: primitives + semantic
  aliases.** A primitive `dimension` grid (4px: 0,1,2,4,6,8,…,128) with `space`,
  `radius`, and component `size` tokens aliasing into it — the same shape as
  color ramps + semantic roles. Reproduces our chosen targets **exactly** (23/23)
  and aurora runs a *different* form factor (compact / scale 2) through the same
  code. Integer px, so the bar is exact equality, not perceptual ΔE.
- **Naming taxonomy POV — numbered-multiplier space, t-shirt only at the
  component layer** (knowledge-base 02/22/24; matches the user's preference and
  the Prism2 house standard). The reasoning, pressure-tested rather than copied
  from NB (which is a *fidelity test*, not the taxonomy authority):
  - **Space** is a numbered-multiplier scale at the *reference* tier:
    `space.100`=1×, `.200`=2× … on an **8px rhythm** (`space.100`=8px). The
    number means "n× base" *invariantly across brands* — the white-label-honest
    encoding the KB calls for. NB ships a legacy t-shirt ramp (`4xs…3xl`), which
    the KB explicitly warns against (t-shirt breaks past ~7 steps); we
    deliberately did **not** follow it. So SPACE validates against **Prism2**
    (16/16), the system whose taxonomy we adopted; radius — t-shirt in both
    systems — still validates against **NB** (5/5).
  - **Two bases, by design:** a 4px *fine grid* backs radius/borders; an 8px
    *space rhythm* backs spacing. Prism2 proves this split (fine 2/4/6 for
    corners, 8-step rhythm for layout).
  - **Density moved to the component tier.** A numbered scale is already
    near-primitive, so remapping `space.400` by density is murky. Instead the
    numbered scale is density-free, and `density` drives the **component `size`**
    layer: each t-shirt size (`xs…xl`) is a *contract* binding a control height
    **and** paired padding from the shared scales, so a `md` button/input/select
    agree. `compact` resolves `size.md` to smaller metrics while the *name*
    stays `md` (name-stable, value-shifts). This is Curtis's three tiers made
    literal: reference (numbered) → component (t-shirt) → (radius, bounded
    semantic).

---

## Open items / next steps (roughly prioritized)

**The token layer is complete; the next phase is the E2E pipeline (`07-e2e-journey.md`).**
The goal is a designer↔developer↔agent workflow ending in production-ready UI —
i.e. completing layers 2–4 of the practice's four-layer AI stack (the engine is
layer 1). Agreed build sequence (owner confirmed "safest path to a working plugin"):

- **★ NOW — E2E integration (`07` §11).** The direction shifted from "build the next
  adapter" to "connect the tools we already own through the `design.md` contract." Two
  active tracks:
  - **Here (prism3-tokens): the Wendy's spike — ✅ DONE, then PROMOTED to the shipped CLI (2026-07-01).**
    A standard-`design.md` reader (`engine/standard-design-md.ts`) + colour-role classifier
    (`engine/classify-colors.ts`, the one genuinely new parser piece), run against a **real
    `brand-skills` Wendy's `design.md`** (`examples/wendys.design.md`, 24 colours + 25 type tokens)
    → a full token system (`out/wendys.tokens.json` + `.ai.json`) + a **full-parity fidelity report**
    (`engine/out/wendys-fidelity-report.md`). **Results:** anchor reproduced **ΔE00 0.00**
    (exact-anchor preservation), 627/627 aliases, 248/248 contrasts, `error`→`danger` carved as a
    distinct palette; primary/secondary/tertiary pin exactly; neutral ramp fits the 11 observed greys at
    mean ΔE00 <1.5 (derived hue/chroma); status hues pinned (L placed by the ramp); aggregate colour ΔE00
    **2.02** across 24 swatches — the ramp/status/neutral divergence is the point (Decision A). Every
    predicted alignment finding confirmed: type roles `mega-*`→`display`/`button-*`→`label`;
    `error`≡`primary-dark`, `info`≡`secondary` (observed dups the engine doesn't propagate); the file's
    stated `primary`-on-white "~4.6:1" is stale for its own `#C8102E` (engine measures **5.88:1**). The
    optional **`x-prism3` block** (§11.4) round-trips: the reader maps its levers → `BrandInput`
    (radiusScale/typeScale/density/motionTempo/actionPalette/iconContrast/surfaces/gradients); Wendy's
    carries no block → engine defaults (the plain-spec guarantee). **Promotion:** the reader + classifier
    are no longer spike-only — `cli.ts` now **auto-detects the dialect** (a top-level flat `colors:` map ⇒
    standard; else engine-native) and runs either through the same core, with `--fidelity` writing the
    report; `standardToBrandInput` (classify + families + x-prism3) and `fidelity.ts` (report builder)
    are the shared modules. The bespoke `spike-wendys.ts` runner was retired; its self-verify folded into
    `test.ts` (189 → **202**). Run: `npx tsx Prism3/engine/cli.ts Prism3/examples/wendys.design.md --fidelity`.
    This closes the round-trip: brand-skills emits `x-prism3`, the shipped engine CLI consumes it.
  - **brand-skills alignment — ✅ DONE (2026-07-01, this thread).** Implemented in `brand-skills`
    (branch `claude/prism3-e2e-integration-8fwul4`), across its three layers (schema → SKILL → CLI):
    (1) **type-role rename** — recommended typography names moved to the engine's vocabulary
    (`display/title/body/label/caption/eyebrow/code`), retiring `headline-*`; custom names still
    allowed + SKILL mapping guidance (`mega-*`→`display-*`, `button-*`→`label-*`). (2) **colour-role
    contract** — documented (no rename): the classifier convention + `error`→`danger` bridge (keep
    emitting `error`). (3) **optional `x-prism3:` block** — hand-authored in `surfaces.md`, passed
    through verbatim by `refresh-design` to a top-level `x-prism3` key; scoring-neutral (no new
    `.brand/` file, no manifest/health impact). Spec: `brand-skills/docs/superpowers/specs/
    2026-07-01-prism3-engine-alignment-design.md`. Tests 159 → 162 green; no version bump.
    **Token Press provisioning deferred** (private, different-org, export-stage — downstream).
- **A. `design.md` + CLI adapter — ✅ DONE (2026-07-01).** A brand brief
  (`design.md` frontmatter → `BrandInput`, prose for agent latitude) compiled by
  the CLI over the pure core. Proves the core-as-a-library and the authoring
  on-ramp in the easy Node environment before the Figma sandbox. No LLM required to
  use it; agent-draftable. **As built:** `engine/design-md.ts` (a dependency-free
  block-style YAML-subset parser — indentation nesting + block sequences + flow
  `{}`/`[]` leaves + scalar typing + frontmatter/prose split) → `BrandInput`,
  validated against `theme-schema.json`; `engine/cli.ts` (`tsx cli.ts <design.md>
  [--out <dir>]`) parses → validates → `brandTheme` → `emitTheme`, exiting non-zero
  on a schema violation, a broken alias, or a failed contrast contract.
  `emit-dtcg.ts` was refactored to **export the reusable core** (`buildTree` /
  `emitTheme` / `validateBrandInput`) behind an `isMain` guard, and now compiles
  both example brands **from** `examples/*.design.md` (single source of truth).
  `examples/aurora.design.md` is the **faithfulness** test — it reproduces
  `out/aurora.tokens.json` **byte-for-byte** (verified: empty `git diff`; the CLI
  path is byte-identical to the regression path); `examples/harbor.design.md` is
  the net-new **coverage** brand (deep-teal, `action = primary`, warm-neutral greys
  + tinted page, measured status, comfortable/sharp, system stack + compact scale,
  gradients off), validated behaviourally (schema-conforms, 622/622 aliases resolve,
  248/248 contrasts hold). Both are wired into `test.ts` (202/202). Full spec + lever
  table in `07-e2e-journey.md` §6. NOTE: the "~30 line parser" estimate in the
  locked plan was optimistic given the nested typography/gradients surface — the
  block-style parser is ~200 lines, still dependency-free and scoped to `BrandInput`.
- **★ NEXT — Theming interfaces (`08-theming-interfaces`, 2026-07-01).** The customization
  surfaces are now a committed shape, not a direction note. Locked: (1) a **NEW** Prism3 Figma
  plugin built on the engine core (not an evolution of the existing theming plugin — the core is
  reused, the plugin is a fresh materialization + control shell); (2) **near-continuity** between
  the Figma plugin and the web playground — one shared **lever manifest** + live-preview model,
  not two hand-maintained UIs. Revised build sequence (`08` §7):
  - **B0. Lever manifest — ✅ DONE (2026-07-01).** `engine/levers.ts` → `schema/lever-manifest.json`:
    the shared-control contract, **35 levers** across 7 groups (20 `advanced`), each with
    group/label/description/control (`color`/`slider`/`enum`/`toggle`/`list`/`palette-ref`/`object`)
    + defaults + UI ranges/enum options. The plugin, playground, and MCP tool schema all render from
    it — the *presentation* half that `theme-schema.json` (validation half) lacks. **Can't drift:**
    `test.ts` asserts every key resolves in the schema, every enum matches the schema enum (as a set),
    every default matches, and the committed JSON is up to date (208/208). **Pure — no `node:*`**
    (the plugin/playground/MCP bundle it into a browser/Figma sandbox); the write step is the
    `emit-levers.ts` I/O shell. `id` is host-supplied identity, not a lever; the gate asserts every
    *other* required field is a lever. Run `npx tsx Prism3/engine/emit-levers.ts`.
  - **B1a. Preview spec — ✅ DONE (2026-07-01).** `engine/preview.ts` → `schema/preview-spec.json`:
    a portable, data-only description of **8 sample components / 22 variants** (button + states,
    secondary button, input, card, alert per semantic, nav item, badge, type specimen), each binding
    UI props to root-relative semantic token paths + the contrast pairs to overlay (52 token refs).
    The plugin and playground render the SAME live preview from it (extracts the binding knowledge
    latent in `visualize.ts`). **Pure — no `node:*`** (write step = `emit-preview.ts`). **Gates
    (`test.ts`):** every referenced token path resolves to a real leaf in the emitted token tree
    (binding-validity), contract mins are sane, **no contract over-claims the engine guarantee**
    (declared min ≤ the engine's min for that role+surface — the PR #20 review hardening), committed
    JSON current (215/215). Run `npx tsx Prism3/engine/emit-preview.ts`.
  - **B1b. Resolved-preview projection — ✅ DONE (2026-07-01).** `engine/resolve-preview.ts`:
    `resolvePreview(theme)` — the runtime read-model the surfaces consume reactively. Projects the
    preview spec to **concrete colours per mode** (every referenced role → its hex in light/dark/
    hc-light/hc-dark) + **live contrast results** (each declared contract computed on the REAL
    resolved fg-on-bg, per mode, with pass/fail — the contrast overlay, `04`'s differentiator).
    **Pure — no `node:*`**: resolves via `resolveAllModes` (which now carries each role's `hex`,
    a small additive enrichment to `modes.ts`) + the pure spec, not `buildTree`. **Gate:** every
    referenced role resolves to a hex in every mode, and **every declared a11y contract actually
    holds on the resolved colours in all 4 modes** — the automated version of the PR #20 manual
    contrast check. 215/215; `out/*` unchanged (the `hex` field is emit-invisible). It's a
    per-live-theme read-model, not a committed artifact.
  - **B1 dogfood — ✅ DONE (2026-07-02, PR #22).** `engine/visualize.ts` now renders the shared
    preview model in-repo before the host renderers exist: for each brand it resolves `previewSpec`
    (B1a) + `resolvePreview(theme)` (B1b) and paints every component/variant as a styled chip —
    bg/text/border from the resolved role colours, radius/padding from the token tree, type from the
    resolved composite — with the per-mode L/D/HL/HD contrast overlay driven by the same `byMode.pass`
    results. Proves the "define once, render everywhere" model composes a real UI + live overlay from
    one source, de-risking the leap to a separate plugin/playground repo. **Additive, output-scoped:**
    only `visualize.ts` (+ regenerated `out/tokens.html`) changed; pure core untouched, `out/*.tokens.json`
    byte-identical, 215/215. **← next: B1c-proper — the host renderers (DOM playground + Figma-node
    plugin) that paint from the same `resolvePreview` output; land with B2/B3.**
  - **B1c. Host renderers** — the DOM (playground) + Figma-node (plugin) renderers that paint the
    components from `resolvePreview`'s output. The binding + overlay logic is now proven via the B1
    dogfood above; B1c ports it to the two live hosts. Land with B2/B3.
  - **B2. New Figma plugin shell** — bundles the core, renders knobs from the manifest,
    materialises via `$extensions.prism3.figma` (`08` §2/§5).
  - **B3. Web playground** — same manifest + preview, DOM/CSS-var host.
  - **Parallel validation:** Style Dictionary consumption (owner-driven) + **Figma-MCP import** of
    `out/*.tokens.json` (validates the Figma directives, de-risks plugin materialization, and
    unblocks Token Press testing — highest-value near-term).
- **C. MCP adapter** over the core — "an agent themes Prism3" as a callable surface
  (the KB's MCP-first payoff). Its tool schema derives from the B0 lever manifest.
- **D. (later) Component library** — components-as-data → Web Components + React +
  Storybook + `.ai.json` + Figma Code Connect (layers 2–3). In scope eventually;
  mapped now so upstream choices don't foreclose it. Heavy per-component research
  already in the KB (UIC series). **Architecture now locked in
  `14-component-layer.md`** (2026-07-03): definitions seeded from the KB's ~40
  component briefs, token-name-bound, deterministically materialized to Figma via
  the B2 plugin (write leg) with an extraction-diff regression (verify leg;
  Specs CLI's seat). Build sequence in `14` §6 — starts with the schema + 3
  components when this activates.

Parked, owner-flagged: **light-grey surface value tuning** — done visually once real
UI layouts exist, not against swatches.

Older backlog (still valid, lower priority than the pipeline above):

1. **"Beyond color" is COMPLETE — see `05-token-coverage-roadmap.md`.** Every token
   category NB + Prism2 ship is now generated: colour + the dimension axis
   (grid/space/radius/sizes), **typography** (the headline font-swap lever +
   composites + fluid), **shadow/elevation** (mode-aware), **motion**
   (`motionPersonality` lever), **layout/breakpoints**, the quick wins
   (**border-width**, **focus** ring dims, **icon 3:1 toggle**), and (opt-in)
   **gradients** (DTCG composite, ramp-aliased stops, OKLCH + sRGB pre-sample,
   Figma Paint Style, worst-case-stop contrast). What's left is plumbing, not new
   categories. Component sizing is still a prototype — values are sensible
   defaults, not yet validated against a real component set; revisit when the
   component layer is real.
2. **Prove downstream consumption.** Feed `out/*.tokens.json` through Style
   Dictionary and/or the Figma MCP — confirm a real tool ingests it and the four
   modes map to Figma variable modes. Turns "generation" into "pipeline".
3. **Round-trip the raw-figma format.** Emit the second parallel format
   (`raw-figma/`) the repo keeps, preserving `variableId` linkage (root `CLAUDE.md`).
4. **Figma binding constraints.** Verify variable/mode constraints via the Figma
   MCP (still outstanding from the architecture review).
5. **Tune status-hue defaults against a reference set** (Tailwind/Radix/Material/
   USWDS + NB's measured green/amber). Current canonical hues (success 145,
   warning 75, danger 27) are plausible but not evidence-derived; functionally
   safe (placed by luminance) but worth grounding. Overrides already wired via
   `BrandInput.status` / schema `statusColors`.
6. **Semantic-layer decision backlog (`03-open-questions.md`).** Items 1–4
   RESOLVED and shipped — elevation/surface naming (ordinal ladder, `overlay`
   dropped), scrim + opacity/alpha primitives, disabled strategy (accessible
   default, 3:1 floor), white/black policy. Remaining: **Item 5** (icon 3:1
   toggle — parked by decision; icons currently mirror text, one-line floor swap
   when wanted). Next non-backlog frontiers: shadows/effects axis (deferred from
   Item 1), typography + motion (item 1 above), downstream consumption (item 2).
7. **Theming playground / dashboard (`04-theming-playground.md`).** Direction
   note only — a live theming dashboard that reskins real components + composed
   pages as tokens change (web app lead; Figma plugin as a second surface). The
   interactive successor to `visualize.ts`; differentiator is a live
   contrast-contract overlay. Not slated for build; documented for direction.
8. **Figma round-trip (code → Figma) (`05-token-coverage-roadmap.md` →
   *Cross-cutting*).** Analysis recorded, build deferred. Figma variables are
   only `COLOR`/`FLOAT`/`STRING` + scopes — no composite type — so typography
   exports as atoms (→ a Text Style binds them) and shadow/transition have **no**
   variable representation (Effect Style / code-only). Pipeline clarified: raw
   Figma → **Adam's custom plugin** → SD-ready DTCG (SD has *not* run on the
   example packages yet). Backlog: a three-tier disposition contract
   (`variable`/`style-part`/`code-only` + scope) as the cheap now-step, then an
   `emit-figma.ts` writer + style manifest + companion plugin. Open decision —
   update an existing template (preserve `VariableID`s) vs build from scratch —
   tracked as `03-open-questions` Item 9. KB POV write-up also backlogged.
   **Verified research** now lives in the knowledge-base repo, run
   `_research/_inbound/2026-06-28-figma-variables-styles-roundtrip` (four
   primary-source agents): the variable type ceiling + 8-field typography binding
   surface, **lineHeight/letterSpacing bind as px only** (unitless `1.5` → 1.5px),
   **text-decoration/case unbindable** (links = separate Text Styles), shadow
   *numerics* bind, Figma Motion (Config 2026) adds timing/easing variables, REST
   Variables API is **Enterprise-only** (styles can only be created via the Plugin
   API). **Materialization decision (locked for the typography build):** canonical
   value in `$value`; a machine-readable directive in `$extensions.prism3.figma`
   for the exporter (e.g. lineHeight `px-from-ratio`); intent *echoed* into
   `.ai.json` as derived narrative — the exporter reads `$extensions` data, never
   the prose sidecar. Generalises to letter-spacing, fluid sizes, etc.
   (`05-token-coverage-roadmap` → Typography + *Cross-cutting: Figma round-trip*).

---

## Constraints to respect (from root CLAUDE.md)

- The base repo is design-tokens-only (JSON, no build). The `Prism3/engine/`
  tool is a new, self-contained addition — don't impose a build system on the
  token data.
- When editing existing brand tokens, change **both** the `raw-figma/` and
  `tokens/` (DTCG) copies and keep `variableId` linkage intact. (The engine
  currently emits a fresh DTCG tree under `engine/out/`; it does not yet write
  back into the brand token dirs.)
- Preserve namespaces (`nbds.*` for NB, `nbds.pds.*` for Prism2). Validate by
  JSON parse + every `{…}` alias resolving.
