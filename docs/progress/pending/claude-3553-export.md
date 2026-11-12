## (2026-11-11) — Export's switchers: Documentation's underline tabs, and mono only for token names (#3553 Q-UI7, Q-UI11)

Two of the UI polish review's owner calls (#3553), each option A.

**Q-UI11 A.** "Which kind of output" was a segmented control on Export ("Design tokens | Brand brief | Component specs")
and a row of underline tabs on Documentation. Export's is now Documentation's form: a `role="tablist"` of `.p3-tab`s
with one `aria-selected`, arrow keys, Home and End moving the selection, and the export body as its tabpanel. The hairline
under it is a head's, as Documentation's is, so it keeps to the column while the tabs keep their focus-ring room. The
three tabs fit one row at the plugin's 380, so M8's overflow and the two-plus-one wrap #3600 left are both gone. Unlike
Documentation's four, there is no select at the narrow tier. If the row ever runs short it scrolls, as `.p3-tabs` does.

**Q-UI7 A.** Every Export option tab was set in mono (`.p3-export-oseg .p3-seg-tab`). Only Token names' options, which are
token spellings ("color.on-fill", "color.on_fill"), are now. "Nested groups", "One per mode", "Indented", "Off" and the
rest are in the chrome's UI face, as every other segmented control is. Each option row carries its setting's key, and
the mono rule names `tokenNameCase`.

**Verified.** New test:chrome section `3553-export`, in shard 3, on the plugin at 380 and 1280 and the web at 1280, both
themes. The switcher is a tablist of three tabs, one selected, on one row inside the column. On the plugin at 1280 a
selected Export tab has the same face, size and underline as Documentation's, read from that page. Each option tab is in
the code preview's face exactly when its row is Token names, and in the body text's face otherwise. Section `3553-md`
(#3600) reads the new class and still holds the tabs inside the column. Mutations, each after a `wip:` commit: the
switcher back to `p3-seg p3-export-seg` and `p3-seg-tab`s fails `#3553 Q-UI11 … the switcher is Documentation's underline
tabs`. The mono rule widened to every row fails `#3553 Q-UI7 … only Token names' options are set in mono`.
