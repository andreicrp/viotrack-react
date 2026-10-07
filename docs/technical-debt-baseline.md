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

## Baseline recheck after the 2026-10-08 PrintDataModal commit

Latest main is [`e4927d6b3eef5f9c185dd2cdb06fa3c37bbd9463`](https://github.com/andreicrp/viotrack-react/commit/e4927d6b3eef5f9c185dd2cdb06fa3c37bbd9463). The commit changes only `src/components/admin/PrintDataModal.jsx`; `dataService.js`, the data-service modules, test files, and package scripts are unchanged. A clean detached checkout on this commit confirmed the baseline remains **1 test file, 4 tests passed** with `npm test -- --reporter=verbose`. Therefore this event requires no additional data-service source changes; the existing PR branch was rebased to current main.

On the same clean `e4927d6` checkout, `npm run lint -- --quiet` passed with **367 warnings and 0 errors**, and `npm run build` passed. The main-checkout build produced a 281.82 kB `vendor-react` chunk without a size advisory because the detached worktree path does not contain `react`; the PR worktree build has the previously documented path-sensitive advisory. Main still has no `typecheck` script.

## Baseline recheck after the 2026-10-08 print pagination commit

Latest main is [`d901c7acda601be1544de3393b2d93ffe3f8744a`](https://github.com/andreicrp/viotrack-react/commit/d901c7acda601be1544de3393b2d93ffe3f8744a). It changes only `src/components/admin/PrintDataModal.jsx`; the service, tests, and package scripts are unchanged. On a clean detached checkout, `npm test -- --reporter=verbose` passed (**1 file, 4 tests**), lint passed (**367 warnings, 0 errors**), and the build passed (281.82 kB `vendor-react`, no size advisory in that checkout path). The existing PR branch was rebased onto this main commit; no additional service-source changes were needed for this event.

## Baseline after the 2026-10-08 live-database commit

Latest main is [`513dd67adb8c35590753ae787b81b5cd73c8f2b3`](https://github.com/andreicrp/viotrack-react/commit/513dd67adb8c35590753ae787b81b5cd73c8f2b3). It changes only `src/services/dataService.js`, removing the demo student/teacher/admin/incident/log/event seed data and preferring successful live query results over merged seed/local data. The clean current-main baseline was captured before modifying the PR branch:

| Command | Result on clean `513dd67` |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 1 file, 4 existing CSV/security/SMS tests; main has no data-service tests. |
| `npm run typecheck` | Not available on main. |
| `npm run lint -- --quiet` | Passed: 0 errors, 368 warnings. |
| `npm run build` | Passed (281.82 kB `vendor-react`; no path-sensitive size advisory in the detached checkout). |

`npm ci` reports one high-severity npm advisory, consistent with prior main baselines. The PR follow-up must preserve latest main's empty seed fallbacks, legacy student/record-cache cleanup, successful-empty-query semantics, and removal of mock merge behavior while keeping the characterization tests deterministic without demo fixtures.

## Baseline after the 2026-10-08 modal gesture commit

Latest main is [`d8c96f6667bbfebb947a5d09d6b6cdf6644603fb`](https://github.com/andreicrp/viotrack-react/commit/d8c96f6667bbfebb947a5d09d6b6cdf6644603fb). It changes only `ParentSummonsModal.jsx` and `ResolutionModal.jsx`; no service or test files changed. In a clean detached checkout on this commit:

- `npm test -- --reporter=verbose`: **4 passed** (1 file); current main still has no data-service tests.
- `npm run lint -- --quiet`: **failed with 7 `react-hooks/rules-of-hooks` errors** (plus 371 warnings), all in `src/components/violations/ResolutionModal.jsx` around lines 563–576, where hooks are reached only on some render paths. These are present on clean main and outside this data-service PR's scope.
- `npm run build`: passed (281.82 kB `vendor-react`; no path-sensitive size advisory in the detached checkout).
- Main has no `typecheck` script. `npm ci` reports the existing single high-severity advisory.

This baseline updates the prior `513dd67` record; the PR branch will rebase onto `d8c96f6` before the live-data behavior is ported.

## Baseline after the 2026-10-08 modal hook-order fix

Latest main is [`533469b219c97f95e2b306529fef93d89c9f90fa`](https://github.com/andreicrp/viotrack-react/commit/533469b219c97f95e2b306529fef93d89c9f90fa). It changes only the two modal files and corrects the transient hook-order errors recorded for `d8c96f6`. On a clean detached checkout, the current-main baseline is **4 tests passed**, lint **368 warnings / 0 errors**, and build passed (281.82 kB `vendor-react`). Main still has no data-service tests and no `typecheck` script. The live-data refactor remains isolated to service modules and tests.

## Baseline after the 2026-10-08 modal FAB styling commit

Latest main is [`f925642f2bdcb2eacf169f35226e367f031db2de`](https://github.com/andreicrp/viotrack-react/commit/f925642f2bdcb2eacf169f35226e367f031db2de). It changes only `ParentSummonsModal.jsx` and `ResolutionModal.jsx`; data-service code and tests are unchanged. On the clean detached latest-main checkout, **4 existing tests passed**, lint passed with **370 warnings and 0 errors**, and the build passed (281.82 kB `vendor-react`). The hook-order errors from intermediate `d8c96f6` were resolved by `533469b`; current main is lint-clean apart from its existing warnings. Main still has no service tests or typecheck script.

## Live-data port and regression results on `f925642`

The split service modules now match the live-read/fallback behavior from current main. The full suite passes **16 tests across 2 files** (12 service tests plus the original 4 utility tests), including checks for empty offline data, legacy demo-cache cleanup, authoritative successful-empty reads, non-merged teacher/admin live rows, pagination metadata, and existing student CRUD behavior. `npm run typecheck` passes. Lint passes with **369 warnings and 0 errors**, one fewer warning than clean main (370/0). The production build passes.

The build from `/home/ubuntu/viotrack-react` emits the 2,230.37 kB `vendor-react` chunk-size advisory; a clean latest-main build from `/tmp/viotrack-react-main-baseline` produced the exact same vendor chunk size/hash and advisory. This is the previously identified path-sensitive Vite chunk matcher, not a refactor regression. From a checkout path without `react` in its name, clean main reports a 281.82 kB `vendor-react` chunk. `npm ci` continues to report the repository's existing high-severity audit advisory.

## Baseline after the 2026-10-08 modal-title commit

Latest main is [`7bf1a21ea92d187907f0e5f7624a1fb9a1fa94f3`](https://github.com/andreicrp/viotrack-react/commit/7bf1a21ea92d187907f0e5f7624a1fb9a1fa94f3). It changes three modal heading labels only; no service, test, or dependency files changed. On a clean detached checkout, **4 tests passed**, lint passed with **370 warnings and 0 errors**, and the build passed with a 281.82 kB `vendor-react` chunk. As documented above, the matching `/viotrack-react` checkout path yields the same 2,230.37 kB chunk and size advisory on both clean main and the PR branch. Main still has no service tests or typecheck script. The open PR's four GitHub checks were successful before this rebase.

## Baseline after the 2026-10-08 mobile filter-drawer fix

Latest main is [`fadfa69173e65e0dbac0f2f794a116918b879c94`](https://github.com/andreicrp/viotrack-react/commit/fadfa69173e65e0dbac0f2f794a116918b879c94). It changes only filter-drawer interaction in three modal components; data-service and test files are unchanged. On a clean detached checkout, **4 tests passed**, lint passed with **371 warnings and 0 errors**, and the standard-path build passed (281.82 kB `vendor-react`). From the PR-matching `/viotrack-react` path, clean main again produced the same 2,230.37 kB vendor chunk and advisory recorded above. Main still has no service tests or typecheck script.

## Baseline after the 2026-10-08 document-footer layout commit

Latest main is [`e3d4b62edaad8a0e87e7507e6e81e6091a879a7e`](https://github.com/andreicrp/viotrack-react/commit/e3d4b62edaad8a0e87e7507e6e81e6091a879a7e). It changes print-document footer layout in the three modal components only; it does not touch data-service, tests, or dependencies. On a clean detached checkout, **4 tests passed**, lint passed with **371 warnings and 0 errors**, and the standard-path build passed (281.82 kB `vendor-react`). The same commit built from a path containing `viotrack-react` again produced 2,230.37 kB with the already documented chunk advisory. The existing PR checks were all successful before the rebase.

## Baseline after the 2026-10-08 RBAC UI commit

Latest main is [`3831e350536cf230ff0d963c198dcb0fb7c036c4`](https://github.com/andreicrp/viotrack-react/commit/3831e350536cf230ff0d963c198dcb0fb7c036c4). It updates RBAC visibility in modal/page components only; no service, test, or dependency files changed. On clean main, **4 tests passed**, lint passed with **370 warnings and 0 errors**, and the standard-path build passed (281.82 kB `vendor-react`). The matching checkout path again produced the 2,230.37 kB chunk/advisory documented above. PR #1 had all four checks successful before this baseline refresh.

## Baseline after the 2026-10-08 Student Directory PDF import/export commit

Latest main is [`e530612c88619b8d7ac0a5297a9ff3e4ad1b8da1`](https://github.com/andreicrp/viotrack-react/commit/e530612c88619b8d7ac0a5297a9ff3e4ad1b8da1). It adds `pdfjs-dist` and changes Student Directory import/export UI plus `pdfHelper.js`; it does not modify data-service modules, tests, or service declarations. PDF import produces the existing student fields, adds the same `lrn`/year/image values used by CSV import, then calls the existing `dataService.bulkAddStudents` API, so no service contract change is needed.

A clean detached checkout installed from the updated lockfile with `npm ci --ignore-scripts` and reported the existing single high-severity npm advisory. Baseline checks on `e530612`:

| Command | Result on clean latest main |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 1 file, 4 existing CSV/security/SMS tests. |
| `npm run typecheck` | Not available on main; this PR provides the focused typecheck. |
| `npm run lint -- --quiet` | Passed: 0 errors, 373 warnings. |
| `npm run build` | Passed; 282.23 kB `vendor-react` from the detached checkout path. |

PR #1's four GitHub checks were successful before rebasing onto this commit. The latest main also adds the `pdfjs-dist` runtime dependency; keep it while resolving the PR's separate JSDoc/test tooling changes.

### Matching-path build comparison after the PDF dependency

A clean build of `e530612` from `/tmp/viotrack-react-main-baseline` emitted `vendor-react-Wu-iWA7h.js` at **2,663.31 kB** with the existing >800 kB advisory. The rebased PR build from `/home/ubuntu/viotrack-react` emitted the same asset filename and size. Thus the PDF dependency/base change increases the path-matched vendor bundle relative to earlier main, but the PR adds no further bundle-size delta; the detached checkout path without `react` in its name reports 282.23 kB on clean main.

## Baseline after the 2026-10-08 student schema-fallback/PDF worker commit

Latest main is [`b85322fb78d97f9c7656eef3ba5611a35278588e`](https://github.com/andreicrp/viotrack-react/commit/b85322fb78d97f9c7656eef3ba5611a35278588e). It changes the monolithic student-service methods and `pdfHelper.js`; no test or dependency files changed in this commit. New service behavior includes an unordered student-read retry if `order('lname')` fails, schema-resilient student inserts/updates/deletes, `student_id`-then-`lrn` lookup fallback for writes, and a generic bulk-import audit message. The PDF worker now resolves to a locally bundled worker URL, with CDN fallback.

Before applying this service change to the existing PR, a clean detached checkout of `b85322f` passed **4 tests** (the existing CSV/security/SMS suite), lint with **372 warnings and 0 errors**, and build (282.23 kB `vendor-react`). Main still has no typecheck script or service-specific tests. `npm ci --ignore-scripts` reports the single existing high-severity audit advisory. These are the pre-port baseline results; the PR will carry the schema and PDF worker behavior into its extracted module/tests without duplicating a branch or PR.

### Student schema fallback port verification (b85322f)

The existing split service now mirrors the main commit's student-read retry, schema-pruned single/bulk inserts, student_id-to-LRN update/delete fallbacks, generic bulk-import audit message, and bundled PDF worker behavior (the `pdfHelper.js` change is inherited from main). Added regressions exercise each data-service fallback.

| Check | PR result after port | Clean-main baseline |
| --- | --- | --- |
| `npm test -- --reporter=verbose` | Passed: 21 tests across 2 files. | 4 tests across 1 file. |
| `npm run typecheck` | Passed. | No typecheck script on main. |
| `npm run lint -- --quiet` | 0 errors, 371 warnings. | 0 errors, 372 warnings. |
| `npm run build` | Passed. | Passed. |

For the comparable checkout path, both clean main and the PR emitted `vendor-react-Wu-iWA7h.js` at 2,663.31 kB and `pdf.worker.min-CjEcRF4W.mjs` at 1,264.34 kB, with the same chunk-size advisory. The PR adds no bundle-size change beyond latest main.

## Baseline after the 2026-10-08 StudentsPage state fix

Latest main is [`3fc25e628b70eee70fb5acb4406c25c7440fd4c4`](https://github.com/andreicrp/viotrack-react/commit/3fc25e628b70eee70fb5acb4406c25c7440fd4c4). This commit adds the missing `studentForViewModal` state variable in `src/pages/StudentsPage.jsx`; it does not change data-service modules, tests, or dependencies, so no service code changes were needed in this run.

On a clean checkout of latest main, `npm test -- --reporter=verbose` passed (4 tests in 1 file), `npm run lint -- --quiet` passed (372 warnings, 0 errors), and `npm run build` passed (282.23 kB `vendor-react` from the detached checkout path). Main still has no typecheck script. A matching-path build of clean main emitted the same `vendor-react` chunk (2,663.31 kB) and bundled PDF worker (1,264.34 kB) as the rebased PR.

After rebasing the existing PR onto `3fc25e6`, all 21 tests, the JSDoc typecheck, lint (371 warnings, 0 errors), and build passed. This commit only prompted a baseline/report refresh; the data-service implementation was already current and remains unchanged.

## Baseline after the 2026-10-08 jsPDF autoTable plugin fix

Latest main is [`754cee6d61c2025115366baed09eab4f90faac35`](https://github.com/andreicrp/viotrack-react/commit/754cee6d61c2025115366baed09eab4f90faac35). It changes only `src/utils/pdfHelper.js`, attaching the autoTable plugin/wrapper to dynamically created jsPDF instances; no data-service or test files changed, so no service-code changes were needed.

A clean latest-main checkout passed **4 existing tests**, lint (**372 warnings, 0 errors**), and build; main still has no typecheck script. After rebasing the existing PR onto `754cee6`, **21 tests passed**, the JSDoc typecheck passed, lint had **371 warnings and 0 errors**, and build passed. Clean main and the PR generated identical matching-path outputs: `pdfHelper-DsOVNyvJ.js` (3.93 kB), `pdf.worker.min-CjEcRF4W.mjs` (1,264.34 kB), and `vendor-react-Wu-iWA7h.js` (2,663.31 kB); the existing chunk-size advisory is baseline-equivalent.

## Baseline after the 2026-10-08 unified Teacher/Admin/Violation import-export commit

Latest main is [`761259f0a9229bb68cb855b433e5876cfb279afd`](https://github.com/andreicrp/viotrack-react/commit/761259f0a9229bb68cb855b433e5876cfb279afd). It adds unified CSV/PDF import/export UI for Teachers, Admins, and Violation Types and updates `pdfHelper.js`; it does not change `src/services` or package dependencies. Its new service writes call only `addTeacher`, `addAdmin`, and `addViolationType`, all already exposed by the extracted modules, so no service changes were needed.

Clean latest main passed **4 tests**, lint (**389 warnings, 0 errors**), and build; main still has no typecheck script. The rebased PR passed **21 tests**, the JSDoc typecheck, lint (**388 warnings, 0 errors**), and build. Clean main and PR matching-path builds are identical: `pdfHelper-DQXIWwx-.js` (7.07 kB), `pdf.worker.min-CjEcRF4W.mjs` (1,264.34 kB), and `vendor-react-df0RWb2s.js` (2,662.96 kB); the chunk-size advisory is baseline-equivalent.

## Baseline after the 2026-10-08 scheduled-backup runner commit

Latest main at this step was [`7cc1d53c49bf519ce5c56e367cc6c42edc01ddb7`](https://github.com/andreicrp/viotrack-react/commit/7cc1d53c49bf519ce5c56e367cc6c42edc01ddb7). It added startup/hourly schedule checks in `App.jsx` and `checkAndRunScheduledBackup` to the monolithic service. Before porting, clean main passed **4 tests**, lint (**389 warnings, 0 errors**), and build (281.89 kB `vendor-react` from the detached checkout path); main has no typecheck script.

The PR ports the runner into `backups.js`, exposes the schedule settings/runner types, and tests disabled, due-daily, and not-yet-due weekly behavior. After the port, **24 tests passed**, typecheck passed, lint had **388 warnings and 0 errors**, and build passed. Matching-path clean-main and PR builds emitted identical PDF helper, PDF worker, and `vendor-react` assets; the chunk-size advisory is baseline-equivalent.

## Baseline after the 2026-10-08 custom AM/PM time-picker commit

Latest main [`95fc1bfbfe5e2b848a8fe9ec053add9170f08794`](https://github.com/andreicrp/viotrack-react/commit/95fc1bfbfe5e2b848a8fe9ec053add9170f08794) replaces the browser time input with a custom 12-hour picker. The control still persists `HH:mm` 24-hour values, matching `BackupScheduleSettings.time`; no service changes were needed. Clean main passed **4 tests**, lint (**388 warnings, 0 errors**), and build. After rebase, the PR passed **24 tests**, typecheck, lint (**387 warnings, 0 errors**), and build.

## Baseline after the 2026-10-08 CustomTimePicker placement fix

Latest main is [`2f6c3300d7feb7b68d527e39f6914469001c2660`](https://github.com/andreicrp/viotrack-react/commit/2f6c3300d7feb7b68d527e39f6914469001c2660). It only adjusts picker popover placement and compact layout; service files are unchanged and the stored `HH:mm` contract remains intact. Clean main passed **4 tests**, lint (**388 warnings, 0 errors**), and build. The PR after rebase passed **24 tests**, typecheck, lint (**387 warnings, 0 errors**), and build. Matching-path builds on clean main and the PR are identical: `pdfHelper-DQXIWwx-.js` (7.07 kB), `pdf.worker.min-CjEcRF4W.mjs` (1,264.34 kB), and `vendor-react-df0RWb2s.js` (2,662.96 kB), with the same existing chunk-size advisory.


## Baseline after the 2026-10-08 CustomTimePicker scroll and portal commits

Latest main is [`08012d32bdf542f9f9d0e1f48ee8b80c935931c4`](https://github.com/andreicrp/viotrack-react/commit/08012d32bdf542f9f9d0e1f48ee8b80c935931c4). It changes only `src/components/common/CustomTimePicker.jsx`, adding constrained popover scrolling and rendering the picker via a React portal outside modal scroll containers. The `onChange` contract remains 24-hour `HH:mm`; no data-service, test, or dependency files changed, so no additional service implementation was needed.

The immediately preceding main commit, [`310ee8e`](https://github.com/andreicrp/viotrack-react/commit/310ee8e), also changed only the picker layout/auto-scroll. A clean checkout there passed **4 tests**, lint (**387 warnings, 0 errors**), and build. On latest clean main `08012d3`, the baseline is:

| Command | Result on clean latest main |
| --- | --- |
| `npm test -- --reporter=verbose` | Passed: 1 file, 4 existing CSV/security/SMS tests. |
| `npm run typecheck` | Not available on main; provided by this PR. |
| `npm run lint -- --quiet` | Passed: 0 errors, 389 warnings. |
| `npm run build` | Passed; 2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the existing >800 kB advisory. |

After rebasing the existing PR onto `08012d3`, the complete suite passed (**24 tests across 2 files**), `npm run typecheck` passed, lint passed (**388 warnings, 0 errors**), and build passed. Clean main and PR matching-path builds emitted the same `vendor-react` (2,662.97 kB), PDF worker (1,264.34 kB), and PDF helper (7.07 kB) assets; the chunk-size advisory is baseline-equivalent.


## Baseline after the 2026-10-08 Student Identified modal redesign

Latest main is [`2503ca6bb9ca7cb200b0aa6b5f273a574bb513e3`](https://github.com/andreicrp/viotrack-react/commit/2503ca6bb9ca7cb200b0aa6b5f273a574bb513e3). It changes only `src/pages/ScanQRPage.jsx` and `src/css/scan-qr.css` to redesign the verified-student modal; no data-service, test, or dependency files changed, so no service-source port was needed.

On a clean detached checkout of latest main, **4 existing tests passed**, lint passed (**390 warnings, 0 errors**), and build passed (2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the established >800 kB advisory). Main has no typecheck script.

After rebasing the existing PR onto `2503ca6`, **24 tests passed**, `npm run typecheck` passed, lint passed (**389 warnings, 0 errors**), and build passed. The matching-path clean-main and PR builds emitted identical PDF helper (7.07 kB), PDF worker (1,264.34 kB), and `vendor-react` (2,662.97 kB) assets; the chunk-size advisory is baseline-equivalent.


## Baseline after the 2026-10-08 QR scan icon fix

Latest main is [`f152b482b1c39cb806f560bb2f2385d1404809d1`](https://github.com/andreicrp/viotrack-react/commit/f152b482b1c39cb806f560bb2f2385d1404809d1). It adds the missing `UserCheck` icon import to `src/pages/ScanQRPage.jsx`; there are no data-service, test, or dependency changes, so no service port was needed.

Clean latest main passed **4 existing tests**, lint (**389 warnings, 0 errors**), and build (2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `f152b48`, **24 tests passed**, typecheck passed, lint passed (**388 warnings, 0 errors**), and build passed. Matching-path clean-main and PR assets are identical; no new bundle-size delta was introduced.


## Baseline after the 2026-10-08 strict QR-payload validation commit

Latest main is [`b8a09116dd71eeb5224f586c80250d09ad5953cf`](https://github.com/andreicrp/viotrack-react/commit/b8a09116dd71eeb5224f586c80250d09ad5953cf). It updates `qrHelper.js` and `ScanQRPage.jsx` to reject unrelated QR payloads and improve invalid-scan status. No data-service, dependency, or test files changed; no service-module port was needed.

Clean latest main passed **4 existing tests**, lint (**389 warnings, 0 errors**), and build (2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the existing chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `b8a0911`, **24 tests passed**, `npm run typecheck` passed, lint passed (**388 warnings, 0 errors**), and build passed. Matching-path main and PR builds emitted the same PDF helper, PDF worker, and vendor React assets; the advisory is baseline-equivalent.


## Baseline after the 2026-10-08 invalid-QR notice commit

Latest main is [`1b8938c57ef480e721373697d6fabd01797ad08d`](https://github.com/andreicrp/viotrack-react/commit/1b8938c57ef480e721373697d6fabd01797ad08d). It updates only `ScanQRPage.jsx` to show the invalid-QR notice for three seconds before dismissal; service, dependency, and test files are unchanged.

Clean latest main passed **4 existing tests**, lint (**389 warnings, 0 errors**), and build (2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the existing chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `1b8938c`, **24 tests passed**, typecheck passed, lint passed (**388 warnings, 0 errors**), and build passed. Matching-path clean-main and PR assets are identical; no bundle-size change was introduced.


## Baseline after the 2026-10-08 notification stat-card refactor

Latest main is [`bf8e19139186030f8800ec8379c0e8f7d324e33a`](https://github.com/andreicrp/viotrack-react/commit/bf8e19139186030f8800ec8379c0e8f7d324e33a). It changes only `src/pages/NotificationsPage.jsx` to remove a redundant four-card statistics row; it does not touch data-service code, tests, or dependencies.

Clean latest main passed **4 existing tests**, lint (**389 warnings, 0 errors**), and build (2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `bf8e191`, **24 tests passed**, typecheck passed, lint passed (**388 warnings, 0 errors**), and build passed. Matching-path main and PR assets are identical; the bundle advisory is unchanged.


## Baseline after the 2026-10-08 UI/security feature commit

Latest main is [`d488024cbf2f5d16d18b1b25e2b8dd960e174f21`](https://github.com/andreicrp/viotrack-react/commit/d488024cbf2f5d16d18b1b25e2b8dd960e174f21). It adds skeleton loaders and keyboard shortcuts and updates notification undo, print styling, QR signing, and inactivity-lock UI across presentation/context/util files. The commit does not change `src/services`, service tests, or package dependencies; no service-module port was needed.

Clean latest main passed **4 existing tests**, lint (**393 warnings, 0 errors**), and build (2,662.97 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `d488024`, **24 tests passed**, `npm run typecheck` passed, lint passed (**392 warnings, 0 errors**), and build passed. Matching-path main and PR builds emitted identical PDF helper, PDF worker, and vendor React assets; bundle size is unchanged.


## Baseline after the 2026-10-08 scanner feedback commit

Latest main is [`07c2342f3fc210a2955ecd0b78013f0d906c8c7f`](https://github.com/andreicrp/viotrack-react/commit/07c2342f3fc210a2955ecd0b78013f0d906c8c7f). It adds configurable scanner audio/haptic feedback in `scannerFeedback.js` and updates QR scanner UI/CSS. It does not change data-service code, service tests, or dependencies; no service port was needed.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the existing >800 kB advisory). Main has no typecheck script. After rebasing the existing PR onto `07c2342`, **24 tests passed**, `npm run typecheck` passed, lint passed (**394 warnings, 0 errors**), and build passed. Clean-main and PR matching-path builds emitted identical PDF helper, PDF worker, and vendor React assets.


## Baseline after the 2026-10-08 scanner popover responsive fix

Latest main is [`df0891571fa62aad1af8144718f0e19e412777d7`](https://github.com/andreicrp/viotrack-react/commit/df0891571fa62aad1af8144718f0e19e412777d7). It adjusts only `src/css/scan-qr.css` for feedback-popover positioning and mobile bounds; service, test, and dependency files are unchanged.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `df08915`, **24 tests passed**, typecheck passed, lint passed (**394 warnings, 0 errors**), and build passed. Matching-path clean-main and PR builds emitted identical PDF helper, PDF worker, and vendor React assets; the advisory is baseline-equivalent.


## Baseline after the 2026-10-08 README feature documentation commit

Latest main is [`981723c4aa2425d80e747cc2ff13f984065da93f`](https://github.com/andreicrp/viotrack-react/commit/981723c4aa2425d80e747cc2ff13f984065da93f). It updates only `README.md` with documentation for signed QR badges, scanner feedback, skeleton loaders, undo toasts, and keyboard shortcuts; service and dependency files are unchanged.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `981723c`, **24 tests passed**, typecheck passed, lint passed (**394 warnings, 0 errors**), and build passed. Matching-path main and PR assets are identical; no bundle change was introduced.


## Baseline after the 2026-10-08 modal safe-area and header fix

Latest main is [`d95e767d1f7e611246c2ffc1742bf8b00f30a92a`](https://github.com/andreicrp/viotrack-react/commit/d95e767d1f7e611246c2ffc1742bf8b00f30a92a). It updates the mobile headers and safe-area padding in the Print Data, Parent Summons, and Resolution modals. The commit does not touch data-service code, tests, or dependencies.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `d95e767`, **24 tests passed**, typecheck passed, lint passed (**394 warnings, 0 errors**), and build passed. Matching-path clean-main and PR builds emitted identical PDF helper, PDF worker, and vendor React assets; the chunk advisory remains unchanged.


## Baseline after the 2026-10-08 universal mobile print/share commit

Latest main is [`46b39fbb0e581e68314fb9240691d45b7a641b18`](https://github.com/andreicrp/viotrack-react/commit/46b39fbb0e581e68314fb9240691d45b7a641b18). It adds `mobilePrintHelper.js` and wires it into the Print Data, Parent Summons, and Resolution modals. No data-service or dependency files changed.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `46b39fb`, **24 tests passed**, typecheck passed, lint passed (**394 warnings, 0 errors**), and build passed. Matching-path clean-main and PR builds emitted identical PDF helper, PDF worker, and vendor React assets.


## Baseline after the 2026-10-08 CSV native-share commit

Latest main is [`6e8ec9f06689a9dfdcd839c02ca83e5ed7002342`](https://github.com/andreicrp/viotrack-react/commit/6e8ec9f06689a9dfdcd839c02ca83e5ed7002342). It updates `csvHelper.js` to support native mobile sharing for CSV exports; no data-service, test, or dependency files changed.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). Main has no typecheck script. After rebasing the existing PR onto `6e8ec9f`, **24 tests passed**, typecheck passed, lint passed (**394 warnings, 0 errors**), and build passed. Matching-path clean-main and PR builds emitted identical vendor React/PDF worker assets; the chunk-size advisory is unchanged.


## Baseline after the 2026-10-08 Capacitor share/filesystem integration

Latest main is [`695c3cc92cc38b76b1505403117a7ed47ae682d3`](https://github.com/andreicrp/viotrack-react/commit/695c3cc92cc38b76b1505403117a7ed47ae682d3). It adds `@capacitor/share` and `@capacitor/filesystem` and updates mobile print/CSV share utilities and Android Gradle integration; no data-service files changed.

Clean latest main passed **4 existing tests**, lint (**395 warnings, 0 errors**), and build (2,663.93 kB `vendor-react`, 1,264.34 kB PDF worker, with the established chunk-size advisory). After rebasing the existing PR, **24 tests passed**, typecheck passed, lint passed (**394 warnings, 0 errors**), and build passed. The lockfile conflict was resolved by retaining main's Capacitor dependency graph and adding the PR's JSDoc/test tooling; no existing package versions changed and 38 dev-only lock entries were added. The PR's `vendor-react` output is **2,673.86 kB** (gzip 791.60 kB), **9.93 kB** above clean main (gzip +3.13 kB); PDF worker size is unchanged. This build-size delta is recorded for follow-up review rather than described as identical.


## Baseline after the 2026-10-08 Android FileProvider fix

Latest main is [`7d6cfe03a0eea377d8807a9c245704eb8b193d5a`](https://github.com/andreicrp/viotrack-react/commit/7d6cfe03a0eea377d8807a9c245704eb8b193d5a). It updates Android FileProvider paths and the mobile print helper's share-file handling; no data-service or dependency files changed.

After reinstalling the clean-main lockfile with `npm ci` (the initial attempt used stale `node_modules` and could not resolve `@capacitor/share`), clean main passed **4 tests**, lint (**395 warnings, 0 errors**), and build (**2,673.86 kB** `vendor-react`, gzip 791.60 kB; PDF worker 1,264.34 kB). The rebased PR passed **24 tests**, `npm run typecheck`, lint (**394 warnings, 0 errors**), and build with the same matching bundle sizes. Compared with the previous main baseline at `695c3cc`, the earlier +9.93 kB apparent PR delta is no longer present against `7d6cfe0`; current main and PR outputs match.
