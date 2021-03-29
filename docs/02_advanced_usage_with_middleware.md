# Advanced usage, with middleware

Middleware functions are used to alter the behaviour of the router without changing its inner code. They are executed before or after the matching pouchdb route core function is executed.

Pre-middleware are executed before the matched core function. You can use them to do anything useful before actually reaching the database : authentication and authorisation, any kind of data checking or sanitization, antivirus scanning, etc.

Post-middleware are executed after the matched core function. You can use them to trigger or do anything useful just before sending back the response of the database to the client : non blocking side effects (CDN caching, statistics, various API calls, etc.) or mutating the answer of the router ( filtering the results to apply the authorisation politics, hot encryption, ...), etc.

In case of a subscription to the `/db/_changes`, the router may send answers multiple times before reaching the end of the router. To allow you to tweak these intermediary answers, you can define a special Post-changes-middleware that is executed just before the router sends intermediary results to the client. This middleware is especially useful to filter the changes result and prevent some documents to reach the client, based on your authorisations logic.

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

The middleware's `handler` property is the actual asynchronous function that is executed when the route matches. This function receives the `req` and the `res` objects. The intended behaviour of the function is to modify the properties of `req.locals.nextPouchdbRouter` and `res.locals.nextPouchdbRouter` objects. It should not resolve the router by calling `res.status()` and/or `res.json()` directly. See the router data structure below for a description of `req.locals.nextPouchdbRouter` and `res.locals.nextPouchdbRouter` objects.

For the Post-changes-middleware, you just have to provide the handler function, which works exactly the same way as regular pre-middlewares or post-middlewares.

## How to declare your middlewares

Pass the middlewares functions to `pouchdb-nextjs-router` inside the `req.locals.nextPouchdbRouter.middlewares` property :

```js
// pouchdb-nextjs-router configuration
req.locals.nextPouchdbRouter.middlewares: {
      // pass your pre-middlewares inside this array ; order matters since every matching middlewares will be executed sequentially
      pre: [
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

      // pass your post changes middleware handler here ; it is executed just before the `/db/_changes` route sends intermediary results
      postChanges: (req, res) => {},

      // pass your post-middlewares inside this array ; order matters since every matching middlewares will be executed sequentially
      post: [
        {
          // the route that is targeted can be provided as a regexp that matches one or more routes
          route: /^\/.*$/,
          // the method that is targeted can be provided as a regexp that matches one or more available method for this route
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
1. Depending on the route, the query is decoded and the body is parsed as a json or a raw value. They are made available in `req.locals.nextPouchdbRouter`.
1. The router executes any pre-middleware which name matches the identified route name. Every matching pre-middleware will be executed in their declared order, until all of them have been called or until a middleware sets the `skipOtherPreMiddlewares` value to true.
1. If `skipCoreFunction` and `res.locals.error` are falsy it executes the matching route core function. Unlike middlewares, only the first matching route core function will be executed during each API call.
   - Inside the `/db/_changes` route core function, the Post-changes-middleware is called just before the router sends intermediary results.
1. If `skipOtherPostMiddlewares` and `res.locals.error` are falsy, it executes any matching post-middleware. Every matching post-middleware will be executed in their declared order, until all of them have been called or until a middleware sets the `skipOtherPostMiddlewares` value to true.
1. If `res.locals.error` is not falsy, the router sends the stringified errors
1. If `res.locals.error` is falsy, the router sends the stringified `res.locals.data` as a result

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

These routes behaviour should probably stay public and unchanged by middlewares. Their name doesn't start with a `/` to exclude them more easily from your regexp (technically, they are not even paths anyway).

- the `headers`route : The HTTP HEAD method requests the headers that would be returned if the HEAD request's URL was instead requested with the HTTP GET method.
- the `not_found` route is the last route. It is executed when no other route could be matched by the router and sends a 404 error by default.

## Router data structure

The whole `req` and `res` are passed to your middlewares as parameters. However, you should focus your work on the local objects that the router works on:

### `req.locals.nextPouchdbRouter`

```js
req.locals.nextPouchdbRouter = {
  //user defined parameters are provided during the initialisation of the router
  routerPrefix,
  limit,
  paramsName,
  PouchDB,
  middlewares: {
    pre : [],
    changes: {
      pre : (req, res) => {},
      post : (req, res) => {},
    },
    post : [],
  }
  // the derived values are computed at the beginning of the router execution flow. You will probably want to focus your attention on the query and/or the body
  db,
  params,
  query,
  body,
  isRawBody,
};
```

### `res.locals.nextPouchdbRouter`

```js
res.locals.nextPouchdbRouter = {
  // router status
  routeName,
  skipOtherPreMiddlewares, // halts the pre-middlewares matching loop after the current pre-middleware execution
  skipCoreFunction, // bypasses completely the route core function execution
  skipOtherPostMiddlewares, // halts the post-middlewares matching loop after the current post-middleware execution or bypasses the whole loop completely if set from a pre-middleware
  // result
  HTTPstatusCode, // The HTTP response status code sent by the router
  data: {}, // the result sent by the router after stringification
};
```

You should also set `res.locals.nextPouchdbRouter.HTTPStatusCode` to the [HTTP response status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) you want if it is different from the current route's default.
