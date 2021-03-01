import { sendError } from "../utils";

const dbRoutes = [];

// Create a database
dbRoutes.push({
  name: "Create db",
  method: "PUT",
  pathToRegexp: "/:db",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      await req.locals.nextPouchdbRouter.db.info();
      res.status(201).json({ ok: true });
    } catch (error) {
      sendError(res, error, 412);
    }
  },
});

// Delete a database
dbRoutes.push({
  name: "Delete db",
  method: "DELETE",
  pathToRegexp: "/:db",
  handler: async (req, res) => {
    try {
      await req.locals.nextPouchdbRouter.db.destroy();
      res.status(200).json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Get database information
dbRoutes.push({
  name: "Get db info",
  method: "GET",
  pathToRegexp: "/:db",
  handler: async (req, res) => {
    try {
      const info = await req.locals.nextPouchdbRouter.db.info();
      res.status(200).json({ ...info });
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Bulk docs operations
dbRoutes.push({
  name: "Bulk docs operations",
  method: "POST",
  pathToRegexp: "/:db/_bulk_docs",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      if (typeof req.body !== "object" || Array.isArray(req.body)) {
        throw {
          status: 400,
          name: "bad_request",
          message: "Request body must be a JSON object",
        };
      }

      const opts =
        "new_edits" in req.body ? { new_edits: req.body.new_edits } : {};
      const response = await req.locals.nextPouchdbRouter.db.bulkDocs(
        req.body,
        opts
      );
      res.status(201).json(response);
    } catch (error) {
      sendError(res, error);
    }
  },
});

// All docs operations
const allDocsHandler = async (req, res) => {
  try {
    // Check that the request body, if present, is an object.
    if (
      !!req.body &&
      (typeof req.body !== "object" || Array.isArray(req.body))
    ) {
      throw {
        status: 400,
        name: "bad_request",
        message: "Request body must be a JSON object",
      };
    }
    const opts = { ...req.body, ...req.query };
    const response = await req.locals.nextPouchdbRouter.db.allDocs(opts);
    res.status(200).json(response);
  } catch (error) {
    sendError(res, error);
  }
};
dbRoutes.push({
  name: "All docs operations",
  method: "GET",
  pathToRegexp: "/:db/_all_docs",
  parseJsonBody: false,
  handler: allDocsHandler,
});
dbRoutes.push({
  name: "All docs operations",
  method: "POST",
  pathToRegexp: "/:db/_all_docs",
  parseJsonBody: true,
  handler: allDocsHandler,
});

// Monitor database changes
const dbChangesHandler = async (req, res) => {
  const { db } = req.locals.nextPouchdbRouter;

  req.query.query_params = JSON.parse(JSON.stringify(req.query));

  if (req.body && req.body.doc_ids) {
    req.query.doc_ids = req.body.doc_ids;
  }

  if (req.query.feed === "continuous" || req.query.feed === "longpoll") {
    let heartbeatInterval;
    let timeout;
    let written = false;
    const heartbeat =
      typeof req.query.heartbeat === "number" ? req.query.heartbeat : 6000;
    heartbeatInterval = setInterval(() => {
      res.write("\n");
    }, heartbeat);

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };

    if (req.query.feed === "continuous") {
      req.query.live = req.query.continuous = true;
      db.changes(req.query)
        .on("change", (change) => {
          written = true;
          res.write(JSON.stringify(change) + "\n");
        })
        .on("error", (error) => {
          if (!written) {
            sendError(res, error);
          } else {
            res.end();
          }
          cleanup();
        });
    } else {
      // longpoll
      // first check if there are >0. if so, return them immediately
      req.query.live = req.query.continuous = false;
      if (req.query.timeout) {
        timeout = setTimeout(() => {
          written = true;
          res.json({
            results: [],
            last_seq: req.query.since,
          });
          cleanup();
        }, req.query.timeout);
      }
      db.changes(req.query)
        .on("complete", (complete) => {
          if (!complete.results) {
            // canceled, ignore
            cleanup();
          } else if (complete.results.length) {
            written = true;
            res.json({ ...complete });
            cleanup();
          } else {
            // do the longpolling
            req.query.live = req.query.continuous = true;

            const changes = db
              .changes(req.query)
              .on("change", (change) => {
                if (written) {
                  return;
                }
                written = true;
                res.write(
                  JSON.stringify({
                    results: [change],
                    last_seq: change.seq,
                  }) + "\n"
                );
                res.end();
                changes.cancel();
                cleanup();
              })
              .on("error", (error) => {
                if (!written) {
                  sendError(res, error);
                }
                cleanup();
              });
          }
        })
        .on("error", (error) => {
          if (!written) {
            sendError(res, error);
          }
          cleanup();
        });
    }
  } else {
    // straight shot, not continuous
    try {
      const response = await db.changes(req.query);
      res.status(200).json(response);
    } catch (error) {
      sendError(res, error);
    }
  }
};
dbRoutes.push({
  name: "DB changes",
  method: "GET",
  pathToRegexp: "/:db/_changes",
  parseJsonBody: false,
  handler: dbChangesHandler,
});
dbRoutes.push({
  name: "DB changes",
  method: "POST",
  pathToRegexp: "/:db/_changes",
  parseJsonBody: true,
  handler: dbChangesHandler,
});

// DB compaction
dbRoutes.push({
  name: "DB Compaction",
  method: "POST",
  pathToRegexp: "/:db/_compact",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      await req.locals.nextPouchdbRouter.db.compact(req.query);
      res.status(200).json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Revs diff
dbRoutes.push({
  name: "Revs Diff",
  method: "POST",
  pathToRegexp: "/:db/_revs_diff",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      const diffs = await req.locals.nextPouchdbRouter.db.revsDiff(
        req.body || {},
        req.query
      );
      res.status(200).json(diffs);
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Query a document view
dbRoutes.push({
  name: "Query a document view",
  method: "GET",
  pathToRegexp: "/:db/_design/:id/_view/:view",
  handler: async (req, res) => {
    try {
      const query = req.query.params?.[2] + "/" + req.query.params?.[4];
      const response = await req.locals.nextPouchdbRouter.db.query(
        query,
        req.query
      );
      res.status(200).json(response);
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Temp views
dbRoutes.push({
  name: "Temp views",
  method: "POST",
  pathToRegexp: "/:db/_temp_view",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      if (req.body.map) req.body.map = new Function("return " + req.body.map)();
      req.query.conflicts = true;
      const response = await req.locals.nextPouchdbRouter.db.query(
        req.body,
        req.query
      );
      res.status(200).json(response);
    } catch (error) {
      sendError(res, error);
    }
  },
});

export default dbRoutes;
