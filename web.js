/*
* Node.js class for serving static web files and recieving a live twitter stream and sending to the client via websockets
*
* Dependancies: Node.js (http://nodejs.org/)
*				Socket.IO (Websocket normalization, http://socket.io/)
*				nTwitter (Node.js twitter API wrapper https://github.com/AvianFlu/ntwitter)
*
* Fully validated with JSLint, no errors
*
* Author: Chris Finch
* Date: April, 2012
*/

// Node Modules
var app		= require("http"),
	url		= require("url"),
	path	= require("path"),
	fs		= require("fs"),
	events	= require("events"),
	util	= require("util"),
	io		= require("socket.io");

var port = process.env.PORT || 3000; // Heroku environment variable..

/*
* Loads a static file (html/assets..) from the file system and writes it in to the response
*/
function loadStaticFile(uri, response) {
	
	uri = uri == '/' ? '/index.html' : uri; // homepage route
	var filename = path.join(process.cwd(), uri);

	// Path exists
	path.exists(filename, function(exists) {
		
		// 404... =[
        if (!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("Four Oh Four! Wherefour art thou?");
            response.end();
            return;
        }
        
        // File Exists - yay!
        fs.readFile(filename, "binary", function(err, file) {
			
			// File could not be read, return a 500 error.
            if (err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err+"\n");
                response.end();
                return;
            }
			
			// Serve files with the correct mime types and 200 ok
            var contentType;			
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

/*
* Access the twitter stream using nTwitter and track a particular search term, then return the tweets to socket.IO
*/
function nTwitterGetTweets (socket, searchTerm) {
	var twitter = require('ntwitter');
	var twit = new twitter({
		consumer_key: 'PyPzMvX2OwtqM9lidR4Lg',
		consumer_secret: '1c38lzjaFpBktknVFV9QiLw5PlAxhX5m8c0FPEPGog',
		access_token_key: '50601202-3mAQsr5YViRu5fH39pY5HsG6FsIb54x6qPPyRb8b4',
		access_token_secret: 'sn8ZXU63lrhEi8gOYWAjq4ez8KsXZFlgnMEA83A3o'
	});
	/*
	* Unfortunately it seems that it is not possible at this time to 
	* provide a term to track AND to ensure that returned results have geodata.
	*
	* This is annoying since a lot of extra processing needs to be done 
	* on the client side to filter the tweets
	*/
	twit.stream('statuses/filter', 
	{
		'track': searchTerm
	},
	function(stream) {
		stream.on('data', function (data) {
			// console.log('.');
			if (data.user.lang == 'en') { // we are only instersted in english language tweets
				if (data.geo !== null) {
					socket.emit('geoTweet', data);					
				} else if (data.user.location !== null) {
					// console.log('location:', data.user.location);
					socket.emit('locTweet', data);					
				} else if (data.place !== null) {
					// console.log('location:', data.place);
					socket.emit('placeTweet', data);					
				}		
			}
		});
		stream.on('end', function (response) {
			// The internet broke
			// console.log('ENDED STREAM');
		});
		stream.on('destroy', function (response) {
			// Twitter kicked us off
			// console.log('DESTROYED STREAM');
		});
	});
}

// Create an HTTP server
var appServer = app.createServer(function (request, response) {
	// parse pathname out of uri
	var uri = url.parse(request.url).pathname;
	loadStaticFile(uri, response);  
});

// Create a new instance of socket.IO
var webSocket = io.listen(appServer);

// Heroku demands that Socket.io not use websockets at this time, configuring to use long-polling.. annoying!
webSocket.configure(function () { 
	webSocket.set("transports", ["xhr-polling"]); 
	webSocket.set("polling duration", 10); 
	webSocket.set('log level', 1);
});

appServer.listen(port); // start the server

webSocket.sockets.on('connection', function (socket) {
		nTwitterGetTweets(socket, '#nowplaying');
	socket.on('changeSearch', function (data) { // Detect search term change and pass in new search term
		nTwitterGetTweets(socket, data.term);
	});
});

// Put a message in the console verifying that the HTTP server is up and running
console.log("Server listening on " + port);