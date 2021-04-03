import multiparty from "multiparty";
import { promises as fs } from "fs";

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
        req.locals.nextPouchDBRouter.body,
        req.locals.nextPouchDBRouter.query
      );
      res.locals.nextPouchDBRouter.status = 201;
      res.locals.nextPouchDBRouter.response = response;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = error;
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
        const id = req.locals.nextPouchDBRouter.params.splice(1).join("/");
        const doc = await req.locals.nextPouchDBRouter.db.get(
          id,
          req.locals.nextPouchDBRouter.query
        );
        res.locals.nextPouchDBRouter.status = 200;
        res.locals.nextPouchDBRouter.response = doc;
      }
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = error;
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
        _rev: req.locals.nextPouchDBRouter.query?.rev,
      };
      const response = await req.locals.nextPouchDBRouter.db.remove(
        doc,
        req.locals.nextPouchDBRouter.query
      );
      res.locals.nextPouchDBRouter.status = 200;
      res.locals.nextPouchDBRouter.response = response;
    } catch (error) {
      res.locals.nextPouchDBRouter.status = error.status || 500;
      res.locals.nextPouchDBRouter.response = error;
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
    const opts = req.locals.nextPouchDBRouter.query;

    if (/^multipart\/related/.test(req.headers["content-type"])) {
      // multipart, assuming it's also new_edits=false for now
      let doc;
      const form = new multiparty.Form();
      const attachments = {};
      form
        .on("error", (error) => {
          res.locals.nextPouchDBRouter.status = error.status || 500;
          res.locals.nextPouchDBRouter.response = error;
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
            res.locals.nextPouchDBRouter.status = 201;
            res.locals.nextPouchDBRouter.response = response;
          } catch (error) {
            res.locals.nextPouchDBRouter.status = error.status || 500;
            res.locals.nextPouchDBRouter.response = error;
          }
        });
      form.parse(req);
    } else {
      try {
        // normal PUT
        const id = req.locals.nextPouchDBRouter.params?.splice(1).join("/");
        req.locals.nextPouchDBRouter.body._id =
          req.locals.nextPouchDBRouter.body?._id || id;
        if (!req.locals.nextPouchDBRouter.body?._id)
          req.locals.nextPouchDBRouter.body._id = id || null;
        req.locals.nextPouchDBRouter.body._rev =
          req.locals.nextPouchDBRouter.body?._rev ||
          req.locals.nextPouchDBRouter.query.rev;
        const response = await db.put(req.locals.nextPouchDBRouter.body, opts);
        console.log(response);
        res.locals.nextPouchDBRouter.status = 201;
        res.locals.nextPouchDBRouter.response = response;
      } catch (error) {
        console.log(error);
        res.locals.nextPouchDBRouter.status = error.status || 500;
        res.locals.nextPouchDBRouter.response = error;
      }
    }
  },
});

export default documentRoutes;
