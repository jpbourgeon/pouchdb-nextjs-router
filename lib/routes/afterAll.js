const afterAll = [];

afterAll.push({
  name: "not_found",
  method: "ANY",
  pathToRegexp: "(.*)",
  handler: async (req, res) => {
    if (req.locals.nextPouchdbRouter.params?.[1] !== "_changes") {
      // if no response has been found before the end of the router, send a 404 error
      res.status(404).json({ error: "not_found", reason: "missing" });
    }
  },
});

export default afterAll;
