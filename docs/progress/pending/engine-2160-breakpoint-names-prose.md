## (2026-10-05) — the schema's breakpoints description states the naming rule the engine follows (#2160)

**STATUS: branch `engine/2160-breakpoint-names-prose`. Merge held for the owner's approval of the changed string (listed in the PR body).** ENGINE bump class: **none owed**. `theme-schema.json` is hand-authored and outside regen, so no committed artifact, token, name or value moves. `CONTRACT_VERSION` unchanged. **Fixes #2160.**

### What was wrong

`theme-schema.json`'s `layout.breakpoints` description said the breakpoints are "Auto-named sm/md/lg/xl/2xl". That's true only up to five. `bpNames()` (`theme.ts`) names six `xs…2xl` and seven `xs…3xl`. The lever's description already says so, in copy approved in #2070.

### The fix

The schema description now carries the lever's approved sentence word for word: "Names follow the count: up to five start at sm, six run xs to 2xl, and seven run xs to 3xl." The rest of the description is unchanged, including "The first must be 0.", which #2158 added.

Swept: no other shipped prose (schema, `levers.ts`, the READMEs, skills, studio or plugin sources) states the old five-name rule.

### Test

The #2146 prose block in `mcp-test.ts` now reads the lever's naming sentence out of `list_levers`, and asserts the schema description that `list_levers describe` returns carries it verbatim. The two are pinned **to each other**, not to a phrase, so an edit to either alone fails. Its old "The first must be 0." arm no longer anchors on "Auto-named".

### Mutations, each failing the arm by name

- **The schema back to "Auto-named sm/md/lg/xl/2xl."**: `❌ #2160 the schema's breakpoints description carries the lever's naming sentence word for word (…)`
- **The lever's sentence edited alone** ("seven or more run xs to 3xl"): the same arm fails, showing both texts.

### Found and filed

**#2198:** an **eighth** breakpoint builds and is named `bp7`. Measured: 1 gives `sm`, 5 `sm…2xl`, 6 `xs…2xl`, 7 `xs…3xl`, and 8 `xs…3xl bp7`. The sentence is true but silent past seven. Whether to refuse, name or describe an eighth is a design question.

### #2146

Items 1 and 2 landed in #2158. Item 3, the studio's `namesFor` guard and offering the refusal up front, plus any studio copy for it, is the UI lane's and is not written here.
