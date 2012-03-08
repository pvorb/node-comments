var Comments = require('../');

var comments = new Comments();

// list all comments
comments.getComments('/log/2011/09/test.html',
    {}, { limit: 2, sort: [[ "modified", "desc" ]] },
    function(err, results) {
  results.toArray(function(err, c) {
    if (err) throw err;

    c = c.reverse();
    c.forEach(function (c) { console.log(c); });
    comments.close(function(err) {
      if (err) throw err;
      console.log('bye');
    });
  });
});
