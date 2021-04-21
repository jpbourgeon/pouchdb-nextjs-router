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

const runRouterMiddleware = async (type, req, res, route) => {
  for (
    let i = 0;
    i < req.locals.nextPouchDBRouter?.middleware?.[type].length ?? -1;
    i++
  ) {
    // Break the loop if skip[Type]Middleware is set
    const skip =
      type === "onRequest"
        ? "skipOnRequestMiddleware"
        : "skipOnResponseMiddleware";
    if (res.locals.nextPouchDBRouter[skip]) break;

    // Run the current middleware if it matches the route method and name. If...
    const middleware = req.locals.nextPouchDBRouter.middleware[type][i];
    if (
      // ((middleware method is a string and equals the route method) OR
      // (middleware method is a regexp and matches the route method)) AND
      ((typeof middleware.method === "string" &&
        middleware.method === route.method) ||
        (Object.prototype.toString.call(middleware.method) ===
          "[object RegExp]" &&
          middleware.method.test(route.method))) &&
      // ((middleware name is a string and equals the route name) OR
      // (middleware name is a regexp and matches the route name))
      ((typeof middleware.route === "string" &&
        middleware.route === route.name) ||
        (Object.prototype.toString.call(middleware.route) ===
          "[object RegExp]" &&
          middleware.route.test(route.name)))
    ) {
      await middleware.handler(req, res);
    }
  }
};

const resolveRouter = (req, res) => {
  // if (res.locals.nextPouchDBRouter.routeName === "/db/_changes")
  //   console.log(JSON.stringify(res.locals, null, 2));

  // headers
  if (!res.headersSent) {
    const headers = res.locals.nextPouchDBRouter.headers;
    for (let i = 0; i < headers.length; i++) {
      res.setHeader(headers[i]?.name, headers[i]?.value);
    }
  }

  // status
  if (res.locals.nextPouchDBRouter.status)
    res.status(res.locals.nextPouchDBRouter.status);

  // response
  if (res.locals.nextPouchDBRouter.responseIsJson) {
    res.json(res.locals.nextPouchDBRouter.response);
  } else {
    res.send(res.locals.nextPouchDBRouter.response);
  }
};

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
        req.locals.nextPouchDBRouter.body = req.body;

        // run the onRequest middlewares
        await runRouterMiddleware("onRequest", req, res, route);

        // run the route core handler function
        if (!res.locals.nextPouchDBRouter.skipCoreFunction)
          await route.handler(req, res);

        // run the onResponse middlewares
        await runRouterMiddleware("onResponse", req, res, route);

        // resolve the router
        await resolveRouter(req, res);

        //and quit the loop
        break;
      }
    }
  } catch (error) {
    console.error(error);
    // Something went wrong, send a 500 error
    res.status(error.status || 500).json({
      error: "Internal server Error",
    });
  }
};

export default nextPouchDBRouter;
export { runMiddleware };
