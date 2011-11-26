var Comments = require('../');

var comments = new Comments();

// list all comments
comments.getComments('/log/2011/09/test.html', function(err, results) {
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
