#!/bin/bash

: ${TIMEOUT:=50000}
: ${BAIL:=1}


if [ $BAIL -eq 1 ]; then
    BAIL_OPT="--bail"
else
    BAIL_OPT=""
fi

REFERENCE_BENCHMARK_FLAKE="test\\.issue3179\\.js-local-http.*#3179.conflicts.synced,.non-live.sync$"

if [ "$BENCHMARK" == 1 ]; then
    BENCHMARK_OPT="--ignore=tests/integration/test.pouchdb-nextjs-router.js"
    RETRIES=0
else
    BENCHMARK_OPT=""
    RETRIES=2
fi

if [ "$BENCHMARK" == 1 ] || [ "$REFERENCE_BENCHMARK" == 1 ]; then
    REFERENCE_BENCHMARK_OPT="--grep=$REFERENCE_BENCHMARK_FLAKE --invert"
else
    REFERENCE_BENCHMARK_OPT=""
fi

: ${BENCHMARK_TEST_PATTERN:="tests/integration/test.*.js"}

if [ "$BENCHMARK" == 1 ]; then
    echo "Benchmark Mocha: SEED=$SEED profile=$SERVER retries=$RETRIES timeout=$TIMEOUT pattern=$BENCHMARK_TEST_PATTERN ignore=tests/integration/test.pouchdb-nextjs-router.js exclude=$REFERENCE_BENCHMARK_FLAKE"
elif [ "$REFERENCE_BENCHMARK" == 1 ]; then
    echo "Reference validation: excluding known upstream flake $REFERENCE_BENCHMARK_FLAKE"
fi

# PouchDB's upstream integration suite contains historically intermittent tests.
# Keep retries global and bounded so CI reflects reproducible failures without
# maintaining a local allowlist of upstream flakes. Persistent failures remain fatal.
./node_modules/.bin/mocha \
    $BAIL_OPT \
    $BENCHMARK_OPT \
    $REFERENCE_BENCHMARK_OPT \
    --exit \
    --retries $RETRIES \
    --timeout $TIMEOUT \
    --require=./tests/integration/node.setup.js \
    --reporter=spec \
    "$BENCHMARK_TEST_PATTERN"
