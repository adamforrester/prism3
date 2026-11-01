---
engine: patch
---
Menus, dialogs and the Activity bar's unread dot now leave with an exit instead of vanishing (#3207). A menu fades out,
a dialog's scrim fades while the dialog shrinks back, and the dot shrinks away, each on the chrome's fast duration and
exit curve. Under reduced motion each is a short fade. The shell marks a closing surface as leaving, keeps it inert so
it holds no focus and reads as closed, and removes it once its exit ends. No committed artifact, token or projected
component surface moves, and CONTRACT is unchanged.
