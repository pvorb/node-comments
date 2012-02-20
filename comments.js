var append = require('append');
var sha1 = require('sha1');
var md5 = require('MD5');
var querystring = require('querystring');
var MongoDB = require('mongodb').Db;
var MongoServer = require('mongodb').Server;

// constructor
var Comments = module.exports = function Comments(opt) {

  // Default options
  var defaultOpt = {
    host: 'localhost',
    port: 27017,
    name: 'website',
    collection: 'comments',
    properties: {}
  };

  this.opt = append(defaultOpt, opt);
};

// method: connect
Comments.prototype.connect = function connect(connected) {
  var inst = this,
      opt = this.opt;

  // Server connection
  inst.server = new MongoServer(opt.host, opt.port, { auto_reconnect: true });
  // DB connection
  var dbConnector = new MongoDB(opt.name, inst.server);

  dbConnector.open(function(err, db) {
    if (err)
      return connected(err);

    // DB connection
    inst.db = db;

    db.collection(opt.collection, function (err, col) {
      if (err)
        return connected(err);

      // ref to collection
      inst.collection = col;

      // ensure index
      col.ensureIndex('res', function (err) {
        if (err)
          return connected(err);
        col.ensureIndex('modified', function (err) {
          // callback
          connected(null, col);
        });
      });
    });
  });
};

// method: getCollection
Comments.prototype.getCollection = function getCollection(done) {
  // If connection hasn't already been established
  if (typeof this.collection == 'undefined')
    // try to connect
    this.connect(done);

  // otherwise simply use existing collection
  else
    done(null, this.collection);
};

// method: saveComment
Comments.prototype.saveComment = function saveComment(res, comment, saved) {
  // resource
  comment.res = res;

  // email address and hash
  var email = comment.email;
  comment.email = {
    address: email,
    hash: md5(email)
  };

  // modified
  comment.modified = new Date();

  // hash the comment, necessary for future comment editing
  comment.hash = sha1(JSON.stringify(comment));

  // get collection and save comment
  this.getCollection(function(err, col) {
    col.save(comment, saved);
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
    website: true,
    modified: true,
    message: true
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
  this.getCollection(function(err, col) {
    col.find(query, props, opt, received);
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
Comments.prototype.close = function(done) {
  if (this.db)
    this.db.close(done);
};

// method: getCommentsJSON
Comments.prototype.getCommentsJSON = function getCommentsJSON(res, resp,
    received) {
  // if resource is not defined
  if (typeof res == 'undefined') {
    resp.writeHead(404);
    resp.end();
    return received(new Error('No resource given'));
  }

  // request comments for this resource from the db
  this.getComments(res, function receiveComments(err, results) {
    if (err) {
      resp.writeHead(404);
      resp.end();
      return received(err);
    }

    // count the comments
    results.count(function count(err, count) {
      var i = 0;

      if (err) {
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
          return received(err);

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
