import PouchDB from "pouchdb";
import pouchdbNextjsRouter from "lib";
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
    // pouchdb-nextjs-router configuration
    req.locals = {
      nextPouchDBRouter: {
        routerPrefix: "/api/pouchdb", // mandatory; the api root path where pouchdb-nextjs-router is installed and running
        PouchDB: PouchDBInstance, // mandatory; the PouchDB instance to be used
        paramsName: "params", // optional; the name of the parameters slug you specified in your route; expected to be "params" if undefined
        limit: "1mb", // optional; body size limit for json body and attachment raw body according to the body-parser package's syntax; defaults to "1mb" if undefined
      },
    };
    // pouchdb-nextjs-router middleware
    await pouchdbNextjsRouter(req, res);
  } catch (error) {
    console.log(error);
  }
};

export default handler;
