/**
 * Glass fills (#3073, owner Q806, Q807 A): the `glassRoles` lever's reads and writes, for Surfaces & fills › Glass.
 *
 * The brand ships one glass fill, `color.glass.surface` (white or black glass), which this page shows read-only. A
 * brand adds its own as `glassRoles.<name>`: a color, from a role (`role: 'foreground.primary'`, the card) or a palette
 * color (`palette: 'white'`), at an opacity. The engine validates the name and the source and refuses a bad one, so
 * these writes stay plain: the page shows the refusal, and the preview keeps the last valid theme.
 *
 * Brand-wide, like Dialog surface (the engine has no per-mode value), so it writes the same bytes from any editable
 * mode (the Q54 rule). Removing the last role removes the key, so a brand that adds none is byte-identical to one
 * that never had the lever.
 */
import type { GlassRoleInput } from '@prism3/engine/theme';
import { brandState, getPath, setPath } from './store';

/** The sources the page offers, DRAFT labels for the owner (#3073). Each is `role:<path>` or `palette:<color>`. */
export const GLASS_SOURCES: readonly { v: string; l: string }[] = [
  { v: 'role:foreground.primary', l: 'Card color' },
  { v: 'role:background.primary', l: 'Page color' },
  { v: 'palette:white', l: 'White' },
  { v: 'palette:black', l: 'Black' },
];
/** What an added fill starts as: the card color at the white glass's light-mode opacity. */
export const NEW_GLASS: GlassRoleInput = { role: 'foreground.primary', alpha: 70 };

/** The brand's added glass fills, in the order it declares them. */
export const readGlassRoles = (): Record<string, GlassRoleInput> => ({ ...(getPath(brandState, 'glassRoles') ?? {}) });
/** A role's source as the page's select value. */
export const sourceOf = (g: GlassRoleInput): string => (g.role ? `role:${g.role}` : `palette:${g.palette}`);

const write = (roles: Record<string, GlassRoleInput>): void => {
  if (Object.keys(roles).length) setPath(brandState, 'glassRoles', roles);
  else delete (brandState as { glassRoles?: unknown }).glassRoles;
};

/** Add a fill under the first free name: `card`, then `card-2`, `card-3`. */
export const addGlassRole = (): void => {
  const roles = readGlassRoles();
  let name = 'card';
  for (let n = 2; name in roles; n++) name = `card-${n}`;
  write({ ...roles, [name]: { ...NEW_GLASS } });
};
export const removeGlassRole = (name: string): void => {
  const { [name]: _gone, ...rest } = readGlassRoles();
  write(rest);
};
/** Rename in place, keeping the declared order. The engine refuses a name it cannot take. */
export const renameGlassRole = (from: string, to: string): void => {
  const t = to.trim();
  if (!t || t === from) return;
  write(Object.fromEntries(Object.entries(readGlassRoles()).map(([k, v]) => [k === from ? t : k, v])));
};
export const setGlassSource = (name: string, source: string): void => {
  const roles = readGlassRoles();
  const g = roles[name];
  if (!g) return;
  const [kind, value] = [source.slice(0, source.indexOf(':')), source.slice(source.indexOf(':') + 1)];
  roles[name] = kind === 'role' ? { role: value, alpha: g.alpha } : { palette: value, alpha: g.alpha };
  write(roles);
};
export const setGlassAlpha = (name: string, alpha: number): void => {
  const roles = readGlassRoles();
  if (!roles[name]) return;
  roles[name] = { ...roles[name], alpha };
  write(roles);
};
