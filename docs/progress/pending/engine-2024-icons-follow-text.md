## (2026-10-03) — under '3:1', tertiary and subtle icons follow their text (#2024)

**Status:** ENGINE `{{ENGINE_VERSION}}` (`engine: minor` change note), CONTRACT unchanged (`token-contract
--check`). `regen` moves no committed artifact: the carry acts only on overrides, and no example brand
overrides a tertiary or `-subtle` text role.

### What changed

The owner decided (2026-10-03) the question #2018 left open. Under `iconContrast: '3:1'`, `icon.tertiary`,
`inverse.icon.tertiary` and the ten `-subtle` icons, page and inverse, follow their text, like the seven #2018
covered. Their text is held to the same 3:1 floor as an icon, which is the rule #1982 applied. That gives
**19 locked and 12 editable** while unpaired. The 12 editable are `(inverse.)icon.secondary` and the bold
`(inverse.)icon.<status>`. Interactive icons were already carried (#1617).

- **Engine:** `ALWAYS_TWINNED` in `withIconTwins` (`modes.ts`) gains `(inverse.)text.tertiary` and
  `(inverse.)text.<status>-subtle`. An explicit icon override still wins (IT-03 arm 5).
- **Studio:** `ALWAYS_FOLLOWS`, the set `lockedTo` reads in `state/fills-input.ts`, gains the twelve, so those
  rows lock as "Follows text.X" while unpaired. No new strings. Nothing else in that file changed.

### Two lists, held together by a test rather than merged

#2023 did not make the engine and Studio share one list. It added a sync arm (`test-fills-input.ts` 6b) that
derives the expected set from the engine's OUTPUT and checks Studio's locks against it. So this extends the
two lists that exist and adds no third, and 6b is what catches either side moving alone: each one-sided
mutation below fails it by name.

### Measured first

Under `'3:1'`, each of the twelve icons already DERIVES equal to its text, with no override: 144 cells across
prism3, aurora and harbor in every mode, 0 different. So "Follows text.X" is true before any edit, and IT-03
(1a) now holds all nineteen by derivation as well as (1b) by carry.

### Tests and mutations

Expected sets are literals in each suite: IT-03's `FOLLOW` (19) and `NOT_CARRIED` (12), and the 19 in
`test-fills-input` and `test:smoke`.

| Mutation | Fails |
|---|---|
| engine drops `inverse.text.tertiary` | `IT-03: under '3:1' inverse.icon.tertiary follows inverse.text.tertiary in light` / `in dark`; 6b `locked but not carried: inverse.icon.tertiary` |
| engine adds `text.secondary` | `IT-03: under '3:1' a text.secondary override does not carry to icon.secondary in light` (and dark, and inverse); 6b `carried but editable: icon.secondary, inverse.icon.secondary` |
| Studio drops `inverse.icon.info-subtle` | `#1982/#2024 unpaired, inverse.icon.info-subtle stays locked …`; 6b; the aurora arm; `S4d prism3/aurora/harbor: … not locked: inverse.icon.info-subtle` |
| Studio adds `icon.secondary` | `unpaired, every icon row but the nineteen edits (12 editable) — still locked: icon.secondary`; 6b `locked but not carried: icon.secondary`; the aurora arm |
