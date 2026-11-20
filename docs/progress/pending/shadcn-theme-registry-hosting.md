## (2026-11-20) — The site serves each brand's shadcn registry item at /r/<brand>.json (#2997, Q2997.19 A)

**Status:** no engine change and no emission change, so no change note; `ENGINE_VERSION` and `CONTRACT_VERSION` do not
move. Carries #4315 (the registry items as regen artifacts), **merged in with a normal merge**: #4315 is unmerged, and
this branch starts at `main`, so it is not a stack. Merge #4315 first.

### What changed

- **`apps/studio/build-site.mjs`** copies each `packages/engine/out/shadcn/<brand>.registry-item.json` to
  `public/r/<brand>.json`, unchanged, and adds them to its publish manifest. `vercel.json` publishes `apps/studio/public`,
  so each item is served at `/r/<brand>.json`, and `npx shadcn add https://<site>/r/<brand>.json` installs that brand's
  theme. The path is the one #4315's decision option proposed (`/r/<brand>.json`, shadcn's own convention).
- **No deploy change was needed.** `vercel-ignore.sh` already rebuilds on any `packages/engine/**` change outside its
  excluded list, and `out/shadcn/` is not excluded, so a regenerated item redeploys.
- **`apps/studio/test-shadcn-registry.ts`** (a studio suite, floor 15) runs the real `build-site.mjs`, then holds every
  `public/r/<brand>.json` to its committed `out/shadcn/<brand>.registry-item.json`, byte for byte. The oracle lists
  `out/shadcn/` with its own pattern, never the build's list, and ties the URL to the deploy through `vercel.json`'s
  `outputDirectory`. It also checks that `public/r/` holds nothing else and that each item is a `registry:theme` named
  for its brand.
- **`apps/studio/README.md`** gains the install command under Deploy (DRAFT copy, for the owner).

### Mutations, each failing by name

- The copy removed from `build-site.mjs` → the build's own manifest check fails first (`build-site.mjs exits 0`), and
  every `public/r/<brand>.json is out/shadcn/<brand>.registry-item.json, byte for byte` fails.
- The copy re-serialized through `JSON.stringify(JSON.parse(…), null, 2)` → every `byte for byte` line fails.
