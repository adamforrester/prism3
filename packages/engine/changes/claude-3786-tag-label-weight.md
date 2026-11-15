---
engine: minor
---
"Control label weight" now reaches a component outside the button family through its own def entry, `levers.buttonLabelWeight: { labels: true }`, instead of riding on `levers.tagStyle` being present (#3786). Tag carries both entries, so nothing it draws changes. A def that takes Tag style no longer takes label weight with it, and a def can take label weight without Tag style. The validator refuses an entry whose `labels` is not `true`, or one on a def with no size axis. No emitted artifact changes, and no component plan changes under any setting. `CONTRACT_VERSION` unchanged: no token name moves.
