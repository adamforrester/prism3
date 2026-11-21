---
engine: patch
---
Two test-harness gates stop certifying what did not run (#4196, #4197). `lint-test-arms.ts` no longer counts a `#NNNN` tag inside a `console.*(…)` call as an arm: a suite's header log outlived every assertion that carried its tags, so 122 registered arms were held by a log line alone and are retired from `test-arms.txt`. `run-suites.ts` runs its own self-test on every invocation, so a broken count parser fails the run before any suite instead of certifying a collapsed one. Gates only; no committed artifact moves.
