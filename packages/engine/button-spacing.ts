/**
 * Button's spacing, per size, at COMFORTABLE density (the spacing model, 2026-09-29, `docs/28` §5.4) — the
 * button family's own spec, as `space.*` steps. `button.ts` spreads it into every button def's `tokens`, and
 * names the four keys in `densitySpacing`, so density moves each one step along the space ladder.
 *
 * ITS OWN MODULE, outside `components/` (which holds defs only, `typecheck-components.ts`), for one reason: the studio's button specimen reads these steps, and importing a def would put
 * every component def's prose into the web bundle, which the studio keeps out on purpose (`main.ts`,
 * `COMPONENT_CATALOGUE`). This file is data only and imports nothing.
 *
 * The horizontal model and its ordering (#325, #326) are argued in `button.ts` beside the tokens.
 */
export const BUTTON_SPACING = {
  'size.small.padding-x': 'space.200',
  'size.small.padding-x-visual': 'space.150',
  'size.small.padding-y': 'space.075',
  'size.small.gap': 'space.100',
  'size.medium.padding-x': 'space.200',
  'size.medium.padding-x-visual': 'space.150',
  'size.medium.padding-y': 'space.100',
  'size.medium.gap': 'space.100',
  'size.large.padding-x': 'space.300',
  'size.large.padding-x-visual': 'space.200',
  'size.large.padding-y': 'space.100',
  'size.large.gap': 'space.150',
} as const;
