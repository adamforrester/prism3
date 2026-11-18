## (2026-11-18) — The default type mode per breakpoint (#2935)

**What.** The owner decided (2026-11-18, A) that a breakpoint's frames use mobile type below 1024px and desktop type
from 1024px up. Nothing in the engine or Studio decided it before: `layout` and `type-sets` were two collections with
no stated pairing. Now one engine rule, `defaultTypeMode(floorPx)` in `theme-layout.ts`, decides it from the
breakpoint's floor alone, so it holds for two to seven breakpoints. Two surfaces read it: the Figma description of each
`breakpoint/<name>` variable (Q565 A put the guidance there; a Figma mode has no description of its own) and Studio's
Layout preview, beside each breakpoint's width. With static type there is no mobile or desktop mode, so neither says
one. Code is unchanged: CSS stays a fluid `clamp()`.

**Held for the owner.** The 2026-10-22 draft wording had a second clause: "a brand with no breakpoint at or above 1024
uses desktop for its widest breakpoint". The 2026-11-18 decision does not repeat it, so this PR does not build it. As
built, a two-breakpoint 0/768 brand gets `sm` mobile and `md` mobile, which differs from Q565 A's guidance for that
brand (`md` = desktop). The PR body asks which applies. The two description and preview strings are drafts.

**Measured.** `test.ts` #2935 TYPE MODE: on main the arms cannot pass (`defaultTypeMode` does not exist, and no
breakpoint description names a type mode). With the change they pass: seven floors typed literally (0 to 1920, across the
1023/1024 edge), the default five brand's descriptions (sm, md mobile; lg, xl, 2xl desktop), a 0/768 brand, and a
static-type brand naming none. Mutation: `<` → `<=` in `defaultTypeMode` fails "#2935 TYPE MODE: a 1024px breakpoint
defaults to desktop type". Regen moves only the five fluid brands' `out/figma/<brand>/layout.*.json` descriptions.
