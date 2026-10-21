/**
 * THE LIBRARY'S VERSIONS, VISIBLE IN THE FILE (#2858, owner decisions Q443 A and Q479) — the words, the Cover page's
 * "About this library" frame, and both through a real Update in the component shim.
 *
 *   npx tsx apps/plugin/test-library-about.ts
 *
 *   words/…      `aboutContent` over the bundled release notes at 0.237.0: the approved wireframe's engine, contract
 *                and date rows, the latest release's counts, and its changes grouped (new sets, the icon's new
 *                value, the new tokens, the one fix). The latest release only (Q479.2 A).
 *   cap/…        more changes than `ABOUT_LINES` end on a count of the rest.
 *   last/…       "Last changed in" from the release notes only (Q479.3 A): the newest release naming the set, no newer
 *                than the engine; "Unchanged since" the oldest notes for a set none name.
 *   publish/…    the wireframe's publish description, word for word, for an Update from 0.236.0 changing icon and
 *                badge; a longer range lists each release it crossed; consumer breaks are counted.
 *   draw/…       the frame goes beside the thumbnail frame (Q479.1 A), records the engine, the contract, the date and
 *                its fingerprint, and the dry run then reads it current.
 *   redraw/…     an engine moved: the dry run reads it stale; a frame left alone is replaced in place; an edited one
 *                is kept, renamed, moved below and untagged.
 *   cover/…      no Cover page: nothing drawn, and the outcome says why.
 *   update/…     a real Update in the component shim: the dry run lists the frame, the apply saves one version naming
 *                it, draws it on Cover beside the thumbnail, reads it back off the shim's nodes, and returns the publish
 *                description; the next check reads it current, and an Update with nothing else to do writes nothing.
 *
 * INDEPENDENCE (docs/34): every expected sentence is a literal copied from the approved wireframe or written here from
 * `docs/public/releases/*.json` by hand, never built from `library-about.ts`. The frame is read back off the shim's
 * nodes (their `characters`, `x`, `y`, plugin data), never off the outcome the drawer reports.
 *
 * BY-NAME MUTATIONS (each proven red, then restored; the PR body lists them):
 *   - `lastChangedIn` not capped at the engine → `last/capped at the engine`;
 *   - `publishDescription`'s range taking every release → `publish/range`;
 *   - `drawAbout` ignoring the thumbnail → `draw/beside the thumbnail`;
 *   - the fingerprint check dropped (every old frame removed) → `redraw/edited kept`;
 *   - `aboutDue` ignoring the engine → `redraw/stale`;
 *   - the apply not drawing the frame → `update/drawn`;
 *   - the frame left out of the preview hash → `update/hash`.
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node } from './component-shim';
import { previewUpdate, previewVerdict } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost } from './src/update-apply';
import { aboutContent, countsLine, lastChangedIn, lastChangedLines, publishDescription, whatChanged, RELEASES, type ReleaseIndex } from './src/library-about';
import { aboutDue, aboutDueLine, drawAbout, ABOUT_NS, ABOUT_KEY, type AboutApi } from './src/about-frame';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/* ── words ───────────────────────────────────────────────────────────────────────────────────────────── */
section('words — the About frame at engine 0.237.0, from the bundled release notes');
{
  const c = aboutContent({ updated: '2026-10-20', engine: '0.237.0', contract: '14.7.0' });
  ok(c.title === 'About this library', `words/title (${c.title})`);
  ok(eq(c.rows, [
    { label: 'Engine', value: '0.237.0', note: 'Released 2026-10-15' },
    { label: 'Token contract', value: '14.7.0', note: 'Changes only when a token name is added, renamed or removed.' },
    { label: 'Updated', value: '2026-10-20', note: 'By Update.' },
  ]), `words/rows: engine with its release date, the contract, the Update's date (${JSON.stringify(c.rows)})`);
  ok(c.heading === 'What changed in 0.237.0' && c.counts === '0.237.0: 29 new, 1 fix. No breaking changes.', `words/latest only: the heading and counts of 0.237.0 (${c.heading}; ${c.counts})`);
  ok(eq(c.changes, [
    '8 new sets: accordion, divider, list, list-item, segmented-control, segmented-control-segment, tab, tabs.',
    'icon: name has a new value, menu.',
    '9 new tokens under type.label.',
    'Fixed: badge builds differently.',
  ]), `words/changes: new sets in one line, building blocks left out, the icon value, the tokens, the fix (${JSON.stringify(c.changes)})`);
  ok(c.footer === 'Generated by Prism3. Edits are kept aside on the next Update.', `words/footer (${c.footer})`);
  ok(!JSON.stringify(c).includes('33') && !/revision|executor/i.test(JSON.stringify(c)), 'words/no executor revision (Q479.5 A)');
  // A build between folds runs under the previous number; an engine older than every note has none to show.
  ok(aboutContent({ updated: 'x', engine: '0.237.5' }).heading === 'What changed in 0.237.0', 'words/between folds: the newest notes at or below the engine');
  const none = aboutContent({ updated: 'x', engine: '0.100.0' });
  ok(none.heading === null && none.changes.length === 0 && none.rows[0].note === '', 'words/no notes: no heading, no changes, no release date');
  ok(countsLine({ version: '9.9.9', from: '', date: '', counts: { breaking: 2, new: 0, fix: 1 } }) === '9.9.9: 1 fix. 2 breaking changes.', 'words/counts with breaking');
}

/* ── cap ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('cap — more changes than the frame lists');
{
  const items = Array.from({ length: 9 }, (_, i) => ({ class: 'new', area: 'figma', kind: 'value-added', component: `s${i}`, text: `\`s${i}\`: \`p\` has a new value, \`v\`.` }));
  const lines = whatChanged({ version: '1.0.0', from: '', date: '', counts: { breaking: 0, new: 9, fix: 0 }, items });
  ok(lines.length === 6 && lines[5] === 'And 4 more in the release notes.' && lines[0] === 's0: p has a new value, v.', `cap/six lines, the last a count (${JSON.stringify(lines)})`);
  const br = whatChanged({ version: '1.0.0', from: '', date: '', counts: { breaking: 1, new: 1, fix: 0 }, items: [items[0], { class: 'breaking', area: 'figma', kind: 'value-removed', component: 'x', text: '`x`: `p` lost a value, `v`.' }] });
  ok(br[0] === 'Breaking: x: p lost a value, v.', `cap/breaking first (${JSON.stringify(br)})`);
}

/* ── last ────────────────────────────────────────────────────────────────────────────────────────────── */
section('last — "Last changed in", from the release notes only');
{
  const b = lastChangedIn('button', '0.237.0');
  ok(eq(lastChangedLines(b), ['Last changed in 0.236.0 · 2026-10-10', 'Builds differently.']), `last/button: the wireframe's block (${JSON.stringify(lastChangedLines(b))})`);
  const tf = lastChangedIn('text-field', '0.237.0');
  ok(eq(lastChangedLines(tf), ['Last changed in 0.236.0 · 2026-10-10', 'state has a new value, focus-visible-filled.']), `last/text field: the wireframe's block (${JSON.stringify(lastChangedLines(tf))})`);
  const capped = lastChangedIn('button', '0.235.0');
  ok(eq(lastChangedLines(capped), ['Last changed in 0.235.0 · 2026-10-09', 'Has a new property, inset, with the values default and flush.']), `last/capped at the engine (${JSON.stringify(lastChangedLines(capped))})`);
  ok(eq(lastChangedLines(lastChangedIn('avatar', '0.237.0')), ['Unchanged since 0.234.0']), `last/unnamed set: unchanged since the oldest notes (${JSON.stringify(lastChangedLines(lastChangedIn('avatar', '0.237.0')))})`);
  ok(lastChangedIn('button', '0.1.0').kind === 'none' && lastChangedLines(lastChangedIn('button', '0.1.0')).length === 0, 'last/no notes that old: nothing');
  // Code items are not the set's Figma change: Select's 0.235.0 code prop sits beside its Figma axis, and only the axis counts.
  const sel = lastChangedIn('select', '0.235.0');
  ok(sel.kind === 'changed' && eq(sel.items, ['Has a new property, size, with the values large, medium and small.']), `last/Figma items only (${JSON.stringify(sel)})`);
}

/* ── publish ─────────────────────────────────────────────────────────────────────────────────────────── */
section('publish — the description offered after an Update');
{
  const d = publishDescription({ title: 'Saved before Prism3 updated 2 sets', sets: ['icon', 'badge'], from: '0.236.0', engine: '0.237.0', contract: '14.7.0' });
  ok(d === 'Saved before Prism3 updated 2 sets. Engine 0.237.0, from 0.236.0. Token contract 14.7.0.\nicon: name has a new value, menu.\nbadge: builds differently.\nNo breaking changes.',
    `publish/wireframe: word for word (${JSON.stringify(d)})`);
  const r = publishDescription({ title: 'Before Prism3 updated button', sets: ['button'], from: '0.234.0', engine: '0.237.0', contract: '14.7.0', consumerBreaks: 2 });
  ok(r === 'Before Prism3 updated button. Engine 0.237.0, from 0.234.0. Token contract 14.7.0.\nbutton: builds differently.\nbutton: has a new property, inset, with the values default and flush.\n2 breaking changes for library consumers.',
    `publish/range: each release after the file's engine, newest first, and the consumer breaks (${JSON.stringify(r)})`);
  // One change seen from two sides: a breaking release item and the Update's own consumer break are counted once (#2876 review).
  const bix: ReleaseIndex = { releases: [{ version: '9.0.0', from: '8.0.0', date: '2026-11-01', counts: { breaking: 1, new: 0, fix: 0 },
    items: [{ class: 'breaking', area: 'figma', kind: 'axis-removed', component: 'button', text: '`button`: the `tone` property is gone.' }] }] };
  const once = publishDescription({ title: 'T', sets: ['button'], from: '8.0.0', engine: '9.0.0', contract: '1.0.0', consumerBreaks: 1, ix: bix });
  ok(once.endsWith('\n1 breaking change for library consumers.'), `publish/breaking counted once (${JSON.stringify(once)})`);
  const noted = publishDescription({ title: 'T', sets: ['button'], from: '8.0.0', engine: '9.0.0', contract: '1.0.0', ix: bix });
  ok(noted.endsWith('\nIncludes breaking changes for library consumers.'), `publish/a breaking release item with no consumer count is still named (${JSON.stringify(noted)})`);
  const first = publishDescription({ title: 'Before Prism3 updated tag', sets: ['tag'], from: null, engine: '0.237.0', contract: '14.7.0' });
  ok(first === 'Before Prism3 updated tag. Engine 0.237.0. Token contract 14.7.0.\nNo breaking changes.', `publish/no from: the engine's own release only, which names no tag item (${JSON.stringify(first)})`);
}

/* ── the shim as a file with a Cover page ────────────────────────────────────────────────────────────── */
type CoverPage = { name: string; children: Node[]; appendChild(c: Node): void };
const pageOf = (name: string): CoverPage => {
  const p: CoverPage = { name, children: [], appendChild(c: Node) { const was = c.parent as { children?: Node[] } | undefined; if (was?.children) was.children.splice(was.children.indexOf(c), 1); c.parent = p; p.children.push(c); } };
  return p;
};
/** Every text's characters under a node, in order: what the canvas shows. */
const textsOf = (n: Node): string[] => n.type === 'TEXT' ? [String(n.characters ?? '')] : ((n.children as Node[] | undefined) ?? []).flatMap(textsOf);
const recordOf = (n: Node): Record<string, string> => { const raw = (n.getSharedPluginData as (a: string, b: string) => string)(ABOUT_NS, ABOUT_KEY); return raw ? JSON.parse(raw) : {}; };
const tagged = (p: CoverPage): Node[] => p.children.filter((n) => (n.getSharedPluginData as (a: string, b: string) => string)?.(ABOUT_NS, ABOUT_KEY));
const fileWithCover = (thumb = true) => {
  const api = makeShim({}) as Record<string, any>;
  const cover = pageOf('Cover');
  let t: Node | null = null;
  if (thumb) { t = api.createFrame(); t!.name = 'Thumbnail'; (t!.resize as (w: number, h: number) => void)(1920, 1080); cover.appendChild(t!); t!.x = 100; t!.y = 50; }
  // A designer's note further right and lower, so "beside the thumbnail" and "past the page's content" differ.
  const note = api.createFrame(); note.name = 'Note'; (note.resize as (w: number, h: number) => void)(400, 300); cover.appendChild(note); note.x = 4000; note.y = 900;
  api.getFileThumbnailNodeAsync = async () => t;
  return { api, cover, thumb: t, root: { children: [cover, pageOf('Components')] } };
};

/* ── draw ────────────────────────────────────────────────────────────────────────────────────────────── */
section('draw — beside the thumbnail frame on the Cover page');
{
  const f = fileWithCover();
  ok(eq(await aboutDue(f.root, '0.237.0', '14.7.0'), { state: 'missing' }), 'draw/due: a Cover page with no frame reads missing');
  const o = await drawAbout(f.api as AboutApi, f.root, { updated: '2026-10-20', engine: '0.237.0', contract: '14.7.0' });
  const fr = tagged(f.cover);
  ok(o.drawn && !o.replaced && fr.length === 1 && fr[0].name === 'About this library', `draw/one frame, named (${fr.map((n) => n.name)})`);
  ok(fr[0].x === 100 + 1920 + 40 && fr[0].y === 50, `draw/beside the thumbnail: 40px right of it, top-aligned (${fr[0].x}, ${fr[0].y})`);
  ok(fr[0].width === 720 && fr[0].height === 960, `draw/720 × 960 (${fr[0].width} × ${fr[0].height})`);
  const shown = textsOf(fr[0]);
  ok(eq(shown.slice(0, 10), ['About this library', 'Engine', '0.237.0', 'Released 2026-10-15', 'Token contract', '14.7.0', 'Changes only when a token name is added, renamed or removed.', 'Updated', '2026-10-20', 'By Update.']),
    `draw/rows on the canvas (${JSON.stringify(shown.slice(0, 10))})`);
  ok(shown.includes('What changed in 0.237.0') && shown.includes('0.237.0: 29 new, 1 fix. No breaking changes.')
    && shown.includes(['• 8 new sets: accordion, divider, list, list-item, segmented-control, segmented-control-segment, tab, tabs.', '• icon: name has a new value, menu.', '• 9 new tokens under type.label.', '• Fixed: badge builds differently.'].join('\n')),
    `draw/what changed on the canvas (${JSON.stringify(shown.slice(10))})`);
  const rec = recordOf(fr[0]);
  ok(rec.engine === '0.237.0' && rec.contract === '14.7.0' && rec.updated === '2026-10-20' && !!rec.print, `draw/record (${JSON.stringify({ ...rec, print: rec.print ? '…' : '' })})`);
  ok(eq(await aboutDue(f.root, '0.237.0', '14.7.0'), { state: 'current' }), 'draw/current after drawing');
  ok(f.cover.children.includes(f.thumb!) && f.thumb!.name === 'Thumbnail', 'draw/the thumbnail untouched');
  // No thumbnail frame: past whatever the page holds.
  const g = fileWithCover(false);
  const art = g.api.createFrame(); (art.resize as (w: number, h: number) => void)(300, 200); g.cover.appendChild(art); art.x = 10; art.y = 20;
  await drawAbout(g.api as AboutApi, g.root, { updated: 'd', engine: '0.237.0', contract: '14.7.0' });
  ok(tagged(g.cover)[0].x === 4440 && tagged(g.cover)[0].y === 20, `draw/no thumbnail: past the page's content (${tagged(g.cover)[0].x}, ${tagged(g.cover)[0].y})`);
}

/* ── redraw ──────────────────────────────────────────────────────────────────────────────────────────── */
section('redraw — a new engine; a frame left alone is replaced, an edited one kept aside');
{
  const f = fileWithCover();
  await drawAbout(f.api as AboutApi, f.root, { updated: '2026-10-20', engine: '0.236.0', contract: '14.7.0' });
  const first = tagged(f.cover)[0];
  first.x = 3000; first.y = 400;   // a designer moved it: not an edit, and the redraw keeps the place
  ok(eq(await aboutDue(f.root, '0.237.0', '14.7.0'), { state: 'stale', from: { engine: '0.236.0', contract: '14.7.0' } }), 'redraw/stale: drawn for another engine');
  ok(eq(await aboutDue(f.root, '0.236.0', '14.8.0'), { state: 'stale', from: { engine: '0.236.0', contract: '14.7.0' } }), 'redraw/stale contract');
  const o = await drawAbout(f.api as AboutApi, f.root, { updated: '2026-10-21', engine: '0.237.0', contract: '14.7.0' });
  const now = tagged(f.cover);
  ok(o.replaced && o.from === '0.236.0' && !o.kept && now.length === 1 && now[0] !== first && !!first.removed, `redraw/replaced: the old frame removed, one frame left (${now.length}, from ${o.from})`);
  ok(now[0].x === 3000 && now[0].y === 400, `redraw/in place (${now[0].x}, ${now[0].y})`);
  ok(textsOf(now[0]).includes('2026-10-21') && textsOf(now[0]).includes('0.237.0'), 'redraw/new words');
  // A designer's edit: one text changed.
  const t = (now[0].findAll as (p: (n: Node) => boolean) => Node[])((n) => n.type === 'TEXT' && n.characters === 'By Update.')[0];
  t.characters = 'By Update. Ask Sam before publishing.';
  // The dry run says so before anything is written (#2876 review).
  const dueEdited = await aboutDue(f.root, '0.237.0', '14.7.0');
  ok(eq(dueEdited, { state: 'current', edited: true }) && aboutDueLine(dueEdited) === 'About this library: edited by hand. An Update that writes keeps your copy aside, named "About this library (edited)", and draws a new one.',
    `redraw/dry run names the edit (${JSON.stringify(dueEdited)}; ${aboutDueLine(dueEdited)})`);
  const e = await drawAbout(f.api as AboutApi, f.root, { updated: '2026-10-22', engine: '0.237.0', contract: '14.7.0' });
  const after = tagged(f.cover);
  const kept = f.cover.children.find((n) => n.name === 'About this library (edited)');
  ok(e.kept === 'About this library (edited)' && !!kept && kept === now[0] && !kept.removed, `redraw/edited kept: renamed, not removed (${e.kept})`);
  ok(after.length === 1 && after[0] !== kept && !(kept!.getSharedPluginData as (a: string, b: string) => string)(ABOUT_NS, ABOUT_KEY), 'redraw/edited untagged: the next Update never touches it');
  ok(kept!.y === 400 + 960 + 40 && after[0].y === 400, `redraw/edited moved below the new frame (${kept!.y})`);
  ok(textsOf(kept!).includes('By Update. Ask Sam before publishing.'), 'redraw/the edit survives');
  // A second edit, kept aside too: below the first copy, never on top of it (#2876 review).
  const t2 = (after[0].findAll as (p: (n: Node) => boolean) => Node[])((n) => n.type === 'TEXT' && n.characters === 'By Update.')[0];
  t2.characters = 'By Update, again.';
  const stale = await aboutDue(f.root, '0.238.0', '14.7.0');
  ok(aboutDueLine(stale).endsWith('Your edited copy will be kept aside, named "About this library (edited)".'), `redraw/a stale edited frame is named in the dry run (${aboutDueLine(stale)})`);
  await drawAbout(f.api as AboutApi, f.root, { updated: '2026-10-23', engine: '0.238.0', contract: '14.7.0' });
  const copies = f.cover.children.filter((n) => n.name === 'About this library (edited)').sort((a, b) => (a.y as number) - (b.y as number));
  ok(copies.length === 2 && (copies[1].y as number) >= (copies[0].y as number) + (copies[0].height as number) + 40, `redraw/edited copies stack, never overlap (${copies.map((c) => c.y)})`);
}

/* ── cover ───────────────────────────────────────────────────────────────────────────────────────────── */
section('cover — no Cover page');
{
  const api = makeShim({}) as Record<string, any>;
  const root = { children: [pageOf('Components')] };
  ok(eq(await aboutDue(root), { state: 'no-cover' }), 'cover/due: no-cover');
  const o = await drawAbout(api as AboutApi, root, { updated: 'd' });
  ok(!o.drawn && o.skipped === 'the file has no Cover page. Run Set up file, then Update', `cover/not drawn, and why (${o.skipped})`);
  ok((await aboutDue({})) === undefined, 'cover/no page list: nothing read');
}

/** The components a plan nests or swaps to, which the file holds before the set is built (as `test-update-apply.ts`). */
const planComps = (n: { swapTarget?: string; nestTarget?: string; nestOverrides?: readonly { type: string; value: string }[]; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];

/* ── update ──────────────────────────────────────────────────────────────────────────────────────────── */
section('update — through a real Update in the component shim');
{
  const id = 'tag';
  const d = componentDefs.find((x) => x.id === id)!;
  const plans = figmaAnatomySet(d, { swapTarget: SWAP_TARGET });
  const page = pageOf('↳ Tag');
  const api = makeShim({
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0', 'space/999'])],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page: page as never, liveRoot: true, identities: true, scaleConstrained: true,
  }) as Record<string, any>;
  const built = await applyComponentPlan(plans, api as never);
  if (built.misses.length) throw new Error(`premise: ${id} built with misses: ${built.misses[0]}`);
  const cover = pageOf('Cover');
  const thumb = api.createFrame(); thumb.name = 'Thumbnail'; thumb.resize(1920, 1080); cover.appendChild(thumb); thumb.x = 0; thumb.y = 0;
  api.getFileThumbnailNodeAsync = async () => thumb;
  const pages = [cover, page];
  const host = { ...api, root: { ...api.root, get children() { return pages; },
    findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  const targets = [{ def: id, plans }];
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(pre.about?.state === 'missing' && v.lines.includes('About this library: to draw on the Cover page.'), `update/dry run lists the frame (${v.lines.join(' | ')})`);
  ok(v.headline === 'Would draw About this library', `update/dry run headline: the frame as the only work reads as work (${v.headline})`);
  ok(!tagged(cover).length && api._versions.length === 0, 'update/the check wrote nothing');
  // Hash: a frame drawn between the check and the confirm is a different file.
  const sneak = await previewUpdate(host, targets);
  await drawAbout(api as AboutApi, host.root as never, { updated: 'x' });
  const refused = await applyUpdate(host, api as never, targets, previewHashOf(sneak), { today: '2026-10-21' });
  ok(!!refused.refusedAll && api._versions.length === 0, `update/hash: the frame drawn since the check refuses the confirm (${refused.refusedAll})`);
  for (const n of tagged(cover)) (n.remove as () => void)();
  const pre2 = await previewUpdate(host, targets);
  const res = await applyUpdate(host, api as never, targets, previewHashOf(pre2), { today: '2026-10-21' });
  const fr = tagged(cover);
  ok(res.about?.drawn === true && fr.length === 1 && fr[0].x === 1960 && fr[0].y === 0, `update/drawn beside the thumbnail, read off the shim (${fr.length}, ${fr[0]?.x}, ${fr[0]?.y})`);
  ok(eq(api._versions, ['Before Prism3 updated About this library']), `update/one version naming the frame, saved first (${JSON.stringify(api._versions)})`);
  const shown = textsOf(fr[0]);
  ok(shown.includes('2026-10-21'), `update/the run's date on the canvas (${shown.slice(7, 9)})`);
  const verdict = applyVerdict(res);
  ok(verdict.headline === '✓ About this library drawn' && verdict.lines.includes('About this library: drawn on the Cover page.'), `update/verdict (${verdict.headline}; ${verdict.lines.join(' | ')})`);
  ok(typeof res.publish === 'string' && res.publish.startsWith('Before Prism3 updated About this library. Engine ') && res.publish.endsWith('No breaking changes.'), `update/publish description returned (${JSON.stringify(res.publish)})`);
  const again = await previewUpdate(host, targets);
  ok(again.about?.state === 'current' && !previewVerdict(again).lines.some((l) => l.startsWith('About this library')) && previewVerdict(again).headline === '✓ All sets up to date', `update/converges: the next check reads the frame current (${previewVerdict(again).headline})`);
  const idle = await applyUpdate(host, api as never, targets, previewHashOf(again), { today: '2026-10-22' });
  ok(api._versions.length === 1 && !idle.about && !idle.publish && tagged(cover).length === 1, 'update/nothing to do: no version, no redraw, no description');
  // A plan change: the set is updated, and the frame, current, is redrawn for the run's date (every Update that writes).
  const moved = plans.map((p) => { const q = JSON.parse(JSON.stringify(p)); (q.root.children.find((c: { name: string }) => c.name === 'content').bound as Record<string, string>).itemSpacing = 'space/999'; return q; });
  const t2 = [{ def: id, plans: moved }];
  const pre3 = await previewUpdate(host, t2);
  const res3 = await applyUpdate(host, api as never, t2, previewHashOf(pre3), { today: '2026-10-23' });
  const fr3 = tagged(cover);
  ok(eq(api._versions.slice(1), ['Before Prism3 updated tag']) && res3.about?.drawn && res3.about.replaced && fr3.length === 1 && textsOf(fr3[0]).includes('2026-10-23'),
    `update/redrawn by a run that changed a set, with its date (${JSON.stringify(api._versions)}; ${fr3.length})`);
  ok(typeof res3.publish === 'string' && res3.publish.startsWith('Before Prism3 updated tag. Engine ') && res3.publish.includes('Token contract '), `update/publish names the set's run (${JSON.stringify(res3.publish)})`);
}

/* ── the index the plugin bundles ────────────────────────────────────────────────────────────────────── */
section('bundle — the release index carries the items the plugin reads');
{
  const ix = RELEASES as ReleaseIndex;
  const r = ix.releases.find((x) => x.version === '0.236.0');
  ok(!!r?.items && r.items.filter((i) => i.class === 'fix' && i.component === 'button').length === 1 && !r.items.some((i) => i.area === 'code'), 'bundle/0.236.0: fixes carried, code items left out');
}

console.log(failed ? `\n✗ ${failed} of ${executed} failed` : `\n✓ all passed — ${executed} assertions executed`);
if (failed) process.exit(1);
