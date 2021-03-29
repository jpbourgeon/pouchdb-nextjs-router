# pouchdb-nextjs-router

> A next.js API submodule with a CouchDB style REST interface to PouchDB

![live the code](https://img.shields.io/badge/live%20the%20code-%E2%98%85%E2%98%85%E2%98%85%E2%98%85-yellow) ![Github workflow status](https://img.shields.io/github/workflow/status/jpbourgeon/pouchdb-nextjs-router/continuous-integration) [![Version](https://img.shields.io/github/package-json/v/jpbourgeon/pouchdb-nextjs-router)](https://www.npmjs.com/package/pouchdb-nextjs-router)

**pouchdb-nextjs-router** is a routing module that provides the minimal API to add a PouchDB HTTP endpoint to a next.js application. It features a powerful middleware system that allows you to customize its behaviour without hacking into the module.

It is designed to be mounted into a [next.js API route](https://nextjs.org/docs/api-routes/introduction) to provide an endpoint for PouchDB instances to sync with.

The code is primarily forked from [https://github.com/pouchdb/pouchdb-express-router](https://github.com/pouchdb/pouchdb-express-router).

I wrote this module because pouchdb-express-router simply doesn't work inside nextjs beyond the basic paths, and fails to pass the whole pouchdb testsuite.

The module is fully functional but has not been widely used in production yet.

## Installation

Install with your favorite package manager.

```bash
npm install --save pouchdb-nextjs-router
```

## Documentation

1. [Basic usage](/docs/01_basic_usage.md)
1. [Advanced usage, with middleware](/docs/02_advanced_usage_with_middleware.md)
1. [Testing](/docs/03_testing.md)
1. [Performance](/docs/04_performance.md)

## Contributing

Pull requests are welcome.

- For major changes, please open an issue first to discuss what you would like to change.
- Your pull request name must respect the [@commitlint/config-conventional](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional) syntax.
- Your pull request must pass the latest full pouchdb test suite.

## More info

- [Changelog](CHANGELOG.md)
- Licensed under the [MIT License](LICENSE.txt)
