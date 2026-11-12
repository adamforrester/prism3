---
engine: minor
---
The filled icon button's disabled glyph takes the disabled on-fill ink, as Button's does (#3554, owner decision Q-CC11 A). The three icon-button families bind `disabled.icon.on-fill` to `color.disabled.on-fill`, so on `appearance=filled` the glyph sits on `color.disabled.fill` in the ink gated against that fill (3.06:1 on the default brand's light mode, where the page ink gave 2.14:1), and on `surface=inverse` in `color.inverse.disabled.on-fill`. Outline and text icon buttons keep `color.disabled.icon`. The member names and count are unchanged; the disabled filled members' glyph paint moves.
