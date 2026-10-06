## (2026-10-06) — Type scale: only a pinned-size clash offers Release; other refusals show their own reason (#2194)

**STATUS: branch `ui/2194-type-scale-refusal`.** UI only: no engine change, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}}, `CONTRACT_VERSION` unchanged. One new sentence, owner-approved (Q55 B, 2026-10-06): the Compact refusal for the 16px title floor. Every other sentence shown was already approved (owner decision N3 A, 2026-10-06).

### What changed

`shapeBlocked(key, cur)` in `state/type-input.ts` returned a boolean, and Type's Type scale lever read every `true` as a pinned-size clash. It then showed "Some sizes you set would clash at this scale. Release them to switch." and "Release pinned sizes", whatever the engine had actually refused. On the shipped Aurora (Expressive, 16px smallest title, nothing pinned), the Compact chip showed that clash. The engine's real refusal was `titleFloor 16 is incompatible with typeScale 'compact'`, which releasing sizes can't fix, and there was nothing to release.

`shapeBlocked` now says why, or returns `null`:
- **`titleFloor`**: Compact with the 16px title floor. This is the engine's own rule, checked directly, as the 16px title floor chip already checks it.
- **`pinned`**: the switch is refused, and the same switch builds once every pinned size is released. Only this case is a clash. The trial release runs the real `releasePinnedSizes()`, not a list of its fields. It works on clones swapped into `brandState.typography` and `brandState.modeLevers`, and the original objects go back in `finally`. So a clash is exactly what the button fixes, and the two can't drift apart (independent review of #2225, which found that a re-listed copy could lose `typeSizes` or `sizeOverrides` and still pass).
- **`other`**: anything else, carrying the engine's message.

The lever shows the clash message and Release only for `pinned`. The title floor case disables the Compact chip with its own sentence, `S63.scaleTitleFloor`: "Compact can't be used while the title floor is 16px. Raise the title floor to use it." (owner decision Q55 B). It also shows that sentence as a warning line under the chips (hook `type-scale-refused`). `other` does the same with the engine's message, the text the global error bar already shows for an engine refusal (owner decision Q56 A).

The 16px title floor chip keeps its own approved B8b sentence, `S63.titleFloorCompact`, unchanged. The first cut of this PR reused B8b under Type scale too, but there "refuses 16px with it" points at a lever in another section (Scale limits), so the owner gave this place its own words.

### Owner decisions (2026-10-06)

- **Q55 B: the title floor refusal gets its own sentence.** "Compact can't be used while the title floor is 16px. Raise the title floor to use it." It shows on the disabled Compact chip and under the chips. The 16px title floor chip's B8b sentence is unchanged.
- **Q56 A: the `other` arm keeps the engine's message as written, for now.** No shipped brand reaches it. The two refusals a scale switch can hit are the title floor and the pinned clash, and a brand already refused for an unrelated reason fails every switch for that same reason. The message is the one the error bar already shows ("That change didn't apply: …"). Friendlier wording is filed as #2236.

### Gates and their independence

- **`test-type-input.ts`** reads the shipped Aurora's input as data (Expressive, the 16px floor, `pinnedSizeCount() === 0`), then expects `titleFloor` for Compact, never `pinned`. With prism3 and display md pinned at 48px, Expressive is `pinned` and Compact builds; once released, Expressive builds and the brand is back to its bytes. An invalid `captionFloor` (9) is `other`, carrying the engine's sentence, which the test types out. Then one arm per place a size can be pinned: brand-wide `sizes`, Dark's `typeSizes`, and a desktop `sizeOverrides` endpoint, each the only pin. Each must be `pinned`, must leave `brandState` byte-identical with the same objects, and must clear on Release.
- **`test-chrome.mjs`**, on both hosts:
  - Aurora loads with nothing pinned. Its Compact chip is disabled with the Q55 B sentence, typed in the test, which shows once under the chips, and there is no clash message and no Release. The B8b arm for the 16px title floor chip still types its own, unchanged sentence.
  - On prism3, display md set to 56px through the picker (allowed at Default, refused under Expressive) disables Expressive with the clash sentence and shows the message and Release. Release clears it.

  `open()` takes an optional `brand` for the Aurora arm (default `prism3`, so every other caller is unchanged).
- **Mutation.** After a `wip:` commit, `shapeBlocked` was put back to "every refusal is a clash" (`pinned` for any refusal). It fails by name, in both suites (see the PR). A second round, again after a `wip:` commit, ran four mutations, and each failed by name in `test-type-input.ts`:
  - Release forgets per-mode `typeSizes`: fails the Dark arm.
  - Release forgets `sizeOverrides`: fails the endpoint arm.
  - `shapeBlocked` re-lists the fields and drops those two, the divergence the review found: fails both arms.
  - The swap is not undone: fails all three "leaves the brand untouched" arms.

  A third round (Q55 B), after a `wip:` commit before each mutation, with both bundles rebuilt, each failing by name in `test-chrome.mjs` on both hosts (4 of 26069):
  - The old B8b sentence put back in the Type scale refusal: fails `#2194: {web,figma}: Aurora's Compact chip is disabled with the title floor's reason "…"` and `#2194: {web,figma}: Aurora at Compact shows the real reason under the chips, once`.
  - One word of the new sentence changed ("Raise" to "Lower"): fails the same four.

  The B8b arm for the 16px title floor chip passes in both rounds' unmutated runs, still expecting its own unchanged sentence.

### Trap for whoever is next

The test-chrome hook guard refuses `data-p3="type-scale-${v}"`. Every hook has to appear literally, so the three chips are spelled out.
