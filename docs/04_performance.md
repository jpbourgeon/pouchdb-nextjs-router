# Performance

`pouchdb-express-router` is the performance baseline. The reference benchmark
compares its Express HTTP stack with the Next.js HTTP stack while keeping the
PouchDB engine, test checkout, Node.js version, dependency trees, seed, Mocha
options, timeouts, exclusions, and workload fixed.

## Current status

After the hot-path changes, one preliminary run observed:

| Router                   |              Time |
| ------------------------ | ----------------: |
| `pouchdb-express-router` |         172.165 s |
| `pouchdb-nextjs-router`  |         178.297 s |
| Observed delta           | +6.132 s / +3.56% |

That campaign used `WARMUP=0 MINRUNS=1`. It is a historical observation, not a
statistically sufficient or definitive performance result. The conclusion about
whether a stable residual difference remains is pending the reproducible campaign
described below. In particular, the observation must not be used to attribute a
remaining cost to Next.js before the paired results have been analysed.

## Reference protocol

The explicitly triggered `reference-benchmark` GitHub Actions workflow is the
source of record. It runs on an explicit `ubuntu-24.04` runner and performs all
work in one job on one machine:

1. Check out the router commit selected at dispatch and the pinned PouchDB test
   commit.
2. Install and build both dependency trees with Node.js 24.19.0.
3. Run the functional PouchDB suite with the selected `SEED`. This validation
   is outside all timings and must finish with zero failures after the single
   upstream quarantine documented below is applied.
4. Prepare the common harness. The router-specific
   `tests/integration/test.pouchdb-nextjs-router.js` file is excluded from both
   measured sides. The exact upstream test quarantined below is excluded from
   both the preliminary validation and the two measured sides; no workload
   exclusion differs between Express and Next.js.
   The existing capability-gated `filter=_design` exception is evaluated under
   the same harness profile for both targets; each real server type is still
   detected from its HTTP response.
5. Start Express on port 3000 and Next.js on port 3001, check both endpoints,
   and keep both processes alive until the campaign ends. Both server stacks use
   the same installed PouchDB version.
6. Send the same short CRUD warmup to both servers. Warmup is not measured and
   the Linux page cache is not purged: the target is a warm, long-lived HTTP
   service rather than cold I/O.
7. Before every measurement, remove the preceding server-side PouchDB state,
   verify that its dedicated state directory is empty, and verify that the warm
   server still answers. Servers are not restarted for this reset.
8. Run five deterministic pairs in the order `A1 Express, B1 Next.js, ..., A5 Express, B5 Next.js`. Every measured process receives the same fixed seed,
   timeout, test pattern and Mocha options. `--retries 0` is forced in benchmark
   mode; any test failure invalidates the campaign immediately.
9. Measure only each common-suite invocation. Setup, builds, server startup,
   health checks, state reset, warmup, and functional validation are excluded.

The report contains all ten durations; count, mean, median, minimum, maximum,
and sample standard deviation for each server; the absolute and relative delta
of means; and every paired `Bᵢ - Aᵢ` delta with its mean. Five pairs support a
descriptive conclusion, not a sophisticated confidence interval.

### Known upstream quarantine

The reference workflow excludes only this test title:

`test.issue3179.js-local-http #3179 conflicts synced, non-live sync`

It is a known PouchDB intermittent failure tracked by
[apache/pouchdb#8690](https://github.com/apache/pouchdb/issues/8690). In the
pull request runs that established this quarantine, the same assertion failed
repeatedly in ordinary CI and in the reference workflow, while other executions
passed it or passed after a full-suite retry. Allowing it into a no-retry timing
campaign makes campaign completion nondeterministic and does not produce a
valid duration when it fails.

The exclusion is identical for Express and Next.js and is limited to the
reference workflow. Ordinary CI continues to execute the test with the existing
bounded retry policy, so a persistent functional regression remains visible and
blocking there.

TODO: investigate and propose an upstream PouchDB pull request that makes this
test reliable without weakening its conflict-synchronisation assertion. Remove
the local quarantine once the pinned PouchDB checkout contains that correction.

## Run the reference benchmark

Before the workflow exists on the default branch, add the `benchmark` label to a
pull request. Only the `labeled` event is observed, and the benchmark job runs
only when that exact label is added. It checks out the pull request head SHA and
uses the deterministic seed `pr-<head-sha>`. Removing and adding the label again
reproduces the campaign programmatically without running it on ordinary pull
request updates.

Once the workflow exists on the default branch, it can also be run manually:

1. Open **Actions → reference-benchmark → Run workflow** on GitHub.
2. Select the commit or branch to benchmark.
3. Enter an explicit PouchDB test seed and dispatch the workflow. Reuse the same
   seed when reproducing a campaign.

The workflow logs print the router commit SHA, pinned PouchDB commit, Node
version, runner and seed. The job summary contains the paired table and aggregate
statistics. The `reference-benchmark-<sha>` artifact contains
`results.md`, `results.json`, `measurements.csv`, individual suite logs, both
server logs, and the functional validation log. The JSON file is sufficient to
repeat the analysis without rerunning the benchmark.

## Local harness checks

The following short command validates the lifecycle, health checks, seed
propagation, state reset, no-retry mode, one Express/Next.js alternation, timing,
statistics, and report generation against a common test file:

```bash
SEED=local-smoke npm run benchmark:smoke
```

`npm run benchmark` runs the full five-pair protocol, but a local execution is
not the reference result. `npm run time`, `npm run time:express`, and custom
server timing commands remain diagnostic tools only; they do not provide the
controlled paired conditions above. The former Hyperfine lifecycle and Linux
page-cache purge are intentionally absent from the reference path.

## Reference results

The paired reference campaign has not yet completed. Once it has been analysed,
record here the exact environment, router SHA, PouchDB commit and version, seed,
all five measurements per server, aggregate statistics, mean differential, and
a proportionate interpretation of whether the residual difference is stable.
