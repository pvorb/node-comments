# Comments

An abstraction layer for MongoDB that provides some commenting functionality.

## Usage

```javascript
new Comments(options)
```

Creates a new Comments object. This means, a connection to MongoDB is set up.

*   `options` is an object that defines some DB connection parameters.

    The default options are as follows:

    ```javascript
    {
      host: 'localhost',      // - hostname of the server where mongodb is
                              //   running
      port: 27017,            // - port that is used by mongodb
      name: 'website',        // - name of the mongodb database
      collection: 'comments'  // - name of the collection that contains the
                              //   comments
    }
    ```

---

```javascript
comments.saveComment(res, comment, saved)
```

Adds a new or updates a comment in the collection depending on if there already
is a comment with the same `_id` property. If `comment` does not define an
`_id` property, a new comment is created.

*   `res` is a string defining the resource the comment belongs to.
*   `comment` is an object that defines a comment. It is stored directly into
    the collection. Any prior parsing is up to you. `comment.res` should be
    defined for the later use of `comments.getComments`.
*   `saved` is a callback function that takes three arguments `(error,
    comment, action)`.
    `error` is an `Error` object, when an error occurred, otherwise it is
    `null`. `comment` is the saved comment object. `action` is a string. It can
    either be `'create'`, `'update'` or `null`, if an error occured.

---

```javascript
comments.getComments(res, [[properties,] options,] received)
```

Gives access to the comments of a resource.

*   `res` is a string defining the resource that contains the comments that you
    are looking for. If `res` is `null`, all comments in the collection will be
    found.
*   `properties [optional]` is an object that defines, which properties of the
    comments shall be returned.

    The default properties are as follows:

    ```javascript
    {
      _id: true,
      author: true,
      website: true,
      created: true,
      message: true
    }
    ```
*   `options [optional]` is an object that defines additional options according
    to [section "Query options"][mongodb-doc-queries] like _sorting_ or
    _paging_.

    The default options are as follows:

    ```javascript
    {
      sort: "created" // sort results by date of creation in ascending order
    }
    ```
*   `received` is a callback function that takes two arguments
    `(error, results)`. `error` is an `Error` object, when an error occurred,
    otherwise it is `null`. `results` is a cursor to the result set of the
    query. Look at [section "Cursors"][mongodb-doc-queries] for more
    information on how to use them.

---

```javascript
comments.count(res, counted)
```

Counts the comments of a resource or the complete collection.

*   `res` is a string defining the resource that contains the comments that you
    are looking for. If `res` is `null`, all comments in the collection will be
    counted.
*   `counted` is a callback function that takes two arguments `(error, count)`.
    `error` is an `Error` object, when an error occurred, otherwise it is
    `null`. `count` is the number of comments for the resource or in the
    collection.

---

```javascript
comments.close(done)
```

Closes the connection to the database.

*   `done` is a callback function.

---

### Facilities for a JSON-REST API

``` js
comments.getCommentsJSON(res, resp, received)
```

Writes a JSON object including the requested comments to a HTTP `ServerResponse`
object.

*   `res` is a string defining the resource that contains the comments that you
    are looking for. If `res` is `null`, all comments in the collection will be
    returned.
*   `resp` is a [`http.ServerResponse` object][http-server-resp]. (Please refer
    to the version of Node.js that you are using.)
*   `received` is a callback function that takes one argument `(error)`. `error`
    is an `Error` object, when an error occurred, otherwise it is `null`.

---

``` js
comments.parseCommentPOST(res, req, parsed)
```

Reads a url encoded string from a HTTP `ServerRequest` object.

*   `res` is a string defining the resource where the comment should be saved.
*   `req` is a [`http.ServerRequest` object][http-server-req]. (Please refer to
    the version of Node.js that you are using.)
*   `parsed` is a callback function that takes two arguments `(error, comment)`.
    `error` is an `Error` object, when an error occurred, otherwise it is
    `null`. `comment` is the parsed comment object.

---

``` js
comments.setCommentJSON(res, comment, resp, saved)
```

Saves or updates a comment for the defined resource and writes the corresponding
HTTP status code to the given `ServerResponse` object.

*   `res` is a string defining the resource where the comment should be saved.
*   `comment` is an object that defines a comment.
*   `resp` is a [`http.ServerResponse` object][http-server-resp]. (Please refer
    to the version of Node.js that you are using.)
*   `saved` is a callback function that takes one argument `(error)`. `error` is
    an `Error` object, when an error occurred, otherwise it is `null`.

## Installation

You need a running MongoDB before you can use **Comments**. On Debian

```bash
apt-get install mongodb
```

Then install **Comments** with npm.

```bash
npm install -g Comments
```

## Examples

For examples, look at the [tests][test-dir].

## Bugs and Issues

If you encounter any bugs or issues, feel free to open an issue at
[github][issues].

[mongodb-doc-indexes]:https://github.com/christkv/node-mongodb-native/blob/master/docs/indexes.md
[mongodb-doc-queries]:https://github.com/christkv/node-mongodb-native/blob/master/docs/queries.md
[http-server-resp]:http://nodejs.org/docs/v0.4.0/api/http.html#http.ServerResponse
[http-server-req]:http://nodejs.org/docs/v0.4.0/api/http.html#http.ServerRequest
[test-dir]:https://github.com/pvorb/node-comments/tree/master/test
[issues]:https://github.com/pvorb/node-comments/issues
[license]:http://vorb.de/license/mit.html

## License

Copyright © 2011-2012 Paul Vorbach

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
