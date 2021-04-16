const changesRoutes = [];

// Monitor database changes
const dbChangesHandler = async (req, res) => {
  const { db } = req.locals.nextPouchDBRouter;

  // Prepare query parameters for the database
  req.locals.nextPouchDBRouter.query.query_params = JSON.parse(
    JSON.stringify(req.locals.nextPouchDBRouter.query)
  );
  if (
    req.locals.nextPouchDBRouter.body &&
    req.locals.nextPouchDBRouter.body?.doc_ids
  ) {
    req.locals.nextPouchDBRouter.query.doc_ids =
      req.locals.nextPouchDBRouter.body?.doc_ids;
  }

  if (req.locals.nextPouchDBRouter.query.feed === "longpoll") {
    // we will watch for changes until the timeout
    // https://stackoverflow.com/questions/33599688/how-to-use-es8-async-await-with-streams#33599789
    const watcher = new Promise(function (resolve, reject) {
      let heartbeatInterval;
      let timeout;
      let written = false;
      const heartbeat =
        typeof req.locals.nextPouchDBRouter.query.heartbeat === "number"
          ? req.locals.nextPouchDBRouter.query.heartbeat
          : 6000;
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
      // longpoll
      // first check if there are >0. if so, return them immediately
      req.locals.nextPouchDBRouter.query.live = req.locals.nextPouchDBRouter.query.continuous = false;
      if (req.locals.nextPouchDBRouter.query.timeout) {
        timeout = setTimeout(() => {
          written = true;
          cleanup();
          resolve({
            results: [],
            last_seq: req.locals.nextPouchDBRouter.query.since,
          });
        }, req.locals.nextPouchDBRouter.query.timeout);
      }
      db.changes(req.locals.nextPouchDBRouter.query)
        .on("complete", (complete) => {
          if (!complete.results) {
            // canceled, ignore
            cleanup();
            resolve({
              results: [],
              last_seq: req.locals.nextPouchDBRouter.query.since,
            });
          } else if (complete.results.length) {
            written = true;
            cleanup();
            resolve({ ...complete });
          } else {
            // do the longpolling
            req.locals.nextPouchDBRouter.query.live = req.locals.nextPouchDBRouter.query.continuous = true;

            const changes = db
              .changes(req.locals.nextPouchDBRouter.query)
              .on("change", (change) => {
                if (written) {
                  return;
                }
                written = true;
                changes.cancel();
                cleanup();
                resolve({
                  results: [change],
                  last_seq: change.seq,
                });
              })
              .on("error", (error) => {
                cleanup();
                reject(error);
              });
          }
        })
        .on("error", (error) => {
          cleanup();
          reject(error);
        });
    });
    const result = await watcher.catch((error) => {
      res.locals.nextPouchDBRouter.status =
        typeof error.status === "number" ? error.status : 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    });
    res.locals.nextPouchDBRouter.status =
      typeof result.status === "number" ? result.status : 200;
    res.locals.nextPouchDBRouter.response = result;
  } else {
    // straight shot, not continuous

    try {
      const changes = await db.changes(req.locals.nextPouchDBRouter.query);
      // if we have results to send back, we are done ! (the client will automatically reconnect to the longpolling)
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = changes;
    } catch (error) {
      res.locals.nextPouchDBRouter.status =
        typeof error.status === "number" ? error.status : 500;
      res.locals.nextPouchDBRouter.response = { ...error };
    }
  }
};

changesRoutes.push({
  name: "/db/_changes",
  method: "GET",
  pathToRegexp: "/:db/_changes",
  parseJsonBody: false,
  handler: dbChangesHandler,
});
changesRoutes.push({
  name: "/db/_changes",
  method: "POST",
  pathToRegexp: "/:db/_changes",
  parseJsonBody: true,
  handler: dbChangesHandler,
});

export default changesRoutes;
