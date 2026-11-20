---
engine: minor
---
A def's `notes.contested` refuses an entry with a sentence that opens on a verdict, in any case: settled, resolved, closed, decided or chosen (#1716). The check no longer breaks a sentence at a colon or after an abbreviation's period, so "Brief §4: Settled in the brief, argued here" and "e.g. Resolved later?" stay legal. Seven decided entries moved to `notes.evolution`: Text field's "ship both" and prefix/suffix entries, Select's error border, Checkbox.Row's border and fill, Toast's two decisions, and the decided half of Accordion's Q241 entry. `schema/component-maintainer.json` moves with them.
