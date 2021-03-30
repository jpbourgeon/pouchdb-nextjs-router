import { json, raw } from "body-parser";
import { pathToRegexp } from "path-to-regexp";
import { runMiddleware, sendError } from "./utils";
import afterAll from "./routes/afterAll";
import baseRoutes from "./routes/base";
import dbRoutes from "./routes/db";
import documentRoutes from "./routes/document";
import attachmentRoutes from "./routes/attachment";

const nextPouchDBRouter = async (req, res) => {
  try {
    console.group(`\n${req.method} ${req.url}`);

    const { routerPrefix, limit } = req.locals.nextPouchDBRouter;

    // build the router
    let router = baseRoutes.concat(
      dbRoutes,
      attachmentRoutes,
      documentRoutes,
      afterAll
    );

    // parse the query parameters
    req.locals.nextPouchDBRouter.params =
      req.query[req.locals.nextPouchDBRouter?.paramsName || "params"];
    const props = req.query;
    delete props.params;
    for (const prop in props) {
      try {
        props[prop] = JSON.parse(props[prop]);
      } catch (e) {
        null;
      }
    }
    req.locals.nextPouchDBRouter.query = props;
    console.log({
      params: req.locals.nextPouchDBRouter.params,
      query: req.locals.nextPouchDBRouter.query,
    });

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
        if (req.locals.nextPouchDBRouter.params?.[0]) {
          const name = encodeURIComponent(
            req.locals.nextPouchDBRouter.params?.[0]
          );
          req.locals.nextPouchDBRouter.db = new req.locals.nextPouchDBRouter.PouchDB(
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
          req.locals.nextPouchDBRouter.params?.[1] !== "_design" &&
          req.locals.nextPouchDBRouter.params?.[1] !== "_local"
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

export default nextPouchDBRouter;
export { runMiddleware };
