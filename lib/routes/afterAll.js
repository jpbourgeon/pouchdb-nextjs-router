const afterAll = [];

afterAll.push({
  name: "not_found",
  method: "ANY",
  pathToRegexp: "(.*)",
  handler: async (req, res) => {
    if (req.locals.nextPouchDBRouter.params?.[1] !== "_changes") {
      // if no response has been found before the end of the router, send a 404 error
      res.locals.nextPouchDBRouter.status = 404;
      res.locals.nextPouchDBRouter.response = {
        error: "not_found",
        reason: "missing",
      };
    }
  },
});

export default afterAll;
