$(function () {
	return new gTweets;
});

var gTweets = function () {
	this.sideBar = $('#tweets');
	this.timeOut = 90000
	this.init();
};

gTweets.prototype = {
	init : function () {
		this.initMaps();
		this.webSocket();
	},

	/*
	* Create an instance of Google Maps
	*/
	initMaps : function () {
		this.mapOptions = {
			center: new google.maps.LatLng(50.848223,-0.129433),
			zoom: 3,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			styles: [ // Monochrome map
						{
							featureType: "all",
							stylers: [
								{ saturation: -100 }
							]
						}
					]
		};
		this.map = new google.maps.Map(document.getElementById('map_canvas'), this.mapOptions); // Init map
		this.geoCoder = new google.maps.Geocoder; // Initialize the geocoder for later use
	},

	/*
	* Takes twitter data and places a marker and attached info box on the map
	*/
	placeMarker : function (data) {
		var i = this;
		if (typeof data.geo.coordinates.lat == 'function') {
			var myLatlng = data.geo.coordinates;
		} else {
			var myLatlng = new google.maps.LatLng(data.geo.coordinates[0], data.geo.coordinates[1]);
		}

		var image = new google.maps.MarkerImage( // Center bottom point of image denotes tweet location
			data.user.profile_image_url,
			new google.maps.Size(32, 32),
			new google.maps.Point(0,0),
			new google.maps.Point(16, 32)
		);

		//A stab at making a better icon for the map - too involved for the scope of this project
		var shadow = new google.maps.MarkerImage("img/shadow.png",
			new google.maps.Size(49.0, 32.0),
			new google.maps.Point(0, 0),
			new google.maps.Point(16.0, 32.0)
		);

		var marker = new google.maps.Marker({
			position: myLatlng,
			icon: image,
			shadow: shadow,
			map: i.map,
			title:data.text.replace(/(\r\n|\n|\r)/gm,""),
			animation: google.maps.Animation.DROP,
			draggable: false
		});

		marker.setMap(i.map);

		var a = setTimeout(function () { // Remove markers after 90 seconds to prevent the map becoming clogged up
			marker.setMap(null);
		}, i.timeOut);

        var infowindow = new InfoBubble({ // Adds the info windows with the tweet text
			map: i.map,
			content: '<div class="infotext">'+data.text.replace(/(\r\n|\n|\r)/gm,"")+'</div>',
			shadowStyle: 1,
			padding: 0,
			backgroundColor: 'rgb(57,57,57)',
			borderRadius: 4,
			arrowSize: 10,
			borderWidth: 1,
			borderColor: '#2c2c2c',
			disableAutoPan: true,
			hideCloseButton: true,
			arrowPosition: 30,
			backgroundClassName: 'info',
			arrowStyle: 2
        });

		google.maps.event.addListener(marker, 'mouseover', function() {
			infowindow.open(i.map,marker);
			google.maps.event.addListener(marker, 'mouseout', function() {
				infowindow.close();
			});
		});
	},

	/*
	* Geocodes a tweet location using the gMaps API geocoding service.
	*/
	getGeo : function (data) {
		var i = this;
		i.geoCoder.geocode( { 'address': data.user.location}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				data.geo = {
					'coordinates': results[0].geometry.location
				};
				i.placeMarker(data);
			} else {
				console.log("Geocode was not successful for the following reason: " + status);
			}
		});
	},

	/*
	* Using Socket.io - connects with the node server and recieves tweet events from the stream
	*
	*
	*/
	webSocket : function () {
		var i = this;
		i.socket = io.connect(window.location.hostname);
		i.socket.on('geoTweet', function (data) {
			i.placeMarker(data);
			i.logTweet(data);
			//socket.emit('my other event', { my: 'data' });
		});
		i.socket.on('locTweet', function (data) {
			i.getGeo(data);
			i.logTweet(data);
			//socket.emit('my other event', { my: 'data' });
		});
	},

	logTweet : function (data) {
		var i = this;
		var tweet = $('<li />').addClass('tweet');
		var html = [];

		// date
		var date = new Date(data.created_at);
		var dateText = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();

		html.push('<div class="icon"><img src="'+data.user.profile_image_url+'" width="48" height="48" /></div>');
		html.push('<div class="title"><a href="http://twitter.com/'+data.user.screen_name+'" target="_blank" class="name">@'+data.user.name+'</a>');
		html.push('<span class="from"> - '+data.user.location+'</span></div>');
		html.push('<span class="date">'+dateText+'</span>');
		html.push('<span class="text">'+data.text+'</span>');
		
		i.displayTweets(tweet.html(html.join('')));		
	},

	displayTweets : function (tweet) {
		var i = this;
		var sbHeight = i.sideBar.innerHeight();
		var twtHeight = i.sideBar.find('.tweet').first().outerHeight(true);
		var numTwt = i.sideBar.find('.tweet').length;
		
		if ((twtHeight*(numTwt-3)) > sbHeight) {
			i.sideBar.find('.tweet').first().slideUp(200, function () {
				$(this).remove();
			});
			tweet.hide().appendTo(i.sideBar.find('#tweetsList')).slideDown(200);
		} else {
			tweet.hide().appendTo(i.sideBar.find('#tweetsList')).slideDown(200);
		}

		
	}
}