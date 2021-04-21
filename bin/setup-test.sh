#!/bin/bash

# cleanup router databases
rm -rf .pouchdb/*

# cleanup pouchdb repository
cd ../pouchdb
git clean -df
git reset --hard HEAD

# copy runtime and tests
cp ../pouchdb-nextjs-router/bin/* bin 2>/dev/null || :
cp ../pouchdb-nextjs-router/tests/* tests/integration 2>/dev/null || :
