/**
 * emit-dtcg-consumer.ts — the CONSUMER set: the conforming projection with no `$extensions` (#2552,
 * owner decision Q250 A).
 *
 *     consumer/<brand>.base.tokens.json            the base, `$extensions` removed everywhere
 *     consumer/<brand>.<mode>.overlay.tokens.json  each overlay, the same
 *
 * WHY A THIRD FORM. The base + overlay projection (`emit-dtcg-overlay.ts`, #609) already reads in a
 * stock consumer, but it still carries our build metadata: every token's `$extensions.prism3`
 * (provenance, contrast, binding data) and the file's `$extensions.generator` and `decisions` log. DTCG
 * says a tool MUST preserve what it does not understand, so all of it travels into a client's pipeline.
 * This set is what a client is handed: a token keeps `$value`, `$type` and `$description`, and nothing
 * else.
 *
 * WHY FROM THE PROJECTION AND NEVER FROM THE CANONICAL TREE. The single-file `<brand>.tokens.json`
 * stores every non-default mode value INSIDE `$extensions.prism3.modes`, because DTCG has no modes.
 * Stripping it would silently keep the default mode and lose the rest. The projection has already
 * moved each mode's values into its own overlay, so here the removal costs no value. That is why the
 * single-file tree is never offered as a handoff file.
 *
 * Exactly one removal, and nothing else: the result is the projection with every `$extensions` key
 * deleted, byte for byte. `lint-consumer-build.ts` holds that, with its own strip, against the committed
 * base and overlays.
 *
 * PURE — no `node:*`, no I/O. The writer lives in `emit-dtcg.ts`; the studio's export calls this too.
 */
import { buildOverlaySet } from './emit-dtcg-overlay';

type Node = Record<string, unknown>;

/** The tree with every `$extensions` key removed, at any depth. Key order is otherwise kept. */
export const stripExtensions = (n: unknown): unknown => {
  if (Array.isArray(n)) return n.map(stripExtensions);
  if (!n || typeof n !== 'object') return n;
  const out: Node = {};
  for (const [k, v] of Object.entries(n as Node)) if (k !== '$extensions') out[k] = stripExtensions(v);
  return out;
};

/** One brand's consumer set: the projected base and overlays, each with `$extensions` removed. */
export const buildConsumerSet = (tree: unknown): { base: unknown; overlays: Array<{ mode: string; tree: unknown }> } => {
  const projected = buildOverlaySet(tree);
  return {
    base: stripExtensions(projected.base),
    overlays: projected.overlays.map(({ mode, tree: t }) => ({ mode, tree: stripExtensions(t) })),
  };
};
