const errorProperties = [
  "status",
  "name",
  "message",
  "error",
  "reason",
  "id",
  "rev",
  "docId",
];

const serializeError = (error) =>
  errorProperties.reduce((response, property) => {
    if (error?.[property] !== undefined) {
      response[property] = error[property];
    }
    return response;
  }, {});

export default serializeError;
