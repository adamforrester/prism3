# Figma's geometry record: the Mac job (#3408 S6, KPI 2)

KPI 2 compares, for each state, what Figma actually lays out with what the browser lays out (Q32 A). The browser's
side is measured in CI (`check-geometry.ts`). Figma's side can only be read in Figma, so it comes from this job and
is committed as `apps/storybook/figma-geometry.json`. Until it is, `compare-figma-geometry.ts` fails, naming this job;
its `--self-test` (in `check:build`) proves the arithmetic on planted records.

## What it reads

`figma-geometry.js` reads every member of the `button`, `text-field` and `password-field` component sets in the open
file. It **writes nothing**: no node, page, style, variable or version. For each member it records the variant, the
boolean properties' defaults, the extent, padding, stroke weights and corner radii, and every visible layer's box from
`absoluteBoundingBox`, relative to the member, with its node id, type and horizontal sizing.

## Which file

The file holds the three component sets as the plugin builds them **at the commit being measured**, with a Prism3
theme applied: a scratch file, as `tools/component-roundtrip` uses. Which file the owner designates is an owner
decision on #3408. Never name the file or its key in a public issue, PR or comment.

## Steps (all on the Mac)

1. Make a worktree at the commit to measure and install in it (CLAUDE.md: never check out over someone's tree):

   ```bash
   git fetch origin && git worktree add --detach /tmp/p3-geometry-<run id> <full sha> && cd /tmp/p3-geometry-<run id> && npm ci
   ```

2. In Figma, the owner opens the designated file, brings it to the front, and runs the **Desktop Bridge** plugin there.
3. Run `apps/storybook/figma-geometry.js` through one Desktop Bridge call (`figma_execute`), its whole content as the
   code, unedited. It returns a JSON string.
4. Save the returned string, unedited, as `apps/storybook/figma-geometry.json` in the worktree.
5. Check it, against the code at the same commit:

   ```bash
   npm run -w @prism3/storybook build && npx tsx apps/storybook/check-geometry.ts && npx tsx apps/storybook/compare-figma-geometry.ts
   ```

   It prints `OK figma geometry: …`, or `FAIL figma geometry: N of M comparisons differ` with one line per difference:
   `<component> <case> (<node id>): <what> is <code> in code, <figma> in Figma`. A difference is a finding, not a
   failure of the job.
6. Post the output verbatim to #3408, and push `figma-geometry.json` on a branch for a PR into `poc/arm-1`. The record
   names node ids and layer names only, no file name.

## Settled by a live run

The Desktop Bridge's `figma_execute` wraps the code in an async function body and returns only what the code
explicitly `return`s. The first live run got `undefined` back from a bare `(async () => { ... })();`, so the script
now starts `return (async () => {`. `compare-figma-geometry.ts --self-test` (in `check:build`) fails by name if the
`return` goes.

## Not yet verified live

Still unconfirmed: that `loadAllPagesAsync` and `findAllWithCriteria` are allowed from the Desktop Bridge; that the
layer names match the anatomy's part paths (`container/label`; the plugin names layers by part); and how Figma reports
a stroke that sits inside the frame (CSS's border takes layout space, and Figma's inside stroke does not, so the first
run may show a 1px padding difference on the button: a real finding if so).
