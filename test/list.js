var Comments = require('../');

var comments = new Comments();

// list all comments
comments.getComments('/path/document', function(err, results) {
  results.each(function(err, comment) {
    if (err) throw err;

    if (comment)
      console.log(comment);
    else
      comments.close(function(err) {
        if (err) throw err;

        console.log('bye');
      });
  });
});
