---
engine: minor
---
Plugin write-path safety floor (#1884, #506 case c): every effect, paint, grid and text style Apply Theme
writes now carries an ownership mark, shared plugin data `prism3`/`owned` = `1`, stamped whether the
style was created or reused. The apply pre-flight reads the mark before the description. A style a
designer re-described is still recognized as Prism3's. Before this, its next apply was refused and named
the style as not created by Prism3. Styles written before the mark existed are still recognized by the
engine's description templates, or by the persisted brand in a file older than the mode stamp, and the
next apply marks them. A file built by any earlier version re-applies with nothing created and no
conflict. Variables carry no mark: the pre-flight judges a variable by its collection's stamp and checks
its type in every era. Nothing changes for a foreign file. It is still refused whole before the first
write, and the verdict names each collision.
