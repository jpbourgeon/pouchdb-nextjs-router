const notFound = [];

notFound.push({
  name: "not_found",
  method: "ANY",
  pathToRegexp: "(.*)",
  handler: async (req, res) => {
    // if no response has been found before the end of the router, send a 404 error
    res.locals.nextPouchDBRouter.status = 404;
    res.locals.nextPouchDBRouter.response = {
      error: "not_found",
      reason: "missing",
    };
  },
});

export default notFound;
