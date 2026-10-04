## (2026-10-04) — test:chrome reads the scroll glides on frame time, not the wall clock (#2042)

**STATUS: branch `test/2042-glide-deterministic`.** Test only: `apps/studio/test-chrome.mjs`. No source change, no emitted artifact moves, no ENGINE bump, `CONTRACT_VERSION` unchanged. **Fixes #2042.**

### Diagnosis

#2015's `QA-B9: the glide lasts about the default transition's 200ms` failed once at 66ms while three test runs shared the machine. The glide itself was never short. `easedScrollTo` reads time only from the animation frame's timestamp, so its last step can't come before 200ms of frame time. The *measurement* was short, almost certainly. A recorder started after the edit's click returned, sampled `scrollTop` once per frame and timed "first move to settled". Under load, that `page.evaluate` round trip can arrive after the glide has started, so the recorder sees only its tail. The mutation runs here show the lag directly: with reduced motion ignored, a position read "right after the edit" was already four frames into the glide (scrollTop 2193 of a 3024 → 865 glide). The same late recorder backed the four "glides through positions on its way" checks (Q4, QA-B9 on Surfaces & fills, Interactive and Type, and QA-B17), which needed at least two in-between positions in whatever tail it caught. They were one bad scheduling run from the same failure.

### The approach: a glide log on a virtual frame clock

A helper above section 15, `installGlideLog`, does two things in the page:

- It wraps `requestAnimationFrame` so every frame's callbacks get a **virtual timestamp**, exactly 16ms after the previous frame, whatever the wall clock did. All callbacks in one real frame share one timestamp.
- It logs **every `scrollTo` on the two panes** from before the edit: the position asked for, the behavior, and the virtual frame time it ran in. The time is null when the step ran outside a frame, in the edit itself.

`glideOf` reads one pane's log. A 200ms glide then takes the same steps on any machine, and the checks are:

- **Duration:** the last step is the first frame at or past 200ms after the first step. Measured: the step before it at 192ms, the last at 208ms, with 12 positions in between. A temporary debug line printed these in the mutation runs, which ran under the same load as the load test.
- **Easing:** every step lies within 1px of `cubic-bezier(0.2, 0, 0, 1)` at its own frame time. The test solves the curve with its own bisection, not `follow-edit.ts`'s Newton solver.
- **In-between positions:** at least two.
- **Reduced motion:** exactly one step, taken in the edit rather than in a frame. This is the stronger form of "lands at once". The old form compared a position read after the click with a later sample. A glide that finished before the read (200ms, under load) passed it, so a reduced-motion mutation could have gone green on a busy machine.

`frames()` stays, but only to wait until a pane has held still. It no longer feeds a timing check.

**Why not `page.clock`, and why not only (a).** `page.clock` fakes every timer, `Date` and `performance.now` in the page, so the whole section would run on a clock the test has to pump. The glide reads only the frame timestamp, so only that is made virtual. Reading the declared tokens alone (option (a)) was already done by `QA-B9: both panes scroll on the chrome's default transition`. It can't see a source that ignores the token, and "intermediate positions exist" would still have depended on frame spacing. The token check stays, and the frame-time checks add what it couldn't see.

**Trap for whoever is next.** The virtual clock covers only the timestamp passed to `requestAnimationFrame`. If `easedScrollTo` ever times itself with `performance.now()` instead, the duration check silently goes back to wall-clock time. It would still pass when the machine is idle and flake under load again. The duration-0 mutation still fails either way.

### Gates and their independence

- Expected values are the test's own literals: `MOTION` (200ms, `cubic-bezier(0.2, 0, 0, 1)`) and the test's own Bézier solver. Positions come from the log, which records what the page asked the browser to do.
- **Load test:** four `test:chrome` runs, each alongside at least two concurrent `npx tsx packages/engine/test.ts` loops on a 4-core machine (load average 7 to 14). Run 4 had four loops, because the first three runs' pair was still going. The mutation runs below added more load during the first three. Every scroll-follow check passed in all four runs. Runs 1, 3 and 4 were 13353/13353. Run 2 was 13352/13353: its one failure is #2073, outside the scroll-follow sections. Before this change, the 66ms failure needed only three runs sharing the machine.
- Mutations, each after a `wip:` commit, restored with `git checkout -- <file>`, each failing by name:

| Mutation | Fails with |
|---|---|
| The duration token at 0 (`--p3-transition-dur` emitted as `0ms`, in `chrome/tokens.mjs`) | `✗ QA-B9: both panes scroll on the chrome's default transition, 200ms and cubic-bezier(0.2, 0, 0, 1) — read [["0ms",…]]`, `✗ QA-B9: the glide lasts the default transition's 200ms, on cubic-bezier(0.2, 0, 0, 1): … (1 steps, in frames false; …)`, the four "glides through positions on its way" checks (Q4, Surfaces & fills, Interactive, Type) and QA-B17's, and `✗ Q4: without reduced motion the reveal steps its own eased glide …` |
| Reduced motion ignored (`reducedMotion()` returns false in `preview/follow-edit.ts`) | `✗ QA-B9: under reduced motion the reveal lands at once, with no frame between (… 15 step(s), in frames true …)`, `✗ QA-B17: under reduced motion a jump link lands at once (…)`, `✗ Q4: under reduced motion the reveal asks for one instant scroll, in the edit itself …`, and Q4's two other reduced-motion checks |
| The reveal no-ops (`revealSection` returns before scrolling) | `✗ QA-B9: editing a Border step on Surfaces & fills brings the preview's Border section into view …`, `✗ QA-B9: the glide lasts the default transition's 200ms … (0 steps …)`, `✗ QA-B9: under reduced motion the reveal lands at once …`, the Interactive and the six Type reveal checks, and their glide checks |

An unrelated flake turned up in load run 2: the chrome audit's `a write running` read the spinner's "…" partway through its fade to transparent (2.85:1). It's the same wall-clock class in a different section, so it's filed as #2073 rather than fixed here.
