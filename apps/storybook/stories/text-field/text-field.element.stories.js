/**
 * `<p3-text-field>`, the custom element from `@prism3/web-components` (#3408 S5). Its controls come from
 * `custom-elements.json`; every story sets the element's properties, the API a client uses. Cases: `../fields.js`.
 */
import { storiesFor } from '../fields.js';

const S = storiesFor('text-field', 'element');

export default { title: 'Components/Text Field/Element', component: 'p3-text-field' };

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
