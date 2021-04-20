# Performance

The module's performance has been tested against the reference express implementation by timing their respective execution against the full pouchdb test suite.

The data below shows the result of the hyperfine benchmarking inside a node:alpine docker container running on a windows 10 computer with an Intel Core i7-8750H CPU @ 2.20GHz and 16GB RAM.

| Router                 |        Mean [s] | Min [s] | Max [s] |    Relative |
| :--------------------- | --------------: | ------: | ------: | ----------: |
| pouchdb-express-router | 125.810 ± 0.230 | 125.648 | 125.973 |        1.00 |
| pouchdb-nextjs-router  | 136.762 ± 0.697 | 136.270 | 137.255 | 1.09 ± 0.01 |

Pouchdb-nextjs-router is slightly slower than its express counterpart.

This overhead is most certainly due to the module providing a hooking system for custom middleware and running its own internal router on top of the next.js one. It is needed however, to make the module atomic and packageable, instead of spreading the code through a bunch of undistributable nextjs api routes. I tested two different routers (regexp based and tree based) and picked the fastest for that use case (regexp based). You are welcome to suggest an alternative that would improve the router's performance.

You can benchmark the module after connecting to the development container.

```bash

# Benchmark pouchdb-nextjs-router against pouchdb-express-router
npm run benchmark

# You can grab the benchmark's result formatted in markdown from /workspaces/pouchdb-nextjs-router/perf.md
nano /workspaces/pouchdb-nextjs-router/perf.md

# Time pouchdb-nextjs-router only
npm run time

# Time pouchdb-express-router only
npm run time:express

# Time a custom server
# useful if you want to test against a custom dev server on your host
# replace the COUCH_HOST url in the example below
COUCH_HOST=http://host.docker.internal:3000/api/pouchdb npm run time:custom
```
