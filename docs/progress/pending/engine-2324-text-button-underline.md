## (2026-10-08) — Buttons: a text button's label is always underlined, and "Text button hover" chooses its wash (#2324)

**Status:** engine, plugin and studio. ENGINE minor (change note). CONTRACT 14.4.0 → 14.5.0 (MINOR: three label link
paths join the guaranteed surface). Owner decisions, recorded on #2324 and, for the last two, on #2349:
- **Q110:** the label is always underlined, at rest and in every state; the underline is fixed, not a brand setting;
  a text button is never filled at rest; the default is color only.
- **The 2026-10-08 answers** (owner → Lane C's lead → Lane C, recorded by Lane C):
  - the setting is "Text button hover", options "Text & icon only" (the default) and "Fill";
  - Neutral follows the same rule, its ink walking 950 → 850 → 750;
  - a disabled text button stays underlined.
- **Q120 A:** every drafted string in this PR is approved as written.
- **Q121:** interactive states need not pass contrast, across the board (the rule, below).

Button, Destructive and Neutral alike (one `makeButton` factory). Icon Button has no text appearance.

### What changed

- **Label link styles, always minted.** `theme.ts` mints `-link` twins for the groups in `typography.links` (default
  body and caption). `label` is now in `TYPE_LINK_ALWAYS`, unioned in whatever the brand lists, so every brand ships
  `type.label.{sm,md,lg}.emphasis-link` (and `default-link` under `buttonLabelWeight: default`). In Figma they are
  `label/{sm,md,lg}/emphasis-link`, `textDecoration: UNDERLINE`.
  - Their DTCG description ends "underlined (a text button's label)", not the link wording, because a button label
    takes the button's own ink.
  - Their `.ai.json` `when_to_use` and `avoid_when` say so too.
  - The studio's Type page shows label's Link cell on and locked. `setLink` never writes `label`, so a list that is
    otherwise the default still reads as the default.
- **The button binds them at `appearance=text`.** The label's type key is per appearance now,
  `size.{size}.{appearance}.type`: text binds the `-link` twin, filled and outline the plain style, at every state.
  `applyButtonLayout`'s two label rewrites walk every appearance's key. "Button label weight: Default" keeps the
  underline tail: `emphasis-link` becomes `default-link`.
- **"Text button hover" (`buttonTextHover: 'text' | 'fill'`, default `text`).** The raw def's text appearance keys
  no wash any more. Under "Fill", `applyButtonLayout` copies the outline appearance's hover and pressed wash onto it.
  Those keys already carry the brand's outline method (`applyOutlineInteraction` runs first), so "Fill" reproduces
  the old text behavior on every brand and method, solid-tint and none included.
  - It's a lever in the Components tab, beside the other Button options.
  - It's threaded through `brand-def.ts`, `lint-lever-sweep`, the surface rows and the schema.
- **Neutral walks.** `modes.ts` built neutral's interactive ink with `walkable: false`, so its text, icon and border
  states were one color. Under the color-only default, a Neutral text button would have changed nothing on hover.
  Now it walks, and `walk()`'s L-01 reflection steps it inward (950 → 850 → 750 in light; from pure black or white
  in HC). So does its inverse-band twin, which has its own derivation (`invColumn`, where neutral passed no palette):
  025 → 100 → 200 on the dark band. On prism3, harbor and aurora every state lands at 9.7:1 or above in every mode on
  both grounds. Values only; no name moves.
  - **The general rule this rests on (owner Q121, recorded on #2349):** *"Interactive states not needing to pass
    contrast applies to all interactive states across the board. Ideally they do, but it's not necessary."* It
    covers every interactive state (hover, pressed, focus) on every button appearance and family, so it's a rule,
    not an exception list. #1387's register cites it in its header and keeps pinning each sub-4.5 cell at its exact
    ratio, so a state that moves still fails by name and gets looked at. Neutral's walk adds cells of the shape the
    register already held: its pressed ink on the inverse band's tinted pressed wash (solid-tint brands, light mode)
    at 4.09–4.11:1, reaching Neutral outline buttons there and text buttons under "Fill".

### The bug found on the way

Neutral's rest candidate carried no `num`, so the first `walkable: true` run hung forever: `fromNum + 50·k` is `NaN`,
and `NaN` is never out of range. The neutral rest now gets its step number: its own step, or for HC's pure
black/white the ramp step nearest it in luminance. `iText` refuses a walk from a rest with no number, by name,
rather than hang.

### A projector rule, made explicit

A STRUCTURE-ONLY projection (a coordinate that names no grid axis, which many tests use) can't fill
`size.{size}.{appearance}.type`. `resolveKey` now resolves a binding key's missing axis at that axis's declared prop
default, the component a consumer gets by leaving the prop unset. It reaches binding keys only. Paints and the
member's coordinate stay structure-only, and a real member, which gives every axis, never takes it. #1248's throw
still fires when an axis has no default.

### Tests and mutations

- **`test.ts`, a new #2324 block:**
  - **Per family:**
    - at each of the six Figma states, all 24 text members bind their size's underlined label;
    - the 288 filled and outline members never do;
    - by default no text member is filled at any state;
    - under "Fill", hover and pressed take `interactive.<family>.overlay.*` and no other state does.
  - **Neutral's text, icon and border inks** are three distinct colors in all 40 corpus modes.
  - **Every corpus brand mints the three label link styles,** and so does a brand with `typography.links: []`.
- **#1387's quiet-button sweep** runs under "Fill", so its cell counts and contrast arms measure what they always did.
  A new pass holds the default: no text hover or pressed member is filled on any corpus brand or NB master, at any
  outline method, and the pass counts the members it looked at.
- **Counts that move by design, each restated from first principles:**
  - #1223's skin, 24 → 22 (text's two wash keys left the def);
  - #1608's raw-button misses, 96 → 48 (outline's half of the owner's 96);
  - the pressed-text counter, 3 → 2 keys;
  - #1248's type-key grid, where the button family crosses size × appearance into 2 styles and `appearance` joins
    the authored axis vocabulary;
  - prism3's text styles in the plugin tests, 63 → 66 (and 84 → 87);
  - the NB fixture test's named engine additions, plus a twin check (each label link is its plain twin with the
    underline added, and only that);
  - test-roundtrip's style contract (`-link` at text).
- **#1646 (plugin)** holds "Fill" composing with solid-tint, its 48/48/96 kept.
- **#1812** lists `buttonTextHover="fill"` as tree-blind, in both halves.

Each mutation ran from a `wip:` commit and was restored with `git checkout --`:

| Arm | Fails by name |
|---|---|
| the underline dropped (text binds `emphasis`) | `#2324 button text rest: every member's label is underlined …` and the other five states, ×3 families, plus #1248's `DISCRIMINATES across 'appearance'` (21) |
| `label` out of `TYPE_LINK_ALWAYS` | `#1296/#1718 prism3 emits every guaranteed contract path (568/571; missing type.label.*.emphasis-link)`, the NB `STALE addition`, the twin check, and every Button binding resolving (24) |
| the "Fill" add-back removed | `#2324 button: under "Fill" the text appearance takes color/interactive/primary/overlay/{hover,pressed} …` ×3, and #1387's cells and fills (5) |
| neutral's inverse walk reverted (`invColumn` back to rest at every state) | `#2324 Neutral's interactive text, icon and border inks step … on the page and on the inverse band (… nb light inverse.text: #f6f7f7 #f6f7f7 #f6f7f7 …)`, and #1387's register reads the 22 held cells as stale |
| neutral back to `walkable: false` | `#2324 Neutral's interactive text, icon and border inks step on hover and pressed in every corpus mode (… nb light text: #0c0d0f #0c0d0f #0c0d0f …)` |

### Filed, not fixed here

#2335: the update dry run lists no named difference for a fill the plan drops. On the NB master, the hover and
pressed text members read `update` (their label's text style moved), but the cleared wash isn't listed.

### Traps for whoever re-verifies this

- **The inverse band has its own interactive-ink derivation.** The first version walked only the page side; the
  smoke suite's #576 edge check caught the inverse twin still flat. A check over `interactive.*` must also read
  `inverse.interactive.*`.

- **Two PRs took the next contract MINOR first:** #2312 (body/xs, 14.3.0) and #2338 (the tracking roles, 14.4.0).
  This PR moved to 14.5.0 and unions its NB text-style additions with #2312's. On each such merge, `git` auto-merges
  `token-contract.json` into a baseline holding both PRs' paths under the other's version. The fix is `main`'s
  baseline restored, then `--accept`, never the merged file.
- **A test that projects a button needs `appearance` only if it asserts a member;** a structure-only plan takes the
  prop default (see above).
