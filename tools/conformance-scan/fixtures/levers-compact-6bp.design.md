---
# FIXTURE A of the --design pair (#1569). Its twin is `levers-comfortable-2bp.design.md`, and the two
# are IDENTICAL except for the `density` and `layout.breakpoints` lines below. That is the whole design:
# `expected.ts --selftest` requires the two expectations built from them to disagree at named
# coordinates, so anything that reads a config and drops it fails by name. If the files differed
# anywhere else, a passing arm would no longer be evidence that the LEVERS travelled.
#
# Deliberately minimal rather than a copy of a real brand's brief: a copy would drift from the brand it
# was copied from, and every extra line here is a line that could make the two fixtures differ for a
# reason the arm does not name. Nine lines is enough for `brandTheme` to build a whole token layer.
#
# The two levers are the two #1569 was found on — an operator moved density and cut the breakpoint set
# in the studio, and all ~92 token-tier findings came from those two. Between them they reach three
# separate tiers of the expectation (the `control/size` aliases, the `core/dimension` rung set, and the
# `layout` collection's mode shape), which is why one lever would have been a weaker fixture.
id: fixture
root: fxt
primary: { l: 0.5, c: 0.15, h: 250 }
neutral: { hue: 250, chroma: 0.006 }
density: compact
layout: { breakpoints: [0, 480, 768, 1024, 1440, 1920] }
---

# Fixture A — compact, 6 breakpoints

Not a brand. A config, and the twin of `levers-comfortable-2bp.design.md`.
