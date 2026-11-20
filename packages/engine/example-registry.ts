/**
 * THE EXAMPLE BRANDS, AND WHAT EACH ONE IS (#3977).
 *
 * The ids the hosts list, in menu order, each beside the one line the hosts show under its name, so a designer
 * knows what an example is without opening it. Pure (no `node:*`), so a host bundles it; `emit-brandinput.ts`
 * reads the ids from here and parses each `examples/<id>.design.md` into `schema/example-brands.json`.
 *
 * WHY HERE AND NOT IN THE `design.md`. A description is not a brand input: no token emits from it, and the
 * frontmatter compiles 1:1 to `BrandInput` (docs/07 §6), whose schema would have to carry a field only these
 * three files use. The registry is the examples' own source of truth for which examples exist, so the line that
 * says what each is sits in the same entry as its id: an example added here without a description is a type error.
 *
 * The copy is the owner's, approved in #3977 (Q-EB1 A): recessive, a few words, the brand's character in the
 * engine's terms. A new example's line goes to the owner as DRAFT before it ships.
 */
export const EXAMPLES = [
  // The canonical default theme (#1296), first because it is the one the hosts boot.
  { id: 'prism3', description: 'The default. Saturated blue, balanced.' },
  { id: 'aurora', description: 'Soft purple, rounder, quick.' },
  { id: 'harbor', description: 'Muted teal, calm, square.' },
] as const satisfies readonly { id: string; description: string }[];

/** The example ids surfaced to the hosts, in menu order. */
export const EXAMPLE_IDS = EXAMPLES.map((e) => e.id) as readonly (typeof EXAMPLES)[number]['id'][];

/** Example id → the line the hosts show under its name. */
export const EXAMPLE_DESCRIPTIONS: Readonly<Record<string, string>> = Object.fromEntries(EXAMPLES.map((e) => [e.id, e.description]));
