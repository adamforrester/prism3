## (2026-11-17) — Report a problem opens the issue with the title and a line asking for the report

**The ask.** People missed that they had to paste the rest of a long report. The owner's direction: "prepopulate with
the title, but then the body has instructions to paste the rest."

**How it worked.** "Open a prefilled issue" copied the whole report to the clipboard, then opened GitHub's new-issue
form with the title and the report as the body. A report longer than the URL allows (7,000 characters) was cut, and it
ended with "(The report was cut to fit the link. The full report is on your clipboard: paste it here.)" A short report
arrived whole, and a long one arrived half-filled, with its pointer at the bottom where nobody looked.

**The change.** `issueUrl()` takes no report. The link carries the title ("Problem report") and a body that holds only
the instruction, `REPORT_COPY.issueBody`, approved by the owner as written (Q-RC1 A, 2026-11-17). The click still copies the report first,
and Copy now says "Copied" once the report is on the clipboard, as its own click does. The cut, its surrogate-pair
guard and the `cut` line are gone, because nothing is cut now. `URL_LIMIT` stays as the main thread's bound in
`isIssueUrl`. The report itself and its scrubbing (#3702) are unchanged. The link now carries nothing from the session,
so less of it leaves the panel than before.

**Held by.** `test-report.ts` `paste: …`, which types the whole URL as a literal. `test:chrome` section 2069 (plugin) and
its #3524 case (web) check the posted or opened body against the literal instruction, and the stubbed clipboard against
the report shown. All fail on main by name. The two mutations, the report given back as the body and the copy dropped,
each fail their own arm.
