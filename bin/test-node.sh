#!/bin/bash

: ${TIMEOUT:=50000}
: ${BAIL:=1}


if [ $BAIL -eq 1 ]; then
    BAIL_OPT="--bail"
else
    BAIL_OPT=""
fi

# PouchDB's upstream integration suite contains historically intermittent tests.
# Keep retries global and bounded so CI reflects reproducible failures without
# maintaining a local allowlist of upstream flakes. Persistent failures remain fatal.
./node_modules/.bin/mocha \
    $BAIL_OPT \
    --exit \
    --retries 2 \
    --timeout $TIMEOUT \
    --require=./tests/integration/node.setup.js \
    --reporter=spec \
    "tests/integration/test.*.js" \
