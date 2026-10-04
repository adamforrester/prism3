## (2026-10-04) — Type: the 18px smallest title and the fluid switch can't drop a size you set individually (#2054, #2055)

**STATUS: branch `ui/2054-2055-type-refusals`, PR held: copy pending.** UI only: no engine change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Fixes #2054, Fixes #2055.** The three reason strings are drafts and the owner's to approve.

### What changed

Both fixes follow #2044's pattern: the control the engine would refuse is disabled up front, with the reason in its title.

- **#2054.** On Type, the "18px" smallest-title chip is disabled while title 2xs is set individually. Draft reason: "Leaves out title 2xs, which you set individually."
- **#2055.** The "Headings scale between mobile and desktop" switch is disabled while it is on and a heading has a mobile size set individually. Draft reason: "Removes the mobile size of ‹size›, which you set individually." With more than one size, it reads "Removes the mobile sizes of ‹a› and ‹b›, which you set individually." Sizes are named as `<group> <size>`, in group order (display, title, eyebrow).

Turning the switch on is never refused. A brand that already arrives in a refused state keeps the current option live, so it can move out (B8b's rule):
- the 18px chip is only disabled while 16px is current;
- the switch is only disabled while it is on.

Nothing a still-offered control writes has changed: the fix only sets `disabled` and `title`.

### Diagnosis, and why no trial build

Each refusal is a pure function of what the brand sets, so `state/type-input.ts` applies the engine's rule directly, as `ceilingBlocked()` does.

- **#2054, `titleFloorBlocked()`.** Title 2xs exists only with `titleFloor: 16`, and the engine refuses a size set on a rung the brand doesn't make. It reads a set size from:
  - `typography.sizes.title`;
  - a desktop or mobile `sizeOverrides.title` endpoint;
  - any mode's `modeLevers[mode].typeSizes.title`.

  `titleFloorBlocked()` checks all three for `2xs`.
- **#2055, `fluidBlocked()`.** A `sizeOverrides.<group>.<size>.mobile` endpoint needs responsive typography, because the engine throws "a mobile override needs responsive typography". A desktop endpoint builds either way. `fluidBlocked()` lists the heading sizes (`PER_MODE_SIZE_GROUPS`) with a mobile endpoint.

### Gates and their independence

- **`test-type-input.ts`.** The expected values are typed in the test, never read from the module. The engine is a second witness each time.
  - #2054: nothing set, and a title xl pin, are not blocked, and 18px builds. A 2xs size set brand-wide, on mobile, and in Dark only is blocked, and 18px throws in `brandTheme`.
  - #2055: nothing set, a desktop pin, and a desktop `sizeOverrides` endpoint are not blocked, and fluid off builds. One mobile size, and two in either order (always listed in group order), are blocked, and fluid off throws.
- **`test-chrome.mjs`** drives the real controls through the value picker.
  - #2054 runs on the Expressive scale with the 16px floor. On Default, title 2xs (16px) has no other value to pick: xs is 18px and the floor is 16px. For title 2xs set in Light, and then in Dark only, the 18px chip is disabled with the exact reason. A forced click writes nothing. Releasing the size makes the chip live again. Back on 18px and Default, the brand returns to its bytes.
  - #2055: with display md set on mobile, and then with title sm added, the switch is disabled with each reason. A forced click writes nothing. Releasing both makes it live again and returns the brand to its bytes.
  - A mobile size on title 2xs has no free value in the picker either (at most its desktop 16px, at least the 16px floor), so that case is covered by the unit arm only.
- **Mutations.** Each was run after a `wip:` commit, and each failed by name; the table is in the PR.

### #388's smoke test: re-pointed a third time, not weakened

With #2044, #2054 and #2055 guarded, no Type control is left that makes an edit the engine refuses. Each guard closed the path §2d used, which is why it moved twice before.

`test-smoke.mjs` §2d now uses a test-only hook, `window.__prism3TestEdit(path, value)`, in `entry.ts` step 8. It is defined only on web, and only when the page is opened with `?p3-test-hooks`. It runs `setPath` on `brandState` and then `rebuild()`, the same two steps a control's edit takes. So the engine's refusal and the error bar are real; only the control is not.

The flow:
1. The hand-written seed (16px floor, Default scale, title 2xs at 16px) is stored.
2. The page is opened with the parameter.
3. The hook removes `typography.titleFloor`, and the engine refuses `typography.sizes.title.2xs`.
4. Undo is the real 16px chip, which stays live because it is the way out.

Every assertion stands: the bar is quiet, then shown, names the field, survives navigating to Motion, and clears on undo. Two assertions are added: the hook exists with the parameter, and it is absent without it.

**A stored refused brand was not used.** On web, a saved brand the engine refuses boots the empty state with the #1989 notice, not the error bar. That route would test a different surface.

### Traps for whoever is next

- **A synthetic click reaches a disabled button's `onclick`.** `dispatchEvent(new MouseEvent('click'))` from `page.evaluate` ran `choice()`'s handler on a disabled chip and wrote the refused edit. The chrome arm first used it to get past the hook guard, and so failed with the fix in place. A real click is never delivered to a disabled button. Use `hooks.click(locator, { force: true })`, as Q65 does.
- **The plugin bundle also carries the hook's code.** It is behind `PRISM3_HOST !== 'figma'`, so it never runs there.
