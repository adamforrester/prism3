## (2026-11-07) — The studio mounts no Activity drawer (#3011, Q121 A)

Since Q2909.9 A put the rail on the web, the web bar draws no Activity tile, and the studio runs no write. So the
drawer could not be opened on the web, and its web paths were dead. The owner decided (Q121 A) to remove them rather
than give the web a door.

- `main.ts` lends the drawer only on Figma; `shell/frame.ts` takes `activity: ActivityLend | null`, as it already does
  for Update file, Documentation and the status strip, and mounts the drawer, its status line and its handle only with
  a lend. `Frame.activity` is null on the web.
- `shell/activity.ts` drops its `host` option: its two host branches (the idle note's web line, "Nothing has run in this
  session.", and the web half of `data-ever`) are gone with the web drawer.
- The web's kept drawer height goes: `entry.ts` no longer calls `initActivityHeight` from `localStorage`, and
  `persist-local.ts` drops `ACTIVITY_HEIGHT_KEY`, `restoreActivityHeightPx` and `persistActivityHeightPx`. The plugin
  keeps its height through the main thread as before (`apps/plugin/test-activity-height.ts`).
- `test:chrome` section 10 now asserts the studio mounts no drawer, handle, note or status line, rather than reading an
  undrawn one; section 32 loses its web branches, which no host loop reached since #3007.

A browser that kept a height under `prism3:activity-height` keeps that key in its `localStorage`; nothing reads it now.
