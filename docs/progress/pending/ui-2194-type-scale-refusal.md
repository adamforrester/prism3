## (2026-10-06) — Type scale: only a pinned-size clash offers Release; other refusals show their own reason (#2194)

**STATUS: branch `ui/2194-type-scale-refusal`.** UI only: no engine change, no emitted artifact moves, ENGINE stays at {{ENGINE_VERSION}}, `CONTRACT_VERSION` unchanged. No new copy: each sentence shown was already approved (owner decision N3 A, 2026-10-06).

### What changed

`shapeBlocked(key, cur)` in `state/type-input.ts` returned a boolean, and Type's Type scale lever read every `true` as a pinned-size clash. It then showed "Some sizes you set would clash at this scale. Release them to switch." and "Release pinned sizes", whatever the engine had actually refused. On the shipped Aurora (Expressive, 16px smallest title, nothing pinned), the Compact chip showed that clash. The engine's real refusal was `titleFloor 16 is incompatible with typeScale 'compact'`, which releasing sizes can't fix, and there was nothing to release.

`shapeBlocked` now says why, or returns `null`:
- **`titleFloor`**: Compact with the 16px title floor. This is the engine's own rule, checked directly, as the 16px title floor chip already checks it.
- **`pinned`**: the switch is refused, and the same switch builds once every pinned size is released (`typography.sizes`, `sizeOverrides`, every mode's `typeSizes`, the fields `releasePinnedSizes()` clears). Only this case is a clash.
- **`other`**: anything else, carrying the engine's message.

The lever shows the clash message and Release only for `pinned`. The title floor case disables the chip with the B8b sentence the 16px title floor chip already uses: "The Compact scale already places a title at 16px, so the engine refuses 16px with it." It also shows that sentence as a warning line under the chips (hook `type-scale-refused`). `other` does the same with the engine's message, the text the global error bar already shows for an engine refusal.

### Held for the owner

- **The `other` arm uses the engine's message as written.** No shipped brand reaches it. The two refusals a scale switch can hit are the title floor and the pinned clash, and a brand already refused for an unrelated reason fails every switch for that same reason. The message is the one the error bar already shows ("That change didn't apply: …"). If the owner wants a studio sentence here, that is new copy and a follow-up.
- **The title floor sentence is reused, not reworded.** It was approved for the 16px title floor chip. Under Type scale, "refuses 16px with it" refers to the smallest title size, a lever in another section (Scale limits). A rewording for this place would be new copy, so it is not done here.

### Gates and their independence

- **`test-type-input.ts`** reads the shipped Aurora's input as data (Expressive, the 16px floor, `pinnedSizeCount() === 0`), then expects `titleFloor` for Compact, never `pinned`. With prism3 and display md pinned at 48px, Expressive is `pinned` and Compact builds; once released, Expressive builds and the brand is back to its bytes. An invalid `captionFloor` (9) is `other`, carrying the engine's sentence, which the test types out.
- **`test-chrome.mjs`**, on both hosts:
  - Aurora loads with nothing pinned. Its Compact chip is disabled with the title floor sentence, which shows once under the chips, and there is no clash message and no Release.
  - On prism3, display md set to 56px through the picker (allowed at Default, refused under Expressive) disables Expressive with the clash sentence and shows the message and Release. Release clears it.

  `open()` takes an optional `brand` for the Aurora arm (default `prism3`, so every other caller is unchanged).
- **Mutation.** After a `wip:` commit, `shapeBlocked` was put back to "every refusal is a clash" (`pinned` for any refusal). It fails by name, in both suites (see the PR).

### Trap for whoever is next

The test-chrome hook guard refuses `data-p3="type-scale-${v}"`. Every hook has to appear literally, so the three chips are spelled out.
