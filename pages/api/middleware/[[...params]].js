import helmet from "helmet";
import cors from "cors";
import PouchDB from "pouchdb";
import pouchdbNextjsRouter, { runMiddleware } from "lib"; // the router also exports a basic middleware runner to use with nextjs
import fs from "fs";
import path from "path";

// disable nextjs body auto-parsing: pouchdb-nextjs-router uses its own body-parser instance, because it needs to parse raw bodies to deal with attachments
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
    // you can run any middleware before the router (ex. for security: helmet, cors, custom authentication, ...)
    // Example: helmet middleware - see <https://github.com/helmetjs/helmet>
    await runMiddleware(req, res, helmet());
    // Example: cors middleware - see <https://github.com/expressjs/cors>
    await runMiddleware(
      req,
      res,
      cors({
        origin: true,
        allowedHeaders: [
          "Origin",
          "X-Requested-With",
          "Content-Type",
          "Accept",
        ],
        methods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        credentials: true,
      })
    );
    // pouchdb-nextjs-router configuration
    req.locals = {
      nextPouchDBRouter: {
        routerPrefix: "/api/middleware", // mandatory; the api root path where pouchdb-nextjs-router is installed and running
        PouchDB: PouchDBInstance, // mandatory; the PouchDB instance to be used
        paramsName: "params", // optional; the name of the parameters slug you specified in your route; expected to be "params" if undefined
        limit: "1mb", // optional; body size limit for json body and attachment raw body according to the body-parser package's syntax; defaults to "1mb" if undefined
        middleware: {
          // `onRequest` middleware functions array
          onRequest: [
            // First onRequest Middleware
            {
              route: /\/_session/,
              method: "GET",
              handler: async (req, res) => {
                // do something here
                console.log("onRequest");
              },
            },
          ],
          // `onResponse` middlewares functions array
          onResponse: [
            // First onResponse Middleware
            {
              route: "/",
              method: "GET",
              handler: async (req, res) => {
                // do something here
                console.log("onResponse");
              },
            },
          ],
        },
      },
    };

    // pouchdb-nextjs-router middleware
    await runMiddleware(req, res, pouchdbNextjsRouter);
  } catch (error) {
    console.log(error);
  }
};

export default handler;
