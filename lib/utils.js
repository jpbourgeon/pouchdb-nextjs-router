import bodyParser from "body-parser";

const sendError = (res, error, status = 500) => {
  console.error("Error:", error);
  const resStatus = error?.status || status;
  const resError =
    error?.name && error?.message
      ? {
          error: error.name,
          reason: error.message,
        }
      : error;
  res.status(resStatus).json(resError);
};

const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
};

// parse the json body
const parseJsonBody = async (req, res, limit) => {
  try {
    await runMiddleware(
      req,
      res,
      bodyParser.json({
        limit: limit || "1mb",
      })
    );
    console.log(
      `Content-Type: ${req.headers["content-type"]}\n\n${JSON.stringify(
        req.body
      )}`
    );
  } catch (error) {
    sendError(res, error);
  }
};

// parse the raw body
const parseRawBody = async (req, res, limit) => {
  try {
    await runMiddleware(
      req,
      res,
      bodyParser.raw({
        limit: limit || "1mb",
        type: "*/*",
      })
    );
    console.log(
      `Content-Type: ${req.headers["content-type"]}\n\n${JSON.stringify(
        req.body
      )}`
    );
  } catch (error) {
    sendError(res, error);
  }
};

export { sendError, runMiddleware, parseJsonBody, parseRawBody };
