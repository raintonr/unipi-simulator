var fs = require("fs");
var http = require('http');
var path = require("path");
var WebSocketServer = require('websocket').server;

/*
 * We're going to create 2 web servers here:
 * 1. For a user to connect to with a normal browser to trigger events
 *    and see results.
 * 2. For a control system to connect to. On this connection we
 *    respond as if we are a UniPi Evok system.
 * 
 * Just for good measure we also handle STDIN keypresses, but they don't
 * do much right now.
 */

/* Keep a list of all connects acting as users or Evok clients */
 
var userClients = [];
var evokClients = [];
 
/* User Server */

function userGet(req, res) {
	var filePath = req.url == '/' ? 'frontend.html' : './' + req.url;
	console.log("Serving up file: %s", filePath);

	fs.exists(filePath, function(exists) {
		if (!exists) {
			res.statusCode = 404;
			res.end("Ooops");
		} else {
			var stat = fs.statSync(filePath);
			res.writeHead(200, {
				"Content-Length" : stat.size
			});

			var readStream = fs.createReadStream(filePath);
			readStream.pipe(res);
		}
	});
}

var userServer = http.createServer(function(req, res) {
  userGet(req, res);
}).listen(3031);

new WebSocketServer({
  httpServer: userServer
}).on('request', function(request) {
  console.log('New user connection from ', request.remoteAddress);
  var connection = request.accept(null, request.origin);
  userClients.push(connection);

  connection.on('message', function(message) {
    console.log('New user message: ', message);
    /* Just send all WS messages to the Evok clients */
    for (var lp = 0; lp < evokClients.length; lp++) {
      evokClients[lp].sendUTF(message.utf8Data);
    }
  });

  connection.on('close', function(connection) {
    console.log('Closed connection');
    /* TODO: remove the closed connection from our clients list */
  });
});

console.log("Connect to web interface at http://localhost:3031/");

/* Evok server */

var server = http.createServer(function(req, res) {
  console.log('http request: ', req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('{"success": true}');
});
server.listen(3030, function() { });

/* Store the value of 8 relays */
var minRelay = 1;
var maxRelay = 8;
var relays = [];

/* Everything starts off */

for (var lp = minRelay; lp <= maxRelay; lp++) {
  relays[lp] = 0;
}

function dumpRelays() {
  console.log('Relays: ' + relays.join(' | ') + ' |');
}

/*
 * WS server.
 */
 
new WebSocketServer({
  httpServer: server
}).on('request', function(request) {
  console.log('New connection from ', request.remoteAddress);
  var connection = request.accept(null, request.origin);
  evokClients.push(connection);

  connection.on('message', function(message) {
    console.log('New message: ', message);
    if (message.utf8Data && message.utf8Data.trim() != '') {

      /* Send all WS messages to the User clients for display */
      for (var lp = 0; lp < userClients.length; lp++) {
        userClients[lp].sendUTF(message.utf8Data);
      }
      
      /* Do our own primative display also */
      data = JSON.parse(message.utf8Data);
      console.log('data: ', data);
      var dev = data.dev;
      var circuit = data.circuit;
      if (dev == 'relay' && circuit >= minRelay && circuit <= maxRelay) {
        relays[circuit] = data.value;
        dumpRelays();
      }
    }
  });

  connection.on('close', function(connection) {
    console.log('Closed connection');
    /* TODO: remove the closed connection from our clients list */
  });
});

console.log("Connect to Evok device at ws://localhost:3030/");

/*
 * Listen for keypress to simulate UniPi inputs
 */
 
var stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

function sendInput(circuit, value) {
  /* Send circuit value to anyone listening */
  var json = JSON.stringify({
    "dev": "input",
    "circuit": circuit,
    "value": value
  });

  console.log("Sending: ", json);
  for (var lp = 0; lp < evokClients.length; lp++) {
    evokClients[lp].sendUTF(json);
  }
}

stdin.on('data', function( key ){
  /* ctrl-c ( end of text ) */
  if (key === '\u0003') {
    process.exit();
  }

  console.log('Keypress: ', key);
  
  if (key >= 'a' && key <= 'n') {
    var circuit = minRelay + key.charCodeAt(0) - 97;
    /*
     * This siumlates an actor pressing a momentary switch and releasing
     * after 100ms.
     * 
     * Ideally Evok would only spit out a single 'click' event for this
     * case because we don't want to have to rely on clients detecting
     * very short 'on' periods.
     */
    sendInput(circuit, 1);
    setTimeout(function(circuitOff){
      sendInput(circuitOff, 0);
    }, 100, circuit);
  }
});
