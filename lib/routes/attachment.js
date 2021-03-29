import { sendError } from "../utils";

const attachmentRoutes = [];

// Put a document attachment
const putAttachment = async (req, res, id, attachment) => {
  try {
    const rev = req.query.rev;
    const body = Buffer.from(req.body || "", "binary");
    const type = req.headers["content-type"] || "application/octet-stream";
    const opts = req.query;

    const response = await req.locals.nextPouchdbRouter.db.putAttachment(
      id,
      attachment,
      rev,
      body,
      type,
      opts
    );
    res.status(201).json(response);
  } catch (error) {
    sendError(res, error);
  }
};

// Retrieve a document attachment
const getAttachment = async (req, res, id, attachment) => {
  const { db } = req.locals.nextPouchdbRouter;
  try {
    const opts = req.query;

    const doc = await db.get(id, opts);
    if (!doc._attachments || !doc._attachments[attachment]) {
      throw {
        status: 404,
        name: "not_found",
        message: "missing",
      };
    }
    const type = doc._attachments[attachment].content_type;
    const response = await db.getAttachment(id, attachment, opts);
    res.setHeader("Content-Type", type);
    res.status(200).send(response);
  } catch (error) {
    sendError(res, error);
  }
};

// Delete a document attachment
const deleteAttachment = async (req, res, id, attachment) => {
  try {
    const rev = req.query.rev;
    const response = await req.locals.nextPouchdbRouter.db.removeAttachment(
      id,
      attachment,
      rev
    );
    res.status(200).json(response);
  } catch (error) {
    sendError(res, error);
  }
};

// Put design doc attachment
attachmentRoutes.push({
  name: "/db/_design/doc/attachment",
  method: "PUT",
  pathToRegexp: "/:db/_design/:id/:attachment(.*)",
  parseRawBody: true,
  handler: async (req, res) => {
    await putAttachment(
      req,
      res,
      "_design/" + req.locals.nextPouchdbRouter.params?.[1],
      req.locals.nextPouchdbRouter.params?.splice(3).join("/")
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
    if (
      req.locals.nextPouchdbRouter.params?.[1] !== "_design" &&
      req.locals.nextPouchdbRouter.params?.[1] !== "_local"
    ) {
      await putAttachment(
        req,
        res,
        req.locals.nextPouchdbRouter.params?.[1],
        req.locals.nextPouchdbRouter.params?.splice(2).join("/")
      );
    }
  },
});

// Get design doc attachment
attachmentRoutes.push({
  name: "/db/_design/doc/attachment",
  method: "GET",
  pathToRegexp: "/:db/_design/:id/:attachment(.*)",
  handler: async (req, res) => {
    await getAttachment(
      req,
      res,
      "_design/" + req.locals.nextPouchdbRouter.params?.[1],
      req.locals.nextPouchdbRouter.params?.splice(3).join("/")
    );
  },
});

// Get doc attachment
attachmentRoutes.push({
  name: "/db/doc/attachment",
  method: "GET",
  pathToRegexp: "/:db/:id/:attachment(.*)",
  handler: async (req, res) => {
    // Be careful not to catch normal design docs or local docs
    if (
      req.locals.nextPouchdbRouter.params?.[1] !== "_design" &&
      req.locals.nextPouchdbRouter.params?.[1] !== "_local"
    ) {
      await getAttachment(
        req,
        res,
        req.locals.nextPouchdbRouter.params?.[1],
        req.locals.nextPouchdbRouter.params?.splice(2).join("/")
      );
    }
  },
});

// Delete design doc attachment
attachmentRoutes.push({
  name: "/db/_design/doc/attachment",
  method: "DELETE",
  pathToRegexp: "/:db/_design/:id/:attachment(.*)",
  handler: async (req, res) => {
    await deleteAttachment(
      req,
      res,
      "_design/" + req.locals.nextPouchdbRouter.params?.[1],
      req.locals.nextPouchdbRouter.params?.splice(3).join("/")
    );
  },
});

// Delete doc attachment
attachmentRoutes.push({
  name: "/db/doc/attachment",
  method: "DELETE",
  pathToRegexp: "/:db/:id/:attachment(.*)",
  handler: async (req, res) => {
    // Be careful not to catch normal design docs or local docs
    if (
      req.locals.nextPouchdbRouter.params?.[1] !== "_design" &&
      req.locals.nextPouchdbRouter.params?.[1] !== "_local"
    ) {
      await deleteAttachment(
        req,
        res,
        req.locals.nextPouchdbRouter.params?.[1],
        req.locals.nextPouchdbRouter.params?.splice(2).join("/")
      );
    }
  },
});

export default attachmentRoutes;
