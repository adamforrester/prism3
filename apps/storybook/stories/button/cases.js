/**
 * The button's stories, shared by both delivery forms so they stay the same set (#3408 S5).
 *
 * Each case is the def's props in their attribute spelling (`@prism3/css`'s `data-prop-*` names, plus the state
 * props), and, for a pseudo-class state, the `pseudo` parameter that forces it. One case per state the def lists
 * (rest, hover, pressed, focus-visible, disabled, inactive, pending), then each appearance, size and surface.
 */
export const ICON_ADD = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z"/></svg>';
export const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"/></svg>';

export const CASES = {
  Rest: { props: {} },
  Hover: { props: {}, pseudo: { hover: true } },
  Pressed: { props: {}, pseudo: { active: true } },
  FocusVisible: { props: {}, pseudo: { focusVisible: true } },
  Disabled: { props: { disabled: true } },
  Inactive: { props: { isInactive: true } },
  Pending: { props: { isPending: true }, label: 'Saving' },
  Filled: { props: { appearance: 'filled' } },
  Outline: { props: { appearance: 'outline' } },
  Text: { props: { appearance: 'text' } },
  TextFlush: { props: { appearance: 'text', inset: 'flush' } },
  Small: { props: { size: 'small' } },
  Medium: { props: { size: 'medium' } },
  Large: { props: { size: 'large' } },
  Inverse: { props: { surface: 'inverse' }, surface: 'inverse' },
  InverseOutline: { props: { surface: 'inverse', appearance: 'outline' }, surface: 'inverse' },
  WithVisuals: { props: {}, leading: ICON_ADD, trailing: ICON_ARROW, label: 'Add item' },
  FullWidth: { props: { fullWidth: true } },
};

/** A case's story parameters: the forced pseudo-class, and the ground the preview frame paints. */
export const parameters = (c) => ({ ...(c.pseudo ? { pseudo: c.pseudo } : {}), ...(c.surface ? { surface: c.surface } : {}) });
