/* eslint-disable no-undef */

"use strict";

const fetch = require("node-fetch");

describe("test.pouchdb-nextjs-router.middleware.js", function () {
  let db;
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

  beforeEach(function () {
    db = Date.now();
  });

  afterEach(async () =>
    fetch(`${COUCH_HOST}/${db}`, {
      method: "DELETE",
    })
  );

  it("Should match routes and middlewares by string", function () {
    return "1".should.equal(2);
  });

  it("Should match routes and middlewares by regexp", function () {
    return "1".should.equal(2);
  });

  it.only("Should run onRequest middleware", async () =>
    fetch(`${COUCH_HOST}/${db}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((res) => console.log(res)));

  it("Should run onResponse middleware", function () {
    return "1".should.equal(2);
  });

  it("Should run the first onRequest middleware and skip others", function () {
    return "1".should.equal(2);
  });

  it("Should run the first onResponse middleware and skip others", function () {
    return "1".should.equal(2);
  });

  it("Should skip onRequest middleware", function () {
    return "1".should.equal(2);
  });

  it("Should skipCoreFunction", function () {
    return "1".should.equal(2);
  });

  it("Should skip onResponse middleware", function () {
    return "1".should.equal(2);
  });
});
