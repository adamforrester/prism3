---
engine: minor
---
SignInButton carries code-only `isPending` and `disabled` (#3554, owner decision Q-CC23 A). Its `onClick` named a loading state the button had no prop for. `isPending` keeps the button focusable with aria-disabled and aria-busy, ignores a second click while the provider's sign-in is in flight, and announces busy; `disabled` is the native attribute. Both join the state list as code-only, admitted as not projected, so the design file's members are unchanged (Q-S6 A decided those). `onClick` is not called while pending or disabled.
