var append = require('append');
var fs = require('fs');
var path = require('path');
var url = require('url');
var md5 = require('MD5');
var querystring = require('querystring');
var async = require('async');
var MongoDB = require('mongodb').Db;
var MongoServer = require('mongodb').Server;
var Pingback = require('pingback');

// constructor
var Comments = module.exports = function Comments(opt) {

  // Default options
  var defaultOpt = {
    host: 'localhost',
    port: 27017,
    name: 'website',
    comments: 'comments',
    pingbacks: 'pingbacks',
    publicDirectory: process.cwd(),
    urlPrefix: 'http://example.com/'
  };

  this.opt = append(defaultOpt, opt);
};

// method: connect
Comments.prototype.connect = function connect(connected) {
  var self = this,
      opt = this.opt;

  // Server connection
  self.server = new MongoServer(opt.host, opt.port);
  // DB connection
  var dbConnector = new MongoDB(opt.name, self.server);

  dbConnector.open(function(err, db) {
    if (err)
      return connected(err);

    // DB connection
    self.db = db;

    // open collections and ensure indexes
    async.parallel({
      comments: function (cb) {
        db.collection(opt.comments, function (err, col) {
          if (err)
            return cb(err);

          self.comments = col;

          col.ensureIndex({
            res: -1,
            modified: -1
          }, function (err) {
            if (err)
              return cb(err);

            cb(null, col);
          });
        });
      },
      pingbacks: function (cb) {
        db.collection(opt.pingbacks, function (err, col) {
          if (err)
            return cb(err);

          self.pingbacks = col;

          cb(null, col);
        });
      }
    }, connected);
  });
};

// method: getCollections
Comments.prototype.getCollections = function getCollections(done) {
  // If connection hasn't already been established
  if (typeof this.comments == 'undefined'
      || typeof this.pingbacks == 'undefined')
    // try to connect
    this.connect(done);

  // otherwise simply use existing collection
  else
    done(null, { comments: this.comments, pingbacks: this.pingbacks });
};

// method: saveComment
Comments.prototype.saveComment = function saveComment(res, comment, saved) {
  // resource
  comment.res = res;

  // email address and hash
  if (comment.email) {
    var email = comment.email;
    comment.email = {
      address: email,
      hash: md5(email)
    };
  }

  // modified
  comment.modified = new Date();

  // get collection and save comment
  this.getCollections(function(err, col) {
    if (err)
      return saved(err);

    col.comments.save(comment, { safe: true }, saved);
  });
};

// method: getComments
Comments.prototype.getComments = function getComments(res, props, opt,
    received) {
  var defaultOpt = {
    sort: 'modified'
  };

  var defaultProps = {
    _id: true,
    author: true,
    'email.hash': true,
    website: true,
    modified: true,
    message: true,
    pingback: true
  };

  // set properties and options
  if (arguments.length == 2) {
    received = props;
    props = defaultProps;
    opt = defaultOpt;
  } else if (arguments.length == 3) {
    received = opt;
    opt = defaultOpt;
    props = append(defaultProps, props);
  } else {
    opt = append(defaultOpt, opt);
    props = append(defaultProps, props);
  }

  var query = {};
  if (res !== null)
    query.res = res;

  // get collection and find comments
  this.getCollections(function(err, col) {
    if (err)
      return received(err);

    col.comments.find(query, props, opt, received);
  });
};

// method: count
Comments.prototype.count = function count(res, counted) {
  try {
    this.getComments(res, function(err, results) {
      results.count(counted);
    });
  } catch(err) {
    counted(err);
  }
};

// method: close
Comments.prototype.close = function close(done) {
  if (this.db)
    return this.db.close(done);

  done();
};

// method: getCommentsJSON
Comments.prototype.getCommentsJSON = function getCommentsJSON(res, resp,
    received) {
  // if resource is not defined
  if (typeof res == 'undefined') {
    resp.writeHead(404);
    resp.end();
    return received(new Error('No resource given.'));
  }

  // request comments for this resource from the db
  this.getComments(res, function receiveComments(err, results) {
    if (err) {
      throw err;
      resp.writeHead(404);
      resp.end();
      return received(err);
    }

    // count the comments
    results.count(function count(err, count) {
      var i = 0;

      if (err) {
        throw err;
        resp.writeHead(404);
        resp.end();
        return received(err);
      }

      resp.writeHead(200, { 'Content-Type': 'application/json' });

      // start JSON array output
      resp.write('[');

      // for each comment in the result set
      results.each(function (err, comment) {
        if (err)
          return;

        if (!comment) {
          // end the output when there are no more comments
          resp.end(']');
          return received();
        }

        resp.write(JSON.stringify(comment));
        // seperate comments by a comma
        if (++i < count)
          resp.write(',');
      });
    });
  });
};

// method: parseCommentPOST
Comments.prototype.parseCommentPOST = function parseCommentPOST(res, req,
    parsed) {
  var data = '';

  // add chunks to data
  req.on('data', function(chunk) {
    data += chunk;
  });

  // when data is complete
  req.on('end', function() {
    parsed(null, querystring.parse(data));
  });

  // when connection is closed, before data is complete
  req.on('close', function(err) {
    parsed(err);
  });
};

// method: setCommentJSON
Comments.prototype.setCommentJSON = function setCommentJSON(res, comment,
    resp, saved) {
  if (typeof res == 'undefined') {
    resp.writeHead(404);
    resp.end();
    return saved(new Error('Invalid argument. `res` must not be undefined.'));
  }

  if (comment === false) {
    resp.writeHead(412); // precondition failed
    resp.end();
    return saved(new Error('Precondition failed.'));
  }

  // save comment
  this.saveComment(res, comment, function(err, comment) {
    if (err) {
      resp.writeHead(500);
      resp.end();
      return saved(err);
    }

    // everything ok
    resp.writeHead(200);
    resp.end();
    saved();
  });
};

// method: sendPingbacks
Comments.prototype.sendPingbacks = function sendPingbacks(res, pinged) {
  var self = this;

  this.getCollections(function (err, col) {
    if (err)
      return pinged(err);

    // check if document already has sent pingbacks
    col.pingbacks.find({ _id: res, sent: true }).count(function (err, num) {
      if (err)
        return pinged(err);

      if (num != 0)
        return pinged(new Error('Already sent pingbacks for "'+res+'".'));

      // if not, send pingbacks
      fs.readFile(path.resolve(self.opt.publicDirectory, './'+res), 'utf8',
          function (err, html) {
        if (err)
          return pinged(err);

        Pingback.scan(html, url.resolve(self.opt.urlPrefix, res),
            function (err, pb) {
          if (err) {
            return col.pingbacks.update({ _id: res }, {
              $set: { sent: true }
            }, { safe: true, upsert: true }, function (e) {
              if (e)
                return pinged(e);
              pinged(err);
            });
          }

          // set sent to true for this document and push .href to targets
          col.pingbacks.update({ _id: res }, {
            $set: { sent: true },
            $push: { targets: pb.href }
          }, { safe: true, upsert: true }, function (err) {
            if (err)
              return pinged(err);
            pinged(null, pb);
          });
        });
      });
    });
  });
};

// method: handlePingback
Comments.prototype.handlePingback
    = function handlePingback(req, resp, next) {
  var self = this;

  var ping = new Pingback(req, resp);
  ping.on('ping', function (source, target, next) {
    // check if it’s a file
    fs.stat(path.resolve(self.opt.publicDirectory, '.'+target.pathname),
        function (err, stats) {
      if (err)
        return next(Pingback.TARGET_DOES_NOT_EXIST);
      if (!stats.isFile())
        return next(Pingback.TARGET_CANNOT_BE_USED);

      self.getCollections(function (err, col) {
        if (err)
          return next(Pingback.TARGET_CANNOT_BE_USED);

        // check if the pingback already has been registered
        col.comments.find({
          res: target.pathname,
          pingback: true,
          website: source.href
        }).count(function (err, count) {
          if (err)
            return next(Pingback.TARGET_CANNOT_BE_USED);
          if (count)
            return next(Pingback.ALREADY_REGISTERED);

          next();
        });
      });
    });
  });
  ping.on('fault', function (code, msg) {
    next(new Error(
      'Received bad pingback from '
      + this.source.href + '.'
      + ' Fault Code: ' + code
      + ' - Message: ' + msg
    ));
  });
  ping.on('error', function () {
    resp.writeHead(404);
    resp.end();
  });
  ping.on('success', function (source, target) {
    // save the pingback as a comment
    self.saveComment(target.pathname, {
      message: '[…] '+ping.excerpt+' […]',
      author: ping.title,
      website: source.href,
      pingback: true
    }, function (err) {
      if (err)
        return next(new Error('Failed to add pingback from '
            +source.href+'.'));
    });
  });
  req.pipe(ping);
};
