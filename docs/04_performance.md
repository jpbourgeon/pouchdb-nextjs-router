# Performance

The module's performance has been tested against the reference express implementation by timing their respective execution against the full pouchdb test suite.

The data below shows the result of the hyperfine benchmarking inside a node:alpine docker container running on a windows 10 computer with an Intel Core i7-8750H CPU @ 2.20GHz and 16GB RAM.

| Router                 |         Mean [s] | Min [s] | Max [s] |     Relative |
| :--------------------- | ---------------: | ------: | ------: | -----------: |
| pouchdb-express-router | 130.485 .. 0.814 | 129.910 | 131.060 |         1.00 |
| pouchdb-nextjs-router  | 137.951 .. 0.498 | 137.599 | 138.303 | 1.06 .. 0.01 |

Pouchdb-nextjs-router is slightly slower than its express counterpart.

This overhead is most certainly due to the module running its own internal router on top of the next.js one. It is needed however, to make the module atomic and packageable, instead of spreading the code through a bunch of undistributable nextjs api routes. I tested two different routers (regexp based and tree based) and picked the fastest for that use case (regexp based). You are welcome to suggest an alternative that would improve the router's performance.

You can benchmark the module after building the docker image:

```bash
# Build the docker image
docker build --pull --rm -f "Dockerfile" -t pouchdbnextjsrouter:latest "."

# Benchmark pouchdb-nextjs-router against pouchdb-express-router
docker run --rm pouchdbnextjsrouter npm run benchmark

# if your run the benchmark in interactive mode, you can grab the benchmark's result formatted in markdown from /workspaces/pouchdb-nextjs-router/perf.md
docker run --it pouchdbnextjsrouter bash
npm run benchmark
vi /workspaces/pouchdb-nextjs-router/perf.md

# Time pouchdb-nextjs-router only
docker run --rm pouchdbnextjsrouter time

# Time pouchdb-express-router only
docker run --rm pouchdbnextjsrouter npm run time:express

# Time a custom server
# useful if you want to test against a custom dev server on your host
# replace the COUCH_HOST url in the example below
docker run --rm -it pouchdbnextjsrouter bash
COUCH_HOST=http://host.docker.internal:3000/api/pouchdb npm run time:custom
```
