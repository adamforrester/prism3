## (2026-10-07) — Engine: body/xs, a 12px body rung for secondary text and metadata (#2266, PR 1)

**Status:** engine and the consume skill. ENGINE minor (change note). CONTRACT 14.2.0 → 14.3.0 (MINOR). No component
changes: PR 2 (field sizing) is the first to bind body/xs. Owner decisions: Q78 A (add body/xs) and Q101 A (the design
note's §9, item 9: the description as drafted), both recorded on #2266.

### What changed

- **The rung.** `body` gains `xs` = 12px ahead of `sm`/`md`/`lg` (`theme.ts` `TYPE_VARIANTS`). It is body, so it
  takes body's line height (normal, 1.5: an 18px box), tracking (normal, 0), family role and weight and variant set,
  with no code of its own. On every brand it carries exactly what body.sm carries: four composites (default, strong,
  each with a link) on aurora, harbor, nb and wendys, and eight on prism3, which ships italics. 12 is on every brand's
  size ladder. Body is reading text, so it is exempt from the type-scale shift and from size overrides, as before.
- **Its words.** The owner's sentence, verbatim, is every body.xs composite's DTCG `$description` and its `.ai.json`
  `$description`: "Smallest body text, 12px. Secondary text and metadata only, never running text." (one constant,
  `BODY_XS_DESCRIPTION`). That replaces the generated description for this rung only, because the generated one is
  built from the group's purpose, and body's is running text. The `.ai.json` `when_to_use` and `avoid_when` say
  when to reach for caption.lg (also 12px) instead. The Figma text styles end "for secondary text and metadata
  only." where body's end "for running text."
- **The consume skill** says how to pick between `type.body.xs.*` and `type.caption.lg.*`: body xs inside body text,
  on its rhythm; caption lg for small print that stands alone.
- **The contract** gains `type.body.xs.default` and `type.body.xs.default-link`. Its other weights are
  brand-dependent, as body.sm's are, because some corpus brand ships a single body weight. The design note's §7
  said six guaranteed names; it is two. That claim was read off body.sm's paths without checking which were
  brand-dependent.

### Tests and mutations

- **`test.ts`, a new body/xs block.** It reads the COMMITTED emissions of all five brands. Each body.xs composite must:
  - bind the 12 step, the normal line-height role (followed to its 1.5), normal tracking and the body family;
  - match its body.sm twin's weight, style and decoration;
  - carry the owner's sentence, typed as a literal (never imported) in both descriptions;
  - send standalone small print to caption.lg in `avoid_when`.

  It also checks that the Figma text styles end with the metadata purpose.
- **The NB text-style fixture test** compared the emitted styles to NB's own file, which predates body/xs. The four
  body/xs styles are now a named list of engine additions, each required to still be emitted (a stale entry fails).
  Since they have no fixture twin, each is held to its body/sm twin instead: identical bindings except the size,
  which must bind `font/size/12`.

- **Plugin tests that pin prism3's text-style count as a literal** move from 63 to 71, and its style total from 84
  to 92 (`test-write-preflight.ts`, `test-style-guide.ts`): eight body/xs styles. They are literals on purpose, so
  a plan that moves fails by name, and this one moved by design.

Each mutation ran from a `wip:` commit and was restored with `git checkout --`:

| Arm | ✗ line |
|---|---|
| (a) the `xs` rung removed | `❌ #2266 body/xs: … (0 composites; 9: aurora: no type.body.xs · harbor: no type.body.xs · …)`, alongside the contract's own `❌ #1296/#1718 prism3 emits every guaranteed contract path (568/570; missing type.body.xs.default, type.body.xs.default-link)`, both figma text-style checks (`STALE addition body/xs/…`, `not emitted`) and the consume skill's sidecar check (6 in all) |
| (b) the DTCG `$description` back to the generated one | `❌ #2266 body/xs: … (24 composites; 24: aurora body.xs.default: $description "body xs default — 12px Inter, normal line-height, default weight, normal tracking" · …)` (1) |
| (c) the `.ai.json` `$description` back to the group's | `❌ #2266 body/xs: … (24: aurora body.xs.default: .ai.json $description "Running text / default UI copy." · …)` (1) |
| (d) the `.ai.json` `when_to_use`/`avoid_when` back to the group's | `❌ #2266 body/xs: … (12: aurora body.xs.default: .ai.json avoid_when does not send standalone small print to caption.lg ("Do not use for headings …") · …)` (1) |
| (e) the Figma purpose back to "running text" | `❌ #2266 body/xs: … (20: aurora body/xs/default: Figma description "body xs default — 12px Inter, normal line-height, for running text." · …)` (1) |

### A trap for whoever re-verifies this

The contract's guaranteed set is the INTERSECTION over its corpus of ten brands, not the five example brands. So
"body.sm carries six names" (read off the baseline's path list) and "body.sm guarantees six" are different claims:
four of its six are brand-dependent. Read `token-contract.ts --check`'s ADDED lines, never the baseline's list.
