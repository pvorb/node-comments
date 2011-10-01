var Comments = require('../');

var comments = new Comments();

// list all comments
comments.count(null, function(err, count) {
  if (err) throw err;
  console.log('There are '+count+' comments in this collection.');

  comments.close(function() {
    console.log('bye');
  });
});
