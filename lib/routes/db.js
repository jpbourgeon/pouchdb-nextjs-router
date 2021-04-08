const dbRoutes = [];

// Create a database
dbRoutes.push({
  name: "/db",
  method: "PUT",
  pathToRegexp: "/:db",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      await req.locals.nextPouchDBRouter.db.info();
      res.locals.nextPouchDBRouter.status = 201;
      res.locals.nextPouchDBRouter.response = { ok: true };
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 412;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// Delete a database
dbRoutes.push({
  name: "/db",
  method: "DELETE",
  pathToRegexp: "/:db",
  handler: async (req, res) => {
    try {
      await req.locals.nextPouchDBRouter.db.destroy();
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = { ok: true };
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// Get database information
dbRoutes.push({
  name: "/db",
  method: "GET",
  pathToRegexp: "/:db",
  handler: async (req, res) => {
    try {
      const info = await req.locals.nextPouchDBRouter.db.info();
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = info;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// Bulk docs operations
dbRoutes.push({
  name: "/db/_bulk_docs",
  method: "POST",
  pathToRegexp: "/:db/_bulk_docs",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      if (
        typeof req.locals.nextPouchDBRouter.body !== "object" ||
        Array.isArray(req.locals.nextPouchDBRouter.body)
      ) {
        throw {
          status: 400,
          name: "bad_request",
          message: "Request body must be a JSON object",
        };
      }

      const opts =
        "new_edits" in req.locals.nextPouchDBRouter.body
          ? { new_edits: req.locals.nextPouchDBRouter.body?.new_edits }
          : {};
      const response = await req.locals.nextPouchDBRouter.db.bulkDocs(
        req.locals.nextPouchDBRouter.body,
        opts
      );
      res.locals.nextPouchDBRouter.status = 201;
      res.locals.nextPouchDBRouter.response = response;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// All docs operations
const allDocsHandler = async (req, res) => {
  try {
    // Check that the request body, if present, is an object.
    if (
      !!req.locals.nextPouchDBRouter.body &&
      (typeof req.locals.nextPouchDBRouter.body !== "object" ||
        Array.isArray(req.locals.nextPouchDBRouter.body))
    ) {
      throw {
        status: 400,
        name: "bad_request",
        message: "Request body must be a JSON object",
      };
    }
    const opts = {
      ...req.locals.nextPouchDBRouter.body,
      ...req.locals.nextPouchDBRouter.query,
    };
    const response = await req.locals.nextPouchDBRouter.db.allDocs(opts);
    res.locals.nextPouchDBRouter.status = 200;
    res.locals.nextPouchDBRouter.response = response;
  } catch (error) {
    res.locals.nextPouchDBRouter.status = error.status || 500;
    res.locals.nextPouchDBRouter.response = { ...error };
  }
};
dbRoutes.push({
  name: "/db/_all_docs",
  method: "GET",
  pathToRegexp: "/:db/_all_docs",
  parseJsonBody: false,
  handler: allDocsHandler,
});
dbRoutes.push({
  name: "/db/_all_docs",
  method: "POST",
  pathToRegexp: "/:db/_all_docs",
  parseJsonBody: true,
  handler: allDocsHandler,
});

// DB compaction
dbRoutes.push({
  name: "/db/_compact",
  method: "POST",
  pathToRegexp: "/:db/_compact",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      await req.locals.nextPouchDBRouter.db.compact(
        req.locals.nextPouchDBRouter.query
      );
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = { ok: true };
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// Revs diff
dbRoutes.push({
  name: "/db/_revs_diff",
  method: "POST",
  pathToRegexp: "/:db/_revs_diff",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      const diffs = await req.locals.nextPouchDBRouter.db.revsDiff(
        req.locals.nextPouchDBRouter.body || {},
        req.locals.nextPouchDBRouter.query
      );
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = diffs;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// Query a _design document view
dbRoutes.push({
  name: "/db/_design/doc/_view",
  method: "GET",
  pathToRegexp: "/:db/_design/:id/_view/:view",
  handler: async (req, res) => {
    try {
      const query =
        req.locals.nextPouchDBRouter.params?.[2] +
        "/" +
        req.locals.nextPouchDBRouter.params?.[4];
      const response = await req.locals.nextPouchDBRouter.db.query(
        query,
        req.locals.nextPouchDBRouter.query
      );
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = response;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

// Temp views
dbRoutes.push({
  name: "/db/_temp_view",
  method: "POST",
  pathToRegexp: "/:db/_temp_view",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      if (req.locals.nextPouchDBRouter.body?.map)
        req.locals.nextPouchDBRouter.body.map = new Function(
          "return " + req.locals.nextPouchDBRouter.body?.map
        )();
      req.locals.nextPouchDBRouter.query.conflicts = true;
      const response = await req.locals.nextPouchDBRouter.db.query(
        req.locals.nextPouchDBRouter.body,
        req.locals.nextPouchDBRouter.query
      );
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = response;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  },
});

export default dbRoutes;
