## (2026-10-27) — prism3-rebind: slot defaults, stale slot handles, stalled import loops, plugin restarts, paragraph links

Four new trap rows for `skills/prism3-rebind` §4, and one widened row, from rebuilding a brand's sign-in and account-creation screens (14 screens across two breakpoints) onto a published Prism3 library:

- **Slot defaults:** a placed component's slot already holds sample content (tabs, list rows, a dialog body placeholder), so append the design's items first, then remove the samples and set the selected item.
- **Stale handles after a slot edit:** handles inside the same instance go stale once its slot changes, and a later `findOne` throws. Look up the other parts first and check `.removed`, the same idiom as stale references after a placement.
- **Serial import loops,** folded into the existing "A new library import never settles" row rather than a second row for the same trap: one stuck import stalls the whole loop (0 of 98 after 80s). In parallel, with per-item timeouts, 70 of 98 landed in 22s. While imports stall, take mains, styles and variables from instances already in the file, filtered by the library's collections, because a legacy library shared the name prefix.
- **Plugin restarts:** a restart clears `globalThis` (a UI reload doesn't), so keep the helpers in a resendable bootstrap.
- **Paragraph links:** in a long paragraph, text pieces plus `link` instances don't wrap. Use one text node with the emitted `*-link` text style on each link's range.

Documentation only: no engine or emission change.
