## (2026-10-26) — prism3-rebind: lessons from a commerce checkout rebuild

A checkout rebuild (cart, shipping, payment, review; desktop and mobile) onto a Prism3-generated brand
library tested `prism3-rebind` as written. This PR folds the generic lessons in (stacked on #3046).

- **§2, items 14–19:**
  - inventory a large source page by structure: labels at mid-row, a separate screenshots section, content bounds rather than frame size, states named from unique texts;
  - pick key screens by pattern;
  - read keys from instances already in the consuming file;
  - map a source in another typeface by role and size;
  - keep source copy exactly, typos included, as an owner question;
  - leave plugin widgets out of the build.
- **§3:** fill each breakpoint from its own source. Cloning desktop to mobile carried the wrong product.
- **§4, six trap rows:**
  - a layout-direction change keeps FIXED sizing and flips `layoutGrow` to height;
  - FILL text in a wrap row collapses;
  - a pending import blocks text-style and later calls, and timed-out calls resume and duplicate nodes;
  - `exportAsync` hangs while another call is stuck;
  - a collapsed disclosure exposes no slot;
  - a text property may not drive a nested label.

**Gaps filed alongside:** #3054–#3059. Scrubbed of client, file, brand, product and page names, node IDs and keys.
