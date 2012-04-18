// Include all Node modules needed for this example
var app    = require("http"),
	url 	= require("url"),
	path 	= require("path"),
	fs 		= require("fs"),
	events 	= require("events"),
	util 	= require("util"),
	io 		= require("socket.io");

var port = process.env.PORT || 3000; // Heroku..

function load_static_web_file(uri, response) {
	
	uri = uri == '/' ? '/index.html' : uri; // homepage
	var filename = path.join(process.cwd(), uri);

	// If path.exists function takes a string parameter - which is a path to
	// the document being requested - and a function which gets passed a boolean
	// argument which is true if a file at the path exists, and false if it doesn't
	path.exists(filename, function(exists) {
		
		// File not found. Return a 404 error.
        if (!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("Four Oh Four! Wherefour art thou?");
            response.end();
            return;
        }
        
		// File does exist. Execute the FileSystem.readFile() method
		// with a closure that returns a 500 error if the file could not
		// be read properly.
        fs.readFile(filename, "binary", function(err, file) {
			
			// File could not be read, return a 500 error.
            if (err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err+"\n");
                response.end();
                return;
            }
			
            var contentType;

			// Serve files with the correct mime types and 200 ok
			switch (filename.split('.')[1]) {
				case 'js':
					contentType = 'text/javascript';
				break;

				case 'css':
					contentType = 'text/css';
				break;

				case 'html':
					contentType = 'text/html';
				break;
					
				default:
					contentType = 'text/plain';
				break;
			}
			
			// Send response
			response.writeHead(200, {'Content-Type': contentType });
			response.write(file, "binary");

			// End the response.
            response.end();
        });
    });
}

var Twitter = (function(){
    var eventEmitter = new events.EventEmitter();
	
    return {
        EventEmitter : eventEmitter,  // The event broadcaster
        latestTweet : 0               // The ID of the latest searched tweet		
    };
})();

function nTwitterGetTweets (socket) {
	console.log('getting tweets');

	var twitter = require('ntwitter');

	var twit = new twitter({
	consumer_key: 'PyPzMvX2OwtqM9lidR4Lg',
	consumer_secret: '1c38lzjaFpBktknVFV9QiLw5PlAxhX5m8c0FPEPGog',
	access_token_key: '50601202-3mAQsr5YViRu5fH39pY5HsG6FsIb54x6qPPyRb8b4',
	access_token_secret: 'sn8ZXU63lrhEi8gOYWAjq4ez8KsXZFlgnMEA83A3o'
	});

	twit.stream('statuses/filter', 
	{
		'track': '#nowplaying'
		// 'locations':'-180,-90,180,90'
		
	},
	function(stream) {
		stream.on('data', function (data) {
			console.log('.');
			if (data.user.lang == 'en') { // we are only instersted in english langueage tweets
				if (data.geo != null) {
					socket.emit('geoTweet', data);					
				} else if (data.user.location != null) {
					console.log('location:', data.user.location);
					socket.emit('locTweet', data);					
				} else if (data.place != null) {
					console.log('location:', data.place);
					socket.emit('placeTweet', data);					
				}		
			}
		});

		stream.on('end', function (response) {
			// Handle a disconnection
			console.log('ENDED STREAM');
		});
		stream.on('destroy', function (response) {
			// Handle a 'silent' disconnection from Twitter, no end/error event fired
			console.log('DESTROYED STREAM');
		});
		// Disconnect stream after five seconds
		//setTimeout(stream.destroy, 20000);		
	});
}

// Create an HTTP server
var appServer = app.createServer(function (request, response) {
	// Parse the entire URI to get just the pathname
	var uri = url.parse(request.url).pathname, query;
	load_static_web_file(uri, response);  
});

var webSocket = io.listen(appServer);

webSocket.configure(function () { 
  webSocket.set("transports", ["xhr-polling"]); 
  webSocket.set("polling duration", 10); 
  webSocket.set('log level', 1);
});

// Heroku demands that Socket.io not use websockets at this time.. annoying

appServer.listen(port); // start the server

webSocket.sockets.on('connection', function (socket) {
  //socket.emit('news', { hello: 'world' });

	nTwitterGetTweets(socket);

  socket.on('my other event', function (data) {
    console.log(data);
  });
});

// Put a message in the console verifying that the HTTP server is up and running
console.log("Server listening on " + port);