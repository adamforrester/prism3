## (2026-11-18) — The tokens gates' no-custom-code rule is an allowlist, not a name denylist (#3879)

Found in quality scan #3868. `check-consumability.mjs` (over `sd.consumer.mjs` and `sd.ship.mjs`) and
`check-platforms.mjs` (over `sd.platforms.mjs`) enforced "no custom code" by scanning each config for a fixed list
of banned names. Style Dictionary's other extension points were not on either list. A
`StyleDictionary.registerAction(...)` with `actions: ['custom-step']` on the `css` platform passed both gates, in the
shippable build (M1) and in the platform config (M2). The platform gate's JSON round trip could not see M2, because
the config names the hook by a string, which survives the round trip.

`packages/tokens/rule-no-custom-code.mjs` states the rule by what is allowed, and both gates call it for each of
their hand-listed subjects (shape 13). Three arms, each naming what it found:
- no `register…(` call on any receiver, so every extension point Style Dictionary registers that way is covered,
  including ones added later;
- no `StyleDictionary.` member; `new StyleDictionary({...})` is the only use;
- every object key in the config source is on `ALLOWED_KEYS`, a hand-written list of the stock options these builds
  use. That catches `actions`, `filter`, `hooks` and `parsers` however the hook is referenced.

A fourth arm is the floor: the key scan must see `transformGroup`, `buildPath` and `format` in each config, so a
scanner that stopped matching cannot pass everything. The old name lists stay; they cost nothing.

The limit is written in the helper's header: it reads source text, so a computed key, a bracketed member or code
moved to another module is not seen. Those are deliberate evasions; review is their backstop.

Mutations, on main and then on the fix:
- M1 (the scan's, `sd.ship.mjs`): main exit 0; the fix exits 1 on `registers nothing — found registerAction`,
  `touching no class member — found StyleDictionary.registerAction` and `not allowed: name, do, undo, actions`;
- M2 (the scan's, `sd.platforms.mjs`): main exit 0; the fix exits 1 on the same three arms for the platform config;
- `filter: 'only-colors'` alone on the consumer config: the fix exits 1 on `not allowed: filter`;
- the key regex blinded: the fix exits 1 on `the key scan reads the platform config's platform options (0/3 …)`.
