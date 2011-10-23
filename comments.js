var append = require('append'),
    MongoDB = require('mongodb').Db,
    MongoServer = require('mongodb').Server;

var INDEX = 'res';

// constructor
var Comments = module.exports = function(opt) {

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
Comments.prototype.connect = function(connected) {
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

        // save ref to collection
        inst.collection = col;

        col.ensureIndex(INDEX, function(err, index) {
          if (err) throw err;

          connected(null, col);
        });
      });
    });
  } catch(err) {
    connected(err);
  }
};

// method: getCollection
Comments.prototype.getCollection = function(done) {
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
Comments.prototype.saveComment = function(comment, saved) {
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
Comments.prototype.getComments = function(res, props, opt, received) {
  var defaultOpt = {
    sort: "created"
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
Comments.prototype.count = function(res, counted) {
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
