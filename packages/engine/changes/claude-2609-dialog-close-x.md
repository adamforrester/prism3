---
engine: minor
---
Dialog's close button always shows the close icon (owner decision, 2026-10-16, #2609), and is a FlushIconButton.Neutral,
round, medium, instead of an IconButton.Neutral (owner decision Q385 A, settling Q377 A), so a file built without the
IconButton sets still builds Dialog. Its `close` part sets the nested button's `swap icon` to `close` on every member
through a per-instance override (#2645), and Dialog declares no swap property of its own. The `close` boolean is
unchanged. Dialog's projected plan moves (15 members, same count); no token path moves, so CONTRACT is unchanged.
