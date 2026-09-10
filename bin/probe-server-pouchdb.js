const PouchDB = require("pouchdb");
const { version } = require("pouchdb/package.json");

const databaseName = `pouchdb-design-filter-probe-${process.pid}`;

const probe = async () => {
  const db = new PouchDB(databaseName);
  let supported = false;

  try {
    await db.bulkDocs([
      { _id: "ordinary" },
      { _id: "_design/probe" },
    ]);

    try {
      const changes = await db.changes({ filter: "_design" });
      supported =
        changes.results.length === 1 &&
        changes.results[0].id === "_design/probe";
    } catch (error) {
      if (error.name !== "not_found" || error.message !== "missing") {
        throw error;
      }
    }
  } finally {
    await db.destroy();
  }

  console.error(`Server PouchDB: ${version}`);
  console.error(
    `Capability filter=_design: ${supported ? "supported" : "unsupported"}`
  );
  console.log(supported ? "1" : "0");
};

probe().catch((error) => {
  console.error("Unable to probe server PouchDB filter=_design capability:");
  console.error(error);
  process.exitCode = 1;
});
