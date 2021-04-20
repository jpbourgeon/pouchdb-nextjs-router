/* eslint-disable no-undef, promise/no-nesting */

"use strict";

const fetch = require("node-fetch");

describe("test.pouchdb-nextjs-router.trailing-slash.js", function () {
  before(function () {
    if (process.env.SERVER !== "pouchdb-nextjs-router") {
      this.skip();
    }
  });

  it("Should work when URLs have a trailing slash", function () {
    return fetch("http://localhost:3000/api/trailingslash/").then((data) => {
      return data.json().then((data) => {
        return data["pouchdb-nextjs-router"].should.equal("Welcome!");
      });
    });
  });
});
