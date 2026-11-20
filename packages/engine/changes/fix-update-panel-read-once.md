---
engine: patch
---
Update file records a set's usage-panel format only when its run checked the panel (#3870). The run reads
Documentation's Usage panels switch once, when it plans its targets, and the as-built ledger uses that reading. Before,
it read the switch again after the apply. Turning the panels on while an update ran recorded a set as panel-checked
when its panel was never drawn, so the set read current and its panel was never offered. Plugin only; no committed
artifact moves.
