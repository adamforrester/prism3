---
engine: minor
---
The library cover is redesigned (#2915, owner decisions Q1–Q5 A). A plain page ground (`color/background/primary`); the
library's name centered in the brand's display face and `color/text/brand` at 120 px; the subtitle "Design system" under
it and the version, now `v{{ENGINE_VERSION}}`, at bottom-left, both in `color/text/secondary`; and an empty "Logo" slot
top-right (#2891). Every color is bound, and each ink holds 4.5:1 on the ground in every example brand and mode. Anything
placed in the logo slot is not a hand edit, so the name and the version keep updating. Update redraws an unedited
first-design cover in this design inside the same frame, and keeps an edited one, setting only its version text. The
name is `BrandInput.name`, else the id made readable (`prism3` becomes Prism3), and then Update says no display name is
set. The default theme's and the redesign seed's briefs gain a display `name`, and a standard-dialect brief's `name` now
reaches `BrandInput.name` (#2892). The Studio's Brand name field edits `name`, not `id`. No token is renamed or added, so
CONTRACT is unchanged.
