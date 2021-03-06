const attachmentRoutes = [];
const designAttachmentRoutes = [];

// Put a document attachment
const putAttachment = async (req, res, id, attachment) => {
  try {
    const rev = req.locals.nextPouchDBRouter.query?.rev;
    const body = Buffer.from(req.locals.nextPouchDBRouter.body || "", "binary");
    const type = req.headers["content-type"] || "application/octet-stream";
    const opts = req.locals.nextPouchDBRouter.query;

    const response = await req.locals.nextPouchDBRouter.db.putAttachment(
      id,
      attachment,
      rev,
      body,
      type,
      opts
    );
    res.locals.nextPouchDBRouter.status = 201;
    res.locals.nextPouchDBRouter.response = response;
  } catch (error) {
    res.locals.nextPouchDBRouter.status = error.status || 500;
    res.locals.nextPouchDBRouter.response = { ...error };
  }
};

// Retrieve a document attachment
const getAttachment = async (req, res, id, attachment) => {
  const { db } = req.locals.nextPouchDBRouter;
  try {
    const opts = req.locals.nextPouchDBRouter.query;

    const doc = await db.get(id, opts);
    if (!doc._attachments || !doc._attachments[attachment]) {
      throw {
        status: 404,
        name: "not_found",
        message: "missing",
      };
    }
    const response = await db.getAttachment(id, attachment, opts);
    res.locals.nextPouchDBRouter.status = 200;
    res.locals.nextPouchDBRouter.headers.push({
      name: "Content-Type",
      value: doc._attachments[attachment].content_type,
    });
    res.locals.nextPouchDBRouter.response = response;
    res.locals.nextPouchDBRouter.responseIsJson = false;
  } catch (error) {
    res.locals.nextPouchDBRouter.status = error.status || 500;
    res.locals.nextPouchDBRouter.response = { ...error };
  }
};

// Delete a document attachment
const deleteAttachment = async (req, res, id, attachment) => {
  try {
    const rev = req.locals.nextPouchDBRouter.query?.rev;
    const response = await req.locals.nextPouchDBRouter.db.removeAttachment(
      id,
      attachment,
      rev
    );
    res.locals.nextPouchDBRouter.status = 200;
    res.locals.nextPouchDBRouter.response = response;
  } catch (error) {
    res.locals.nextPouchDBRouter.status = error.status || 500;
    res.locals.nextPouchDBRouter.response = { ...error };
  }
};

// Put _design doc attachment
designAttachmentRoutes.push({
  name: "/db/_design/doc/attachment",
  method: "PUT",
  pathToRegexp: "/:db/_design/:id/:attachment(.*)",
  parseRawBody: true,
  handler: async (req, res) => {
    await putAttachment(
      req,
      res,
      "_design/" + req.locals.nextPouchDBRouter.params?.[1],
      req.locals.nextPouchDBRouter.params?.splice(3).join("/")
    );
  },
});

// Put doc attachment
attachmentRoutes.push({
  name: "/db/doc/attachment",
  method: "PUT",
  pathToRegexp: "/:db/:id/:attachment(.*)",
  parseRawBody: true,
  handler: async (req, res) => {
    // Be careful not to catch normal design docs or local docs
    await putAttachment(
      req,
      res,
      req.locals.nextPouchDBRouter.params?.[1],
      req.locals.nextPouchDBRouter.params?.splice(2).join("/")
    );
  },
});

// Get _design doc attachment
designAttachmentRoutes.push({
  name: "/db/_design/doc/attachment",
  method: "GET",
  pathToRegexp: "/:db/_design/:id/:attachment(.*)",
  handler: async (req, res) => {
    await getAttachment(
      req,
      res,
      "_design/" + req.locals.nextPouchDBRouter.params?.[1],
      req.locals.nextPouchDBRouter.params?.splice(3).join("/")
    );
  },
});

// Get doc attachment
attachmentRoutes.push({
  name: "/db/doc/attachment",
  method: "GET",
  pathToRegexp: "/:db/:id/:attachment(.*)",
  handler: async (req, res) => {
    await getAttachment(
      req,
      res,
      req.locals.nextPouchDBRouter.params?.[1],
      req.locals.nextPouchDBRouter.params?.splice(2).join("/")
    );
  },
});

// Delete _design doc attachment
designAttachmentRoutes.push({
  name: "/db/_design/doc/attachment",
  method: "DELETE",
  pathToRegexp: "/:db/_design/:id/:attachment(.*)",
  handler: async (req, res) => {
    await deleteAttachment(
      req,
      res,
      "_design/" + req.locals.nextPouchDBRouter.params?.[1],
      req.locals.nextPouchDBRouter.params?.splice(3).join("/")
    );
  },
});

// Delete doc attachment
attachmentRoutes.push({
  name: "/db/doc/attachment",
  method: "DELETE",
  pathToRegexp: "/:db/:id/:attachment(.*)",
  handler: async (req, res) => {
    await deleteAttachment(
      req,
      res,
      req.locals.nextPouchDBRouter.params?.[1],
      req.locals.nextPouchDBRouter.params?.splice(2).join("/")
    );
  },
});

export { attachmentRoutes, designAttachmentRoutes };
