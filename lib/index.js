import bodyParser from "body-parser";
import { pathToRegexp } from "path-to-regexp";
import { runMiddleware, sendError } from "./utils";
import afterAll from "./routes/afterAll";
import baseRoutes from "./routes/base";
import dbRoutes from "./routes/db";
import documentRoutes from "./routes/document";
import attachmentRoutes from "./routes/attachment";

const nextPouchdbRouter = async (req, res) => {
  try {
    console.group(`\n${req.method} ${req.url}`);

    const { routerPrefix, limit } = req.locals.nextPouchdbRouter;

    // build the router
    let router = [].concat(
      ...baseRoutes,
      ...dbRoutes,
      ...attachmentRoutes,
      ...documentRoutes,
      ...afterAll
    );

    // parse the query parameters
    if (req.locals.nextPouchdbRouter?.paramsName !== "params") {
      req.query.params =
        req.query[req.locals.nextPouchdbRouter?.paramsName || "params"];
    }
    const props = req.query;
    for (const prop in props) {
      try {
        if (prop !== "params") {
          req.query[prop] = JSON.parse(props[prop]);
        }
      } catch (e) {
        null;
      }
    }

    // parse the router in search of matching handlers
    for (const route of router) {
      // Filter the router prefix from the url
      const url = req.url.replace(routerPrefix, "").split("?")[0] || "/";
      if (
        ["ALL", req.method].includes(route.method) &&
        pathToRegexp(route.pathToRegexp).exec(url)
      ) {
        console.log(`${route.name}: ${route.method} ${route.pathToRegexp}`);

        // connect to the database as needed
        if (req.query.params?.[0]) {
          const name = encodeURIComponent(req.query.params?.[0]);
          req.locals.nextPouchdbRouter.db = new req.locals.nextPouchdbRouter.PouchDB(
            name,
            {
              skip_setup: true,
            }
          );
        }

        // parse the json body as needed
        if (route.parseJsonBody) {
          await runMiddleware(
            req,
            res,
            bodyParser.json({
              limit: limit || "1mb",
            })
          );
        }

        // parse the raw body as needed
        if (
          route.parseRawBody &&
          req.query.params?.[1] !== "_design" &&
          req.query.params?.[1] !== "_local"
        ) {
          await runMiddleware(
            req,
            res,
            bodyParser.raw({
              limit: limit || "1mb",
              type: "*/*",
            })
          );
        }
        // run the handler
        await route.handler(req, res);
      }
      // If the headers have been sent or if we went through the GET/POST _changes route, exit the loop
      if (res.headersSent) break;
    }
  } catch (error) {
    // Something went wrong, send a 500 error
    console.error(error);
    sendError(req, res, error);
  } finally {
    console.groupEnd(`\n${req.method} ${req.url}`);
  }
};

export default nextPouchdbRouter;
