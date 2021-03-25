import { json, raw } from "body-parser";
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
    let router = baseRoutes.concat(
      dbRoutes,
      attachmentRoutes,
      documentRoutes,
      afterAll
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
    const prefixLength = routerPrefix.length;
    const indexOfQuery = req.url.indexOf("?");
    let url =
      req.url.substring(
        prefixLength,
        indexOfQuery >= prefixLength ? indexOfQuery : undefined
      ) || "/";
    //cut url trailing slash if any
    if (url.slice(-1) === "/") url = url.slice(0, -1) || "/";
    console.log({ src: req.url, res: url });
    for (let i = 0; i < router.length; i++) {
      const route = router[i];
      // Filter the router prefix from the url
      if (
        (route.method === req.method || route.method === "ANY") &&
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
            json({
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
            raw({
              limit: limit || "1mb",
              type: "*/*",
            })
          );
        }
        // run the handler
        await route.handler(req, res);
      }
      // If the headers have been sent exit the loop
      if (res.headersSent) break;
    }
  } catch (error) {
    // Something went wrong, send a 500 error
    console.error(error);
    sendError(res, error);
  } finally {
    console.groupEnd(`\n${req.method} ${req.url}`);
  }
};

export default nextPouchdbRouter;
export { runMiddleware };
