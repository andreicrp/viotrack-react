# Data-service refactor baseline

Baseline captured before extracting any code from `src/services/dataService.js` on **2026-10-06**, from `main` commit [`24d2141ce0df7eda6eee457767822e5e640b226b`](https://github.com/andreicrp/viotrack-react/commit/24d2141ce0df7eda6eee457767822e5e640b226b), the explicit revert of the broader UI/table refactor.

## Pre-existing test infrastructure

At this commit there were **no test files, no `test` npm script, no Vitest/jsdom dependencies, and no type-check script**. The original `npm test` command therefore failed with `Missing script: "test"`; that is an infrastructure gap, not a failing test suite. The repository was cleanly installed from its committed lockfile before adding the minimal Vitest/jsdom harness and characterization tests.

## Characterization baseline (before extraction)

The first three data-service tests were added and run against the original, still-monolithic service before any module split:

| Command | Result |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 1 test file, 3 tests (offline student normalization, offline violation fixtures, concurrent-read deduplication). |
| `npm run typecheck` | Not available at baseline: no script or type-check config existed. |
| `npm run lint -- --quiet` | Passed (exit 0): 0 errors, 321 warnings. |
| `npm run build` | Passed. |

These test results are the behavior baseline for the incremental extraction. Preserve them while splitting the service, add coverage alongside each slice, and rerun the full checks after each change. Lint warnings are existing baseline findings and are outside this focused refactor.

## Post-extraction verification

The pre-refactor three-test baseline still passes after splitting the original service into a 27-line facade and modules for authentication, students, violations/records, teachers, admins, logs, events, dashboard, backups, shared caching, and fixtures. Two pagination contract tests were added after the split.

| Command | Post-extraction result |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 1 test file, 5 tests. |
| `npm run typecheck` | Passed for the service modules and direct dependencies. |
| `npm run lint -- --quiet` | Exit 0; 0 errors, 321 existing warnings. |
| `npm run build` | Passed. |

The branch is based on the reverted `main` and intentionally does not restore the unrelated UI/table refactor.

### Build-path note

The clean baseline build in `/tmp/viotrack-main-baseline` produced a 280.63 kB `vendor-react` chunk because that checkout path does not contain the word `react`. A second clean build of the same reverted-main commit from `/tmp/viotrack-react-baseline` reproduced the current 2,229.17 kB chunk and the >800 kB advisory exactly. The existing `vite.config.js` tests absolute module IDs with `id.includes('react')`, so a checkout path containing `viotrack-react` classifies unrelated dependencies as React. This pre-existing path-sensitive chunking issue is documented but not changed as part of the data-service scope.

## Baseline after the 2026-10-08 main commit

Before updating this PR, a clean checkout of main commit [`71109d2323fd473179dbe149aae670bc81e8ce3c`](https://github.com/andreicrp/viotrack-react/commit/71109d2323fd473179dbe149aae670bc81e8ce3c) was checked independently:

| Command | Result on new main, before this PR was applied |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 1 file, 4 CSV/security/SMS tests. |
| `npm run typecheck` | Not available on main; the typecheck script is added by this PR. |
| `npm run lint -- --quiet` | Exit 0; 0 errors, 366 warnings. |
| `npm run build` | Passed. |

That commit also expanded student writes to support `track`/`strand`, schema-compatible Supabase fallbacks, and local/Supabase updates and deletes by LRN. These changes were ported into the extracted student module and covered by added regression tests.

## Rebased PR verification on latest main

The existing PR was rebased onto `71109d2` (no second branch or PR). The latest main student-write behavior was carried into `students.js`; LRN update/delete and track/strand add/bulk behavior are covered by regressions.

| Command | Result after rebase |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 2 files, 11 tests (4 existing main tests + 7 data-service tests). |
| `npm run typecheck` | Passed. |
| `npm run lint -- --quiet` | Exit 0; 0 errors, 366 existing warnings. |
| `npm run build` | Passed. In the repository checkout path the known `includes('react')` matcher emits the same >800 kB advisory; see the build-path note above. |

A clean `npm ci` on latest main already reported one high-severity dependency advisory; the updated branch reports the same count. No automatic dependency audit fix was applied because it is outside this PR's scope.
