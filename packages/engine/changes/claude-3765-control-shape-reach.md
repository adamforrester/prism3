---
engine: minor
---
Control shape now reaches Code input's cells, as its description says it reaches every field (#3765, owner decision Q-CS1 A). Under Boxed each cell binds `radius.none`, and under Hairline `radius.hairline`, at every size, the x-large cell's `radius.lg` included. Rounded and Pill keep the cell's own corner, as on every field, and Underline still gives it no corner. No other def's plan changes under any Control shape or Field style. No committed artifact changes, because no example brand uses Boxed or Hairline. `CONTRACT_VERSION` unchanged: no token name moves.
