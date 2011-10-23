var Comments = require('../');

var comments = new Comments();

function log(err, comment) {
  if (err) console.error(err);
  else if (comment === 1)
    console.log('updated');
  else
    console.log('created');

  // close afterwards
  comments.close(function() {
    console.log('bye');
  });
}

comments.saveComment({
  res: '/path/document',
  message: 'this is the text of the comment',
  author: 'paul',
  website: 'https://vorb.de',
  email: 'paul@vorb.de',
  created: new Date()
}, log);
