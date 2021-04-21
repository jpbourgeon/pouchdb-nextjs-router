/* eslint-disable no-undef */

"use strict";
const fetch = require("node-fetch");
var assert = require("chai").assert;

let to = process.env.COUCH_HOST.lastIndexOf("/");
to = to === -1 ? process.env.COUCH_HOST.length : to;
const COUCH_HOST = `${process.env.COUCH_HOST.substring(0, to)}/with-middleware`;

describe("test.pouchdb-nextjs-router.js - trailing-slash", function () {
  before(function () {
    if (process.env.SERVER === "express") {
      this.skip();
    }
  });

  it("Should work when URLs have a trailing slash", () =>
    fetch(`${COUCH_HOST}/`)
      .then((res) => res.json())
      .then((res) =>
        assert.propertyVal(res, "pouchdb-nextjs-router", "Welcome!")
      ));
});

describe("test.pouchdb-nextjs-router.js - middleware", () => {
  let db;

  before(function () {
    if (process.env.SERVER === "express") {
      this.skip();
    }
  });

  beforeEach(() => {
    db = `${Date.now()}-${require("crypto").randomBytes(6).toString("hex")}`;
  });

  afterEach(() =>
    fetch(`${COUCH_HOST}/${db}`, {
      method: "DELETE",
    })
  );

  it("Should match middlewares with route names, by regexp", () =>
    fetch(`${COUCH_HOST}/${db}`)
      .then((res) => res.json())
      .then((res) => assert.include(res.onRequest, { firstMiddleware: true })));

  it("Should match middlewares with route names, by string", () =>
    fetch(`${COUCH_HOST}/${db}`)
      .then((res) => res.json())
      .then((res) =>
        assert.include(res.onResponse, { firstMiddleware: true })
      ));

  it("Should match middlewares with route methods, by regexp", () =>
    fetch(`${COUCH_HOST}/${db}`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((res) =>
        assert.include(res.onResponse, { firstMiddleware: true })
      ));

  it("Should match middlewares with route methods, by string", () =>
    fetch(`${COUCH_HOST}/${db}`, { method: "GET" })
      .then((res) => res.json())
      .then((res) => assert.include(res.onRequest, { firstMiddleware: true })));

  it("Should run every matching middlewares", () =>
    fetch(`${COUCH_HOST}/${db}`)
      .then((res) => res.json())
      .then((res) => {
        assert.include(res.onRequest, { firstMiddleware: true });
        assert.include(res.onRequest, { secondMiddleware: true });
        assert.include(res.onResponse, { firstMiddleware: true });
        return;
      }));

  it("Should not run any unmatching middleware", () =>
    fetch(`${COUCH_HOST}/${db}`)
      .then((res) => res.json())
      .then((res) => {
        assert.notInclude(res.onRequest, { thirdMiddleware: true });
        assert.notInclude(res.onResponse, { secondMiddleware: true });
        return;
      }));

  it("Should skip onRequest middleware", () =>
    fetch(`${COUCH_HOST}/${db}?skipOnRequestMiddleware=true`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((res) => assert.notProperty(res, "onRequest")));

  it("Should skip onResponse middleware", () =>
    fetch(`${COUCH_HOST}/${db}?skipOnResponseMiddleware=true`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((res) => assert.notProperty(res, "onResponse")));

  it("Should skip core function", () =>
    fetch(`${COUCH_HOST}/${db}?skipCoreFunction=true`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((res) =>
        assert.deepEqual(res, {
          onRequest: {
            firstMiddleware: true,
            secondMiddleware: true,
          },
          onResponse: {
            firstMiddleware: true,
          },
        })
      ));
});
