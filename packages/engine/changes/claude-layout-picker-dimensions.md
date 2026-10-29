---
engine: patch
---
The studio's Layout gutter and margin picker follows the engine's link order (#3092, Q785 A): the spacing steps first,
then, in their own group, the brand's core dimension steps that no spacing step has, so a 44px margin can be picked and
links to core dimension 44. The value picker gains named groups. Chrome only: no token, emitted tree or component
surface moves, so CONTRACT is unchanged.
