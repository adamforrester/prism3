---
engine: minor
---
The fields' status/helper message is off by default (#2926 item 1, owner decision). TextField, PasswordField, Select and
Textarea now emit their `showMessage` boolean (Figma property `message`) with `default: false`, so the composed
FieldMessage nest is built `visible: false` at every member and a placed field shows no message line until a designer
turns it on. The `showMessage` prop defaults to false in code to match, and the props' docs and the parts' notes say so.
Counter already defaulted off. The four field sets' projected plans move (component surface re-accepted); member counts,
property names and every token are unchanged, so CONTRACT is unchanged.
