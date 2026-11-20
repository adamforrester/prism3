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

### Owner decision on #4373 (2026-11-20): A, host the house brand and the example brands only

- **`build-site.mjs`** now copies from an explicit allow-list, `HOSTED` (`prism3`, `aurora`, `harbor`), not from every
  item in `out/shadcn/`. The reference brand and any other real-brand fixture keep their registry items in the repo as
  test fixtures and get no public install address. A brand added to the engine is not hosted until someone names it there.
  A hosted brand with no committed item fails the build.
- **`test-shadcn-registry.ts`** holds its own copy of the allow-list, `HOSTABLE`, and never reads the build's list. It
  fails `public/r/<brand>.json is not built: <brand> is a fixture, not a hosted brand` for any committed item outside that
  list that reaches `public/r/`. It also checks that `public/r/` holds exactly the hosted brands, and that the README names
  exactly the hosted `/r/` addresses. The floor stays 15.
- **`apps/studio/README.md`** lists the three hosted addresses. The owner approved the install wording, so the DRAFT
  marker is gone.
- **Mutation:** one fixture brand added to the build's `HOSTED` makes the build exit 0, because its own manifest is
  derived from the same list. The suite fails `public/r/<fixture>.json is not built: <fixture> is a fixture, not a
  hosted brand` and `public/r/ holds exactly the hosted brands, and nothing else` by name.
