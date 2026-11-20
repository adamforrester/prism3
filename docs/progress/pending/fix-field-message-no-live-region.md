## (2026-11-18) — FieldMessage drops the field-level live region (#1712)

The owner's decision on #1712 (2026-11-18, A) puts FieldMessage on its brief's model (inline-message §6, §11, §12). The field gets `aria-invalid="true"` and `aria-describedby` pointing at its message, focus moves to the invalid field or the error summary, and nothing on the field is a live region. The form's error summary is the only region that announces. A live region on the field fires while focus moves to the field, so NVDA, JAWS and TalkBack read the error twice.

### What changed

- `field-message.ts`: `accessibility.aria`, the `announcement` code-only entry, the `docs.dont` line, and the 4.1.3 WCAG line, which still told the host to "decide how" to announce a message that arrives without a focus move.
- `text-field.ts`: its aria's error timing said "announce politely", the same advice in two words. PasswordField and SearchField defer to TextField ("as TextField does"), so they follow without an edit. Their own polite regions (show/hide, "Search cleared") are app-level announcements, not the field's error, and stay.
- The POC custom elements the decision names (#3408, `<p3-text-field>`/`<p3-password-field>`) are not in this tree yet. Whoever builds them takes the model from these defs.
- No skill repeated the old advice. `skills/prism3-consume` does not exist; `prism3-build-component` and `prism3-build-ui` say nothing about field-level announcement.

### The gate

`test.ts` gains a #1712 arm. It scans every shipped field-message string, plus TextField's aria, against hand-written patterns for advice that puts a region on the field ("polite live region", "host wraps", "self-announcing", `aria-live`, `role="status"`, "announce politely", and, after review, `role="alert"` and "assertive", the loudest form of the same advice). It also requires the aria to name `aria-invalid="true"`, `aria-describedby`, the focus move to "the invalid field or to the form's error summary", and "never a live region", so deleting the guidance outright fails too. Mutations, each failing the arm by name: restoring the old aria sentence (`accessibility.aria`); adding a `role="alert"` sentence to TextField's aria (`textField.accessibility.aria`); adding "assertively" to `docs.usage`; and dropping the focus clause from the aria (`missing: focus moves to …`).

### A trap

The first version of the pattern matched any "wrap … live region" and flagged the new don't ("Wrap the message in a live region — …"), which is a prohibition. The pattern now matches only "host wraps"/"field wraps", the form the old advice took.

### Held

Two other defs give field-scoped announcement advice of the kind the brief rules out. `code-input` sends a server result to a polite `role="status"`, and `switch-row` announces a failed change's message. Both are the case where a message arrives without a focus move, which the decision does not address. They are filed as #3943 for the owner, not changed here.

The chrome suite (three shards of about 11 minutes each) did not run locally inside the lane's 10-minute chunks. The change touches no studio code, and CI runs it.
