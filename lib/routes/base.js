const baseRoutes = [];

// HEAD
baseRoutes.push({
  name: "HEAD",
  method: "HEAD",
  pathToRegexp: "(.*)",
  handler: async (req, res) => {
    res.status(200).send({});
  },
});

// home
baseRoutes.push({
  name: "Home",
  method: "GET",
  pathToRegexp: "(^/?$)",
  handler: async (req, res) => {
    res.status(200).json({ "pouchdb-nextjs-router": "Welcome!" });
  },
});

// _session mock
baseRoutes.push({
  name: "Session mock",
  method: "GET",
  pathToRegexp: "/_session",
  handler: async (req, res) => {
    res.status(200).send({
      ok: true,
      userCtx: { name: null, roles: ["_admin"] },
    });
  },
});

export default baseRoutes;
