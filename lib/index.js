import { json, raw } from "body-parser";
import { pathToRegexp } from "path-to-regexp";
import afterAll from "./routes/afterAll";
import baseRoutes from "./routes/base";
import dbRoutes from "./routes/db";
import documentRoutes from "./routes/document";
import attachmentRoutes from "./routes/attachment";

const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
};

const nextPouchDBRouter = async (req, res) => {
  try {
    // console.group(`\n${req.method} ${req.url}`);

    const { routerPrefix, limit } = req.locals.nextPouchDBRouter;
    res.locals = {
      nextPouchDBRouter: {
        routeName: undefined,
        skipOtherPreMiddleware: false,
        skipCoreFunction: false,
        skipOtherPostMiddleware: false,
        headers: [],
        status: undefined,
        response: undefined,
        responseIsJson: true,
      },
    };

    // build the router
    let router = baseRoutes.concat(
      dbRoutes,
      documentRoutes,
      attachmentRoutes,
      afterAll
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
        // console.log(`${route.name}: ${route.method} ${route.pathToRegexp}`);

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

        // run the route core handler function

        await route.handler(req, res);

        // if (route.name === "/db/_changes") console.log([res.locals]);
        console.log([res.locals]);

        // If the headers have already been sent, break the loop (related to live `db/_changes` subscriptions)
        // if (res.headersSent || route.name === "/db/_changes") break router;
        // console.log([res.locals.nextPouchDBRouter]);
        // Send the HTTP response and break the loop
        if (!res.headersSent) {
          const headers = res.locals.nextPouchDBRouter.headers;
          for (let i = 0; i < headers.length; i++) {
            res.setHeader(headers[i]?.name, headers[i]?.value);
          }
        }
        if (res.locals.nextPouchDBRouter.status)
          res.status(res.locals.nextPouchDBRouter.status);
        if (res.locals.nextPouchDBRouter.responseIsJson) {
          // console.log("JSON");
          res.json(res.locals.nextPouchDBRouter.response);
        } else {
          // console.log("SEND");
          res.send(res.locals.nextPouchDBRouter.response);
        }
        break;
      }
    }
  } catch (error) {
    console.log("ERROR");
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
