---
engine: patch
---
Update file no longer reports hand edits on a file nobody edited when a component nested in a set changes its properties
(#4070). A member's record now reads a nested instance's properties by their id, and only the values set on the instance:
a property added to the nested set, renamed there or given a new default is no longer a hand edit on every member that
nests it. Usage panels no longer read as edited when Update redraws the root of the member a specimen shows: a specimen
is read only through what is set on it. A real hand edit is still kept and reported. Sets and panels written before
this change can still report one false edit until Update rewrites them. Plugin only; no committed artifact moves.
