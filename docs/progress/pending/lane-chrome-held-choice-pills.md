## (2026-11-18) — Chrome: a held segmented choice looks held, and the verdict pill is smaller (#2366, #2561)

### #2366: a held segmented choice takes the mode control's mapping

Owner decision A. In a derived mode (HC light, HC dark, wireframe) the levers panel holds every segmented choice by its native `disabled` (#2284), but no rule gave a disabled `.p3-seg-tab` the disabled skin, so it drew like a live one. #2321 had mapped the preview's mode control (`.p3-mode`): the checked segment takes the outline skin, the others the text skin. `.p3-mode` is a `.p3-seg-tab`, so the four disabled-skin rules now name `.p3-seg-tab`, and the unchecked-segment edge rule reads `aria-checked`, `aria-selected` and `aria-pressed`. Any disabled segmented tab takes the skin, not only the levers' choices: every other held control already does (X4 A). That includes Style guides' **Options** segmented choices (`sg-opt-*`) while a run holds them (their `fieldset.p3-sg-plain` is disabled while busy), on every mode, which drew their live skin on main. The scope is flagged on the PR (#4086 review).

The contrast audit could not catch this (it checks the skin only on the nodes it exempts, and these clear their floor at full ink). So `test-chrome.mjs` x4a §3, the derived-mode sweep, now reads every held `.p3-seg-tab` and holds it to the mapping by hook, with a floor (20; 27 measured in HC light across the places) and the three choices #2366 names (`type-scale-*`, `density-choice-*`, `tempo-*`) required by name.

### #2561: the verdict pill, one step down

Owner decision A: Activity's status pills one step down the chrome type scale, with tighter padding. Since #3113 (Q3113.2 A) Activity's rows say their verdict in words, so the one `.p3-pill` left is the Style guides run's verdict (`sg-verdict`). It goes from `fs-12` to `fs-10` (the scale's next step down) and from `space-150` to `space-100` sides. Its height stays `hit-min` (24px): it is a button that opens the run's result. Whether the decision should reach this pill at all is flagged on the PR.

### Verification

`test-chrome.mjs` x4a (`#2366` arms): on main, 4 failures by name (all four host × theme cases, 27 held choices drawing live, `scrim-strength-choice-standard` first); on the branch, 428/428. Mutation: the unchecked-segment edge rule narrowed back to `.p3-mode` fails the same arm. `test-style-guides-page.mjs` (`#2561`): main draws 12px type with 12px sides and fails; the branch draws 10px with 8px sides; mutation: font size back to `fs-12` fails it by name. `test-style-guides-page.mjs` (`#2366 held options`, #4086 review) reads each Options segmented choice during a run against the disabled roles resolved on a probe: on main's CSS it fails by name (`sg-opt-header-dark (checked): … ink rgb(13, 13, 14), fill rgb(255, 255, 255)`); mutation: `aria-checked` dropped from the unchecked-edge rule's `:not()` fails it by name.
