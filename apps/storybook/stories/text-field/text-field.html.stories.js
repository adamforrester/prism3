/**
 * The text field as plain HTML and CSS, from `@prism3/css`'s README markup contract (#3408 S5): what a
 * server-rendered page writes, with no script. Same cases as the element stories (`../fields.js`).
 */
import { storiesFor } from '../fields.js';

const S = storiesFor('text-field', 'html');

export default { title: 'Components/Text Field/HTML' };

export const Rest = S.Rest;
export const Filled = S.Filled;
export const Hover = S.Hover;
export const FocusVisible = S.FocusVisible;
export const Error = S.Error;
export const Warning = S.Warning;
export const Success = S.Success;
export const Disabled = S.Disabled;
export const ReadOnly = S.ReadOnly;
export const Pending = S.Pending;
export const Required = S.Required;
export const Small = S.Small;
export const Medium = S.Medium;
export const Large = S.Large;
export const WithIcons = S.WithIcons;
export const RestNoMessage = S.RestNoMessage;
export const HoverNoMessage = S.HoverNoMessage;
export const FocusVisibleNoMessage = S.FocusVisibleNoMessage;
export const DisabledNoMessage = S.DisabledNoMessage;
export const ErrorNoMessage = S.ErrorNoMessage;
