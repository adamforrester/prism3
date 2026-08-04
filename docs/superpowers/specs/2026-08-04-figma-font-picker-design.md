# Figma-aware font selection in the shared UI

**Date:** 2026-08-04 · **Branch:** `feat/plugin-font-picker` · **Lane:** plugin (+ shared web UI)
**Related:** #113 (research — font availability + name resolution across surfaces), #237 (typography write)

---

## 1. The problem

The typeface library (Foundations → Primitives) authors a font family as a **free-text string**
(`web/src/main.ts` — the "Font family name" input + "Add face" button). The UI is honest about the
consequence, in its own copy: *"The name passes through to CSS and Figma untouched — there is no
validation or auto-correct, so a near-miss silently falls back."* It then sends the user to macOS Font
Book or Windows Settings to hand-copy an exact string.

There **is** already an availability signal, and it is not the thing that is missing. `fontAvailable()`
canvas-measures a probe string against `monospace`/`sans-serif`/`serif`, and the library table renders
the verdict as an "On this device" column (`✓ Installed` / `⚠ Not installed`). Three limits:

1. **It verifies, it does not discover.** It answers *"is this exact string installed?"* only after the
   string is typed correctly. It cannot answer *"what may I choose?"*
2. **A typo and a genuinely-absent font are indistinguishable.** Both render `⚠ Not installed`, and the
   corrective action for each is the opposite of the other.
3. **Inside Figma it measures the wrong set.** The probe runs in the iframe, so it reports the
   *browser/OS* fonts, not Figma's font set (which includes Figma-hosted families). It is therefore
   answering a different question from the one that decides whether the write succeeds.

**Where the cost lands.** `applyTextStylePlan` treats an unloadable font as skip-with-warning — a
deliberate #237 decision, correctly implemented. So a one-character typo produces a Figma file where all
50 font *variables* write and a **silent subset of the 38 Text Styles simply do not exist**. Partial
success, reported only after the fact.

Meanwhile the plugin main thread can call `figma.listAvailableFontsAsync()` and knows the real list
exactly. The UI upstream has never asked. #113 already records this asymmetry — *"Figma plugin: uses
Figma's own font list — no loading problem"* — as a captured option with no decision attached.

## 2. Owner decisions taken in this session

- **Keep the escape hatch.** A picker is the primary path, but authoring a font that is *not* installed
  on this machine stays possible. The brand input is a portable **specification** that travels to CSS,
  DTCG and MCP; hard-blocking on local availability would let one laptop's font situation constrain a
  brand.
- **One native control, not two.** `<input list>` + `<datalist>` rather than a picker beside a text
  field, or a hand-rolled combobox. It is type-ahead filtered over a large list *and* accepts a
  free-typed string, which is precisely the "picker + escape hatch" pair in a single affordance.
- **Accepted cost:** `<datalist>`'s dropdown is browser chrome and cannot be themed to match the
  dashboard. Accepted knowingly, weighed against what it buys: the browser's own keyboard and
  screen-reader behavior, rather than a custom `role="combobox"` surface (`aria-expanded`,
  `aria-activedescendant`, arrow-key management) that this project would have to get right by hand.
- **Prose may change.** The existing "find the exact name in Font Book" guidance is *wrong advice* when
  a real list is present, so it is conditional rather than left to contradict the UI.

## 3. Architecture

One new message in each direction, following the existing bridge pattern exactly.

```
UI iframe (shared web/src)              Main thread (sandbox)
──────────────────────────              ─────────────────────
onHostMessage() attaches
  → posts 'ui-ready'  ──────────────────→  seedFromFile() + restoreToUi()
                                            + NEW: void sendFonts()
                                                listFamilies(figma)
                                                → unique families, sorted
  figmaFonts cached  ←──────────────────  postToUi({type:'font-list', families})
  renderWorkspace()
```

Five deliberate choices:

**Rides on `ui-ready`, not a request.** The main thread already does two things on that cue; fonts
become the third. No request/response pair and no correlation id — the list is static for the session,
so a fire-once push is the whole requirement.

**Families only; styles dropped.** `listAvailableFontsAsync()` returns `{family, style}` pairs. The
input authors a *family*, so deduping to families cuts several thousand entries to ~1,000 strings and
keeps the payload honest about what it feeds. Per-style/weight validation is a separate concern
(§7).

**The list never persists and never enters `BrandInput`.** It is an environment fact about one machine
at one moment, not brand data. Leaking it into the brand input would send it to CSS/DTCG/MCP as though
it were a design decision, and would make `out/*` machine-dependent. This is the constraint least
acceptable to get wrong.

**Late arrival is a re-render, not new plumbing.** The UI caches the list module-level and calls the
existing `renderWorkspace()` — the same path every tab click takes. Before it arrives the cache is
empty and the input behaves as it does today.

**Failure is silence.** If the API throws, the main thread posts nothing. Empty cache → no `<datalist>`
→ today's behavior. The feature degrades to its own baseline, which is a working control.

## 4. Components

| File | Change |
|---|---|
| `plugin/src/messages.ts` | One `MainToUi` variant: `{ type: 'font-list'; families: string[] }`. `assertNever` makes an unhandled variant a compile error. |
| `plugin/src/list-fonts.ts` **(new, ~20 lines)** | `FontsApi` port + `listFamilies(api)`: dedupe to families, sort by `localeCompare`. |
| `plugin/src/main.ts` | `sendFonts()` beside `seedFromFile()`/`restoreToUi()`, called on `ui-ready`, try/caught to post nothing on failure. |
| `web/src/write-adapter.ts` | Widen `onHostMessage`'s union with `{ kind: 'font-list'; families: string[] }`; forward in `figmaCommit`. `webCommit` stays inert. |
| `web/src/main.ts` | `let figmaFonts: string[] = []` cache → `renderWorkspace()`; a `<datalist>` emitted only when non-empty, wired to the existing input via `list`/`id`; the two guidance notes made conditional. |

`list-fonts.ts` is its own file behind a narrow port — matching `write-styles.ts` and `persist-figma.ts`
— for one reason: **it is the only part with logic worth testing**, and a port makes it shim-testable
without a live Figma.

**Prose that changes**, because it would otherwise contradict the UI standing next to it:
- the "exact spelling matters / find it in Font Book" note — replaced, when a list is present, with copy
  describing what is then true.
- the `tf-note warn` "the dashboard loads no webfonts" note — a statement about the *web* host that
  reads as false inside Figma.

## 5. Error handling

Every failure mode lands on the same floor: today's behavior, a working text input. No new error state
is invented, because a correct fallback exists for all of them.

| Failure | Behavior | Rationale |
|---|---|---|
| `listAvailableFontsAsync()` throws | post nothing; no `<datalist>` | The control still works; a banner would report a degradation the user cannot act on. |
| Web host | `webCommit.onHostMessage` inert | The build-time swap means the web bundle carries none of this code. |
| List arrives after first render | cache → `renderWorkspace()` | Same path as any tab click. |
| List arrives before the tab is opened | cached, read on next render | Push-then-cache is order-independent. |
| Typed name absent from the list | accepted | The escape hatch — the reason for `<datalist>` over `<select>`. |
| Empty list returned | no `<datalist>` | Indistinguishable from failure; correct response is identical. |
| Family name with quotes / odd characters | `textContent`, never `innerHTML` | Font names are **external input**. The two guidance notes this spec edits use `innerHTML` for hand-authored prose; that is safe and stays, but no font name may travel that path. |

**Deliberate non-behavior:** the picker does **not** validate on commit. Rejecting an unlisted name
would convert the escape hatch back into a hard block, undoing §2.

## 6. Testing

**`plugin/test-list-fonts.ts`** (new; joins the five shim tests in `npm test -w @prism3/plugin`) drives
the real `listFamilies` against an in-memory `FontsApi`:

- duplicate families across many styles collapse to one entry — the actual behavior being bought, since
  Figma returns `{Inter, Regular}`, `{Inter, Bold}`, … and the input takes one family
- sorted, deterministic order
- an empty list yields `[]`, not a throw
- a rejecting API surfaces as a rejection the caller can catch

**Typecheck does real work here.** `tsconfig.main.json` has no `dom` lib and `tsconfig.ui.json` has no
plugin typings, so `document` in `list-fonts.ts` or `figma.*` in the UI path fails to compile — the
two-context split enforcing itself.

**Full gate sequence** (CLAUDE.md): `regen.ts --check`, `test.ts`, `mcp-test.ts`,
`token-contract.ts --check`, NB regression, both surface typechecks + builds, US-English (which scans
the *built bundle*, so new `web/src` prose is caught there), 0 `node:` builtins.

**The stated limit.** None of the above touches `figma.listAvailableFontsAsync()`. The shim proves the
dedupe/sort logic; it cannot prove the real API returns the shape coded against. That is exactly where
the `FONT_FAMILY`-scope bug on the sibling MCP branch lived — correct plans, untested payload. So this
requires a **live drive in Figma** before it is done: build, import, confirm real families appear and
filter, pick one, apply, verify Text Styles land unskipped.

## 7. Out of scope (follow-ups, not absorbed)

- **Per-style/weight validation** — Figma's list carries real styles per family, which would retire the
  hardcoded "common families → shipped weights" warning map in `web/src/main.ts`. Genuinely useful, and
  a different concern.
- **Web-side `queryLocalFonts()`** (#113's Local Font Access option) — Chromium-only and
  permission-gated; not committed to here.
- **The per-mode family override selects** — they pick from `ty.typefaces`, the brand's own library,
  which is a different question from "what exists on this machine."
