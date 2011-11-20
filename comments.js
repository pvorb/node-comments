var append = require('append'),
    sha1 = require('sha1'),
    MongoDB = require('mongodb').Db,
    MongoServer = require('mongodb').Server;

var INDEX = 'res'; // which field to index

// constructor
var Comments = module.exports = function Comments(opt) {

  // Default options
  var defaultOpt = {
    host: 'localhost',
    port: 27017,
    name: 'website',
    collection: 'comments'
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

  try {
    dbConnector.open(function(err, db) {
      if (err) throw err;

      // DB connection
      inst.db = db;

      db.collection(opt.collection, function(err, col) {
        if (err) throw err;

        // ref to collection
        inst.collection = col;

        // ensure index
        col.ensureIndex(INDEX, function(err, index) {
          if (err) throw err;

          // callback
          connected(null, col);
        });
      });
    });
  } catch(err) {
    connected(err);
  }
};

// method: getCollection
Comments.prototype.getCollection = function getCollection(done) {
  // If connection hasn't already been established
  if (typeof this.collection == 'undefined')
    // try to connect
    try {
      this.connect(done);
    } catch(err) {
      done(err);
    }
  // otherwise simply use existing collection
  else
    done(null, this.collection);
};

// method: saveComment
Comments.prototype.saveComment = function saveComment(comment, saved) {
  try {
    // get collection and save comment
    this.getCollection(function(err, col) {
      col.save(comment, saved);
    });
  } catch(err) {
    saved(err);
  }
};

// method: getComments
Comments.prototype.getComments = function getComments(res, props, opt,
    received) {
  var defaultOpt = {
    sort: 'created'
  };

  var defaultProps = {
    _id: true,
    author: true,
    website: true,
    created: true,
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

  try {
    // get collection and find comments
    this.getCollection(function(err, col) {
      col.find(query, props, opt, received);
    });
  } catch(err) {
    received(err);
  }
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
  } else {
    // request comments for this resource from the db
    this.getComments(res, function receiveComments(err, results) {
      if (err) {
        resp.writeHead(404);
        resp.end();
        received(err);
      } else {
        // count the comments
        results.count(function count(err, count) {
          var i = 0;

          if (err) {
            resp.writeHead(404);
            resp.end();
            received(err);
          } else {
            resp.writeHead(200, { 'Content-Type': 'application/json' });

            // start JSON array output
            resp.write('[');

            // for each comment in the result set
            results.each(function (err, comment) {
              if (err) received(err);

              if (comment) {
                resp.write(JSON.stringify(comment));
                // seperate comments by a comma
                if (++i < count) resp.write(',');
              } else {
                // end the output when there are no more comments
                resp.end(']');
                received(null);
              }
            });
          }
        });
      }
    });
  }
};

// method: parseCommentJSON
Comments.prototype.parseCommentJSON = function parseCommentJSON(res, req,
    parsed) {
  var data = '';

  // add chunks to data
  request.on('data', function(chunk) {
    data += chunk;
  });

  // when data is complete
  request.on('end', function() {
    try {
      parsed(null, JSON.parse(data));
    } catch (err) {
      parsed(err, null);
    }
  });

  // when connection is closed, before data is complete
  request.on('close', function(err) {
    parsed(err, null);
  });
};

// method: setCommentJSON
Comments.prototype.setCommentJSON = function setCommentJSON(res, comment,
    resp, saved) {
  if (typeof res == 'undefined') {
    resp.writeHead(404);
    resp.end();
    saved(new Error('Invalid argument. `res` must not be undefined.'));
  } else {
    if (comment === false) {
      resp.writeHead(412); // precondition failed
      resp.end();
      saved(new Error('Precondition failed.'));
    } else {
      comment.res = res;
      comment.created = new Date();
      // hash the comment
      comment.hash = sha1(JSON.stringify(comment));
      // save comment
      this.saveComment(comment, function(err, comment) {
        if (err) {
          resp.writeHead(500);
          resp.end();
          saved(err);
        } else { // everything ok
          resp.writeHead(200, { 'Location': res });
          resp.end();
          saved(null);
        }
      });
    }
  }
};
