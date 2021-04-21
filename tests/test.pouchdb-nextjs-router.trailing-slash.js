/* eslint-disable no-undef */

"use strict";

const fetch = require("node-fetch");

describe("test.pouchdb-nextjs-router.trailing-slash.js", function () {
  let COUCH_HOST;

  before(function () {
    if (process.env.SERVER === "express") {
      this.skip();
    } else {
      let to = process.env.COUCH_HOST.lastIndexOf("/");
      to = to === -1 ? process.env.COUCH_HOST.length : to + 1;
      COUCH_HOST = `${process.env.COUCH_HOST.substring(0, to)}/trailingslash`;
    }
  });

  it("Should work when URLs have a trailing slash", () =>
    fetch(`${COUCH_HOST}/`)
      .then((res) => res.json())
      .then((res) => res["pouchdb-nextjs-router"].should.equal("Welcome!")));
});
