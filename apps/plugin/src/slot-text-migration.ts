/**
 * A SLOT'S TEXT MOVED OUT TO A TEXT PROPERTY, CARRIED ACROSS AN UPDATE (#3225, owner decision Q-BN2.2 A).
 *
 * Banner's body was a native slot whose default content was one text layer, `placeholder`. Text a designer or an agent
 * typed into a placed instance's slot did not persist for agents, so the sentence moved out: a text part beside the
 * slot, driven by the `body text` property, and the slot stays for rich content behind the `rich body` toggle, off by
 * default and empty. The update changes every member that way, and Figma carries nothing from the old slot to the new
 * property by itself: an instance whose slot held edited text would show the property's default and keep its own text
 * in a hidden slot. So the update carries each placed instance across itself, in two steps around the set's update,
 * as `slot-migration.ts` does for repeating rows:
 *
 *   capture  BEFORE the set is touched, every instance of one of its members in the file is read: its slot (the entry's
 *            `slot`, by layer name) and what that slot holds. Four cases, one per instance:
 *              · the one default text with the default characters: nothing to carry, and the instance is left out;
 *              · the one default text with EDITED characters: `move`, the characters to write into the property;
 *              · anything else (a list, a link, several layers, a renamed layer): `rich`, the content stays in the slot,
 *                which is shown, and the sentence is hidden;
 *              · nothing at all (a designer emptied the body): `empty`, the sentence is hidden so the body stays empty.
 *   fill     AFTER the set is updated, each captured instance gets its properties written with `setProperties` (the
 *            text, or the two toggles), and a `move` instance's slot is cleared of anything the old default left in it.
 *            Read back after: every value written.
 *
 * NOTHING IS SILENT. An instance inside another instance follows the component that holds it and is named, not
 * written; a value the host refuses or does not keep is a miss naming the instance.
 *
 * MEASURED ON THE SHIM, NOT ON A REAL HOST: `setProperties` on a placed instance after its set changed. The first run on
 * the master file is that probe, as it was for `slot-migration.ts`.
 */
import type { ComponentRename } from '@prism3/engine/component-renames';

type SlotTextEntry = Extract<ComponentRename, { kind: 'slot-text' }>;
type Val = string | boolean;
/** The structural reads this module makes on the host. `figma`'s own nodes satisfy it. */
export type TextMigNode = {
  id?: string; name?: string; type?: string; characters?: string; parent?: TextMigNode | null; children?: readonly TextMigNode[];
  componentProperties?: Record<string, { type?: string; value?: unknown }>;
  getMainComponentAsync?(): Promise<TextMigNode | null>;
  getInstancesAsync?(): Promise<readonly TextMigNode[]>;
  setProperties?(p: Record<string, Val>): void;
  remove?(): void;
};

/** What one placed instance's slot held, and what the update does with it. */
export type SlotTextCase =
  | { kind: 'move'; characters: string }
  | { kind: 'rich'; layers: string[] }
  | { kind: 'empty' };
export type SlotTextCapture = { id: string; name: string; page: string; member: string; case: SlotTextCase; nested?: true };
export type SlotTextMigration = { slot: string; property: string; show: string; hide: string; instances: SlotTextCapture[] };

const pageOf = (n: TextMigNode): string => {
  let p = n.parent;
  try { while (p && p.type !== 'PAGE') p = p.parent; } catch { return ''; }
  return String(p?.name ?? '');
};
const insideInstance = (n: TextMigNode): boolean => {
  let p = n.parent;
  try { while (p) { if (p.type === 'INSTANCE') return true; p = p.parent; } } catch { return false; }
  return false;
};
/** The first layer under `n` (itself excluded) that `pred` accepts, not looking inside nested instances. */
const findOwn = (n: TextMigNode, pred: (x: TextMigNode) => boolean): TextMigNode | undefined => {
  for (const k of n.children ?? []) {
    if (pred(k)) return k;
    if (k.type === 'INSTANCE') continue;
    const f = findOwn(k, pred);
    if (f) return f;
  }
  return undefined;
};
const slotOf = (n: TextMigNode, name: string): TextMigNode | undefined => findOwn(n, (x) => x.type === 'SLOT' && x.name === name);

/** The instances of a set's members in the file, each once. */
const instancesOf = async (set: TextMigNode, breathe?: () => Promise<void>): Promise<TextMigNode[]> => {
  const out: TextMigNode[] = [];
  const seen = new Set<string>();
  let k = 0;
  for (const m of set.children ?? []) {
    if (breathe && ++k % 24 === 0) await breathe();
    const list = m.getInstancesAsync ? await m.getInstancesAsync() : [];
    for (const i of list) { const id = String(i.id); if (!seen.has(id)) { seen.add(id); out.push(i); } }
  }
  return out;
};

/** Whether `set` still holds the old shape: a member whose slot (the entry's `slot`) holds the entry's `text` layer. */
export const holdsSlotText = (set: TextMigNode, entry: SlotTextEntry): boolean =>
  (set.children ?? []).some((m) => { const s = slotOf(m, entry.slot); return !!s && (s.children ?? []).some((c) => c.type === 'TEXT' && c.name === entry.text); });

/**
 * Every placed instance of `set` whose slot needs carrying, read as it stands, before the set changes. An instance
 * still showing the default text unedited is left out: after the update it shows the same characters in the property.
 */
export const captureSlotText = async (set: TextMigNode, entry: SlotTextEntry, breathe?: () => Promise<void>): Promise<{ migration: SlotTextMigration; live: Map<string, TextMigNode> }> => {
  const instances: SlotTextCapture[] = [];
  const live = new Map<string, TextMigNode>();
  for (const inst of await instancesOf(set, breathe)) {
    const slot = slotOf(inst, entry.slot);
    if (!slot) continue;
    const member = await inst.getMainComponentAsync?.();
    const kids = [...(slot.children ?? [])];
    // The default characters are the MEMBER's own, read off the main component as it stands before the update.
    const mainText = member ? slotOf(member, entry.slot)?.children?.find((c) => c.type === 'TEXT' && c.name === entry.text) : undefined;
    let c: SlotTextCase | null;
    if (!kids.length) c = { kind: 'empty' };
    else if (kids.length === 1 && kids[0].type === 'TEXT' && kids[0].name === entry.text) {
      const chars = String(kids[0].characters ?? '');
      c = mainText && chars === String(mainText.characters ?? '') ? null : { kind: 'move', characters: chars };
    } else c = { kind: 'rich', layers: kids.map((k) => String(k.name ?? k.type ?? '')) };
    if (!c) continue;
    const cap: SlotTextCapture = { id: String(inst.id), name: String(inst.name ?? ''), page: pageOf(inst), member: String(member?.name ?? ''), case: c };
    if (insideInstance(inst)) cap.nested = true;
    instances.push(cap);
    if (!cap.nested) live.set(cap.id, inst);
  }
  return { migration: { slot: entry.slot, property: entry.property, show: entry.show, hide: entry.hide, instances }, live };
};

// ---- the words (DRAFT, for the owner: #3225) -------------------------------------------------------------------

/** One instance's line: what the update does with its body. DRAFT. */
export const slotTextLine = (set: string, entry: Pick<SlotTextMigration, 'property' | 'show' | 'hide'>, c: SlotTextCapture): string => {
  const where = `${set} instance "${c.name}"${c.page ? ` on ${c.page}` : ''}`;
  if (c.nested) return `${where}: inside another instance, so it follows the component that holds it and is not changed here.`;
  if (c.case.kind === 'move') return `${where}: its text moves into "${entry.property}" (${JSON.stringify(c.case.characters)}).`;
  if (c.case.kind === 'rich') return `${where}: its content stays in the slot, which is shown ("${entry.show}" on, "${entry.hide}" off): ${c.case.layers.join(', ')}.`;
  return `${where}: its body was emptied, so "${entry.hide}" is turned off and it stays empty.`;
};

/** The set's summary line, then one line per instance, every one listed. DRAFT. */
export const slotTextLines = (set: string, m: SlotTextMigration): string[] => {
  const head = `${set}: the body's text moves out of the "${m.slot}" slot into "${m.property}".`;
  if (!m.instances.length) return [`${head} No instance in this file changed its body, so none needs carrying.`];
  return [`${head} ${m.instances.length} instance${m.instances.length === 1 ? '' : 's'} in this file changed ${m.instances.length === 1 ? 'its' : 'their'} body and ${m.instances.length === 1 ? 'is' : 'are'} carried across.`, ...m.instances.map((c) => slotTextLine(set, m, c))];
};

// ---- the fill -------------------------------------------------------------------------------------------------

export type SlotTextOutcome = { instances: number; moved: number; rich: number; emptied: number; misses: string[] };

/**
 * Write each captured instance's properties, after the set was updated. `live` is the capture's own node references;
 * `slotNow` is the slot's layer name after the update (its part may be renamed in the same update). Each instance is
 * read back after its write; a difference is a miss naming it.
 */
export const fillSlotText = async (setName: string, entry: SlotTextEntry, slotNow: string, live: Map<string, TextMigNode>, captured: SlotTextMigration, breathe?: () => Promise<void>): Promise<SlotTextOutcome> => {
  const out: SlotTextOutcome = { instances: 0, moved: 0, rich: 0, emptied: 0, misses: [] };
  let k = 0;
  for (const c of captured.instances) {
    if (c.nested) continue;
    if (breathe && ++k % 24 === 0) await breathe();
    const inst = live.get(c.id);
    const where = `${setName} instance "${c.name}"`;
    if (!inst) { out.misses.push(`${where}: no longer in the file`); continue; }
    const keys = Object.keys(inst.componentProperties ?? {});
    const keyOf = (bare: string): string | undefined => keys.find((x) => x.split('#')[0] === bare);
    const want: Record<string, Val> = {};
    const need = (bare: string, v: Val): void => { const key = keyOf(bare); if (key) want[key] = v; else out.misses.push(`${where}: has no "${bare}" property after the update`); };
    if (c.case.kind === 'move') need(entry.property, c.case.characters);
    else if (c.case.kind === 'rich') { need(entry.show, true); need(entry.hide, false); }
    else need(entry.hide, false);
    if (!Object.keys(want).length) continue;
    try { inst.setProperties?.(want); } catch (err) { out.misses.push(`${where}: values -> REFUSED (${(err as Error)?.message ?? String(err)})`); continue; }
    // A moved body's old text, if the update left it in the (now hidden) slot, goes: the property holds it now.
    if (c.case.kind === 'move') {
      const slot = slotOf(inst, slotNow);
      for (const x of [...(slot?.children ?? [])]) { try { x.remove?.(); } catch (err) { out.misses.push(`${where}: the old text in the slot could not be cleared (${(err as Error)?.message ?? String(err)})`); } }
    }
    // READ BACK every value written.
    for (const [key, v] of Object.entries(want)) {
      const got = inst.componentProperties?.[key]?.value;
      if (got !== v) out.misses.push(`${where}: ${key.split('#')[0]} reads ${JSON.stringify(got)}, expected ${JSON.stringify(v)}`);
    }
    out.instances++;
    if (c.case.kind === 'move') out.moved++; else if (c.case.kind === 'rich') out.rich++; else out.emptied++;
  }
  return out;
};
