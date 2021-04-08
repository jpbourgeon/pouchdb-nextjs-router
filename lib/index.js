import { json, raw } from "body-parser";
import { pathToRegexp } from "path-to-regexp";
import notFound from "./routes/notFound";
import baseRoutes from "./routes/base";
import dbRoutes from "./routes/db";
import changesRoutes from "./routes/changes";
import {
  designDocumentRoutes,
  localDocumentRoutes,
  documentRoutes,
} from "./routes/document";
import { designAttachmentRoutes, attachmentRoutes } from "./routes/attachment";
import { runMiddleware, resolveRouter } from "./utils";

const nextPouchDBRouter = async (req, res) => {
  try {
    // console.group(`\n${req.method} ${req.url}`);

    const { routerPrefix, limit } = req.locals.nextPouchDBRouter;
    res.locals = {
      nextPouchDBRouter: {
        routeName: undefined,
        method: req.method,
        skipOtherPreMiddleware: false,
        skipCoreFunction: false,
        skipOtherPostMiddleware: false,
        headers: [],
        status: undefined,
        response: undefined,
        responseIsJson: true,
      },
    };

    // build the router : order matters
    let router = [].concat(
      baseRoutes,
      changesRoutes,
      dbRoutes,
      designAttachmentRoutes,
      designDocumentRoutes,
      localDocumentRoutes,
      attachmentRoutes,
      documentRoutes,
      notFound
    );

    // parse the query parameters
    req.locals.nextPouchDBRouter.params =
      req.query[req.locals.nextPouchDBRouter?.paramsName ?? "params"];
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

    // Filter the router prefix from the url
    const prefixLength = routerPrefix.length;
    const indexOfQuery = req.url.indexOf("?");
    let url =
      req.url.substring(
        prefixLength,
        indexOfQuery >= prefixLength ? indexOfQuery : undefined
      ) || "/";

    //cut url the trailing slash if any
    if (url.slice(-1) === "/") url = url.slice(0, -1) || "/";

    // parse the router in search of matching handlers
    for (let i = 0; i < router.length; i++) {
      const route = router[i];
      if (
        (route.method === req.method || route.method === "ANY") &&
        pathToRegexp(route.pathToRegexp).exec(url)
      ) {
        // The route has been found
        // console.log([url, route]);

        res.locals.nextPouchDBRouter.routeName = route.name;

        // connect to the database
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

        // parse the json body
        if (route.parseJsonBody) {
          req.locals.nextPouchDBRouter.hasRawBody = false;
          await runMiddleware(
            req,
            res,
            json({
              limit: limit || "1mb",
            })
          );
        }

        // or parse the raw body
        if (
          route.parseRawBody &&
          req.locals.nextPouchDBRouter.params?.[1] !== "_design" &&
          req.locals.nextPouchDBRouter.params?.[1] !== "_local"
        ) {
          req.locals.nextPouchDBRouter.hasRawBody = true;
          await runMiddleware(
            req,
            res,
            raw({
              limit: limit || "1mb",
              type: "*/*",
            })
          );
        }

        // Move data into the router's namespace
        req.locals.nextPouchDBRouter.body = req.body;

        // run the onRequest middleware

        // run the route core handler function
        await route.handler(req, res);

        // run the onResponse middleware

        // resolve the router
        // if (route.name !== "/db/_changes") await resolveRouter(req, res);
        await resolveRouter(req, res);

        //and quit the loop
        break;
      }
    }
  } catch (error) {
    // console.error(error);
    // Something went wrong, send a 500 error
    res.status(error.status || 500).json({
      error: "Internal server Error",
    });
  } finally {
    // console.groupEnd(`\n${req.method} ${req.url}`);
  }
};

export default nextPouchDBRouter;
export { runMiddleware };
