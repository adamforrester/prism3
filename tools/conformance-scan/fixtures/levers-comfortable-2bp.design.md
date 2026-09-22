---
# FIXTURE B of the --design pair (#1569). Its twin is `levers-compact-6bp.design.md`, and the two are
# IDENTICAL except for the `density` and `layout.breakpoints` lines below — see that file's header for
# why the pair is shaped this way and why it is minimal rather than copied from a real brand.
#
# What the two levers move, measured between these two files: 36 variables change value (the whole
# `control/size/*` alias set a rung up, plus the `breakpoint/*` values), 4 exist only at compact/6bp,
# 1 only at comfortable/2bp (a `core/dimension` rung the other config never needs), and the `layout`
# collection goes from 6 modes to 2. A correct file built at THIS config reports every one of those as
# drift against its twin's expectation, which is exactly the false-positive class #1569 records.
id: fixture
root: fxt
primary: { l: 0.5, c: 0.15, h: 250 }
neutral: { hue: 250, chroma: 0.006 }
density: comfortable
layout: { breakpoints: [0, 768] }
---

# Fixture B — comfortable, 2 breakpoints

Not a brand. A config, and the twin of `levers-compact-6bp.design.md`.
