## (2026-10-01) — Studio inbound host messages are validated against the plugin's own MainToUi (#1840)

**STATUS: PR open from `lane/typed-inbound-messages`.** UI and tests only, so no ENGINE bump. The redesign plan's P3; it lands before S1.4.

**What was wrong.** #1841 (F3) typed the OUTBOUND side: the studio posts the plugin's own `UiToMain`. The inbound side still read `pluginMessage` through a loose shape written out in `write-adapter.ts` (`headline?`, `count?`, `present?` and so on), beside `MainToUi` but not linked to it. Renaming a `MainToUi` field in `apps/plugin/src/messages.ts` left the adapter reading the old name, which arrived as `undefined` and was defaulted, and no typecheck or test noticed. Adding a `MainToUi` kind was silent too: the `if` chain simply never matched it.

**What changed.** The validation stays field by field, because the message crosses `postMessage` from another context and an older or newer host can send any shape. What changed is where its field names come from.
- `write-adapter.ts` imports `MainToUi` and `OfType` as types, like `UiToMain`.
- The `if` chain is now `INBOUND`, a table typed `{ [K in MainToUi['type']]: Validator<K> | null }`. Each validator receives `Untrusted<member>`: that member's own keys, each value `unknown`. So reading a field the member does not have is a compile error at the read, and every value is still checked before use.
- The table's keys are the union itself. A kind added in `messages.ts` fails studio typecheck until it is handled or declared `null`. The four `agent-*` kinds are `null`: the panel's own listeners read them, and the shared UI never did.
- The listener body is now an exported pure function, `toHostMessage(data)`, so the test can drive it. The `type` lookup uses own keys only, so `toString` is dropped like any other unknown kind.
- `HostMessage`, the UI-side `kind`-tagged type, is unchanged. It is not a wire type: it carries the defaults the adapter fills in (`headline`, `styles`, `present`), so deriving it from `MainToUi` would change what the UI receives.

**Behavior-neutral, checked two ways.** First, a differential run before the PR: 49 inputs, including primitives, `null`, inherited keys, bad numbers, missing fields and every agent kind, fed through main's listener and through `toHostMessage`, with 0 differences. Second, `test-write-adapter.ts` now drives `toHostMessage` with literal messages and literal expected `HostMessage`s: 18 accepts (every handled kind, plus the older-host fallbacks) and 15 drops.

**Bundles.** The import is type-only, so `messages.ts` is absent from both esbuild metafiles' outputs, and no `assertNever` text reaches either bundle. One trap was caught along the way. A first version built the four verdict validators with a factory call, `verdict('apply-result', …)`, inside the table. esbuild cannot prove a call is pure, so it kept the table in the WEB bundle, where `hostCommit` never uses it: `write-adapter.ts` went from 275 to 3,427 bytes of web output. Each entry is now an arrow function, so the table has no side effects and the web output is back to 275 bytes, the same as main.

**Mutations, each committed first.**
- (a) Rename `apply-result`'s `headline` to `pill` in `messages.ts`: studio typecheck fails at `src/write-adapter.ts(227,29): Property 'headline' does not exist on type 'Untrusted<…>'`. The same holds for `prune-result`'s `count` (line 260) and `seed-info`'s `present` (line 269).
- (b) Add `{ type: 'ping'; at: number }` to `MainToUi`: studio typecheck fails at `src/write-adapter.ts(235,7): Property 'ping' is missing`.
- (c) Declare `restore-input-empty` `null` in `INBOUND`: typecheck passes, and `accepts restore-input-empty` fails by name (36/37). Deleting the key outright instead fails typecheck (`Property '"restore-input-empty"' is missing`).

**Not covered, on purpose.** A NEW field on an existing `MainToUi` member is not forced to be read. The same is true on the outbound side for optional fields. Requiring every field to be read would need a gate over the validator's reads, and a field the UI has no use for yet is not a defect.
