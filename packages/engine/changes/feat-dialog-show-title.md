---
engine: minor
---
Dialog gains a `show title` boolean in Figma, default on, and a `hideTitle` code prop, default off. Off hides the title from view and keeps it as the dialog's accessible name, for a dialog whose tabs or body name the content (#2895). Existing instances keep their visible title; the set stays at 24 members and no token moves. The code contract gains the visually hidden `<h2>` that `aria-labelledby` still points at, focus on the first body control while the title is hidden, and an alertdialog that always shows its title.
