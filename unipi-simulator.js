var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
  /* Don't do anything here, we're interested in WS only */
});
server.listen(3030, function() { });

/* Let's keep a list of clients to send all inputs to */
var clients = [];

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
  clients.push(connection);

  connection.on('message', function(message) {
    console.log('New message: ', message);
    data = JSON.parse(message.utf8Data);
    var dev = data.dev;
    var circuit = data.circuit;
    if (dev == 'relay' && circuit >= minRelay && circuit <= maxRelay) {
      relays[circuit] = data.value;
      dumpRelays();
    }
  });

  connection.on('close', function(connection) {
    console.log('Closed connection');
    /* TODO: remove the closed connection from our clients list */
  });
});

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
  for (var lp = 0; lp < clients.length; lp++) {
    clients[lp].sendUTF(json);
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
