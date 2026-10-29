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
import { GLASS_ROLE_NAME, SHIPPED_GLASS_ROLE, type GlassRoleInput } from '@prism3/engine/theme';
import { brandState, getPath, setPath } from './store';

/** The sources the page offers, DRAFT labels for the owner (#3073). Each is `role:<path>` or `palette:<color>`. */
export const GLASS_SOURCES: readonly { v: string; l: string }[] = [
  { v: 'role:foreground.primary', l: 'Card color' },
  { v: 'role:background.primary', l: 'Page color' },
  { v: 'palette:white', l: 'White' },
  { v: 'palette:black', l: 'Black' },
];
/** What an added fill starts as: the card color at the white glass's light-mode opacity. Its name is the designer's (Q827 A). */
export const NEW_GLASS: GlassRoleInput = { role: 'foreground.primary', alpha: 70 };

/** The brand's added glass fills, in the order it declares them. */
export const readGlassRoles = (): Record<string, GlassRoleInput> => ({ ...(getPath(brandState, 'glassRoles') ?? {}) });
/** A role's source as the page's select value. */
export const sourceOf = (g: GlassRoleInput): string => (g.role ? `role:${g.role}` : `palette:${g.palette}`);

const write = (roles: Record<string, GlassRoleInput>): void => {
  if (Object.keys(roles).length) setPath(brandState, 'glassRoles', roles);
  else delete (brandState as { glassRoles?: unknown }).glassRoles;
};

/** The name field's hint, a DRAFT for the owner (#3106, Q827 A). The field starts empty: no name is chosen for the designer. */
export const GLASS_NAME_HINT = 'e.g. card, header, overlay';

/**
 * Why a typed glass fill name can't be taken, or null when it can (#3106, Q827 A; each line a DRAFT for the owner). The
 * name becomes a token segment, `color.glass.<name>`, so it is required, a lowercase slug (the engine's own rule,
 * `GLASS_ROLE_NAME`, so the page and the engine refuse the same names), not the shipped `surface`, and not one the
 * brand already has. Surrounding spaces are dropped; nothing else is changed for the designer, so what is added is
 * what was typed.
 */
export const glassNameRefusal = (typed: string, taken: readonly string[]): string | null => {
  const name = typed.trim();
  if (!name) return 'A glass fill needs a name, such as card.';
  if (name === SHIPPED_GLASS_ROLE) return 'surface is the shipped glass fill, so another fill can\'t use its name.';
  if (!GLASS_ROLE_NAME.test(name)) return 'A name is lowercase letters, digits and hyphens, starting with a letter, such as top-bar.';
  if (taken.includes(name)) return `This brand already has glass.${name}. Each glass fill needs its own name.`;
  return null;
};

/** A fill's readable name for its row, as the shipped one reads "Glass surface": `top-bar` reads "Glass top bar". */
export const glassLabel = (name: string): string => `Glass ${name.replace(/-/g, ' ')}`;

/** Add a fill under the name the designer typed, at the end. The caller has checked it with `glassNameRefusal`; a name
 *  it refuses writes nothing. */
export const addGlassRole = (typed: string): boolean => {
  const roles = readGlassRoles();
  if (glassNameRefusal(typed, Object.keys(roles))) return false;
  write({ ...roles, [typed.trim()]: { ...NEW_GLASS } });
  return true;
};
export const removeGlassRole = (name: string): void => {
  const { [name]: _gone, ...rest } = readGlassRoles();
  write(rest);
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
