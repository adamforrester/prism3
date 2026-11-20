## (2026-11-18) — set-override: a confirm with other changes than its preview is refused as changes-moved (#3693)

**Status:** plugin (`apps/plugin/src/set-override.ts`, `main.ts`), `test-agent-link.ts`, the agent-link guide, and a
`patch` change note. `EXECUTOR_REVISION` unchanged (neither file is in the executor's import closure; the gate agrees).
CONTRACT unchanged.

### What changed

- **Owner decision on #3693 (2026-11-18, A):** split the hash and give a confirm whose changes differ from the preview
  its own refusal, separate from `brand-moved`.
- `overrideHash` is now the stored brand's FNV-1a (8 hex digits) followed by the changes' (8 more), so the
  `previewHash` is 16 digits. `confirmMoved(planHash, echoed)` reads which half moved. If the changes half moved, the
  confirm is refused as `changes-moved`. If only the brand half moved, it is still `brand-moved`.
- **Both moved reads `changes-moved`.** The remedy is the same either way, preview these changes, and the agent's own
  mismatch is the one it can act on without looking at the file. An echo that is not two halves at all (another
  command's 8-digit hash) cannot be these changes' preview, so it also reads `changes-moved`.
- The refusal hands back the hash these changes would need, as `brand-moved` already did.

### OWNER DECISION: the wording is DRAFT

`OVERRIDE_COPY.changesMoved` is marked DRAFT in the source: "Not saved — these changes aren't the ones previewed.
Preview them first." It is the issue's own example, recommended as is. It keeps `brandMoved`'s "Not saved — …" shape,
names the agent's request rather than the file, and gives one next step. The test pins it, so a change to it is a
one-line edit plus that assertion.

### The arms (`test-agent-link.ts`, tagged `#3693`)

- A confirm with other changes is refused as `changes-moved`, the only refusal, with the draft line as the headline,
  and writes nothing: no Theme write, 0 brand writes, the overrides as they were.
- The hash halves: brand half equal, changes half different. The previewed changes in another order read
  `changes-moved`. An 8-digit echo reads `changes-moved`. Brand and changes both moved reads `changes-moved`. Only the
  brand moved reads `brand-moved`.
- The existing `set-override/preview-hash` arm now asserts 16 digits.
- **Mutations:** main's two source files fail 7 by name, the six new `#3693` refusal arms and the 16-digit arm.
  `confirmMoved` checking the brand half first fails one by name,
  `#3693 set-override/changes-moved-and-brand-moved … (brand-moved, …)`.

### Guide

- `docs/public/guides/agent-link.md` gains one line: a color override's confirm is refused as `changes-moved` or
  `brand-moved`, cited to `confirmMoved`. The two `main.ts` citations below the edit moved by two lines, and they are
  re-pointed with their fingerprints unchanged.

### Review fixes

- **The real-Figma canary:** `tools/figma-canary/judge.ts` required set-override's `previewHash` to be 8 hex digits, so
  a live run would hold every rebuild on the split hash. It now requires 16, the fixtures carry 16, and a selftest arm,
  `hash-8-digits/set-override`, holds an 8-digit hash by name.
- **The agent reference:** set-override's description names the new refusal, "the changes sent are not the ones
  previewed" (DRAFT, the owner's call). A `#3693` arm in `test.ts` asserts the committed reference names each reason
  `confirmMoved` returns.
- The `set-override/busy` arm's confirm echoes its own preview's hash again (`pv3`), as on main: the busy guard declines
  it before the hash is read.
