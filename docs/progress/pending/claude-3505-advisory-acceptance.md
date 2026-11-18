## (2026-11-18) — The four open `npm audit` advisories are recorded with review dates the expiry gate enforces (#3505)

**What.** Owner decision A on #3505 (2026-11-18): accept the deepmerge and esbuild advisories as dev-only, and wait for
upstream fixes to glob and minimatch. `docs/dependency-advisories.md` is the register: one row per advisory, under
"Accepted" or "Waiting on upstream", each ending "advisory until 2027-02-18". `lint-advisory-expiry.ts` already reads
that form in every tracked file, so on the review date it fails and names each row; no gate code changed. The page
says how to review a row: take an in-range fix if one exists, otherwise a new date is a new owner decision.

**The test arm.** `test.ts` (#3505) holds the register to the decision's four advisories, written in the test: each
has a row, under the section the decision put it in, and the detector's own `claimsIn` finds a claim on that row's
line. Mutation, each failing by name: rewording the esbuild row to "Accepted until …" (no marker) fails `#3505
lint-advisory-expiry reads a review date on GHSA-67mh-4wv8-2f99's row`; `PRISM3_TODAY=2027-02-18` fails the gate with
all four rows named, and `2027-02-17` passes. A first draft put the decision date in a section heading after a row;
the gate read it as a claim already due and failed today, so every decision date is in the opening paragraph, before
any claim.

**Measured, and one premise that did not hold.** `npm audit` on 2026-11-18 reports 11 moderate (glob, minimatch,
esbuild and the packages above them) and no longer lists the deepmerge advisory, though deepmerge 4.3.1 is still
installed; its row stays, as decided. The earlier triage on #3505 said no build starts esbuild's dev server. Studio's
`npm run dev` does (`apps/studio/build.mjs`, `esbuild.context().serve()` behind the front server on port 5173), so the
esbuild row says so. The decision may rest on that premise, so it is filed for the owner as #4011.
