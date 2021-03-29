import multiparty from "multiparty";
import { promises as fs } from "fs";
import { sendError } from "../utils";

const documentRoutes = [];

// Create a document
documentRoutes.push({
  name: "/db",
  method: "POST",
  pathToRegexp: "/:db",
  parseJsonBody: true,
  handler: async (req, res) => {
    try {
      const response = await req.locals.nextPouchDBRouter.db.post(
        req.body,
        req.query
      );
      res.status(201).json(response);
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Retrieve a document
documentRoutes.push({
  name: "/db/doc",
  method: "GET",
  pathToRegexp: "/:db/:id(.*)",
  handler: async (req, res) => {
    try {
      if (req.locals.nextPouchDBRouter.params?.[1] !== "_changes") {
        const id = req.locals.nextPouchDBRouter.params?.splice(1).join("/");
        const doc = await req.locals.nextPouchDBRouter.db.get(id, req.query);
        res.status(200).send(doc);
      }
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Delete a document
documentRoutes.push({
  name: "/db/doc",
  method: "DELETE",
  pathToRegexp: "/:db/:id(.*)",
  handler: async (req, res) => {
    try {
      const id = req.locals.nextPouchDBRouter.params?.splice(1).join("/");
      const doc = {
        _id: id,
        _rev: req.query.rev,
      };
      const response = await req.locals.nextPouchDBRouter.db.remove(
        doc,
        req.query
      );
      res.status(200).json(response);
    } catch (error) {
      sendError(res, error);
    }
  },
});

// Create or update a document by its ID
documentRoutes.push({
  name: "/db/doc",
  method: "PUT",
  pathToRegexp: "/:db/:id(.*)",
  parseJsonBody: true,
  handler: async (req, res) => {
    const { db } = req.locals.nextPouchDBRouter;
    const opts = req.query;

    if (/^multipart\/related/.test(req.headers["content-type"])) {
      // multipart, assuming it's also new_edits=false for now
      let doc;
      const form = new multiparty.Form();
      const attachments = {};
      form
        .on("error", (error) => {
          return sendError(res, error);
        })
        .on("field", (_, field) => {
          doc = JSON.parse(field);
        })
        .on("file", async (_, file) => {
          const type = file.headers["content-type"];
          const filename = file.originalFilename;
          const body = await fs.readFile(file.path);
          attachments[filename] = {
            content_type: type,
            data: body,
          };
        })
        .on("close", async () => {
          try {
            // don't store the "follows" key
            for (const filename in doc._attachments) {
              if (doc._attachments?.[filename]) {
                delete doc._attachments[filename].follows;
              }
            }
            // merge, since it could be a mix of stubs and non-stubs
            doc._attachments = { ...doc._attachments, ...attachments };
            const response = await db.put(doc, opts);
            res.status(201).json(response);
          } catch (error) {
            sendError(res, error);
          }
        });
      form.parse(req);
    } else {
      try {
        // normal PUT
        const id = req.locals.nextPouchDBRouter.params?.splice(1).join("/");
        req.body._id = req.body._id || id;
        if (!req.body._id) req.body._id = id || null;
        req.body._rev = req.body._rev || req.query.rev;
        const response = await db.put(req.body, opts);
        res.status(201).json(response);
      } catch (error) {
        sendError(res, error);
      }
    }
  },
});

export default documentRoutes;
