---
engine: minor
---
SignInButton's Facebook styles and the facebook marks move to Facebook's current brand blue, #0866ff, from #1877f2
(#3136, owner decision Q837 A). The blue style's fill and the white style's label ink are #0866ff, and `social/facebook`
and its derived `provider/facebook-blue` paint #0866FF. White on the new blue measures 4.82:1, so every SignInButton
style now clears the 4.5:1 text floor at rest and focus-visible (the Facebook hover and pressed states, under the
Q-S13 A wash, measure 3.00 to 4.13:1 and are recorded as contested), and the 4.23:1 provider-shortfall note is gone. No member, name or token moves,
so CONTRACT is unchanged.
