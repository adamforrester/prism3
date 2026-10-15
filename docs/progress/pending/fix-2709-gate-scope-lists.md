## (2026-10-15) — Gate scope lists name every def that qualifies, and an unlisted one fails by name (#2709, #973)

The component audit (#2706) found five hand-written scope lists that had fallen behind the registry. Each is a gate's memory of which defs it must see: if a listed def stops projecting the shape, the gate fails instead of reading clean. Defs off a list were still checked, but nothing would notice if they dropped out. The counts at `main` `0c66e5b0`:

| List | Listed | Qualifying |
|---|---|---|
| `lint-absolute-inset.ts` `MUST_COVER` | 7 | 21 inset parts |
| `lint-absolute-inset.ts` `MUST_CLEAR_STROKE` | 6 | 20 (Accordion's ring is drawn inside, with no `strokeInset`) |
| `lint-standalone-floor.ts` `MUST_PROJECT` | 26 | 41 projecting defs |
| `test.ts` `GAP_KEYS` | 12 | 15 (Password field, Accordion, Link) |
| `test.ts` `SH_DEFS` / `RO_PINNED` | 3 | 4 (Password field) |

The issue's table counted the Button and Icon button variants once each. The converse arms below counted each one separately, and they are listed one by one now.

**The fix has two parts.** First, every qualifying def is added to its list. Second, each list gets a converse arm: a def with the qualifying shape that is in neither the list nor a named exemption with a reason fails by name. The qualifying shape is read off the def, by each gate's own spelling of it: a declared `absolute` part with an `inset`, a successful projection, a `densitySpacing` key whose last segment ends in `gap`, a `status` axis with error, warning or success, a state axis with `read-only`. The lists stay authored and the registry stays the subject, so neither side is derived from the other (`docs/34`). The standalone-floor converse closes #973, which asked for exactly that arm.

**One exemption, with its reason.** Field message has a status axis but no state axis and no stroked edge, so there is no hover border for the #1782 status sweep to measure. It sits in `SH_EXEMPT`. Every newly covered def passed its gate as it stands, so nothing was filed.

**Mutations, each failing by name.** Each one removed one entry from a list, with the work committed first:

- `lint-absolute-inset.ts`, with `'tag.focusRing'` dropped from `MUST_COVER`: exit 1, `SCOPE NOT RECORDED: 'tag.focusRing' declares an absolute inset and is not in MUST_COVER.`
- `lint-absolute-inset.ts`, with `'radio-control.focusRing'` dropped from `MUST_CLEAR_STROKE` only: exit 1, `COMPENSATION NOT RECORDED: 'radio-control.focusRing' declares strokeInset 'ring-width' and is not in MUST_CLEAR_STROKE`.
- `lint-standalone-floor.ts`, with `'dialog'` dropped from `MUST_PROJECT`: exit 1, `SCOPE NOT RECORDED: 'dialog' projects today and is not in MUST_PROJECT.`
- `test.ts`, in one run: `link` dropped from `GAP_KEYS`, `password-field` dropped from `SH_DEFS` and from `RO_PINNED`, and Field message's `SH_EXEMPT` key renamed. That gave 3 failures, all three new arms, and no others: `the gap floor RECORDS every def whose density spacing names a gap (14 listed) — NOT IN GAP_KEYS: link`; `a11y(#1782, #2709): … NOT PINNED: field-message, password-field`; `a11y(#1710, #2709): every def with a read-only member is pinned in RO_PINNED — NOT PINNED: password-field`. Each arm reads only its own list, so one run shows every arm firing on its own entry.

The skill's gate table (`prism3-build-component` §7) now says each of these lists fails on an unlisted def, and it names the three `test.ts` lists, which it did not name before.
