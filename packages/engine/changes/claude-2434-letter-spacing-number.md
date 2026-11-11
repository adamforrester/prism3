---
engine: minor
---
Letter spacing is a DTCG `number`, a multiplier of the font size, and `container.fluid` leaves the token layer (#2434, with #2423; owner Q175 A). The `core.font.letter-spacing.*` steps and `core.font.letter-spacing-role.*` roles were `dimension` tokens in `em`, a unit DTCG 2025.10 doesn't allow, so stock native transforms read `-0.04em` as rem and wrote an absolute `-0.64`. Each now holds the bare multiplier (`-0.04`) as `$type: number`, and each platform applies it where the text's size is set (`packages/tokens/README.md`). `container.fluid` (`100%`) is removed with no replacement: full width is a layout's default. `CONTRACT_VERSION` 15.0.0 (MAJOR: 18 paths retyped, one removed). Figma text styles keep their baked PERCENT letter spacing, unchanged.
