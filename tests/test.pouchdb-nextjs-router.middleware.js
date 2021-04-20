/* eslint-disable no-undef, promise/no-nesting */

"use strict";

// const fetch = require("node-fetch");

describe.skip("test.pouchdb-nextjs-router.middleware.js", function () {
  before(function () {
    if (process.env.SERVER !== "pouchdb-nextjs-router") {
      this.skip();
    }
  });

  it("Should run onRequest middleware", function () {
    return "1".should.equal(2);
  });

  it("Should run onResponse middleware", function () {
    return "1".should.equal(2);
  });

  it("should skip onRequest middleware", function () {
    return "1".should.equal(2);
  });

  it("should run the first onRequest middleware and skip others", function () {
    return "1".should.equal(2);
  });

  it("should skipCoreFunction", function () {
    return "1".should.equal(2);
  });

  it("should skip onResponse middleware", function () {
    return "1".should.equal(2);
  });

  it("should run the first onResponse middleware and skip others", function () {
    return "1".should.equal(2);
  });
});
