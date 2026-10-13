## (2026-10-12) — verify: a local run on macOS keeps the display and the system awake (#2547, #2550, owner Q252)

**STATUS: branch `tools/verify-caffeinate`.** Runner only (`verify.ts`). No engine change, no artifact moves, no ENGINE bump.

**Why.** The owner's answer to Q252: Lanes A–D and the rebuild lane run on a laptop that sleeps when left. Three of the browser-gate hangs (#2537, #2547, #2550) fell in display-off or system-sleep windows (`pmset -g log`, measured in #2557), and with no frames a click or key press never completes. The fourth, test:chrome's `lh-swap` step, ran in a cloud session and is #2550's remaining part.

**The change.** On macOS, `npm run verify` starts `caffeinate -dimsu -w <its own pid>` before the first gate. It holds the display (`-d`), idle sleep (`-i`), the disk (`-m`), system sleep on AC power (`-s`) and the user as active (`-u`). `-w` ends the assertion when verify exits, however it exits, so nothing outlives the run. The run prints one line saying so. On any other platform it does nothing, so CI (Linux) is unchanged. A missing `caffeinate` isn't an error.

**Its check** is one of the runner's own checks, which run before any gate:
- with a recording spawn, darwin starts exactly `caffeinate -dimsu -w 4242` once;
- `linux` and `win32` start nothing.

The expected argv is written in the check, not read from `CAFFEINATE_ARGS`.

**Measured live:** `caffeinate -dimsu -w 82457` was running for verify pid 82457 during a run and was gone after it exited.

**Mutations, each from a `wip:` commit:**
- **the platform check removed:** `keepAwake on linux should start nothing (started [["caffeinate",["-dimsu","-w","4242"]]]): CI would run caffeinate`, and the same for win32;
- **the darwin spawn removed:** `keepAwake on darwin should start "caffeinate -dimsu -w 4242" once (started []): a local run on the owner's Mac would sleep mid-verify`.

Either way, verify refuses to run.
