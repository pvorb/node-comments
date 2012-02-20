// node-pingback examples

// There are two ways of dealing with pingbacks
// the first way is to do all error handling at the end
// on the `end` event. This simplifies things because
// you can perform operations like checking to see
// if the pinged article exists, etc, and inserting
// the pingback in one fell swoop.
// the downside is, if its a bad pingback, you will have
// made a needless request to get to that `end` event.
// see the code for more info.

// NOTE: if you dont care about the semantics of fault codes
// you can pass a zero into `next` for a generic fault
app.use('/pingback', function(req, res, next) {
  var ping = new Pingback(req, res);
  ping.on('fault', function(code, msg) {
    next(new Error(
      'Received bad pingback from '
      + this.source.href + '.'
      + ' Fault Code: ' + code
      + ' - Message: ' + msg
    ));
  });
  ping.on('error', next);
  ping.on('end', function(source, target, next) {
    Posts.get(target.pathname, function(err, post) {
      if (err) {
        return next(Pingback.TARGET_DOES_NOT_EXIST);
      }
      if (post.pingbacks[source.href]) { // contrived example
        return next(Pingback.ALREADY_REGISTERED);
      }
      if (post.pingbacksDisabled) {
        return next(Pingback.TARGET_CANNOT_BE_USED);
      }
      // insert a new pingback
      post.pingbacks.push({
        from: source.href, // e.g. "http://domain.tld/hey_check_out_this_guys_post"
        title: self.title, // e.g. "Joe's blog"
        text: ping.excerpt // e.g. "hey, check this out: <a href="your_site">...</a>"
      });
      post.save();
      next(); // respond with a success code
    });
  });
  req.pipe(ping);
});

// this way is a bit more complex, but it is technically how
// pingbacks are supposed to be done. you can bind to a
// `ping` event. as soon as the source and target uri's
// have been parsed, this event will be emitted. you can
// do your error handling there, and call the `next` function
// pass in an error code if necessary, otherwise pass no arguments
// at all. the error you pass in must be a valid fault code int.
app.use('/pingback', function(req, res, next) {
  var post, ping = new Pingback(req, res);
  ping.on('ping', function(source, target, next) {
    Posts.get(target.pathname, function(err, data) {
      post = data;
      if (err) {
        return next(Pingback.TARGET_DOES_NOT_EXIST);
      }
      if (post.pingbacks[source.href]) { // contrived example
        return next(Pingback.ALREADY_REGISTERED);
      }
      if (post.pingbacksDisabled) {
        return next(Pingback.TARGET_CANNOT_BE_USED);
      }
      next(); // respond with a success code
    });
  });
  ping.on('fault', function(code, msg) {
    next(new Error(
      'Received bad pingback from '
      + this.source.href + '.'
      + ' Fault Code: ' + code
      + ' - Message: ' + msg
    ));
  });
  ping.on('error', next);
  ping.on('success', function(source, target) {
    console.log('Successful pingback from: ' + source.href);
    console.log('Page title:', this.title);
    console.log('Excerpt: ' + this.excerpt);
    // insert a new pingback
    post.pingbacks.push({
      from: source.href, // e.g. "http://domain.tld/hey_check_out_this_guys_post"
      title: ping.title, // e.g. "Joe's blog"
      text: ping.excerpt // e.g. "hey, check this out: <a href="your_site">...</a>"
    });
    post.save();
  });
  req.pipe(ping);
});

// the middleware bundled with node-pingback will abstract away certain
// things and allow you to do no error handling at all.
// the middleware callback can optionally take a third argument, which
// is another `next` function, allowing you to pass in a fault code,
// or nothing for a success response.
app.use('/pingback', Pingback.middleware(function(source, target) {
  var self = this;
  Posts.get(target.pathname, function(err, post) {
    if (err) return;
    post.pingbacks.push({
      from: source.href, // e.g. "http://domain.tld/hey_check_out_this_guys_post"
      title: self.title, // e.g. "Joe's blog"
      text: self.excerpt // e.g. "hey, check this out: <a href="your_site">...</a>"
    });
    post.save();
  });
}));

// send a pingback - err will be a fault code if present
Pingback.send('[target]', '[source]', function(err, pingback) {
  if (!err) console.log('Pinged ' + pingback.href + ' successfully.');
});

// `.scan()` scans an html fragment and looks for links.
// if it finds any links with a differing domain/port
// from the source url, it dispatches pingback requests.
// the second parameter is the SOURCE URL, not the target url
// in a lot of cases, it might just be `req.url`.
// you might want to call this after posting an article on your blog,
// but it would be wise to limit it somehow, you may be making a lot
// of http requests depending on the content of your post.
var text = 'a link here: <a href="http://localhost:9000/article">a post</a>';
Pingback.scan(text, '[source]', function(err, pingback) {
  // optional callback - will get called for every pingback sent
  if (!err) console.log('Pinged ' + pingback.href + ' successfully.');
});