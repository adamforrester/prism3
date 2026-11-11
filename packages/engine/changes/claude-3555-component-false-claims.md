---
engine: minor
---
Component prose corrected where it was false (#3555): Toast's target-size line describes its 20px close glyph; PasswordField,
CardNumberField, CodeInput and ImagePlaceholder name the built component (CodeInput, WalletButton, Counter, Veil)
instead of calling it unbuilt, and PasswordField lists CodeInput in `alternativeTo`; FocusRing no longer claims fields nest it, and drops text-field, textarea and select from
its partners; Radio says native radios leave Home/End to script; Pagination and SegmentedControl say medium clears 44px;
Button's 4.1.2 line limits `aria-pressed` to a toggle button, and its error line names FieldMessage or Banner.
