var Comments = require('..');
var Pingback = require('pingback');
var http = require('http');
var fs = require('fs');
var path = require('path');

var c1 = new Comments({
  name: 'source',
  publicDirectory: __dirname,
  urlPrefix: 'http://127.0.0.1:1337/'
});

var source = http.createServer(function (req, resp) {
  resp.setHeader('X-Pingback', '/pingback');
  if (req.url == '/pingback') {
    c1.handlePingback(req, resp, function (err) {
      console.log(err);
    });
  } else
    resp.end(fs.readFileSync(path.resolve(__dirname, '.'+req.url)));
});

var c2 = new Comments({
  name: 'target',
  publicDirectory: __dirname,
  urlPrefix: 'http://127.0.0.1:1338/'
});

var target = http.createServer(function (req, resp) {
  resp.setHeader('X-Pingback', '/pingback');
  if (req.url == '/pingback') {
    c2.handlePingback(req, resp, function (err) {
      console.log(err);
    });
  } else
    resp.end(fs.readFileSync(path.resolve(__dirname, '.'+req.url)));
});

source.listen(1337, function () {
  target.listen(1338, function () {

    // test
    c1.sendPingbacks('hello.html', function () {
      console.log('Sent pingbacks');
    });

    c2.sendPingbacks('world.html', function () {
      console.log('Sent pingbacks');
    });

  });
});
