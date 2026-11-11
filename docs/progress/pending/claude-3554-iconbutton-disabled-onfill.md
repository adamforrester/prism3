## (2026-11-11) — The filled icon button's disabled glyph takes the on-fill ink (#3554 Q-CC11 A)

Owner decision Q-CC11 A. The icon-button factory bound only `disabled.fill` and `disabled.icon`, so a disabled
filled icon button painted page ink on the disabled fill, 2.14:1 on the default brand's light mode. This is the
shape #784 fixed on Button. The fix is one binding, `disabled.icon.on-fill: color.disabled.on-fill`, in the shared
disabled block: the projector already picks the `.on-fill` form wherever the appearance has a disabled fill under
the glyph (`anatomy-figma.ts`, the `onFill` branch), and swaps it for `color.inverse.disabled.on-fill` on the
inverse surface, so outline and text members keep `color.disabled.icon`.

- No executor code moved, so `EXECUTOR_REVISION` stays: the change is engine data, and it reaches Figma through the
  plan stamp. The paint census and the component-surface baselines were re-accepted for the three icon-button sets
  (same member count, different plans).
- `color.disabled.on-fill` is already contract-gated against `color.disabled.fill` per mode, so no new pairing
  was minted and no contrast contract changed.
