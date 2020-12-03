# pouchdb-nextjs-router

> A next.js API submodule with a CouchDB style REST interface to PouchDB

![live the code](https://img.shields.io/badge/live%20the%20code-%E2%98%85%E2%98%85%E2%98%85%E2%98%85-yellow) ![Github workflow status](https://img.shields.io/github/workflow/status/jpbourgeon/pouchdb-nextjs-router/continuous-integration) ![Github workflow status](https://img.shields.io/github/package-json/v/jpbourgeon/pouchdb-nextjs-router)

## Introduction

**pouchdb-nextjs-router** is a routing module that provides the minimal API to add a PouchDB HTTP endpoint to a next.js application.

It is designed to be mounted into a [next.js API route](https://nextjs.org/docs/api-routes/introduction) to provide an endpoint for PouchDB instances to sync with.

The code is primarily forked from [https://github.com/pouchdb/pouchdb-express-router](https://github.com/pouchdb/pouchdb-express-router).

I wrote this module because pouchdb-express-router simply doesn't work inside nextjs beyond the basic paths, and fails to pass the whole pouchdb testsuite.

The module is fully functional but has not been widely used in production yet.

## Installation

Install with your favorite package manager.

```bash
npm install --save pouchdb-nextjs-router
```

## Example usage

Create an [optional catch all API route](https://nextjs.org/docs/api-routes/dynamic-api-routes#optional-catch-all-api-routes) in your next.js app. For example `pages/api/pouchdb/[[...params]].js`.

```js
import PouchDB from "pouchdb";
import fs from "fs";
import path from "path";
// the router comes with a basic middleware runner to use with next.js
import { runMiddleware } from "pouchdb-nextjs-router/utils";
import pouchdbNextjsRouter from "pouchdb-nextjs-router";

// disable nextjs body auto-parsing: pouchdb-nextjs-router uses
// its own body-parser instance, because it needs to parse raw bodies
// to deal with attachments
export const config = {
  api: {
    bodyParser: false,
  },
};

// create a PouchDB instance
const prefix = path.normalize(".pouchdb/");
!fs.existsSync(prefix) && fs.mkdirSync(prefix, { recursive: true });
const PouchDBInstance = PouchDB.defaults({ prefix });

const handler = async (req, res) => {
  try {
    // you can run any middleware before the router
    // (ex. for security: helmet, cors, custom authentication, ...)

    // pouchdb-nextjs-router configuration
    req.locals = {
      nextPouchdbRouter: {
        // mandatory; the api root path where pouchdb-nextjs-router
        // is installed and running
        routerPrefix: "/api/pouchdb",
        // mandatory; the PouchDB instance to be used
        PouchDB: PouchDBInstance,
        // optional; the name of the parameters slug you specified
        // in your route; expected to be "params" if undefined
        paramsName: "params",
        // optional; body size limit for json body and attachment raw
        // body according to the body-parser package's syntax;
        // defaults to "1mb" if undefined
        limit: "1mb",
      },
    };

    // pouchdb-nextjs-router middleware
    await runMiddleware(req, res, pouchdbNextjsRouter);
  } catch (error) {
    console.log(error);
  }
};

export default handler;
```

The repo is actually a next.js app that uses pouchdb-nextjs-router. You can check the code for a full example with headers setup (helmet and cors middleware).

## Testing

The module is automatically tested against the whole pouchdb test suite (1662 tests) before any PR merge or release.

You can run the tests after building the docker image:

```bash
# Build the docker image
docker build --pull --rm -f "Dockerfile" -t pouchdbnextjsrouter:latest "."

# Run the tests with pouchdb-nextjs-router
docker run --rm pouchdbnextjsrouter

# Run the tests with pouchdb-express-router
docker run --rm pouchdbnextjsrouter npm run test:express

# Run the container and connect to geek around
docker run --rm -it pouchdbnextjsrouter bash

# Run the tests with a custom server
# useful if you want to test against a custom dev server on your host
# replace the COUCH_HOST url in the example below
docker run --rm -it pouchdbnextjsrouter bash
COUCH_HOST=http://host.docker.internal:3000/api/pouchdb npm run test:custom

```

## Performance

The module's performance has been tested against the reference express implementation by timing their execution against the full pouchdb test suite (1662 tests).

The data below shows the result of the hyperfine benchmarking inside a node:alpine docker container running on a windows 10 computer with an Intel Core i7-8750H CPU @ 2.20GHz and 16GB RAM.

```bash
# Benchmark #1: pouchdb-express-router
  Time (mean ± δ):    130.241 s ± 10.069 s   [User: 42.057 s, System: 8.883 s]
  Range (min … max):  125.980 s … 158.779 s  10 runs

# Benchmark #2: pouchdb-nextjs-router
  Time (mean ± δ):    137.238 s ± 2.083 s    [User: 44.053 s, System: 9.215 s]
  Range (min … max):  133.924 s … 140.000 s  10 runs

# Summary
  pouchdb-express-router ran 1.05 ± 0.08 times faster
  than pouchdb-nextjs-router
```

Pouchdb-nextjs-router is slightly slower than its express counterpart.

I think this overhead is because the module uses its own internal router. It is needed to make the module atomic and packageable, instead of making a bunch of undistributable nextjs api routes. I tested two different routers and picked the fastest for that use case. You are welcome to suggest an alternative that would improve the router's performance.

You can benchmark the module after building the docker image:

```bash
# Build the docker image
docker build --pull --rm -f "Dockerfile" -t pouchdbnextjsrouter:latest "."

# Benchmark pouchdb-nextjs-router against pouchdb-express-router
docker run --rm pouchdbnextjsrouter npm run benchmark

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

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.  
Please make sure that the package still passes the latest full pouchdb test suite before submitting.

## License

[MIT](https://choosealicense.com/licenses/mit/)
