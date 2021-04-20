#!/bin/bash

cd ../pouchdb
git clean -df
git reset --hard HEAD
cp ../pouchdb-nextjs-router/bin/* bin 2>/dev/null || :
cp ../pouchdb-nextjs-router/tests/* tests/integration 2>/dev/null || :
