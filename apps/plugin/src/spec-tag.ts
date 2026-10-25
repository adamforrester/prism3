/**
 * THE SPEC PANEL'S TAG (#2830 phase 2), apart from `spec-panel.ts` so the usage panel and the update can read it
 * without importing the spec panel's draw (which imports theirs).
 *
 * `live` is the panel the plugin keeps drawn; `kept` is one a designer edited, set aside. `def` is the family's lead
 * and `set` its set's id, as the usage panel's tag (`doc-panel.ts` `PanelTag`).
 */
export const SPEC_PANEL_NS = 'prism3';
export const SPEC_PANEL_KEY = 'specPanel';

export interface SpecTag { v: 1; def: string; set: string; state: 'live' | 'kept' }

type Tagged = { getSharedPluginData?(ns: string, key: string): string };

export const readSpecTag = (n: unknown): SpecTag | null => {
  try {
    const raw = (n as Tagged | null | undefined)?.getSharedPluginData?.(SPEC_PANEL_NS, SPEC_PANEL_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<SpecTag>;
    return t && t.v === 1 && typeof t.def === 'string' && typeof t.set === 'string' && (t.state === 'live' || t.state === 'kept') ? (t as SpecTag) : null;
  } catch { return null; }
};
/** A spec panel the plugin keeps drawn: it follows its set when Update spaces the sets, as the usage panel does. */
export const isLiveSpecPanel = (n: unknown): boolean => readSpecTag(n)?.state === 'live';
