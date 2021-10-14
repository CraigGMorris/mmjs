var nodeStatic = require('node-static');
var http = require('http');

var file = new(nodeStatic.Server)(__dirname);

http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(8080);