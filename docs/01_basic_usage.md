# Basic usage

Create an [optional catch all API route](https://nextjs.org/docs/api-routes/dynamic-api-routes#optional-catch-all-api-routes) in your next.js app. For example `pages/api/pouchdb/[[...params]].js`.

```js
import PouchDB from "pouchdb";
import fs from "fs";
import path from "path";
import pouchdbNextjsRouter, {
  // the router also exports a basic middleware runner to use with nextjs
  runMiddleware,
} from "pouchdb-nextjs-router";

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

The repo is actually a next.js app that uses pouchdb-nextjs-router inside various API routes. You can check the code for a full example with headers setup (helmet and cors middleware).
