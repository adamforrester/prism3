/**
 * THE FOCUSED FIELD THAT HOLDS A VALUE (#2318, owner decision Q157, 2026-10-09: a new state, `focus-visible-filled`).
 *
 * Whether that member draws the text cursor (Q157.3) is re-asked, so it is ONE switch, read by text-field and textarea
 * (select has no insertion point, so it draws none either way). `true`: the member draws the field's caret at the
 * START of the value, the one caret node each field has (two parts cannot share the `caret` paint slot, and textarea's
 * value fills the box and wraps, so nothing can follow its last character). `false`: no caret on the focused filled
 * member. Flip this line and regenerate; nothing else changes.
 */
export const FOCUSED_FILLED_CARET: boolean = true;
