# node-pingback

Pingbacks have come to node.js. If you're writing a blog, you may be interested 
in this. It conforms to the 
[pingback specification](http://www.hixie.ch/specs/pingback/pingback), as well 
as the [XML-RPC spec](http://www.xmlrpc.com/spec), however, it may need more 
testing. 

It protects against spam, has no dependencies, and can be used right out of 
the box. Connect/Express middleware is included.

## Usage

### Receiving Pingbacks (contrived example for clarity)

``` js
app.use('/pingback', Pingback.middleware(function(source, target, next) {
  var self = this;
  Posts.get(target.pathname, function(err, post) {
    if (err) {
      return next(Pingback.TARGET_DOES_NOT_EXIST); 
    }
    if (post.pingbacks[source.href]) { 
      return next(Pingback.ALREADY_REGISTERED);
    }
    if (post.pingbacksDisabled) {
      return next(Pingback.TARGET_CANNOT_BE_USED); 
    }
    // or pass zero above for a generic error
    post.pingbacks.push({
      from: source.href, // e.g. "http://domain.tld/hey_check_out_this_guys_post"
      title: self.title, // e.g. "Joe's blog"
      text: self.excerpt // e.g. "hey, check this out: <a href="your_site">...</a>"
    });
    post.save();
    next(); // send a success response
  });
}));
```

What you see above is merely the abstracted interface of the bundled middleware.
See example.js/test.js for more in-depth and lower-level examples.

### Sending Pingbacks

``` js
// ping a target - err will be a fault code if present
Pingback.send('[target]', '[source]', function(err, pingback) {
  if (!err) console.log('Pinged ' + pingback.href + ' successfully.');
});

// scan an html string for links to ping
var text = 'a link here: <a href="http://localhost:9000/article">a post</a>';
Pingback.scan(text, '[source]', function(err, pingback) {
  // optional callback - will get called for every pingback sent
  if (!err) console.log('Pinged ' + pingback.href + ' successfully.');
});
```

Again, see example.js/test.js for more examples and explanation.

## Reference

### Fault Code Constants

``` js
Pingback.METHOD_NOT_FOUND = -32601;
Pingback.GENERAL_ERROR = 0;
Pingback.SOURCE_DOES_NOT_EXIST = 16;
Pingback.NO_LINK_TO_TARGET = 17;
Pingback.TARGET_DOES_NOT_EXIST = 32;
Pingback.TARGET_CANNOT_BE_USED = 33;
Pingback.ALREADY_REGISTERED = 48;
Pingback.ACCESS_DENIED = 49;
```

### Pingback properties

- `source`: a parsed url object of the source
- `target`: a parsed url object of the target
- `excerpt`: an excerpt from the source's page
- `title`: the title of the source page

### Events for receiving pingbacks

- `ping`: An optional event to validate and handle errors/faults. If bound,
          this will be triggered as the first event and passed a `next` 
          callback, which can be passed a fault code to trigger a fault 
          response, otherwise it will continue handling the pingback. 
          Arguments: `source`, `target`, `next`.
- `fault`: Emitted when a fault occurs. Passed the fault code and string.
           Arguments: `code`, `msg`.
- `error`: Emitted for non-fault related errors. Calls the next middleware layer 
           in the bundled connect/express middleware function. Arguments: `err`.
- `end`: Emitted if no `ping` listeners have been bound, and after a pingback 
         has been received and verified. Arguments: `source`, `target`, `next`.
         `next` has the same effect as the callback passed for `ping`.
- `success`: Emitted if a `ping` listener was bound, and after the pingback has 
             been received and handled. Arguments: `source`, `target`.

## License
(c) Copyright 2011, Christopher Jeffrey (MIT License). 
See LICENSE for more info.