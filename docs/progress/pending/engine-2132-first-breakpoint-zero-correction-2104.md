## (2026-10-05) — Correction to 2026-10-05 FO-02 tells a role ground from a step ground (#2097 item 1)

The entry says the role-branch mutation **mA** (`if (role) return ramps.get('neutral')?.find((s) => s.key === '050')?.rgb ?? role;`) was "caught only by the #1745 exit gate". **That is wrong.** Against FO-02 as it then stood, mA failed three arms: **L-06** (an inverse link family is independently settable), **IT-01** (the carried icon is re-rated against its own `against`), and the **#1745 exit gate**.

Re-measured on 2026-10-05 with every failure line printed. FO-02b now catches mA as well, so today it fails four:

```
❌ L-06: an INVERSE link family is independently settable (got 550, pinned 025)
❌ FO-02b: a role ground resolves to that role's color, #c8d2dc — not the floor step (#e9e9e9) or the page (#ffffff); got #e9e9e9
❌ IT-01: the carried icon is re-rated against its own `against`
❌ #1745 exit gate: an override sinking the label on the bold neutral fill …
Prism3 engine tests: 135274 passed, 4 failed
```

**How it happened.** The original run printed failure lines through a keyword filter (`grep -E "landed|exit|FO-0|passed|…"`). The #1745 line passed because it contains the word "exit", and the L-06 and IT-01 lines were dropped. The harness had already reported `3 failure line(s)`, and only one was shown. That mismatch was the signal, and it went unread.

**What stands.** The entry's conclusion is unchanged: FO-02, the arm written to hold these two branches, was green under both mutations, and FO-02b closes that. The mB row was complete as written: it reported 7 failure lines, and all 7 were FO-01 and FO-01b.
