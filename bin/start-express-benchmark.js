"use strict";

const fs = require("fs");
const path = require("path");

const routerRoot = path.resolve(__dirname, "..");
const pouchdbRoot = path.resolve(routerRoot, "../pouchdb");
const express = require(path.join(pouchdbRoot, "node_modules/express"));
const pouchdbExpressRouter = require(path.join(
  pouchdbRoot,
  "node_modules/pouchdb-express-router"
));
const PouchDB = require(path.join(routerRoot, "node_modules/pouchdb"));

const stateDirectory = path.join(routerRoot, ".benchmark-state/express");
fs.mkdirSync(stateDirectory, { recursive: true });

const app = express();
const ServerPouchDB = PouchDB.defaults({ prefix: `${stateDirectory}/` });

// Match the application middleware in PouchDB's reference launcher. The Next.js
// benchmark route intentionally has no Helmet, CORS, or custom application hooks.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Max-Age", "1000000000");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(pouchdbExpressRouter(ServerPouchDB));
app.listen(Number(process.env.PORT || 3000), "127.0.0.1");
