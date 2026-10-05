/**
 * Write-adapter test (#1720) — drives the REAL `cssVarAdapter` from `src/write-adapter.ts` over a fake
 * scope, with a model from the real `resolvePreview`.
 *
 *   npx tsx apps/studio/test-write-adapter.ts
 *
 * The defect this guards: a type binding the brand does not emit is absent from `model.type` (named in
 * `model.unresolvedType`), and the adapter used to only SKIP it. A property an earlier apply had set
 * stayed on the scope, so switching to a brand without the style kept painting the previous brand's
 * value. The adapter now removes the three atoms of every unresolved ref.
 *
 * docs/34 (gate independence): the property names are LITERALS written out here, never built with the
 * adapter's own `typeAtomName`, so a change to the naming scheme cannot move the test along with it.
 * Mutation that drops the removal loop from `cssVarAdapter` fails `displayCeiling 'md' apply removes
 * --type-display-lg-strong-{family,weight,size}` BY NAME.
 *
 * #1840 adds the inbound half: `toHostMessage`, the validator every `MainToUi` message crosses, driven with
 * literal messages and literal expected `HostMessage`s. Mutation that declares `restore-input-empty` `null`
 * in the adapter's `INBOUND` table fails `accepts restore-input-empty` BY NAME.
 */
import { cssVarAdapter, toHostMessage } from './src/write-adapter';
import { resolvePreview } from '@prism3/engine/resolve-preview';
import { brandTheme } from '@prism3/engine/theme';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// A fake scope: the adapter only calls `style.setProperty` / `style.removeProperty`.
const props = new Map<string, string>();
const scope = {
  style: {
    setProperty: (k: string, v: string) => { props.set(k, v); },
    removeProperty: (k: string) => { const v = props.get(k) ?? ''; props.delete(k); return v; },
  },
} as unknown as HTMLElement;
const adapter = cssVarAdapter(scope);

const harbor = (exampleBrands as Record<string, unknown>)['harbor'] as BrandInput;
const ceilingMd = { ...harbor, typography: { ...harbor.typography, displayCeiling: 'md' } } as BrandInput;

const DISPLAY_LG = ['--type-display-lg-strong-family', '--type-display-lg-strong-weight', '--type-display-lg-strong-size'];
const TITLE_MD = ['--type-title-md-strong-family', '--type-title-md-strong-weight', '--type-title-md-strong-size'];
const present = (keys: string[]) => keys.filter((k) => (props.get(k) ?? '') !== '');

adapter.apply(resolvePreview(brandTheme(harbor)), 'light');
ok(present(DISPLAY_LG).length === 3, `harbor apply sets --type-display-lg-strong-{family,weight,size} (set: ${present(DISPLAY_LG).join(', ') || 'none'})`);

const second = resolvePreview(brandTheme(ceilingMd));
ok(JSON.stringify(second.unresolvedType) === JSON.stringify(['type.display.lg.strong']),
  `premise: displayCeiling 'md' leaves type.display.lg.strong unresolved (got ${second.unresolvedType.join(', ') || 'none'})`);
adapter.apply(second, 'light');
const stale = DISPLAY_LG.filter((k) => props.has(k));
ok(stale.length === 0, `displayCeiling 'md' apply removes --type-display-lg-strong-{family,weight,size}` + (stale.length ? ` — STILL SET: ${stale.map((k) => `${k}=${props.get(k)}`).join(', ')}` : ''));
ok(present(TITLE_MD).length === 3, `displayCeiling 'md' apply keeps --type-title-md-strong-{family,weight,size} (set: ${present(TITLE_MD).join(', ') || 'none'})`);

// ─── Inbound validation (#1840) ─────────────────────────────────────────────────────────────────────────
// `toHostMessage` is the boundary every `MainToUi` message crosses before the UI sees it. Its accepted
// kinds are keyed by the `MainToUi` union at compile time (a new kind fails typecheck until handled); what
// this checks is the runtime half: each accepted kind still produces the UI's `HostMessage`, and each kind
// that is not the shared UI's, or not a kind at all, is still dropped. Every expected value is a literal.
console.log('\ninbound validation (#1840)');
const wire = (pluginMessage: unknown): unknown => ({ pluginMessage });
const same = (got: unknown, want: unknown): boolean => JSON.stringify(got) === JSON.stringify(want);
const accepts = (label: string, msg: unknown, want: unknown): void => {
  const got = toHostMessage(wire(msg));
  ok(same(got, want), `accepts ${label}` + (same(got, want) ? '' : ` — got ${JSON.stringify(got)}`));
};
const drops = (label: string, data: unknown): void => {
  const got = toHostMessage(data);
  ok(got === null, `drops ${label}` + (got === null ? '' : ` — got ${JSON.stringify(got)}`));
};

accepts('apply-result', { type: 'apply-result', ok: true, headline: '✓ 12 written', summary: 'counts' },
  { kind: 'apply-result', ok: true, headline: '✓ 12 written', summary: 'counts' });
accepts('apply-result without a headline (older host)', { type: 'apply-result', ok: false, summary: 'x' },
  { kind: 'apply-result', ok: false, headline: '✗ apply failed', summary: 'x' });
// `completed` (UI redesign S8.2, owner decision C1): carried as the host sends it, and never inferred from `ok`: a
// post without it (a contract break, since `messages.ts` requires it) reads as a build that did not finish.
accepts('component-result', { type: 'component-result', ok: true, completed: true, headline: '✓ 48 built', summary: 's' },
  { kind: 'component-result', ok: true, headline: '✓ 48 built', summary: 's', completed: true });
accepts('component-result without completed is not read off ok', { type: 'component-result', ok: true, headline: '✓ 48 built', summary: 's' },
  { kind: 'component-result', ok: true, headline: '✓ 48 built', summary: 's', completed: false });
accepts('component-result without a headline', { type: 'component-result', ok: true, completed: true, summary: 's' },
  { kind: 'component-result', ok: true, headline: '✓ built', summary: 's', completed: true });
accepts('component-result that completed with misses', { type: 'component-result', ok: false, completed: true, headline: '⚠ 48, 2 missed', summary: 's' },
  { kind: 'component-result', ok: false, headline: '⚠ 48, 2 missed', summary: 's', completed: true });
accepts('component-result that stopped before the set', { type: 'component-result', ok: false, completed: false, headline: '✗ unknown def', summary: 's' },
  { kind: 'component-result', ok: false, headline: '✗ unknown def', summary: 's', completed: false });
accepts('component-result with a malformed completed', { type: 'component-result', ok: false, completed: 'yes', headline: '✗ x', summary: 's' },
  { kind: 'component-result', ok: false, headline: '✗ x', summary: 's', completed: false });
accepts('file-setup-result', { type: 'file-setup-result', ok: true, headline: '✓ 9 pages', summary: 'p' },
  { kind: 'file-setup-result', ok: true, headline: '✓ 9 pages', summary: 'p' });
accepts('file-setup-result without a headline', { type: 'file-setup-result', ok: false, summary: 'p' },
  { kind: 'file-setup-result', ok: false, headline: '✗ setup failed', summary: 'p' });
accepts('style-guide-result', { type: 'style-guide-result', ok: true, headline: '✓ 4 tables', summary: 't' },
  { kind: 'style-guide-result', ok: true, headline: '✓ 4 tables', summary: 't' });
accepts('style-guide-result without a headline', { type: 'style-guide-result', ok: true, summary: 't' },
  { kind: 'style-guide-result', ok: true, headline: '✓ style guide written', summary: 't' });
accepts('component-progress', { type: 'component-progress', phase: 'wire', done: 3.7, total: 10, chunkMs: 41 },
  { kind: 'component-progress', phase: 'wire', done: 3, total: 10, chunkMs: 41 });
accepts('style-guide-progress', { type: 'style-guide-progress', done: 6.4, total: 22, tableMs: 900 },
  { kind: 'style-guide-progress', done: 6, total: 22 });
accepts('agent-progress (a style guide\'s table reading)', { type: 'agent-progress', id: 'a1', progress: { at: 't', phase: 'table', done: 6, total: 22, chunkMs: 900 } },
  { kind: 'agent-progress', id: 'a1', phase: 'table', done: 6, total: 22 });
accepts('prune-result (preview)', { type: 'prune-result', ok: true, applied: false, count: 5, summary: 'r' },
  { kind: 'prune-result', ok: true, applied: false, count: 5, summary: 'r' });
accepts('prune-result (agent preview, pillOnly)', { type: 'prune-result', ok: true, applied: false, count: 2, summary: 'r', pillOnly: true },
  { kind: 'prune-result', ok: true, applied: false, count: 2, summary: 'r', pillOnly: true });
accepts('seed-info', { type: 'seed-info', ok: false, present: true, summary: 'ours', failed: 2 },
  { kind: 'seed-info', ok: false, summary: 'ours', present: true, failed: 2 });
accepts('seed-info without present or failed (older host)', { type: 'seed-info', ok: true, summary: 'ours' },
  { kind: 'seed-info', ok: true, summary: 'ours', present: false, failed: 0 });
accepts('seed-info with a malformed failed count', { type: 'seed-info', ok: false, present: true, summary: 'ours', failed: '2' },
  { kind: 'seed-info', ok: false, summary: 'ours', present: true, failed: 0 });
accepts('restore-input', { type: 'restore-input', input: { name: 'b' } },
  { kind: 'restore-input', input: { name: 'b' } });
accepts('restore-input-empty', { type: 'restore-input-empty' }, { kind: 'restore-input-empty' });
accepts('restore-input-error', { type: 'restore-input-error', message: 'old shape' },
  { kind: 'restore-input-error', message: 'old shape' });
accepts('font-list, with a non-string family dropped together with its count', { type: 'font-list', families: ['Inter', 7, 'Roboto'], styles: [9, 3, 36] },
  { kind: 'font-list', families: ['Inter', 'Roboto'], styles: [9, 36] });
accepts('font-list without styles (older host)', { type: 'font-list', families: ['Inter'] },
  { kind: 'font-list', families: ['Inter'], styles: [0] });

drops('agent-link-state (the panel\'s own listener reads it)', wire({ type: 'agent-link-state', state: { on: true } }));
drops('agent-result', wire({ type: 'agent-result', result: { id: 'a' } }));
// UI redesign S11: the agent's runs, which the Activity drawer shows.
accepts('agent-started', { type: 'agent-started', id: 'a1', cmd: 'apply-theme' }, { kind: 'agent-started', id: 'a1', cmd: 'apply-theme' });
accepts('agent-finished', { type: 'agent-finished', id: 'a1', cmd: 'apply-theme' }, { kind: 'agent-finished', id: 'a1' });
accepts('agent-progress', { type: 'agent-progress', id: 'b1', progress: { phase: 'build', done: 24.6, total: 648, chunkMs: 40 } },
  { kind: 'agent-progress', id: 'b1', phase: 'build', done: 24, total: 648 });
drops('agent-progress with no reading', wire({ type: 'agent-progress', id: 'a', progress: {} }));
drops('agent-started with no id', wire({ type: 'agent-started', cmd: 'apply-theme' }));
drops('agent-log', wire({ type: 'agent-log', id: 'a', line: 'x' }));
// #1957: a second write of a running operation, declined by the main thread.
accepts('refused', { type: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: 'Apply Theme is already running. Try again when it finishes.' },
  { kind: 'refused', code: 'busy', cmd: 'apply-theme', agent: false, message: 'Apply Theme is already running. Try again when it finishes.' });
drops('refused with another code', wire({ type: 'refused', code: 'nope', cmd: 'apply-theme', agent: false, message: 'm' }));
drops('refused with no message', wire({ type: 'refused', code: 'busy', cmd: 'apply-theme', agent: false }));
drops('refused with no caller', wire({ type: 'refused', code: 'busy', cmd: 'apply-theme', message: 'm' }));
drops('an unknown type', wire({ type: 'apply-results', ok: true, summary: 's' }));
drops('an inherited key as type (toString)', wire({ type: 'toString' }));
drops('a message with no type', wire({ ok: true, summary: 's' }));
drops('a non-object pluginMessage', wire('apply-result'));
drops('an event with no pluginMessage', { type: 'apply-result' });
drops('null data', null);
drops('restore-input with no input', wire({ type: 'restore-input' }));
drops('font-list with no families array', wire({ type: 'font-list', families: 'Inter' }));
drops('component-progress with total 0', wire({ type: 'component-progress', phase: 'build', done: 0, total: 0, chunkMs: 1 }));
drops('component-progress with an unknown phase', wire({ type: 'component-progress', phase: 'paint', done: 1, total: 2, chunkMs: 1 }));
drops('style-guide-progress with total 0', wire({ type: 'style-guide-progress', done: 0, total: 0, tableMs: 0 }));
drops('style-guide-progress past its total', wire({ type: 'style-guide-progress', done: 23, total: 22, tableMs: 0 }));
drops('prune-result with a negative count', wire({ type: 'prune-result', ok: true, applied: false, count: -1, summary: 'r' }));

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
