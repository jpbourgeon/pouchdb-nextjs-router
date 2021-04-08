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

const resolveRouter = (req, res) => {
  // if (res.locals.nextPouchDBRouter.routeName === "/db/_changes")
  //   console.log(JSON.stringify(res.locals, null, 2));

  // Send the HTTP response and break the loop

  // headers
  if (!res.headersSent) {
    const headers = res.locals.nextPouchDBRouter.headers;
    for (let i = 0; i < headers.length; i++) {
      res.setHeader(headers[i]?.name, headers[i]?.value);
    }
  }

  // status
  if (res.locals.nextPouchDBRouter.status)
    res.status(res.locals.nextPouchDBRouter.status);

  // response
  if (res.locals.nextPouchDBRouter.responseIsJson) {
    res.json(res.locals.nextPouchDBRouter.response);
  } else {
    res.send(res.locals.nextPouchDBRouter.response);
  }
};

export { runMiddleware, resolveRouter };
