---
engine: patch
---
Counter accessibility (#2693, owner decision Q425 A): the shipped keyboard, focus and aria text state the spinbutton pattern in full. The counter is one Tab stop at the value; Up and Down Arrow, Page Up and Page Down, Home and End step it; `aria-valuetext` carries a formatted value; the minus and plus buttons are `tabindex="-1"` and not `aria-hidden`; one focus ring wraps the row. No token or layout change.
