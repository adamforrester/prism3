import { readFileSync, writeFileSync } from 'node:fs';
import { resolveAllModes } from '/home/user/prism3/packages/engine/modes';
import { nbTheme } from '/home/user/prism3/packages/engine/nb-fixture';
import { parseDesignMd } from '/home/user/prism3/packages/engine/design-md';
import { brandTheme } from '/home/user/prism3/packages/engine/theme';
const ground = process.argv[3];
const mk = (t: any) => (ground ? { ...t, interactiveGround: ground } : t);
const ex = (id: string) => mk(brandTheme(parseDesignMd(readFileSync(`/home/user/prism3/packages/engine/examples/${id}.design.md`, 'utf8')).input as any));
const themes: Record<string, any> = { nb: mk(nbTheme()), aurora: ex('aurora'), harbor: ex('harbor') };
const out: any = {};
for (const [id, t] of Object.entries(themes)) {
  out[id] = {};
  for (const m of resolveAllModes(t)) {
    out[id][m.mode] = Object.fromEntries(Object.entries(m.roles).map(([k, r]: any) => [k, { path: r.path, hex: r.hex, against: r.against, min: r.min, ratio: +r.ratio.toFixed(2), also: r.alsoAgainst?.against }]));
    out[id][m.mode].__tier = m.tierChecks;
    out[id][m.mode].__warn = m.warnings;
  }
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
