# Advanced usage, with middleware

Middleware functions are used to alter the way the router accesses the database without changing its inner code. They are executed before or after the matching PouchDB route core function is executed.

`onRequest` middlewares are executed before the router's matched core function accesses the database. You can use them to do anything useful before actually reaching the database : authentication and authorisation, any kind of data checking or sanitization, antivirus scanning, etc.

`onResponse` middlewares are executed after the router's matched core function accesses the database but before the router sends the response to the client. You can use them to trigger or do anything useful just before sending back the response of the database to the client : non blocking side effects (CDN caching, statistics, various API calls, etc.) or mutating the answer of the router ( filtering the results to apply the authorisation politics, hot encryption, ...), etc.

Notice about the `/db/_changes` route : You can apply your authorisation strategy by forcing [filtered changes](https://pouchdb.com/api.html#filtered-changes) to an `onRequest` middleware. Also, in case of a live subscription to the `/db/_changes` route, the router may send data multiple times before reaching the end of the router. Thus, should you create `onResponse` middlewares for the `/db/_changes`route, they would be called before every intermediate answer. Finally, and since the `/db/_changes` route can be accessed with a `GET` or a `POST` HTTP method, be sure to target both methods when you declare your middleware to avoid any security hole.

## Middlewares definition

The signature of a middleware is defined as follows :

```js
const middleware = {
  route: /route_name/,
  method: /method_name/,
  handler: async (req, res) => {},
};
```

The middleware's `route` property is compared to the routes list. The value can be provided as a regexp that matches one or more routes from the list, or a string that matches a specific route.

The middleware's `method` property defines which HTTP method triggers the middleware. The value can be provided as a regexp that matches one or more method available for that route, or a string that matches a specific method for that route. Every method are not available for every pouchdb route. The special method `ANY` is available as a wildcard. See below for a complete list of available routes and methods.

The middleware's `handler` property is the actual function that is executed when the actual route and the middleware names match. This function receives the `req` and the `res` objects. The intended behaviour of the function is to modify the properties of `req.locals.nextPouchDBRouter` and `res.locals.nextPouchDBRouter` objects. It should not resolve the router itself by calling `res.status()` and/or `res.json()` directly. See below the router data structure for a description of `req.locals.nextPouchDBRouter` and `res.locals.nextPouchDBRouter` objects. The handler is called with the `runMiddleware` util function.

## How to declare your middlewares

Pass the middleware functions to `pouchdb-nextjs-router` inside the `req.locals.nextPouchDBRouter.middleware` property :

```js
// pouchdb-nextjs-router configuration
req.locals.nextPouchDBRouter.middleware: {
      // pass your `onRequest` middlewares inside this array ; order matters since every matching middlewares will be executed sequentially
      onRequest: [
        {
          // the route that is targeted can be provided as a string
          route: "/db",
          // the method that is targeted can be provided as a string
          method: "GET",
          // the actual middleware function
          handler: async (req, res) => {
            // do something here
          },
        },
        //...
      ],

      // pass your `onResponse` middlewares inside this array ; order matters since every matching middlewares will be executed sequentially
      onResponse: [
        {
          // the route that is targeted can be provided as a regexp
          // trick 1 : use alternatives to catch specific routes /^\/|\/_session)$/ : `/` or `/session`
          // trick 2 : use a negative lookahead to exclude specific routes /^(?!(^\/$|^\/_session$))(.*)$/ : not `/` nor `/session`
          route: /^\/.*$/,
          // the method that is targeted can be provided as a regexp
          method: /^\/.*$/,
          // the actual middleware function
          handler: async (req, res) => {
            // do something here
          },
        },
      ],
    },
  },
};
```

## Router execution pseudo-code

When the router is called :

1. The router parses the url to find a matching route. If the method is HEAD, the `headers` route is chosen. If no route could be found it defaults to the `not_found` route.
1. Depending on the route, the query is decoded and the body is parsed as a json or a raw value. They are made available in `req.locals.nextPouchDBRouter`.
1. The router executes any `onRequest` middleware which name matches the identified route name. Every matching `onRequest` middleware will be executed in their declared order, until all of them have been called or until a middleware sets the `skipOtherPreMiddleware` value to true.
1. If `skipCoreFunction` is falsy and `res.locals.HTTPStatusCode` is lower than 400 it executes the matching route core function. Unlike middleware functions, only one matching route core function is executed during each API call.
   - Inside the `/db/_changes` route core function, the `onResponse` middlewares stack is called just before the router sends intermediate results.
1. If `skipOtherPostMiddleware` is falsy and `res.locals.HTTPStatusCode` is lower than 400, it executes any matching `onResponse` middleware. Every matching `onResponse` middleware will be executed in their declared order, until all of them have been called or until a middleware sets the `skipOtherPostMiddleware` value to true.
1. The router sends `res.locals.HTTPStatusCode` and the stringified `res.locals.data` as a result

## Available routes and methods

| Route name                   | Available methods              | Description                           |
| ---------------------------- | ------------------------------ | ------------------------------------- |
| `/`                          | `GET`                          | The router's home                     |
| `/_session`                  | `GET`                          | CouchDB session mock                  |
| `/db`                        | `GET`, `POST`, `PUT`, `DELETE` | Database operations                   |
| `/db/_all_docs`              | `GET`, `POST`                  | All docs operations                   |
| `/db/_bulk_docs`             | `POST`                         | Bulk docs operations                  |
| `/db/_changes`               | `GET`, `POST`                  | Database changes monitoring           |
| `/db/_compact`               | `POST`                         | Database compaction                   |
| `/db/_design/doc/_view`      | `GET`                          | Query a design document view          |
| `/db/_design/doc/attachment` | `GET`, `PUT`, `DELETE`         | Design document attachment operations |
| `/db/doc`                    | `GET`, `PUT`, `DELETE`         | Document operations                   |
| `/db/doc/attachment`         | `GET`, `PUT`, `DELETE`         | Document attachement operations       |
| `/db/_revs_diff`             | `POST`                         | Documents revisions diff              |
| `/db/_temp_view`             | `POST`                         | Post a temp view                      |
| `headers`                    | `HEAD`                         | Special route : send headers          |
| `not_found`                  | `ANY`                          | Special route : route not found       |

**Special routes:**

These routes behaviour should probably stay public and unchanged by any middleware. Their names don't start with a `/` to exclude them more easily from your regexp (technically, they are not even paths anyway).

- the `headers`route : The HTTP HEAD method requests the headers that would be returned if the HEAD request's URL was instead requested with the HTTP GET method.
- the `not_found` route is the last route. It is executed when no other route could be matched by the router and sends a 404 error by default.

## Router data structure

The `req` and `res` objects are passed to your middleware functions as parameters. However, you should focus on the following local objects that the router relies on:

### `req.locals.nextPouchDBRouter`

```js
req.locals.nextPouchDBRouter = {
  // ## User defined parameters are provided during the initialisation of the router
  // mandatory; the api root path where pouchdb-nextjs-router is installed and running
  routerPrefix: "/api/path/to/the/router",
  // mandatory; the PouchDB instance to be used
  PouchDB : YourPouchDBInstance,
  // optional; the name of the parameters slug you specified in your route
  // expected to be "params" if undefined
  paramsName: "params",
  limit: "1mb",
  // optional; user defined middleware functions
  middleware: {
    // `onRequest` middleware functions array
    onRequest : [],
    // `onRequest` middlewares functions array
    onResponse : [],
  }

  // ## Derived values are computed at the beginning of the router execution flow.
  // ## You will probably want to focus your attention on the query and/or the body

  // the database opened with the provided pouchdb instance
  db,
  // the url params parsed by next.js
  params,
  // the parsed query string
  query,
  // the parsed body
  body,
  // wether the parsed body is in json or raw format
  hasRawBody,
};
```

### `res.locals.nextPouchDBRouter`

```js
res.locals.nextPouchDBRouter = {
  // ## Properties used to control the behaviour of the router
  // Contains the identified route name
  routeName,
  // halts the `onRequest` middlewares matching loop after the current `onRequest` middleware execution
  skipOtherPreMiddleware,
  // bypasses completely the route core function execution
  skipCoreFunction,
  // halts the `onResponse` middlewares matching loop after the current `onResponse` middleware execution or bypasses the whole loop completely if set from a `onRequest` middleware
  skipOtherPostMiddleware,

  // ## Stores the result that will be send by the router
  // An array of headers name/value pairs to be set before sendind the response
  headers: [
    {
      name,
      value,
    },
    //...
  ],
  // The HTTP response status code sent by the router
  status,
  // the final result sent by the router
  response,
  // if set to true, the route response will be sent with res.send() instead of res.json()
  responseIsNotJSON,
};
```
