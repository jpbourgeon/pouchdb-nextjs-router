const baseRoutes = [];

// HEAD
baseRoutes.push({
  name: "headers",
  method: "HEAD",
  pathToRegexp: "(.*)",
  handler: async (req, res) => {
    res.locals.nextPouchDBRouter.status = 200;
    res.locals.nextPouchDBRouter.response = { ok: true };
  },
});

// home
baseRoutes.push({
  name: "/",
  method: "GET",
  pathToRegexp: "(^/?$)",
  handler: async (req, res) => {
    res.locals.nextPouchDBRouter.status = 200;
    res.locals.nextPouchDBRouter.response = {
      "pouchdb-nextjs-router": "Welcome!",
    };
  },
});

// _session mock
baseRoutes.push({
  name: "/db/_session",
  method: "GET",
  pathToRegexp: "/_session",
  handler: async (req, res) => {
    res.locals.nextPouchDBRouter.status = 200;
    res.locals.nextPouchDBRouter.response = {
      ok: true,
      userCtx: { name: null, roles: ["_admin"] },
    };
  },
});

export default baseRoutes;
