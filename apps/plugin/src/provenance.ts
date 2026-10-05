/**
 * The OWNERSHIP MARK — what says "Prism3 wrote this style" in the file itself (#1884, #506 case c).
 *
 * A collection already carries its provenance: the #1581 `modes:owned` stamp, written on every apply.
 * A style carried none. The pre-flight judged it by its DESCRIPTION, against the engine's own templates
 * (`isEngineDescription`, #1577). That reads provenance out of a field the designer owns and can edit.
 * One rewritten description and every later apply on that file was refused, with a verdict saying
 * Prism3 did not create a style it did. So each style writer now stamps the style it writes, and the
 * pre-flight reads the stamp first.
 *
 * SHARED plugin data, in the `prism3` namespace, for the reasons `stampOwnedModes` gives: any plugin
 * and an agent's `figma_execute` census can read it, so the mark can be checked from outside the
 * plugin. `setPluginData` is private to this plugin and is not.
 *
 * BACKFILLED, not retrofitted. A style written before this mark existed has none. The pre-flight still
 * admits it by the description template (and, in a file older than the #1581 stamp, by the persisted
 * brand), and the write that follows stamps it. So a file built by any earlier version re-applies
 * exactly as before and leaves carrying the mark.
 *
 * NO MARK ON VARIABLES, deliberately. A variable is never written outside a collection the pre-flight
 * has already cleared, and its name sits under the brand root, which is Prism3's namespace. The
 * collision that breaks a write, a variable of another type, is checked in every era. Stamping each
 * of the 600-odd variables on every apply would buy one residual case: a designer's own variable,
 * added inside a Prism3 collection, under a name a later engine version starts writing.
 *
 * Best-effort both ways, like the mode stamp. A host or shim with no shared plugin data writes nothing
 * and reads "unmarked", which is exactly what a style written before this reads. An apply never fails
 * because a mark could not be written.
 */
const NS = 'prism3';
/** The key the mark lives under, on the style. Exported so a test reads the same key by name. */
export const OWNED_KEY = 'owned';
const OWNED = '1';

/** The slice of a Figma node the mark needs. Optional, so a port that does not model it still fits. */
export interface Markable {
  getSharedPluginData?(namespace: string, key: string): string;
  setSharedPluginData?(namespace: string, key: string, value: string): void;
}

/** Whether this node carries Prism3's ownership mark. An unreadable mark is an absent one. */
export const isMarkedOwned = (node: Markable): boolean => {
  try {
    return node.getSharedPluginData?.(NS, OWNED_KEY) === OWNED;
  } catch {
    return false;
  }
};

/** Stamp the mark on a node Prism3 just wrote. Skips a node already marked, so a re-apply writes nothing
 *  new. Never throws. */
export const markOwned = (node: Markable): void => {
  if (isMarkedOwned(node)) return;
  try {
    node.setSharedPluginData?.(NS, OWNED_KEY, OWNED);
  } catch { /* best-effort: see the module header */ }
};
