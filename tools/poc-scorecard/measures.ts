/**
 * THE POC SCORECARD'S ROWS (#3408): each KPI the brief names, and for each arm, the command that measures it.
 *
 * A row is MEASURED (an arm runs a command, and the record holds its exit and summary line) or PENDING (no command
 * measures it yet, and the row says why). The brief's KPIs are written here by hand, from #3408's "KPIs and how each
 * is measured", so a KPI with no measurement still shows on the card instead of dropping off it.
 */
export type Measure = {
  /** The record's file name, and the row's key. */
  id: string;
  /** Run from the repo root, in order, before the measurement; a setup that fails is the record's failure. */
  setup?: string[][];
  /** The measurement: every command runs, in order, and the record holds all their output. */
  cmds: string[][];
  /** Each match's first group is summed into the row's value. A passing run that matches none is "unparsed". */
  value: RegExp[];
  unit: string;
};

/** The brief's KPI rows in card order. `arms` names, per arm, the commands that measure each row it can measure. */
export const ROWS: { id: string; kpi: string; label: string }[] = [
  { id: 'kpi1-cli-scratch', kpi: 'KPI 1', label: 'Developer + CLI, from scratch: time, commands, hand edits, errors' },
  { id: 'kpi1-cli-update', kpi: 'KPI 1', label: 'Developer + CLI, update (primary color and radius): the same' },
  { id: 'kpi1-agent', kpi: 'KPI 1', label: 'Agent + MCP, 5 runs: success, turns, tool calls, tokens, hand fixes' },
  { id: 'kpi2-token-parity-html', kpi: 'KPI 2', label: 'Token parity, HTML/CSS form' },
  { id: 'kpi2-token-parity-element', kpi: 'KPI 2', label: 'Token parity, component form' },
  { id: 'kpi2-api-parity', kpi: 'KPI 2', label: 'API parity: props and variants against the defs' },
  { id: 'kpi2-api-mismatches', kpi: 'KPI 2', label: 'API parity against Figma: mismatches' },
  { id: 'kpi2-geometry-figma', kpi: 'KPI 2', label: 'Geometry against Figma, to 0.01px' },
  { id: 'kpi3-geometry-forms', kpi: 'KPI 3', label: 'Geometry, the two forms against each other, to 0.01px' },
  { id: 'kpi3-axe', kpi: 'KPI 3', label: 'axe, every story, light and dark' },
  { id: 'kpi3-aria', kpi: 'KPI 3', label: 'Accessibility tree, the two forms against each other' },
  { id: 'kpi3-keyboard', kpi: 'KPI 3', label: 'Scripted keyboard pass' },
  { id: 'kpi3-rtl', kpi: 'KPI 3', label: 'Right to left' },
  { id: 'kpi3-one-edit', kpi: 'KPI 3', label: 'One token edit reaches both forms' },
  { id: 'eject-package', kpi: 'Ejection', label: 'Package mode: steps, time, references left to prism3' },
  { id: 'eject-source', kpi: 'Ejection', label: 'Source mode: the same, plus how upstream changes arrive' },
];

const tsx = (f: string, ...a: string[]) => ['npx', 'tsx', f, ...a];
const sb = ['npm', 'run', '-w', '@prism3/storybook', 'build'];
/** The a11y harness's own summary line, never a self-test line: `OK <label>: <n> checks.` */
const harness = (label: string) => [new RegExp(`^OK ${label}: (\\d+) checks\\.`, 'm')];

export const ARMS: Record<string, { measures: Measure[]; pending: Record<string, string> }> = {
  'arm-1': {
    measures: [
      { id: 'kpi2-token-parity-html', cmds: [['npm', 'run', '-w', '@prism3/css', 'check:parity']],
        value: [/^OK parity: (\d+) bindings/m, /^OK parity \(fields\): (\d+) bindings/m], unit: 'bindings' },
      { id: 'kpi2-token-parity-element', cmds: [tsx('packages/web-components/check-token-parity.ts')],
        value: [/^OK token parity \(element form\): (\d+) bindings/m], unit: 'bindings' },
      { id: 'kpi2-api-parity', cmds: [tsx('packages/web-components/check-parity.ts'), tsx('packages/web-components/check-parity-fields.ts')],
        value: [/^OK element parity: <p3-button> has the (\d+) props/m, /^OK element parity \((?:text-field|password-field)\): <p3-[a-z-]+> has the (\d+) props/gm], unit: 'props matched' },
      { id: 'kpi2-api-mismatches', cmds: [tsx('tools/poc-scorecard/api-mismatches.ts', '--manifest', 'packages/web-components/custom-elements.json')],
        value: [/^OK api mismatches: (\d+) mismatches/m], unit: 'mismatches: Figma-exposed props the element lacks' },
      { id: 'kpi2-geometry-figma', setup: [sb, tsx('apps/storybook/check-geometry.ts')], cmds: [tsx('apps/storybook/compare-figma-geometry.ts')],
        value: [/^OK figma geometry: (\d+) comparisons/m], unit: 'comparisons' },
      { id: 'kpi3-geometry-forms', setup: [sb], cmds: [tsx('apps/storybook/check-geometry.ts')], value: [/^OK geometry: (\d+) checks/m], unit: 'checks' },
      { id: 'kpi3-axe', setup: [sb], cmds: [tsx('apps/storybook/check-axe.ts')], value: harness('axe'), unit: 'checks' },
      { id: 'kpi3-aria', setup: [sb], cmds: [tsx('apps/storybook/check-aria.ts')], value: harness('aria'), unit: 'checks' },
      { id: 'kpi3-keyboard', setup: [sb], cmds: [tsx('apps/storybook/check-keyboard.ts')], value: harness('keyboard'), unit: 'checks' },
      { id: 'kpi3-rtl', setup: [sb], cmds: [tsx('apps/storybook/check-rtl.ts')], value: harness('rtl'), unit: 'checks' },
    ],
    pending: {
      'kpi1-cli-scratch': 'not built yet (plan item 4, #3408)',
      'kpi1-cli-update': 'not built yet (plan item 4, #3408)',
      'kpi1-agent': 'the brief and agent setup wait on D2 (#3408); the driver is plan item 5',
      'kpi3-one-edit': 'not built yet (plan item 4, #3408)',
      'eject-package': 'not built yet (plan item 3, #3408)',
      'eject-source': 'not built yet (plan item 3, #3408)',
    },
  },
};

/** The arms the card always shows, measured or not: the brief's two. */
export const CARD_ARMS = ['arm-1', 'arm-2'];
