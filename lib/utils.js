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

export { sendError, runMiddleware };
