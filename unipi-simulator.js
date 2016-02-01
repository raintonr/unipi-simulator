var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
    /* Don't do anything here, we're interested in WS only */
});
server.listen(3030, function() { });

/* WS server */
new WebSocketServer({
    httpServer: server
}).on('request', function(request) {
    console.log('New connection from ', request.remoteAddress);
    var connection = request.accept(null, request.origin);

    connection.on('message', function(message) {
        console.log('New message: ', message);
    });

    connection.on('close', function(connection) {
        console.log('Closed connection');
    });
});
