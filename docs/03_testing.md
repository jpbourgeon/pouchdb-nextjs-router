# Testing

The module is automatically tested against the whole pouchdb test suite (+/- 1650 tests) before any PR merge or release.

You can run the tests after building the docker image:

```bash
# Build the docker image
docker build --pull --rm -f "Dockerfile" -t pouchdbnextjsrouter:latest "."

# Run the tests with pouchdb-nextjs-router
docker run --rm pouchdbnextjsrouter

# Run the tests with pouchdb-express-router
docker run --rm pouchdbnextjsrouter npm run test:express

# Run the container and connect to geek around
docker run --rm -it pouchdbnextjsrouter bash

# Run the tests with a custom server
# useful if you want to test against a custom dev server on your host
# replace the COUCH_HOST url in the example below
docker run --rm -it pouchdbnextjsrouter bash
COUCH_HOST=http://host.docker.internal:3000/api/pouchdb npm run test:custom

```
