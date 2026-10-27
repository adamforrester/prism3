## (2026-10-27) — prism3-rebind: slot defaults, stale slot handles, stalled import loops, plugin restarts, paragraph links

Five trap rows for `skills/prism3-rebind` §4, from rebuilding a brand's sign-in and account-creation screens (14 screens across two breakpoints) onto a published Prism3 library:

- **Slot defaults:** a placed component's slot already holds sample content (tabs, list rows, a dialog body placeholder), so clear it before appending.
- **Stale handles after a slot edit:** handles inside the same instance go stale once its slot changes, and a later `findOne` throws. Look up the other parts first.
- **Serial import loops:** one stuck import stalls the whole loop (0 of 98 after 80s). In parallel, with per-item timeouts, 70 of 98 landed in 22s. While imports stall, take mains, styles and variables from instances already in the file, filtered by the library's collections, because a legacy library shared the name prefix.
- **Plugin restarts:** a restart clears `globalThis` (a UI reload doesn't), so keep the helpers in a resendable bootstrap.
- **Paragraph links:** in a long paragraph, text pieces plus `link` instances don't wrap. Use one text node with the emitted `*-link` text style on each link's range.

Documentation only: no engine or emission change.
