# Testing

The module is automatically tested against the whole pouchdb test suite (+/- 1650 tests) before any PR merge or release.

You can run the tests after connecting to the development container.

```bash
# Run the tests with pouchdb-nextjs-router
npm run test

# Run the tests with pouchdb-express-router
npm run test:express

# Run the tests with a custom server
# useful if you want to test against a custom dev server on your host
# replace the COUCH_HOST url in the example below
COUCH_HOST=http://host.docker.internal:3000/api/pouchdb npm run test:custom
```
