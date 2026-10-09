/**
 * CodeInput — DRAFT for the owner's review on #2428. NOT registered in `components/index.ts`, NOT a
 * shipped def, and it joins no gate list: it exists so the proposal's renders come from a real projected
 * plan rather than a mock-up. A def lands in a PR only after the owner approves the shape.
 *
 * No KB brief. Category `form`: it is a field (label, control, message) whose value is one string.
 * The closest brief is `components/text-field.md` (the label / describedby / autocomplete contract) and
 * the date picker's segmented-input section (`components/date-picker.md`), which is the cautionary case.
 *
 * THE ARCHITECTURE THIS ASSUMES (owner call 1 on #2428): in code, ONE real <input> holds the whole code
 * (autocomplete="one-time-code", inputmode="numeric", maxlength = length), and the cells are a drawing
 * over it. Figma draws the cells as boxes because that is what a designer places; nothing here implies
 * one <input> per cell.
 *
 * LENGTH (owner call 2): eight cells, cells 1–4 always shown and cells 5–8 behind Figma-only booleans,
 * 5 and 6 on by default, so the default instance is a six-digit code. The checkbox-group mechanism
 * (#2344 / #2419), so length multiplies nothing: size(3) × status(2) × state(6) = 36 members.
 *
 * STATES: rest (empty) · hover · focus-visible (empty, cell 1 active) · focus-visible-filled (partial:
 * three digits in, cell 4 active) · filled (complete, unfocused) · disabled. `partial` is not a state name
 * in the closed vocabulary; it is projected as `focus-visible-filled`, which is what a partly typed code
 * almost always is. An unfocused partial code is a code-only coordinate.
 */
import type { ComponentDef, PartDef } from '../../../packages/engine/component-schema';

const CELLS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
/** Cells holding a digit in the partial (focus-visible-filled) member: 1–3, so cell 4 is the active one. */
const PARTIAL = 3;
const SAMPLE = '48291375';

const cellParts: Record<string, PartDef> = {};
for (const i of CELLS) {
  const states = i <= PARTIAL ? ['filled', 'focus-visible-filled'] : ['filled'];
  const activeAt = i === 1 ? 'focus-visible' : i === PARTIAL + 1 ? 'focus-visible-filled' : undefined;
  cellParts[`cell${i}`] = {
    kind: 'box',
    paintSlots: ['overlay', 'fill', 'border'],
    layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
    width: 'size.{size}.cell',
    height: 'size.{size}.cell',
    radius: 'radius',
    strokeWidth: 'border-width',
    ...(i > 4 ? { optional: true } : {}),
    children: [`digit${i}`, ...(activeAt ? [`caret${i}`, `ring${i}`] : [])],
  } as PartDef;
  cellParts[`digit${i}`] = {
    kind: 'text',
    type: 'size.{size}.type',
    presentWhen: { state: states },
    note: `Digit ${i} (sample "${SAMPLE[i - 1]}"). A drawing of one character of the single input's value.`,
  } as PartDef;
  if (activeAt) {
    cellParts[`caret${i}`] = {
      kind: 'box',
      role: 'presentation',
      paintSlots: ['caret'],
      width: 'caret-width',
      height: 'size.{size}.caret-height',
      layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'fixed', y: 'fixed' } },
      presentWhen: { state: [activeAt] },
    } as PartDef;
    cellParts[`ring${i}`] = {
      kind: 'absolute',
      when: activeAt,
      nests: 'focus-ring',
      inset: 'ring-offset',
      strokeInset: 'ring-width',
      nesting: { kind: 'nest-fixed', variant: { surface: 'default' } },
    } as PartDef;
  }
}

export const codeInput: ComponentDef = {
  id: 'code-input',
  name: 'CodeInput',
  aliases: ['otp-input', 'one-time-code', 'verification-code', 'pin-input'],
  category: 'form',
  status: 'draft',
  summary: 'DRAFT — a one-time code field: label, one input drawn as cells, and a message.',
  description:
    'DRAFT — A field for a short one-time code sent by text message, email or an authenticator app. One input holds the whole code; the cells show how many characters it takes.',
  props: [
    { name: 'label', type: 'string | node', required: true, description: 'DRAFT' },
    { name: 'length', type: 'enum: 4 | 6 | 8', values: ['4', '6', '8'], default: '6', required: false, description: 'DRAFT' },
    { name: 'validation', type: "enum: 'default' | 'error'", values: ['default', 'error'], default: 'default', required: false, description: 'DRAFT' },
    { name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'DRAFT' },
    { name: 'showMessage', type: 'boolean', default: true, required: false, description: 'DRAFT' },
  ],
  states: ['rest', 'hover', 'focus-visible', 'focus-visible-filled', 'filled', 'disabled', 'pending', 'empty'],
  variants: { size: ['medium', 'small', 'large'], status: ['default', 'error'] },
  axisKinds: { size: 'authoring', status: 'runtime' },
  paintKeys: ['{status}.{slot}.{state}', '{slot}.{state}', '{slot}'],
  densitySpacing: ['size.{size}.gap'],
  tokens: {
    'radius': 'radius.sm',
    'root-gap': 'space.100',
    'border-width': 'border-width.hairline',
    'ring-width': 'focus.ring.width',
    'ring-offset': 'focus.ring.offset-field',
    'fill': 'color.field.fill',
    'overlay.hover': 'color.interactive.neutral.overlay.hover',
    'label': 'color.text.primary',
    'caret': 'color.text.primary',
    'caret-width': 'border-width.hairline',
    'border': 'color.field.border.rest',
    'border.hover': 'color.field.border.hover',
    'error.border.rest': 'color.border.danger',
    'error.border.hover': 'color.border.danger',
    'error.border.focus-visible': 'color.border.danger',
    'error.border.focus-visible-filled': 'color.border.danger',
    'error.border.filled': 'color.border.danger',
    'error.border.empty': 'color.border.danger',
    'disabled.fill': 'color.disabled.fill',
    'disabled.border': 'color.disabled.border',
    'disabled.label.on-fill': 'color.disabled.on-fill',
    'size.small.cell': 'size.md.min-height',
    'size.small.gap': 'space.100',
    'size.small.type': 'type.body.sm.default',
    'size.small.caret-height': 'control.size.sm.line-box',
    'size.medium.cell': 'size.md.min-height',
    'size.medium.gap': 'space.100',
    'size.medium.type': 'type.body.md.default',
    'size.medium.caret-height': 'control.size.md.line-box',
    'size.large.cell': 'size.lg.height',
    'size.large.gap': 'space.100',
    'size.large.type': 'type.body.lg.default',
    'size.large.caret-height': 'control.size.lg.line-box',
  },
  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        layout: { direction: 'column', align: 'start', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'root-gap',
        children: ['label', 'cells', 'message'],
      },
      label: {
        kind: 'nest',
        nests: 'field-label',
        nesting: { kind: 'nest-exposed', variant: { size: 'medium', emphasis: 'secondary', weight: 'regular', state: 'rest' }, expose: ['emphasis', 'weight'], follow: ['size'] },
        crossAxisFill: true,
      },
      cells: {
        kind: 'box',
        role: 'target',
        layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        gap: 'size.{size}.gap',
        children: CELLS.map((i) => `cell${i}`),
      },
      ...cellParts,
      message: {
        kind: 'nest',
        nests: 'field-message',
        nesting: { kind: 'nest-fixed', variant: { status: 'default' }, follow: ['status'] },
        optional: true,
        crossAxisFill: true,
      },
    },
    codeOnly: [
      'the ONE INPUT — DRAFT: one real <input autocomplete="one-time-code" inputmode="numeric" maxlength={length}> under the cells.',
      'pending — DRAFT: verifying the code; aria-busy, no static skin.',
      'empty — DRAFT: the rest, hover and focus-visible members are the empty code.',
    ],
  },
  figmaProperties: {
    variantAxes: ['size', 'status'],
    stateAxis: { name: 'state', values: ['rest', 'hover', 'focus-visible', 'focus-visible-filled', 'filled', 'disabled'] },
    gridAxis: 'state',
    booleans: {
      cell5: { part: 'cell5', default: true, figmaName: 'Cell 5', figmaOnly: true },
      cell6: { part: 'cell6', default: true, figmaName: 'Cell 6', figmaOnly: true },
      cell7: { part: 'cell7', default: false, figmaName: 'Cell 7', figmaOnly: true },
      cell8: { part: 'cell8', default: false, figmaName: 'Cell 8', figmaOnly: true },
      showMessage: { part: 'message', figmaName: 'message', default: true },
    },
  },
  accessibility: { role: 'DRAFT', wcag: ['DRAFT'], keyboard: 'DRAFT', focus: 'DRAFT', aria: 'DRAFT' },
  docs: { usage: 'DRAFT', do: ['DRAFT'], dont: ['DRAFT'] },
  ai: { primaryPurpose: 'DRAFT', whenToUse: 'DRAFT', avoidWhen: 'DRAFT' },
  composition: { composesWith: ['field-label', 'field-message', 'focus-ring'] },
} as unknown as ComponentDef;
